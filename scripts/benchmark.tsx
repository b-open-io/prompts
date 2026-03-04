#!/usr/bin/env bun
/**
 * Skill Benchmark Harness (Ink UI)
 *
 * Discovers skills with evals/evals.json, runs each eval prompt
 * with and without the skill using `claude -p`, grades assertions
 * via LLM-as-judge, and writes results to benchmarks/latest.json.
 *
 * Features:
 *   - Live Ink terminal UI with progress bar and per-eval status
 *   - Parallel workers (--concurrency N, default 2)
 *   - Resume/cache: skips already-completed eval variants
 *   - Grading counted in progress (not invisible)
 *
 * Usage:
 *   bun run benchmark
 *   bun run benchmark --skill geo-optimizer
 *   bun run benchmark --model claude-sonnet-4-6
 *   bun run benchmark --concurrency 4
 */

import React, { useReducer } from "react";
import { render, Box, Text } from "ink";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { createHash } from "crypto";
import { join, resolve } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Assertion {
  id: string;
  text: string;
  type: string;
}

interface EvalCase {
  id: number;
  prompt: string;
  expected_output: string;
  files: string[];
  assertions: Assertion[];
}

interface EvalsFile {
  skill_name: string;
  evals: EvalCase[];
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
    cached: boolean;
  };
  baseline: {
    output: string;
    tokens: number;
    duration_ms: number;
    assertions: AssertionResult[];
    pass_rate: number;
    cached: boolean;
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
// Job types — run and grade are separate so grading shows in progress
// ---------------------------------------------------------------------------

type Variant = "with-skill" | "baseline";

interface RunJob {
  kind: "run";
  skill: string;
  skillPath: string;
  evalCase: EvalCase;
  variant: Variant;
}

interface GradeJob {
  kind: "grade";
  skill: string;
  evalId: number;
  variant: Variant;
  output: string;
  expectedOutput: string;
  assertions: Assertion[];
}

type Job = RunJob | GradeJob;

// ---------------------------------------------------------------------------
// Cache — keyed by SHA1(model + skill + evalId + variant + prompt)
// ---------------------------------------------------------------------------

interface CacheEntry {
  output: string;
  tokens: number;
  duration_ms: number;
  assertions: AssertionResult[];
  pass_rate: number;
}

function cacheKey(model: string, skill: string, evalId: number, variant: Variant, prompt: string): string {
  return createHash("sha1")
    .update(JSON.stringify({ model, skill, evalId, variant, prompt }))
    .digest("hex")
    .slice(0, 16);
}

function readCache(cacheDir: string, key: string): CacheEntry | null {
  const path = join(cacheDir, `${key}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as CacheEntry;
  } catch {
    return null;
  }
}

function writeCache(cacheDir: string, key: string, entry: CacheEntry): void {
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
  writeFileSync(join(cacheDir, `${key}.json`), JSON.stringify(entry, null, 2));
}

// ---------------------------------------------------------------------------
// Ink state — useReducer for O(1) incremental updates (not event replay)
// ---------------------------------------------------------------------------

type EvalStatus = "pending" | "running" | "done" | "cached" | "error";

interface EvalState {
  skill: string;
  evalId: number;
  variant: Variant;
  status: EvalStatus;
  passRate: number | null;
  tokens: number;
  duration_ms: number;
}

interface AppState {
  completedOps: number;
  totalOps: number;
  evals: Map<string, EvalState>; // key: `${skill}:${evalId}:${variant}`
  errors: string[];
  reportPath: string | null;
}

type AppAction =
  | { type: "PLAN"; totalOps: number; evalKeys: { skill: string; evalId: number; variant: Variant }[] }
  | { type: "RUN_START"; skill: string; evalId: number; variant: Variant }
  | { type: "RUN_DONE"; skill: string; evalId: number; variant: Variant; tokens: number; duration_ms: number; cached: boolean }
  | { type: "GRADE_DONE"; skill: string; evalId: number; variant: Variant; passRate: number }
  | { type: "ERROR"; skill: string; evalId: number; variant: Variant; error: string }
  | { type: "COMPLETE"; reportPath: string };

function evalKey(skill: string, evalId: number, variant: Variant): string {
  return `${skill}:${evalId}:${variant}`;
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "PLAN": {
      const evals = new Map<string, EvalState>();
      for (const { skill, evalId, variant } of action.evalKeys) {
        evals.set(evalKey(skill, evalId, variant), {
          skill, evalId, variant, status: "pending", passRate: null, tokens: 0, duration_ms: 0,
        });
      }
      return { ...state, totalOps: action.totalOps, evals };
    }
    case "RUN_START": {
      const evals = new Map(state.evals);
      const k = evalKey(action.skill, action.evalId, action.variant);
      const existing = evals.get(k)!;
      evals.set(k, { ...existing, status: "running" });
      return { ...state, evals };
    }
    case "RUN_DONE": {
      const evals = new Map(state.evals);
      const k = evalKey(action.skill, action.evalId, action.variant);
      const existing = evals.get(k)!;
      evals.set(k, {
        ...existing,
        status: action.cached ? "cached" : "done",
        tokens: action.tokens,
        duration_ms: action.duration_ms,
      });
      return { ...state, evals, completedOps: state.completedOps + 1 };
    }
    case "GRADE_DONE": {
      const evals = new Map(state.evals);
      const k = evalKey(action.skill, action.evalId, action.variant);
      const existing = evals.get(k)!;
      evals.set(k, { ...existing, passRate: action.passRate });
      return { ...state, evals, completedOps: state.completedOps + 1 };
    }
    case "ERROR": {
      const evals = new Map(state.evals);
      const k = evalKey(action.skill, action.evalId, action.variant);
      const existing = evals.get(k);
      if (existing) evals.set(k, { ...existing, status: "error" });
      return {
        ...state,
        evals,
        completedOps: state.completedOps + 1,
        errors: [...state.errors, `${action.skill}#${action.evalId}(${action.variant}): ${action.error.slice(0, 120)}`],
      };
    }
    case "COMPLETE":
      return { ...state, reportPath: action.reportPath };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Ink components
// ---------------------------------------------------------------------------

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const cols = typeof process.stdout.columns === "number" ? process.stdout.columns : 80;
  const width = Math.max(20, Math.min(60, cols - 30));
  const ratio = total > 0 ? Math.min(completed / total, 1) : 0;
  const filled = Math.round(width * ratio);
  const empty = width - filled;
  const percent = Math.floor(ratio * 100);
  return (
    <Text>
      [<Text color="green">{"█".repeat(filled)}</Text>
      <Text color="gray">{"░".repeat(empty)}</Text>] <Text color="cyan">{percent}%</Text>{" "}
      (<Text color="green">{completed}</Text>/<Text color="white">{total}</Text>)
    </Text>
  );
}

function statusSymbol(status: EvalStatus): string {
  switch (status) {
    case "pending": return "·";
    case "running": return "⟳";
    case "done": return "✓";
    case "cached": return "↩";
    case "error": return "✗";
  }
}

function statusColor(status: EvalStatus): string {
  switch (status) {
    case "pending": return "gray";
    case "running": return "cyan";
    case "done": return "green";
    case "cached": return "blue";
    case "error": return "red";
  }
}

function rateColor(rate: number): string {
  if (rate >= 0.8) return "green";
  if (rate >= 0.5) return "yellow";
  return "red";
}

function EvalRow({ ev }: { ev: EvalState }) {
  const sym = statusSymbol(ev.status);
  const col = statusColor(ev.status);
  const rateStr = ev.passRate !== null ? `${(ev.passRate * 100).toFixed(0)}%` : "    ";
  return (
    <Box>
      <Box width={3}><Text color={col}>{sym}</Text></Box>
      <Box width={22}><Text>{ev.skill.slice(0, 20)}</Text></Box>
      <Box width={4}><Text color="gray">#{ev.evalId}</Text></Box>
      <Box width={12}><Text color="gray">{ev.variant === "with-skill" ? "skill" : "base "}</Text></Box>
      <Box width={7}>
        {ev.passRate !== null
          ? <Text color={rateColor(ev.passRate)}>{rateStr}</Text>
          : <Text color="gray">{ev.status === "running" ? "..." : "---"}</Text>
        }
      </Box>
      {ev.duration_ms > 0 && (
        <Text color="gray"> {(ev.duration_ms / 1000).toFixed(1)}s</Text>
      )}
      {ev.status === "cached" && <Text color="blue"> (cached)</Text>}
    </Box>
  );
}

function App({ state }: { state: AppState }) {
  const evalList = Array.from(state.evals.values());

  // Per-skill summary (aggregate pass rates)
  const skillMap = new Map<string, { wsRates: number[]; blRates: number[] }>();
  for (const ev of evalList) {
    if (!skillMap.has(ev.skill)) skillMap.set(ev.skill, { wsRates: [], blRates: [] });
    if (ev.passRate !== null) {
      const s = skillMap.get(ev.skill)!;
      if (ev.variant === "with-skill") s.wsRates.push(ev.passRate);
      else s.blRates.push(ev.passRate);
    }
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">◆ Skill Benchmark Harness</Text>
      </Box>

      <ProgressBar completed={state.completedOps} total={state.totalOps} />

      {/* Skill summary table */}
      {skillMap.size > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Box width={22}><Text bold underline color="white">Skill</Text></Box>
            <Box width={12}><Text bold underline color="white">W/ Skill</Text></Box>
            <Box width={12}><Text bold underline color="white">Baseline</Text></Box>
            <Box width={10}><Text bold underline color="white">Delta</Text></Box>
          </Box>
          {Array.from(skillMap.entries()).map(([skill, { wsRates, blRates }]) => {
            const ws = wsRates.length > 0 ? wsRates.reduce((a, b) => a + b, 0) / wsRates.length : null;
            const bl = blRates.length > 0 ? blRates.reduce((a, b) => a + b, 0) / blRates.length : null;
            const delta = ws !== null && bl !== null ? ws - bl : null;
            return (
              <Box key={skill}>
                <Box width={22}><Text bold>{skill.slice(0, 20)}</Text></Box>
                <Box width={12}>
                  {ws !== null
                    ? <Text color={rateColor(ws)}>{(ws * 100).toFixed(0)}%</Text>
                    : <Text color="gray">...</Text>
                  }
                </Box>
                <Box width={12}>
                  {bl !== null
                    ? <Text color={rateColor(bl)}>{(bl * 100).toFixed(0)}%</Text>
                    : <Text color="gray">...</Text>
                  }
                </Box>
                <Box width={10}>
                  {delta !== null
                    ? <Text color={delta > 0 ? "green" : delta < 0 ? "red" : "gray"}>{delta > 0 ? "+" : ""}{(delta * 100).toFixed(0)}%</Text>
                    : <Text color="gray">---</Text>
                  }
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Per-eval detail */}
      <Box marginTop={1} flexDirection="column">
        <Text bold color="gray">── evals ──────────────────────────────</Text>
        {evalList.map(ev => (
          <EvalRow key={evalKey(ev.skill, ev.evalId, ev.variant)} ev={ev} />
        ))}
      </Box>

      {state.errors.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold color="red">Errors:</Text>
          {state.errors.map((e, i) => (
            <Text key={i} color="red">  {e}</Text>
          ))}
        </Box>
      )}

      {state.reportPath ? (
        <Box marginTop={1}>
          <Text bold color="green">✓ Complete → {state.reportPath}</Text>
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text color="gray">Running… (Ctrl+C to abort, results cached so far will resume)</Text>
        </Box>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs(): { skill?: string; model: string; concurrency: number } {
  const args = process.argv.slice(2);
  let skill: string | undefined;
  let model = "claude-sonnet-4-6";
  let concurrency = 2;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--skill" && args[i + 1]) skill = args[++i];
    else if (args[i] === "--model" && args[i + 1]) model = args[++i];
    else if (args[i] === "--concurrency" && args[i + 1]) concurrency = parseInt(args[++i], 10);
  }

  return { skill, model, concurrency };
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

function discoverSkills(repoRoot: string, filter?: string) {
  const dir = join(repoRoot, "skills");
  return readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && (!filter || e.name === filter))
    .map(e => ({
      name: e.name,
      evalsPath: join(dir, e.name, "evals", "evals.json"),
      skillPath: join(dir, e.name),
    }))
    .filter(s => existsSync(s.evalsPath));
}

// ---------------------------------------------------------------------------
// Claude CLI runner
// ---------------------------------------------------------------------------

async function runClaude(
  prompt: string,
  opts: { model: string; skillPath?: string },
): Promise<{ output: string; tokens: number; duration_ms: number }> {
  const args = [
    "claude", "-p", prompt,
    "--model", opts.model,
    "--output-format", "json",
    "--dangerously-skip-permissions",
  ];

  if (opts.skillPath) {
    const skillMdPath = join(opts.skillPath, "SKILL.md");
    if (existsSync(skillMdPath)) {
      args.push("--append-system-prompt", readFileSync(skillMdPath, "utf-8"));
    }
  }

  const start = performance.now();
  const env = { ...process.env };
  delete env.CLAUDECODE;

  const proc = Bun.spawn(args, { stdout: "pipe", stderr: "pipe", env });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  const duration_ms = Math.round(performance.now() - start);

  if (exitCode !== 0) {
    throw new Error(`claude exited ${exitCode}: ${stderr.slice(0, 400)}`);
  }

  try {
    const parsed = JSON.parse(stdout);
    const output = parsed.result ?? parsed.content ?? parsed.text ?? stdout;
    const tokens = parsed.usage?.total_tokens
      ?? (parsed.usage?.input_tokens + parsed.usage?.output_tokens)
      ?? 0;
    return { output, tokens, duration_ms };
  } catch {
    return { output: stdout, tokens: 0, duration_ms };
  }
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
  const gradingPrompt = `You are a strict evaluator. Grade whether the OUTPUT satisfies each assertion.

EXPECTED OUTPUT DESCRIPTION:
${expectedOutput}

ACTUAL OUTPUT:
${output.slice(0, 8000)}

ASSERTIONS:
${assertions.map((a, i) => `${i + 1}. [${a.id}] ${a.text}`).join("\n")}

Respond with ONLY a JSON array. Each element: {"id":"...","passed":true/false,"reasoning":"one sentence"}

JSON array:`;

  const result = await runClaude(gradingPrompt, { model });
  try {
    const jsonMatch = result.output.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("no JSON array in grader response");
    const parsed: { id: string; passed: boolean; reasoning: string }[] = JSON.parse(jsonMatch[0]);
    return assertions.map(a => {
      const grade = parsed.find(g => g.id === a.id);
      return { id: a.id, text: a.text, passed: grade?.passed ?? false, reasoning: grade?.reasoning ?? "missing" };
    });
  } catch {
    return assertions.map(a => ({ id: a.id, text: a.text, passed: false, reasoning: "grading parse error" }));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const repoRoot = resolve(import.meta.dir, "..");
  const { skill: filterSkill, model, concurrency } = parseArgs();
  const cacheDir = join(repoRoot, "benchmarks", "cache");

  // Pre-flight
  const which = Bun.spawn(["which", "claude"], { stdout: "pipe", stderr: "pipe" });
  if (await which.exited !== 0) {
    console.error("Error: `claude` CLI not found in PATH.");
    process.exit(1);
  }

  const skills = discoverSkills(repoRoot, filterSkill);
  if (skills.length === 0) {
    console.error(filterSkill
      ? `No evals found for skill "${filterSkill}".`
      : "No skills with evals/evals.json found."
    );
    process.exit(1);
  }

  // Load all evals and plan jobs
  const skillEvalMap = new Map<string, { evalsFile: EvalsFile; skillPath: string }>();
  const runJobs: RunJob[] = [];
  const evalKeys: { skill: string; evalId: number; variant: Variant }[] = [];

  for (const skill of skills) {
    const evalsFile: EvalsFile = JSON.parse(readFileSync(skill.evalsPath, "utf-8"));
    skillEvalMap.set(skill.name, { evalsFile, skillPath: skill.skillPath });

    for (const evalCase of evalsFile.evals) {
      for (const variant of ["with-skill", "baseline"] as Variant[]) {
        runJobs.push({ kind: "run", skill: skill.name, skillPath: skill.skillPath, evalCase, variant });
        evalKeys.push({ skill: skill.name, evalId: evalCase.id, variant });
      }
    }
  }

  // totalOps = runJobs * 2 (each run + each grade)
  const totalOps = runJobs.length * 2;

  // Set up Ink with useReducer
  const initState: AppState = {
    completedOps: 0,
    totalOps,
    evals: new Map(),
    errors: [],
    reportPath: null,
  };

  let dispatch!: (action: AppAction) => void;

  function RootApp() {
    const [state, d] = useReducer(reducer, initState);
    dispatch = d;
    return <App state={state} />;
  }

  const { rerender, unmount } = render(<RootApp />);
  const triggerRerender = () => rerender(<RootApp />);

  // Plan
  dispatch({ type: "PLAN", totalOps, evalKeys });
  triggerRerender();

  // Result storage
  const runResults = new Map<string, { output: string; tokens: number; duration_ms: number; cached: boolean }>();
  const gradeResults = new Map<string, { assertions: AssertionResult[]; pass_rate: number }>();

  // Shared mutable job queue (run jobs first, grade jobs pushed as runs complete)
  const jobQueue: Job[] = [...runJobs];

  async function worker(): Promise<void> {
    while (true) {
      const job = jobQueue.shift();
      if (!job) break;

      if (job.kind === "run") {
        const key = `${job.skill}:${job.evalCase.id}:${job.variant}`;
        const ck = cacheKey(model, job.skill, job.evalCase.id, job.variant, job.evalCase.prompt);
        const cached = readCache(cacheDir, ck);

        if (cached) {
          // Cached: skip run, skip grading (both counts done)
          runResults.set(key, { ...cached, cached: true });
          gradeResults.set(key, { assertions: cached.assertions, pass_rate: cached.pass_rate });
          dispatch({ type: "RUN_DONE", skill: job.skill, evalId: job.evalCase.id, variant: job.variant, tokens: cached.tokens, duration_ms: cached.duration_ms, cached: true });
          dispatch({ type: "GRADE_DONE", skill: job.skill, evalId: job.evalCase.id, variant: job.variant, passRate: cached.pass_rate });
          triggerRerender();
        } else {
          dispatch({ type: "RUN_START", skill: job.skill, evalId: job.evalCase.id, variant: job.variant });
          triggerRerender();

          try {
            const result = await runClaude(job.evalCase.prompt, {
              model,
              skillPath: job.variant === "with-skill" ? job.skillPath : undefined,
            });

            runResults.set(key, { ...result, cached: false });
            dispatch({ type: "RUN_DONE", skill: job.skill, evalId: job.evalCase.id, variant: job.variant, tokens: result.tokens, duration_ms: result.duration_ms, cached: false });
            triggerRerender();

            // Push grade job to front so it runs next (keeps workers busy)
            jobQueue.unshift({
              kind: "grade",
              skill: job.skill,
              evalId: job.evalCase.id,
              variant: job.variant,
              output: result.output,
              expectedOutput: job.evalCase.expected_output,
              assertions: job.evalCase.assertions,
            });
          } catch (err) {
            dispatch({ type: "ERROR", skill: job.skill, evalId: job.evalCase.id, variant: job.variant, error: err instanceof Error ? err.message : String(err) });
            // Consume grade op too
            dispatch({ type: "GRADE_DONE", skill: job.skill, evalId: job.evalCase.id, variant: job.variant, passRate: 0 });
            triggerRerender();
          }
        }
      } else {
        // Grade job
        const key = `${job.skill}:${job.evalId}:${job.variant}`;

        try {
          const grades = await gradeAssertions(job.output, job.expectedOutput, job.assertions, model);
          const passRate = grades.filter(a => a.passed).length / grades.length;

          gradeResults.set(key, { assertions: grades, pass_rate: passRate });

          // Cache the full result (run + grade together)
          const runResult = runResults.get(key);
          if (runResult && !runResult.cached) {
            const ck = cacheKey(model, job.skill, job.evalId, job.variant,
              // We need the prompt — retrieve from evals
              gradeResults.has(key) ? job.expectedOutput : "");
            // Find the original prompt from skillEvalMap
            const { evalsFile } = skillEvalMap.get(job.skill)!;
            const evalCase = evalsFile.evals.find(e => e.id === job.evalId);
            if (evalCase) {
              const ckCorrect = cacheKey(model, job.skill, job.evalId, job.variant, evalCase.prompt);
              writeCache(cacheDir, ckCorrect, {
                output: runResult.output,
                tokens: runResult.tokens,
                duration_ms: runResult.duration_ms,
                assertions: grades,
                pass_rate: passRate,
              });
            }
          }

          dispatch({ type: "GRADE_DONE", skill: job.skill, evalId: job.evalId, variant: job.variant, passRate });
          triggerRerender();
        } catch (err) {
          dispatch({ type: "ERROR", skill: job.skill, evalId: job.evalId, variant: job.variant, error: err instanceof Error ? err.message : String(err) });
          triggerRerender();
        }
      }
    }
  }

  // Staggered workers (bitbench pattern)
  const workerCount = Math.min(concurrency, jobQueue.length);
  await Promise.all(
    Array.from({ length: workerCount }, (_, i) =>
      new Promise<void>(r => setTimeout(r, i * 300)).then(() => worker())
    )
  );

  // ---------------------------------------------------------------------------
  // Build final report
  // ---------------------------------------------------------------------------

  const skillResults: SkillBenchmark[] = [];

  for (const skill of skills) {
    const { evalsFile } = skillEvalMap.get(skill.name)!;
    const evalResults: EvalRunResult[] = [];

    for (const evalCase of evalsFile.evals) {
      const wsKey = `${skill.name}:${evalCase.id}:with-skill`;
      const blKey = `${skill.name}:${evalCase.id}:baseline`;
      const wsRun = runResults.get(wsKey);
      const blRun = runResults.get(blKey);
      const wsGrade = gradeResults.get(wsKey);
      const blGrade = gradeResults.get(blKey);

      evalResults.push({
        eval_id: evalCase.id,
        prompt: evalCase.prompt,
        with_skill: {
          output: (wsRun?.output ?? "").slice(0, 2000),
          tokens: wsRun?.tokens ?? 0,
          duration_ms: wsRun?.duration_ms ?? 0,
          assertions: wsGrade?.assertions ?? [],
          pass_rate: wsGrade?.pass_rate ?? 0,
          cached: wsRun?.cached ?? false,
        },
        baseline: {
          output: (blRun?.output ?? "").slice(0, 2000),
          tokens: blRun?.tokens ?? 0,
          duration_ms: blRun?.duration_ms ?? 0,
          assertions: blGrade?.assertions ?? [],
          pass_rate: blGrade?.pass_rate ?? 0,
          cached: blRun?.cached ?? false,
        },
      });
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const wsPassRates = evalResults.map(e => e.with_skill.pass_rate);
    const blPassRates = evalResults.map(e => e.baseline.pass_rate);

    skillResults.push({
      skill_name: skill.name,
      skill_path: `skills/${skill.name}`,
      eval_count: evalResults.length,
      pass_rate: Math.round(avg(wsPassRates) * 1000) / 1000,
      baseline_pass_rate: Math.round(avg(blPassRates) * 1000) / 1000,
      avg_tokens_with_skill: Math.round(avg(evalResults.map(e => e.with_skill.tokens))),
      avg_tokens_baseline: Math.round(avg(evalResults.map(e => e.baseline.tokens))),
      avg_duration_ms_with_skill: Math.round(avg(evalResults.map(e => e.with_skill.duration_ms))),
      avg_duration_ms_baseline: Math.round(avg(evalResults.map(e => e.baseline.duration_ms))),
      evals: evalResults,
    });
  }

  const totalEvals = skillResults.reduce((s, sk) => s + sk.eval_count, 0);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const report: BenchmarkReport = {
    generated_at: new Date().toISOString(),
    model,
    total_skills: skillResults.length,
    total_evals: totalEvals,
    overall_pass_rate: Math.round(avg(skillResults.map(s => s.pass_rate)) * 1000) / 1000,
    overall_baseline_pass_rate: Math.round(avg(skillResults.map(s => s.baseline_pass_rate)) * 1000) / 1000,
    skills: skillResults,
  };

  const outDir = join(repoRoot, "benchmarks");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "latest.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");

  dispatch({ type: "COMPLETE", reportPath: outPath });
  triggerRerender();

  await new Promise(r => setTimeout(r, 600));
  unmount();

  console.log(`\nBenchmark Complete`);
  console.log(`  Skills: ${report.total_skills}  Evals: ${report.total_evals}`);
  console.log(`  With skill: ${(report.overall_pass_rate * 100).toFixed(1)}%  Baseline: ${(report.overall_baseline_pass_rate * 100).toFixed(1)}%`);
  console.log(`  Report: ${outPath}`);
}

main().catch(err => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
