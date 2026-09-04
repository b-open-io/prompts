import { describe, expect, it } from "vitest";
import { defaultWorkflow, type WorkflowNode } from "./workflow-schema";
import { commandForNode, generateNodeCommand, shellQuote } from "./command";

const node = (id: string, changes: Partial<WorkflowNode> = {}): WorkflowNode => ({
  ...defaultWorkflow().nodes[1],
  id,
  ...changes,
});

describe("visual coordinator command generation", () => {
  it("describes native work as native metadata and includes the prepared worktree handoff", () => {
    const generated = generateNodeCommand(node("builder"), { hostHarness: "codex" });

    expect(generated.execution).toBe("native-agent");
    expect(generated.provider).toBe("native");
    expect(generated.nativeController).toBe("codex");
    expect(generated.executable).toBe(true);
    expect(generated.command).toBeNull();
    expect(generated.prompt).toContain("You are already inside the prepared worktree.");
    expect(generated.prompt).toContain("Repository root: {repo}");
    expect(generated.prompt).toContain("Task worktree: ~/code/worktrees/{repo}-build");
    expect(generated.prompt).toContain("Do not create or switch branches. Do not commit, push, merge, or clean up.");
  });

  it("makes an external writer executable only after disclosure and safely quotes its prompt", () => {
    const hostile = "review $(touch /tmp/pwned) `echo nope` 'quoted'\nnext";
    const generated = generateNodeCommand(node("external-writer", {
      provider: "external",
      lane: "codex",
      model: "openai/gpt-5.6-luna",
      disclosure: "Approved external Codex worker",
      task: hostile,
    }), { hostHarness: "grok", nativeController: "grok" });

    expect(generated.execution).toBe("external-provider");
    expect(generated.executable).toBe(true);
    expect(generated.command).toContain("--sandbox");
    expect(generated.command).toContain("workspace-write");
    expect(generated.command).toContain("printf '%s\\n'");
    expect(generated.command).toContain(shellQuote(generated.prompt));
    expect(generated.prompt).toContain(hostile);
    expect(generated.prompt).toContain("Do not create or switch branches.");
  });

  it("never emits an executable command for an external node without approved disclosure", () => {
    for (const disclosure of [undefined, "", "pending", "denied", "required"]) {
      const generated = generateNodeCommand(node("undisclosed", {
        provider: "external",
        lane: "codex",
        disclosure,
      }), { hostHarness: "grok", nativeController: "grok" });

      expect(generated.executable).toBe(false);
      expect(generated.command).toBeNull();
      expect(generated.reason).toContain("disclosure");
    }
  });

  it("forces reviewer nodes into a read-only boundary", () => {
    const codex = generateNodeCommand(node("review", { role: "reviewer", provider: "external", lane: "codex", disclosure: "Approved" }), { hostHarness: "grok", nativeController: "grok" });
    expect(codex.readOnly).toBe(true);
    expect(codex.permissions).toBe("read-only");
    expect(codex.prompt).toContain("Do not edit files, run write-capable commands, or alter git state.");
    expect(codex.command).toContain("--sandbox");
    expect(codex.command).toContain("read-only");
    expect(codex.command).not.toContain("workspace-write");

    const opencode = generateNodeCommand(node("review-opencode", { role: "reviewer", provider: "external", lane: "opencode", disclosure: "Approved" }), { hostHarness: "grok", nativeController: "grok" });
    expect(opencode.readOnly).toBe(true);
    expect(opencode.permissions).toBe("read-only");
    expect(opencode.executable).toBe(false);
    expect(opencode.reason).toContain("no portable read-only CLI flag");
  });

  it("requires complete worktree metadata and never runs anything", () => {
    const missing = node("missing-worktree", { worktree: undefined });
    const generated = generateNodeCommand(missing);
    expect(generated.executable).toBe(false);
    expect(generated.command).toBeNull();
    expect(generated.reason).toContain("prepared-worktree");
  });

  it("quotes shell arguments without allowing shell syntax to escape", () => {
    const value = "$(rm -rf /tmp/nope) `echo bad` ' and\nnew line";
    const quoted = shellQuote(value);
    expect(quoted.startsWith("'")).toBe(true);
    expect(quoted.endsWith("'")).toBe(true);
    expect(quoted).toContain("'\"'\"'");
    const generated = commandForNode(node("writer", { provider: "external", lane: "opencode", disclosure: "Approved", task: value }), { hostHarness: "grok", nativeController: "grok" });
    expect(generated).toContain(shellQuote(generatedNodePrompt(value)));
  });
});

const generatedNodePrompt = (task: string) => {
  const generated = generateNodeCommand(node("writer", { provider: "external", lane: "opencode", disclosure: "Approved", task }));
  return generated.prompt;
};
