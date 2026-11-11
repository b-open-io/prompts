import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, symlinkSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/** Run the CLI on one fixture skill whose provider always fails; `existing` seeds benchmarks/latest.json. */
async function runFailingFixture(root: string, existing?: object) {
  const scripts = join(root, "scripts");
  const bin = join(root, "bin");
  const skill = join(root, "skills", "fixture");
  for (const dir of [scripts, bin, join(skill, "evals"), join(root, ".claude-plugin")]) mkdirSync(dir, {recursive: true});
  for (const name of ["benchmark.tsx", "benchmark-runner.ts", "benchmark-cache.ts", "benchmark-grade.ts"])
    copyFileSync(resolve(import.meta.dir, "..", name), join(scripts, name));
  symlinkSync(resolve(import.meta.dir, "../node_modules"), join(scripts, "node_modules"));
  writeFileSync(join(root, ".claude-plugin/plugin.json"), JSON.stringify({name:"fixture-plugin"}));
  writeFileSync(join(skill, "SKILL.md"), "Answer the fixture prompt.");
  writeFileSync(join(skill, "evals/evals.json"), JSON.stringify({skill_name:"fixture",evals:[{id:1,prompt:"Fixture",expected_output:"Answer",files:[],assertions:[{id:"answer",text:"Contains answer",type:"qualitative"}]}]}));
  writeFileSync(join(bin, "claude"), `#!/bin/sh
if [ "$1" = "--help" ]; then
  echo '--bare --append-system-prompt --disable-slash-commands --strict-mcp-config --mcp-config --tools --output-format --json-schema --no-session-persistence --effort'
else
  printf '%s\n' "$*" >> "$BENCHMARK_ARGS_LOG"
  echo '{"is_error":true,"result":"Fixture provider failure"}'
fi
`, {mode:0o755});
  if (existing) {
    mkdirSync(join(root, "benchmarks"), {recursive: true});
    writeFileSync(join(root, "benchmarks/latest.json"), JSON.stringify(existing));
  }
  const child = Bun.spawn([process.execPath, join(scripts, "benchmark.tsx"), "--skill", "fixture", "--concurrency", "1"], {
    cwd:root, env:{...process.env, PATH:`${bin}:${process.env.PATH}`, ANTHROPIC_API_KEY:"fixture-not-a-real-key", BENCHMARK_ARGS_LOG:join(root, "claude-args.log")}, stdout:"pipe", stderr:"pipe",
  });
  const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
  const report = JSON.parse(readFileSync(join(root, "benchmarks/latest.json"), "utf8"));
  return {code, stdout, stderr, report};
}

test("CLI retains failed arms and exits nonzero without calling a judge", async () => {
  const root = mkdtempSync(join(tmpdir(), "benchmark-cli-fixture-"));
  try {
    const {code, stdout, stderr, report} = await runFailingFixture(root);
    expect(code).toBe(1);
    expect(stderr).toContain("Fixture provider failure");
    expect(stdout).not.toContain("Benchmark Complete");
    expect(report.skills[0].evals[0].with_skill.run_error).toContain("Fixture provider failure");
    expect(report.skills[0].evals[0].baseline.run_error).toContain("Fixture provider failure");
    expect(report.skills[0].avg_tokens_with_skill).toBeNull();
    expect(report.skills[0].pass_rate).toBe(0);
    // The default model is Haiku 5.5, so both arms pin the tier's low effort.
    expect(report.effort).toBe("low");
    const calls = readFileSync(join(root, "claude-args.log"), "utf8").trim().split("\n").filter((line) => line.includes("--model"));
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const call of calls) expect(call).toContain("--effort low");
  } finally { rmSync(root, {recursive:true,force:true}); }
}, 15_000);

test("a --skill merge that keeps skills from another model or effort labels the aggregate mixed", async () => {
  const root = mkdtempSync(join(tmpdir(), "benchmark-cli-fixture-"));
  try {
    const kept = {skill_id: "other", skill_name: "other", model: "claude-haiku-5-5", effort: "medium", eval_count: 1, pass_rate: 1, baseline_pass_rate: 0, evals: []};
    const {report} = await runFailingFixture(root, {model: "claude-haiku-5-5", effort: "medium", skills: [kept]});
    expect(report.skills.map((skill: {skill_id: string}) => skill.skill_id).sort()).toEqual(["fixture-plugin:fixture", "other"]);
    // Same model, different effort: only the effort label becomes mixed; per-skill provenance stays exact.
    expect(report.model).toBe("claude-haiku-5-5");
    expect(report.effort).toBe("mixed");
    expect(report.skills.find((skill: {skill_id: string}) => skill.skill_id === "other").effort).toBe("medium");
  } finally { rmSync(root, {recursive:true,force:true}); }
}, 15_000);

const skillIds = (report: {skills: {skill_id: string}[]}) => report.skills.map((skill) => skill.skill_id).sort();

test("a --skill merge that keeps a skill from another model at the same effort labels only the model mixed", async () => {
  const root = mkdtempSync(join(tmpdir(), "benchmark-cli-fixture-"));
  try {
    const kept = {skill_id: "other", skill_name: "other", model: "claude-sonnet-5-5", effort: "low", eval_count: 1, pass_rate: 1, baseline_pass_rate: 0, evals: []};
    const {report} = await runFailingFixture(root, {model: "claude-sonnet-5-5", effort: "low", skills: [kept]});
    expect(skillIds(report)).toEqual(["fixture-plugin:fixture", "other"]);
    expect(report.model).toBe("mixed");
    expect(report.effort).toBe("low");
    expect(report.skills.find((skill: {skill_id: string}) => skill.skill_id === "other").model).toBe("claude-sonnet-5-5");
  } finally { rmSync(root, {recursive:true,force:true}); }
}, 15_000);

test("a --skill merge whose kept skills all match the run's model and effort keeps a single label", async () => {
  const root = mkdtempSync(join(tmpdir(), "benchmark-cli-fixture-"));
  try {
    const kept = {skill_id: "other", skill_name: "other", model: "claude-haiku-5-5", effort: "low", eval_count: 1, pass_rate: 1, baseline_pass_rate: 0, evals: []};
    const {report} = await runFailingFixture(root, {model: "claude-haiku-5-5", effort: "low", skills: [kept]});
    expect(skillIds(report)).toEqual(["fixture-plugin:fixture", "other"]);
    expect(report.model).toBe("claude-haiku-5-5");
    expect(report.effort).toBe("low");
  } finally { rmSync(root, {recursive:true,force:true}); }
}, 15_000);

test("rerunning the only mismatched skill turns a mixed aggregate back into a single label", async () => {
  const root = mkdtempSync(join(tmpdir(), "benchmark-cli-fixture-"));
  try {
    // The stale fixture entry is replaced by this run; the kept skill already matches it.
    const stale = {skill_id: "fixture-plugin:fixture", skill_name: "fixture", model: "claude-sonnet-5-5", effort: "medium", eval_count: 1, pass_rate: 1, baseline_pass_rate: 0, evals: []};
    const kept = {skill_id: "other", skill_name: "other", model: "claude-haiku-5-5", effort: "low", eval_count: 1, pass_rate: 1, baseline_pass_rate: 0, evals: []};
    const {report} = await runFailingFixture(root, {model: "mixed", effort: "mixed", skills: [stale, kept]});
    expect(skillIds(report)).toEqual(["fixture-plugin:fixture", "other"]);
    expect(report.skills.find((skill: {skill_id: string}) => skill.skill_id === "fixture-plugin:fixture").model).toBe("claude-haiku-5-5");
    expect(report.model).toBe("claude-haiku-5-5");
    expect(report.effort).toBe("low");
  } finally { rmSync(root, {recursive:true,force:true}); }
}, 15_000);
