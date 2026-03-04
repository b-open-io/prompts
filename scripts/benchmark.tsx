#!/usr/bin/env bun
/**
 * Skill Benchmark Harness (Ink UI)
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

import React, { useEffect, useState } from "react";
import { render, Box, Text } from "ink";
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
// Event types (drive the Ink UI)
// ---------------------------------------------------------------------------

type BenchmarkEvent =
  | { type: "plan"; totalJobs: number }
  | { type: "eval-start"; skill: string; evalId: number; variant: "with-skill" | "baseline" }
  | { type: "eval-done"; skill: string; evalId: number; variant: "with-skill" | "baseline"; tokens: number; duration_ms: number }
  | { type: "grade-done"; skill: string; evalId: number; variant: "with-skill" | "baseline"; passRate: number }
  | { type: "error"; skill: string; evalId: number; variant: string; error: string }
  | { type: "complete"; reportPath: string };

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { skill?: string; model: string; concurrency: number } {
  const args = process.argv.slice(2);
  let skill: string | undefined;
  let model = "claude-sonnet-4-6";
  let concurrency = 2;

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
  const args = ["claude", "-p", prompt, "--model", opts.model, "--output-format", "json", "--dangerously-skip-permissions"];

  if (opts.skillPath) {
    // Inject skill content via --append-system-prompt
    const skillMdPath = join(opts.skillPath, "SKILL.md");
    if (existsSync(skillMdPath)) {
      const skillContent = readFileSync(skillMdPath, "utf-8");
      args.push("--append-system-prompt", skillContent);
    }
  }

  const start = performance.now();

  // Strip CLAUDECODE to allow nested claude -p calls
  const env = { ...process.env };
  delete env.CLAUDECODE;

  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe",
    env,
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  const duration_ms = Math.round(performance.now() - start);

  if (exitCode !== 0) {
    throw new Error(`claude CLI exited with code ${exitCode}: ${stderr.slice(0, 500)}`);
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
    return assertions.map((a) => ({
      id: a.id,
      text: a.text,
      passed: false,
      reasoning: `Grading parse error: ${e}`,
    }));
  }
}

// ---------------------------------------------------------------------------
// Job queue types
// ---------------------------------------------------------------------------

interface Job {
  skill: string;
  skillPath: string;
  evalCase: Eval;
  variant: "with-skill" | "baseline";
  expectedOutput: string;
}

interface SkillState {
  name: string;
  withSkillPassRate: number | null;
  baselinePassRate: number | null;
  evalResults: Map<number, {
    withSkill?: { output: string; tokens: number; duration_ms: number; assertions: AssertionResult[]; pass_rate: number };
    baseline?: { output: string; tokens: number; duration_ms: number; assertions: AssertionResult[]; pass_rate: number };
  }>;
}

// ---------------------------------------------------------------------------
// Ink Components
// ---------------------------------------------------------------------------

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const width =
    typeof process.stdout.columns === "number"
      ? Math.max(20, Math.min(60, process.stdout.columns - 30))
      : 40;
  const ratio = total > 0 ? completed / total : 0;
  const filled = Math.round(width * ratio);
  const empty = width - filled;
  const percent = total > 0 ? Math.floor(ratio * 100) : 0;

  return (
    <Text>
      [<Text color="green">{"#".repeat(filled)}</Text>
      <Text color="gray">{".".repeat(empty)}</Text>] <Text color="cyan">{percent}%</Text>{" "}
      (<Text color="green">{completed}</Text>/<Text color="white">{total}</Text>)
    </Text>
  );
}

function passRateColor(rate: number): string {
  if (rate >= 0.8) return "green";
  if (rate >= 0.5) return "yellow";
  return "red";
}

function SkillRow({ skill }: { skill: SkillState }) {
  const ws = skill.withSkillPassRate;
  const bl = skill.baselinePassRate;
  const delta = ws !== null && bl !== null ? ws - bl : null;

  return (
    <Box>
      <Box width={24}>
        <Text bold>{skill.name.slice(0, 22)}</Text>
      </Box>
      <Box width={14}>
        <Text color={ws !== null ? passRateColor(ws) : "gray"}>
          {ws !== null ? `${(ws * 100).toFixed(0)}%` : "..."}
        </Text>
      </Box>
      <Box width={14}>
        <Text color={bl !== null ? passRateColor(bl) : "gray"}>
          {bl !== null ? `${(bl * 100).toFixed(0)}%` : "..."}
        </Text>
      </Box>
      <Box width={14}>
        {delta !== null ? (
          <Text color={delta > 0 ? "green" : delta < 0 ? "red" : "gray"}>
            {delta > 0 ? "+" : ""}{(delta * 100).toFixed(0)}%
          </Text>
        ) : (
          <Text color="gray">---</Text>
        )}
      </Box>
    </Box>
  );
}

function App({
  events,
  skillNames,
  totalJobs,
}: {
  events: BenchmarkEvent[];
  skillNames: string[];
  totalJobs: number;
}) {
  const [skills, setSkills] = useState<Map<string, SkillState>>(new Map());
  const [completed, setCompleted] = useState(0);
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const newSkills = new Map<string, SkillState>();
    for (const name of skillNames) {
      newSkills.set(name, { name, withSkillPassRate: null, baselinePassRate: null, evalResults: new Map() });
    }

    let done = 0;
    for (const evt of events) {
      switch (evt.type) {
        case "eval-done":
          done++;
          break;
        case "grade-done": {
          const skill = newSkills.get(evt.skill);
          if (skill) {
            const evalEntry = skill.evalResults.get(evt.evalId) ?? {};
            if (evt.variant === "with-skill") {
              evalEntry.withSkill = { ...evalEntry.withSkill!, pass_rate: evt.passRate } as any;
            } else {
              evalEntry.baseline = { ...evalEntry.baseline!, pass_rate: evt.passRate } as any;
            }
            skill.evalResults.set(evt.evalId, evalEntry);

            // Recalculate skill-level pass rates
            const entries = Array.from(skill.evalResults.values());
            const wsRates = entries.filter(e => e.withSkill?.pass_rate !== undefined).map(e => e.withSkill!.pass_rate);
            const blRates = entries.filter(e => e.baseline?.pass_rate !== undefined).map(e => e.baseline!.pass_rate);
            skill.withSkillPassRate = wsRates.length > 0 ? wsRates.reduce((a, b) => a + b, 0) / wsRates.length : null;
            skill.baselinePassRate = blRates.length > 0 ? blRates.reduce((a, b) => a + b, 0) / blRates.length : null;
          }
          break;
        }
        case "error":
          break;
        case "complete":
          break;
      }
    }

    setSkills(newSkills);
    setCompleted(done);

    const lastEvt = events[events.length - 1];
    if (lastEvt?.type === "complete") setReportPath(lastEvt.reportPath);

    const errs = events.filter(e => e.type === "error").map(e => `${(e as any).skill}#${(e as any).evalId} (${(e as any).variant}): ${(e as any).error}`);
    setErrors(errs);
  }, [events, skillNames]);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Skill Benchmark Harness</Text>
      </Box>

      <ProgressBar completed={completed} total={totalJobs} />

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Box width={24}><Text bold underline>Skill</Text></Box>
          <Box width={14}><Text bold underline>With Skill</Text></Box>
          <Box width={14}><Text bold underline>Baseline</Text></Box>
          <Box width={14}><Text bold underline>Delta</Text></Box>
        </Box>
        {Array.from(skills.values()).map(skill => (
          <SkillRow key={skill.name} skill={skill} />
        ))}
      </Box>

      {errors.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="red">Errors ({errors.length}):</Text>
          {errors.slice(0, 5).map((e, i) => (
            <Text key={i} color="red">  {e.slice(0, 100)}</Text>
          ))}
        </Box>
      )}

      {reportPath && (
        <Box marginTop={1}>
          <Text bold color="green">Complete! Report: {reportPath}</Text>
        </Box>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main engine
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

  // Build flat job queue: each job is one eval variant (with-skill OR baseline)
  const jobs: Job[] = [];
  const skillEvals = new Map<string, { evalsFile: EvalsFile; skillPath: string }>();

  for (const skill of skills) {
    const evalsFile: EvalsFile = JSON.parse(readFileSync(skill.evalsPath, "utf-8"));
    skillEvals.set(skill.name, { evalsFile, skillPath: skill.skillPath });

    for (const evalCase of evalsFile.evals) {
      jobs.push({
        skill: skill.name,
        skillPath: skill.skillPath,
        evalCase,
        variant: "with-skill",
        expectedOutput: evalCase.expected_output,
      });
      jobs.push({
        skill: skill.name,
        skillPath: skill.skillPath,
        evalCase,
        variant: "baseline",
        expectedOutput: evalCase.expected_output,
      });
    }
  }

  // Event log for Ink rendering
  const events: BenchmarkEvent[] = [];
  let renderApp: (() => void) | null = null;

  events.push({ type: "plan", totalJobs: jobs.length });

  const skillNames = skills.map(s => s.name);

  // Eval results storage, keyed by "skill:evalId"
  const evalOutputs = new Map<string, {
    withSkill?: { output: string; tokens: number; duration_ms: number };
    baseline?: { output: string; tokens: number; duration_ms: number };
  }>();

  // Grading results keyed by "skill:evalId"
  const gradingResults = new Map<string, {
    withSkill?: { assertions: AssertionResult[]; pass_rate: number };
    baseline?: { assertions: AssertionResult[]; pass_rate: number };
  }>();

  // Start Ink rendering
  const { rerender, unmount } = render(
    React.createElement(App, { events: [...events], skillNames, totalJobs: jobs.length })
  );

  function emitEvent(evt: BenchmarkEvent) {
    events.push(evt);
    rerender(React.createElement(App, { events: [...events], skillNames, totalJobs: jobs.length }));
  }

  // Job queue with staggered workers (from bitbench pattern)
  const jobQueue = [...jobs];

  async function worker(): Promise<void> {
    while (jobQueue.length > 0) {
      const job = jobQueue.shift();
      if (!job) break;

      const key = `${job.skill}:${job.evalCase.id}`;

      emitEvent({
        type: "eval-start",
        skill: job.skill,
        evalId: job.evalCase.id,
        variant: job.variant,
      });

      try {
        const result = await runClaude(job.evalCase.prompt, {
          model,
          skillPath: job.variant === "with-skill" ? job.skillPath : undefined,
        });

        emitEvent({
          type: "eval-done",
          skill: job.skill,
          evalId: job.evalCase.id,
          variant: job.variant,
          tokens: result.tokens,
          duration_ms: result.duration_ms,
        });

        // Store output
        const entry = evalOutputs.get(key) ?? {};
        if (job.variant === "with-skill") {
          entry.withSkill = result;
        } else {
          entry.baseline = result;
        }
        evalOutputs.set(key, entry);

        // Grade assertions
        const grades = await gradeAssertions(
          result.output,
          job.expectedOutput,
          job.evalCase.assertions,
          model,
        );

        const passRate = grades.filter(a => a.passed).length / grades.length;

        emitEvent({
          type: "grade-done",
          skill: job.skill,
          evalId: job.evalCase.id,
          variant: job.variant,
          passRate,
        });

        // Store grading results
        const gradeEntry = gradingResults.get(key) ?? {};
        if (job.variant === "with-skill") {
          gradeEntry.withSkill = { assertions: grades, pass_rate: passRate };
        } else {
          gradeEntry.baseline = { assertions: grades, pass_rate: passRate };
        }
        gradingResults.set(key, gradeEntry);

      } catch (err) {
        emitEvent({
          type: "error",
          skill: job.skill,
          evalId: job.evalCase.id,
          variant: job.variant,
          error: err instanceof Error ? err.message : String(err),
        });

        emitEvent({
          type: "eval-done",
          skill: job.skill,
          evalId: job.evalCase.id,
          variant: job.variant,
          tokens: 0,
          duration_ms: 0,
        });
      }
    }
  }

  // Staggered worker pool
  const workerCount = Math.min(concurrency, jobQueue.length);
  const workers = Array.from({ length: workerCount }, (_, i) =>
    new Promise<void>(resolve => setTimeout(() => resolve(), i * 200))
      .then(() => worker())
  );
  await Promise.all(workers);

  // ---------------------------------------------------------------------------
  // Build final report (same format as before)
  // ---------------------------------------------------------------------------

  const skillResults: SkillBenchmark[] = [];

  for (const skill of skills) {
    const { evalsFile } = skillEvals.get(skill.name)!;
    const evalResults: EvalRunResult[] = [];

    for (const evalCase of evalsFile.evals) {
      const key = `${skill.name}:${evalCase.id}`;
      const outputs = evalOutputs.get(key);
      const grades = gradingResults.get(key);

      evalResults.push({
        eval_id: evalCase.id,
        prompt: evalCase.prompt,
        with_skill: {
          output: (outputs?.withSkill?.output ?? "").slice(0, 2000),
          tokens: outputs?.withSkill?.tokens ?? 0,
          duration_ms: outputs?.withSkill?.duration_ms ?? 0,
          assertions: grades?.withSkill?.assertions ?? [],
          pass_rate: grades?.withSkill?.pass_rate ?? 0,
        },
        baseline: {
          output: (outputs?.baseline?.output ?? "").slice(0, 2000),
          tokens: outputs?.baseline?.tokens ?? 0,
          duration_ms: outputs?.baseline?.duration_ms ?? 0,
          assertions: grades?.baseline?.assertions ?? [],
          pass_rate: grades?.baseline?.pass_rate ?? 0,
        },
      });
    }

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

    skillResults.push({
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
    });
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

  emitEvent({ type: "complete", reportPath: outPath });

  // Give Ink a moment to render the final state, then unmount
  await new Promise(resolve => setTimeout(resolve, 500));
  unmount();

  // Print summary to stdout for non-TTY consumers
  console.log(`\nBenchmark Complete`);
  console.log(`  Skills tested: ${report.total_skills}`);
  console.log(`  Total evals:   ${report.total_evals}`);
  console.log(`  Overall pass rate (with skill): ${(report.overall_pass_rate * 100).toFixed(1)}%`);
  console.log(`  Overall pass rate (baseline):   ${(report.overall_baseline_pass_rate * 100).toFixed(1)}%`);
  console.log(`  Results written to: ${outPath}`);
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
