import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, symlinkSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("CLI retains failed arms and exits nonzero without calling a judge", async () => {
  const root = mkdtempSync(join(tmpdir(), "benchmark-cli-fixture-"));
  try {
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
  echo '--bare --append-system-prompt --disable-slash-commands --strict-mcp-config --mcp-config --tools --output-format --json-schema --no-session-persistence'
else
  echo '{"is_error":true,"result":"Fixture provider failure"}'
fi
`, {mode:0o755});
    const child = Bun.spawn([process.execPath, join(scripts, "benchmark.tsx"), "--skill", "fixture", "--concurrency", "1"], {
      cwd:root, env:{...process.env, PATH:`${bin}:${process.env.PATH}`, ANTHROPIC_API_KEY:"fixture-not-a-real-key"}, stdout:"pipe", stderr:"pipe",
    });
    const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
    expect(code).toBe(1);
    expect(stderr).toContain("Fixture provider failure");
    expect(stdout).not.toContain("Benchmark Complete");
    const report = JSON.parse(readFileSync(join(root, "benchmarks/latest.json"), "utf8"));
    expect(report.skills[0].evals[0].with_skill.run_error).toContain("Fixture provider failure");
    expect(report.skills[0].evals[0].baseline.run_error).toContain("Fixture provider failure");
    expect(report.skills[0].avg_tokens_with_skill).toBeNull();
    expect(report.skills[0].pass_rate).toBe(0);
  } finally { rmSync(root, {recursive:true,force:true}); }
}, 15_000);
