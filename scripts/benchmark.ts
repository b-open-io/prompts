#!/usr/bin/env bun
/**
 * Skill Benchmark Harness
 *
 * Discovers skills with evals/evals.json, runs each eval prompt
 * with and without the skill using `claude -p`, grades assertions
 * via LLM-as-judge, and aggregates results into benchmarks/latest.json.
 *
 * Usage:
 *   bun run scripts/benchmark.ts
 *   bun run scripts/benchmark.ts --skill geo-optimizer
 *   bun run scripts/benchmark.ts --model claude-sonnet-4-6
 *   bun run scripts/benchmark.ts --concurrency 2
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Assertion {
  id: string;
  text: string;
  type: string;
}

interface Eval {
  id: number;
  prompt: string;
  expected_output: string;
  files: string[];
  assertions: Assertion[];
}

interface EvalsFile {
  skill_name: string;
  evals: Eval[];
}

interface AssertionResult {
  id: string;
  text: string;
  passed: boolean;
  reasoning: string;
}

interface EvalRunResult {
  eval_id: number;
  prompt: string;
  with_skill: {
    output: string;
    tokens: number;
    duration_ms: number;
    assertions: AssertionResult[];
    pass_rate: number;
  };
  baseline: {
    output: string;
    tokens: number;
    duration_ms: number;
    assertions: AssertionResult[];
    pass_rate: number;
  };
}

interface SkillBenchmark {
  skill_name: string;
  skill_path: string;
  eval_count: number;
  pass_rate: number;
  baseline_pass_rate: number;
  avg_tokens_with_skill: number;
  avg_tokens_baseline: number;
  avg_duration_ms_with_skill: number;
  avg_duration_ms_baseline: number;
  evals: EvalRunResult[];
}

interface BenchmarkReport {
  generated_at: string;
  model: string;
  total_skills: number;
  total_evals: number;
  overall_pass_rate: number;
  overall_baseline_pass_rate: number;
  skills: SkillBenchmark[];
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { skill?: string; model: string; concurrency: number } {
  const args = process.argv.slice(2);
  let skill: string | undefined;
  let model = "claude-sonnet-4-6";
  let concurrency = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--skill" && args[i + 1]) {
      skill = args[++i];
    } else if (args[i] === "--model" && args[i + 1]) {
      model = args[++i];
    } else if (args[i] === "--concurrency" && args[i + 1]) {
      concurrency = parseInt(args[++i], 10);
    }
  }

  return { skill, model, concurrency };
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

function discoverSkillsWithEvals(
  repoRoot: string,
  filterSkill?: string,
): { name: string; evalsPath: string; skillPath: string }[] {
  const skillsDir = join(repoRoot, "skills");
  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const results: { name: string; evalsPath: string; skillPath: string }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (filterSkill && entry.name !== filterSkill) continue;

    const evalsPath = join(skillsDir, entry.name, "evals", "evals.json");
    if (existsSync(evalsPath)) {
      results.push({
        name: entry.name,
        evalsPath,
        skillPath: join(skillsDir, entry.name),
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Claude CLI runner
// ---------------------------------------------------------------------------

async function runClaude(
  prompt: string,
  opts: { model: string; skillPath?: string },
): Promise<{ output: string; tokens: number; duration_ms: number }> {
  const args = ["claude", "-p", prompt, "--model", opts.model, "--output-format", "json"];

  if (opts.skillPath) {
    // The --skill flag points to the SKILL.md directory
    args.push("--skill", opts.skillPath);
  }

  const start = performance.now();

  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  const duration_ms = Math.round(performance.now() - start);

  if (exitCode !== 0) {
    console.error(`  claude CLI exited with code ${exitCode}`);
    if (stderr) console.error(`  stderr: ${stderr.slice(0, 500)}`);
  }

  // Try to parse JSON output for token info
  let output = stdout;
  let tokens = 0;

  try {
    const parsed = JSON.parse(stdout);
    output = parsed.result ?? parsed.content ?? parsed.text ?? stdout;
    tokens =
      parsed.usage?.total_tokens ??
      parsed.usage?.input_tokens + parsed.usage?.output_tokens ??
      0;
  } catch {
    // Non-JSON output, use raw text
    output = stdout;
  }

  return { output, tokens, duration_ms };
}

// ---------------------------------------------------------------------------
// LLM-as-judge grading
// ---------------------------------------------------------------------------

async function gradeAssertions(
  output: string,
  expectedOutput: string,
  assertions: Assertion[],
  model: string,
): Promise<AssertionResult[]> {
  const assertionList = assertions
    .map((a, i) => `${i + 1}. [${a.id}] ${a.text}`)
    .join("\n");

  const gradingPrompt = `You are a strict evaluator. Grade whether the following OUTPUT satisfies each assertion.

EXPECTED OUTPUT DESCRIPTION:
${expectedOutput}

ACTUAL OUTPUT:
${output.slice(0, 8000)}

ASSERTIONS TO CHECK:
${assertionList}

Respond with ONLY a JSON array. Each element must have:
- "id": the assertion id
- "passed": true or false
- "reasoning": brief explanation (1 sentence)

Example: [{"id":"a-1","passed":true,"reasoning":"Output includes the required section."}]

JSON array:`;

  const result = await runClaude(gradingPrompt, { model });

  try {
    // Extract JSON array from the output
    const jsonMatch = result.output.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("  Failed to extract JSON from grading response");
      return assertions.map((a) => ({
        id: a.id,
        text: a.text,
        passed: false,
        reasoning: "Grading failed: could not parse judge response",
      }));
    }

    const parsed: { id: string; passed: boolean; reasoning: string }[] =
      JSON.parse(jsonMatch[0]);

    return assertions.map((a) => {
      const grade = parsed.find((g) => g.id === a.id);
      return {
        id: a.id,
        text: a.text,
        passed: grade?.passed ?? false,
        reasoning: grade?.reasoning ?? "No grade returned for this assertion",
      };
    });
  } catch (e) {
    console.error("  Failed to parse grading response:", e);
    return assertions.map((a) => ({
      id: a.id,
      text: a.text,
      passed: false,
      reasoning: `Grading parse error: ${e}`,
    }));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const repoRoot = resolve(import.meta.dir, "..");
  const { skill: filterSkill, model, concurrency } = parseArgs();

  // Pre-flight: check that claude CLI is available
  const whichProc = Bun.spawn(["which", "claude"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const whichExit = await whichProc.exited;
  if (whichExit !== 0) {
    console.error(
      "Error: `claude` CLI not found in PATH. Install it first: https://docs.anthropic.com/en/docs/claude-code",
    );
    process.exit(1);
  }

  // Discover skills
  const skills = discoverSkillsWithEvals(repoRoot, filterSkill);

  if (skills.length === 0) {
    if (filterSkill) {
      console.error(
        `No evals found for skill "${filterSkill}". Ensure skills/${filterSkill}/evals/evals.json exists.`,
      );
    } else {
      console.error(
        "No skills with evals/evals.json found. Create evals for at least one skill.",
      );
    }
    process.exit(1);
  }

  console.log(`Benchmark starting`);
  console.log(`  Model: ${model}`);
  console.log(`  Skills found: ${skills.map((s) => s.name).join(", ")}`);
  console.log("");

  const skillResults: SkillBenchmark[] = [];

  for (const skill of skills) {
    console.log(`--- ${skill.name} ---`);

    const evalsFile: EvalsFile = JSON.parse(
      readFileSync(skill.evalsPath, "utf-8"),
    );
    const evalResults: EvalRunResult[] = [];

    for (const evalCase of evalsFile.evals) {
      console.log(`  Eval #${evalCase.id}: ${evalCase.prompt.slice(0, 80)}...`);

      // Run with skill
      console.log("    Running with skill...");
      const withSkill = await runClaude(evalCase.prompt, {
        model,
        skillPath: skill.skillPath,
      });
      console.log(
        `    With skill: ${withSkill.duration_ms}ms, ${withSkill.tokens} tokens`,
      );

      // Run baseline (no skill)
      console.log("    Running baseline...");
      const baseline = await runClaude(evalCase.prompt, { model });
      console.log(
        `    Baseline:   ${baseline.duration_ms}ms, ${baseline.tokens} tokens`,
      );

      // Grade both outputs
      console.log("    Grading with-skill output...");
      const withSkillGrades = await gradeAssertions(
        withSkill.output,
        evalCase.expected_output,
        evalCase.assertions,
        model,
      );

      console.log("    Grading baseline output...");
      const baselineGrades = await gradeAssertions(
        baseline.output,
        evalCase.expected_output,
        evalCase.assertions,
        model,
      );

      const withSkillPassRate =
        withSkillGrades.filter((a) => a.passed).length /
        withSkillGrades.length;
      const baselinePassRate =
        baselineGrades.filter((a) => a.passed).length /
        baselineGrades.length;

      console.log(
        `    Pass rates: with-skill=${(withSkillPassRate * 100).toFixed(0)}%, baseline=${(baselinePassRate * 100).toFixed(0)}%`,
      );

      evalResults.push({
        eval_id: evalCase.id,
        prompt: evalCase.prompt,
        with_skill: {
          output: withSkill.output.slice(0, 2000),
          tokens: withSkill.tokens,
          duration_ms: withSkill.duration_ms,
          assertions: withSkillGrades,
          pass_rate: withSkillPassRate,
        },
        baseline: {
          output: baseline.output.slice(0, 2000),
          tokens: baseline.tokens,
          duration_ms: baseline.duration_ms,
          assertions: baselineGrades,
          pass_rate: baselinePassRate,
        },
      });
    }

    // Aggregate skill-level stats
    const avgPassRate =
      evalResults.reduce((sum, e) => sum + e.with_skill.pass_rate, 0) /
      evalResults.length;
    const avgBaselinePassRate =
      evalResults.reduce((sum, e) => sum + e.baseline.pass_rate, 0) /
      evalResults.length;
    const avgTokensWithSkill =
      evalResults.reduce((sum, e) => sum + e.with_skill.tokens, 0) /
      evalResults.length;
    const avgTokensBaseline =
      evalResults.reduce((sum, e) => sum + e.baseline.tokens, 0) /
      evalResults.length;
    const avgDurationWithSkill =
      evalResults.reduce((sum, e) => sum + e.with_skill.duration_ms, 0) /
      evalResults.length;
    const avgDurationBaseline =
      evalResults.reduce((sum, e) => sum + e.baseline.duration_ms, 0) /
      evalResults.length;

    const skillBenchmark: SkillBenchmark = {
      skill_name: skill.name,
      skill_path: `skills/${skill.name}`,
      eval_count: evalResults.length,
      pass_rate: Math.round(avgPassRate * 1000) / 1000,
      baseline_pass_rate: Math.round(avgBaselinePassRate * 1000) / 1000,
      avg_tokens_with_skill: Math.round(avgTokensWithSkill),
      avg_tokens_baseline: Math.round(avgTokensBaseline),
      avg_duration_ms_with_skill: Math.round(avgDurationWithSkill),
      avg_duration_ms_baseline: Math.round(avgDurationBaseline),
      evals: evalResults,
    };

    skillResults.push(skillBenchmark);
    console.log(
      `  Skill pass rate: ${(avgPassRate * 100).toFixed(1)}% (baseline: ${(avgBaselinePassRate * 100).toFixed(1)}%)`,
    );
    console.log("");
  }

  // Build final report
  const totalEvals = skillResults.reduce((s, sk) => s + sk.eval_count, 0);
  const overallPassRate =
    skillResults.reduce((s, sk) => s + sk.pass_rate * sk.eval_count, 0) /
    totalEvals;
  const overallBaselinePassRate =
    skillResults.reduce(
      (s, sk) => s + sk.baseline_pass_rate * sk.eval_count,
      0,
    ) / totalEvals;

  const report: BenchmarkReport = {
    generated_at: new Date().toISOString(),
    model,
    total_skills: skillResults.length,
    total_evals: totalEvals,
    overall_pass_rate: Math.round(overallPassRate * 1000) / 1000,
    overall_baseline_pass_rate:
      Math.round(overallBaselinePassRate * 1000) / 1000,
    skills: skillResults,
  };

  // Write output
  const outDir = join(repoRoot, "benchmarks");
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  const outPath = join(outDir, "latest.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");

  console.log("=== Benchmark Complete ===");
  console.log(`  Skills tested: ${report.total_skills}`);
  console.log(`  Total evals:   ${report.total_evals}`);
  console.log(
    `  Overall pass rate (with skill): ${(report.overall_pass_rate * 100).toFixed(1)}%`,
  );
  console.log(
    `  Overall pass rate (baseline):   ${(report.overall_baseline_pass_rate * 100).toFixed(1)}%`,
  );
  console.log(`  Results written to: ${outPath}`);
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
