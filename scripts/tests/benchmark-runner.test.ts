import { describe, expect, test } from "bun:test";
import {
  BenchmarkInfrastructureError,
  ClaudeRunError,
  buildClaudeInvocation,
  discoverSkills,
  parseClaudeOutput,
  preflightClaude,
  normalizeTokenCount,
  runClaude,
  validateConcurrency,
  validateTextAblationEvalFile,
  usageTokens,
} from "../benchmark-runner";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "benchmark-runner-test-"));
  const evals = JSON.stringify({ skill_name: "shared", evals: [] });
  mkdirSync(join(root, "skills", "shared", "evals"), { recursive: true });
  writeFileSync(join(root, "skills", "shared", "SKILL.md"), "root skill");
  writeFileSync(join(root, "skills", "shared", "evals", "evals.json"), evals);

  mkdirSync(join(root, "modules", "review", ".claude-plugin"), { recursive: true });
  writeFileSync(join(root, "modules", "review", ".claude-plugin", "plugin.json"), JSON.stringify({ name: "review" }));
  mkdirSync(join(root, "modules", "review", "skills", "shared", "evals"), { recursive: true });
  writeFileSync(join(root, "modules", "review", "skills", "shared", "SKILL.md"), "review skill");
  writeFileSync(join(root, "modules", "review", "skills", "shared", "evals", "evals.json"), evals);

  mkdirSync(join(root, "modules", "other", "skills", "unique", "evals"), { recursive: true });
  writeFileSync(join(root, "modules", "other", "skills", "unique", "SKILL.md"), "unique skill");
  writeFileSync(join(root, "modules", "other", "skills", "unique", "evals", "evals.json"), evals);
  return root;
}

function removeFixture(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

function usageFixture(name: string): unknown {
  const path = join(import.meta.dir, "fixtures", "benchmark", `${name}.json`);
  return (JSON.parse(readFileSync(path, "utf8")) as { usage: unknown }).usage;
}

describe("discoverSkills", () => {
  test("discovers root and module skills and disambiguates duplicate bare names", () => {
    const root = fixtureRoot();
    try {
      const all = discoverSkills(root);
      expect(all.map(skill => skill.qualifiedName)).toEqual([
        "other:unique",
        "review:shared",
        "root:shared",
      ]);
      expect(discoverSkills(root, "review:shared")[0]?.skillPath).toContain("modules/review");
      expect(() => discoverSkills(root, "shared")).toThrow(BenchmarkInfrastructureError);
      expect(() => discoverSkills(root, "shared")).toThrow(/review:shared.*root:shared/);
      expect(discoverSkills(root, "unique")[0]?.qualifiedName).toBe("other:unique");
    } finally {
      removeFixture(root);
    }
  });

  test("follows vendored symlinks only when their target remains inside the repository", () => {
    const root = fixtureRoot();
    const outside = mkdtempSync(join(tmpdir(), "benchmark-runner-outside-"));
    try {
      const internal = join(root, "vendor", "vendored");
      mkdirSync(join(internal, "evals"), { recursive: true });
      writeFileSync(join(internal, "SKILL.md"), "vendored");
      writeFileSync(join(internal, "evals", "evals.json"), JSON.stringify({ skill_name: "vendored", evals: [] }));
      const reviewSkills = join(root, "modules", "review", "skills");
      symlinkSync(internal, join(reviewSkills, "vendored"));
      mkdirSync(join(outside, "leak", "evals"), { recursive: true });
      writeFileSync(join(outside, "leak", "SKILL.md"), "outside");
      writeFileSync(join(outside, "leak", "evals", "evals.json"), JSON.stringify({ skill_name: "leak", evals: [] }));
      symlinkSync(join(outside, "leak"), join(reviewSkills, "leak"));

      const names = discoverSkills(root).map(skill => skill.qualifiedName);
      expect(names).toContain("review:vendored");
      expect(names).not.toContain("review:leak");
    } finally {
      removeFixture(root);
      removeFixture(outside);
    }
  });
});

describe("Claude invocation", () => {
  test("keeps baseline and with-skill argv/cwd/env parity except for the body", () => {
    const env = { CLAUDECODE: "nested", PROVIDER: "test" };
    const baseline = buildClaudeInvocation("same prompt", { model: "claude-test", cwd: "/tmp/empty", env });
    const withSkill = buildClaudeInvocation("same prompt", {
      model: "claude-test",
      cwd: "/tmp/empty",
      env,
      skillContent: "the exact skill body",
    });
    expect(withSkill.cwd).toBe(baseline.cwd);
    expect(withSkill.env).toEqual(baseline.env);
    expect(withSkill.env.CLAUDECODE).toBeUndefined();
    expect(withSkill.args.slice(0, -2)).toEqual(baseline.args);
    expect(withSkill.args.slice(-2)).toEqual(["--append-system-prompt", "the exact skill body"]);
    expect(baseline.args).toContain("--bare");
    expect(baseline.args).toContain("--disable-slash-commands");
    expect(baseline.args).toContain("--strict-mcp-config");
    expect(baseline.args).toContain("--mcp-config");
    expect(baseline.args).toContain("--tools");
    expect(baseline.args).not.toContain("--dangerously-skip-permissions");
  });

  test("runs a mocked CLI and parses only a valid result envelope", async () => {
    const calls: string[] = [];
    const result = await runClaude("prompt", {
      model: "claude-test",
      cwd: "/tmp/empty",
      processRunner: async invocation => {
        calls.push(JSON.stringify(invocation));
        return { stdout: JSON.stringify({ result: "answer", usage: { input_tokens: 2, output_tokens: 3 } }), stderr: "", exitCode: 0 };
      },
    });
    expect(result.output).toBe("answer");
    expect(result.tokens).toBe(5);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0]).cwd).toBe("/tmp/empty");
  });
});

describe("Claude output and preflight", () => {
  test("fails malformed, API-error, and non-zero responses", () => {
    expect(() => parseClaudeOutput("plain text")).toThrow(/malformed JSON/);
    expect(() => parseClaudeOutput(JSON.stringify({ is_error: true, result: "denied" }))).toThrow(/error response/);
    expect(() => parseClaudeOutput("{}", "nope", 2)).toThrow(/exited 2/);
    expect(parseClaudeOutput(JSON.stringify({ result: "ok", usage: { input_tokens: 4, output_tokens: Number.NaN } })).tokens).toBeNull();
  });

  test("preserves unknown usage and counts complete Claude cache telemetry", () => {
    expect(usageTokens(usageFixture("missing"))).toBeNull();
    expect(usageTokens(usageFixture("malformed"))).toBeNull();
    expect(usageTokens(usageFixture("validzero"))).toBe(0);
    expect(usageTokens(usageFixture("completeusage"))).toBe(16);
    expect(usageTokens(usageFixture("cachetokens"))).toBe(27);
    expect(usageTokens({ total_tokens: Number.NaN, input_tokens: 4, output_tokens: 5 })).toBe(9);
    expect(usageTokens({ total_tokens: 8, input_tokens: 4, output_tokens: 5 })).toBe(8);
    expect(usageTokens({ input_tokens: 4 })).toBeNull();
    expect(usageTokens({ output_tokens: 5 })).toBeNull();
    expect(normalizeTokenCount(undefined)).toBeNull();
    expect(normalizeTokenCount(0)).toBe(0);
  });

  test("rejects invalid text-only eval contracts before queue planning", () => {
    const base = {
      skill_name: "fixture",
      evals: [{ id: 1, prompt: "prompt", expected_output: "answer", files: [], assertions: [{id:"a",text:"Contains answer",type:"qualitative"}] }],
    };
    expect(validateTextAblationEvalFile(base).evals).toHaveLength(1);
    expect(() => validateTextAblationEvalFile({...base,evals:[{...base.evals[0],assertions:[]}]})).toThrow(/non-empty assertions/);
    expect(() => validateTextAblationEvalFile({...base,evals:[{...base.evals[0],assertions:[base.evals[0].assertions[0],base.evals[0].assertions[0]]}]})).toThrow(/duplicate assertion id/);
    expect(() => validateTextAblationEvalFile({ ...base, evals: [] })).toThrow(/no eval cases/);
    expect(() => validateTextAblationEvalFile({
      ...base,
      evals: [base.evals[0], { ...base.evals[0] }],
    })).toThrow(/duplicate eval id/);
    expect(() => validateTextAblationEvalFile({
      ...base,
      evals: [{ ...base.evals[0], files: ["artifact.txt"] }],
    })).toThrow(/text-body ablation is text-only/);
  });

  test("rejects zero, fractional, and non-numeric concurrency", () => {
    expect(validateConcurrency("3")).toBe(3);
    expect(() => validateConcurrency(0)).toThrow(/positive integer/);
    expect(() => validateConcurrency(1.5)).toThrow(/positive integer/);
    expect(() => validateConcurrency("fast")).toThrow(/positive integer/);
  });

  test("reports missing auth and unsupported CLI flags before any run", async () => {
    const calls: string[][] = [];
    await expect(preflightClaude({ env: {}, run: async args => {
      calls.push(args);
      return { stdout: "", stderr: "", exitCode: 0 };
    } })).rejects.toThrow(/provider authentication/);
    expect(calls).toHaveLength(0);

    const help = ["--bare", "--append-system-prompt", "--disable-slash-commands", "--strict-mcp-config", "--mcp-config", "--tools", "--output-format", "--json-schema", "--no-session-persistence"].join(" ");
    await preflightClaude({ env: { ANTHROPIC_API_KEY: "test" }, run: async args => {
      calls.push(args);
      return { stdout: args[0] === "which" ? "/usr/bin/claude" : help, stderr: "", exitCode: 0 };
    } });
    expect(calls).toEqual([["which", "claude"], ["claude", "--help"]]);
    await expect(preflightClaude({ env: { ANTHROPIC_API_KEY: "test" }, run: async () => ({ stdout: "--bare", stderr: "", exitCode: 0 }) })).rejects.toThrow(/missing required benchmark flags/);
  });

  test("retains a timeout failure from a mocked process", async () => {
    await expect(runClaude("prompt", {
      model: "claude-test",
      timeoutMs: 5,
      processRunner: async () => new Promise(() => undefined),
    })).rejects.toMatchObject({ timedOut: true });
    expect(ClaudeRunError).toBeDefined();
  });
});
