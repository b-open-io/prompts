import { describe, expect, it } from "vitest";
import { defaultWorkflow, parseEnvironment, type WorkflowNode } from "./workflow-schema";
import { commandForNode, generateNodeCommand, serializeWorkflow, shellQuote, toExportText } from "./command";

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

describe("versioned export contract", () => {
  const environment = parseEnvironment({
    harness: "codex",
    lanes: { codex: "available", grok: "available" },
    models: { codex: ["gpt-5.6-luna"], grok: ["grok-4.6"] },
  });

  it("serializes metadata, actors, graph edges, and lifecycle from the live workflow", () => {
    const spec = serializeWorkflow(defaultWorkflow(environment), environment);

    expect(spec.version).toBe(2);
    expect(spec.harness).toBe("codex");
    expect(spec.isolation).toBe("worktree-per-agent");
    expect(spec.isolationPolicy).toMatchObject({ worktreeRoot: "~/code/worktrees", baseRef: "origin/dev" });
    expect(spec.nodes.map((node) => node.id)).toEqual(["coordinate", "build", "review"]);
    expect(spec.nodes[0]).toMatchObject({ kind: "process", actor: "main-controller", execution: "native-agent", shell: false, command: null });
    expect(spec.edges.find((edge) => edge.kind === "reject")).toMatchObject({ failureOwner: "review", failureCondition: "revise", correctionBudget: "workflow", onExhausted: "return-to-main" });
    expect(spec.gates).toEqual([]);
    expect(spec.worktreeLifecycle).toContain("human-approves");
    expect(toExportText(defaultWorkflow(environment), environment)).toContain("\"version\": 2");
  });

  it("emits exact shell-out records and omits an unapproved boundary", () => {
    const workflow = defaultWorkflow(environment);
    workflow.nodes[1] = { ...workflow.nodes[1], lane: "grok", provider: "external", model: "grok-4.6", disclosure: "Approved external worker" };
    workflow.nodes[2] = { ...workflow.nodes[2], lane: "grok", provider: "external", model: "grok-4.6", disclosure: "pending" };

    const spec = serializeWorkflow(workflow, environment);
    expect(spec.nodes.find((node) => node.id === "build")).toMatchObject({ shell: true, nativeController: "codex", provider: "xai", disclosure: "Approved external worker" });
    expect(spec.nodes.find((node) => node.id === "build")?.command).toContain("grok");
    expect(spec.nodes.find((node) => node.id === "review")).toBeUndefined();
    expect(spec.omissions).toContainEqual(expect.objectContaining({ id: "review", kind: "node" }));
    expect(spec.omissions).toContainEqual(expect.objectContaining({ id: "build-review", kind: "edge" }));
    expect(spec.omissions).toContainEqual(expect.objectContaining({ id: "review-build", kind: "edge" }));
    expect(spec.edges.every((edge) => edge.from !== "review" && edge.to !== "review")).toBe(true);
  });

  it("converts a detected native non-4.6 Grok model to an explicit shell-out", () => {
    const grok = parseEnvironment({ harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.6", "ox-alpha"] } });
    const workflow = defaultWorkflow(grok);
    workflow.nodes[0] = { ...workflow.nodes[0], model: "ox-alpha", disclosure: "Approved Grok CLI conversion" };

    const spec = serializeWorkflow(workflow, grok);
    expect(spec.nodes.find((node) => node.id === "coordinate")).toMatchObject({ converted: true, shell: true, execution: "external-provider", model: "ox-alpha" });
  });
});

const generatedNodePrompt = (task: string) => {
  const generated = generateNodeCommand(node("writer", { provider: "external", lane: "opencode", disclosure: "Approved", task }));
  return generated.prompt;
};
