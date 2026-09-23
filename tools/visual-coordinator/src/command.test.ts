import { describe, expect, it } from "vitest";
import { defaultWorkflow, parseEnvironment, validateWorkflow, type WorkflowNode } from "./workflow-schema";
import { commandForNode, dispatchIssues, generateNodeCommand, serializeWorkflow, shellQuote, toExportText } from "./command";

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
      model: "gpt-6-sol",
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
    const codex = generateNodeCommand(node("review", { role: "reviewer", provider: "external", lane: "codex", model: "gpt-6-sol", effort: "xhigh", disclosure: "Approved" }), { hostHarness: "grok", nativeController: "grok" });
    expect(codex.readOnly).toBe(true);
    expect(codex.permissions).toBe("read-only");
    expect(codex.prompt).toContain("Do not edit files, run write-capable commands, or alter git state.");
    expect(codex.command).toContain("--sandbox");
    expect(codex.command).toContain("read-only");
    expect(codex.command).toContain("gpt-6-sol");
    expect(codex.command).toContain("model_reasoning_effort=xhigh");
    expect(codex.command).not.toContain("workspace-write");

    const opencode = generateNodeCommand(node("review-opencode", { role: "reviewer", provider: "external", lane: "opencode", disclosure: "Approved" }), { hostHarness: "grok", nativeController: "grok" });
    expect(opencode.readOnly).toBe(true);
    expect(opencode.permissions).toBe("read-only");
    expect(opencode.executable).toBe(false);
    expect(opencode.reason).toContain("no portable read-only CLI flag");

    const variant = generateNodeCommand(
      node("review-opencode", { role: "reviewer", provider: "external", lane: "opencode", model: "openrouter/openai/gpt-6-sol", effort: "xhigh", disclosure: "Approved" }),
      { hostHarness: "grok", nativeController: "grok", readOnlyAgent: "review-readonly" },
    );
    expect(variant.command).toContain("'--variant' 'xhigh'");
    expect(variant.command).toContain("'--agent' 'review-readonly'");

    const medium = generateNodeCommand(
      node("build-opencode", { provider: "external", lane: "opencode", model: "openrouter/openai/gpt-6-sol", effort: "medium", disclosure: "Approved" }),
      { hostHarness: "grok", nativeController: "grok" },
    );
    expect(medium.command).not.toContain("--variant");
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
    models: { codex: ["gpt-6-sol"], grok: ["grok-4.7"] },
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
    const pressured = parseEnvironment({ harness: "codex", lanes: { codex: "available", grok: "available" }, models: { codex: ["gpt-6-sol"], grok: ["grok-4.7"] }, credit_pressure: true, grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh", grok_auth: "grok.com" });
    const workflow = defaultWorkflow(pressured);
    workflow.nodes[1] = { ...workflow.nodes[1], lane: "grok", provider: "external", model: "grok-4.7", disclosure: "Approved external worker" };
    workflow.nodes[2] = { ...workflow.nodes[2], lane: "grok", provider: "external", model: "grok-4.7", disclosure: "pending" };

    const spec = serializeWorkflow(workflow, pressured);
    expect(spec.nodes.find((node) => node.id === "build")).toMatchObject({ shell: true, nativeController: "codex", provider: "xai", disclosure: "Approved external worker" });
    expect(spec.nodes.find((node) => node.id === "build")?.command).toContain("run-grok-worker.sh");
    expect(spec.nodes.find((node) => node.id === "review")).toBeUndefined();
    expect(spec.omissions).toContainEqual(expect.objectContaining({ id: "review", kind: "node" }));
    expect(spec.omissions).toContainEqual(expect.objectContaining({ id: "build-review", kind: "edge" }));
    expect(spec.omissions).toContainEqual(expect.objectContaining({ id: "review-build", kind: "edge" }));
    expect(spec.edges.every((edge) => edge.from !== "review" && edge.to !== "review")).toBe(true);
  });

  it("routes Grok-lane dispatches through the policy wrapper, never a raw grok call", () => {
    const options = { hostHarness: "codex", nativeController: "codex", grokWorker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh", grokAuth: "api" as const };
    const writer = generateNodeCommand(node("grok-writer", { provider: "external", lane: "grok", model: "grok-4.7", effort: "high", ownedPaths: ["src/a.ts"], disclosure: "Approved" }), options);
    const reviewer = generateNodeCommand(node("grok-review", { role: "reviewer", provider: "external", lane: "grok", model: "gpt-6-sol", effort: "xhigh", disclosure: "Approved" }), options);
    const unresolved = generateNodeCommand(node("grok-writer", { provider: "external", lane: "grok", model: "grok-4.7", disclosure: "Approved" }), { hostHarness: "codex", nativeController: "codex" });

    expect(writer.command).toContain("bash '/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh' --auth 'api'");
    expect(writer.command).not.toContain("BOPEN_GROK_AUTH");
    expect(writer.command).not.toContain("BOPEN_GROK_WORKER");
    expect(unresolved).toMatchObject({ executable: false, command: null });
    expect(unresolved.reason).toContain("wrapper was not resolved");
    expect(writer.command).toContain("'--model' 'grok-4.7' '--effort' 'high' '--mode' 'write'");
    expect(writer.command).toContain("'--branch' 'codex/build' '--base-ref' 'origin/dev' '--ownership' 'src/a.ts'");
    expect(writer.command).toContain('--prompt-file "$PROMPT_FILE"');
    expect(writer.command).not.toContain("--credit-pressure");
    expect(writer.command).not.toMatch(/(^|\| )'?grok'? /);
    expect(reviewer.command).toContain("'--mode' 'read'");
    expect(reviewer.command).not.toContain("--branch");
  });

  it("withholds executable records for nodes that fail validation", () => {
    const pressured = parseEnvironment({
      harness: "claude-code",
      lanes: { claude: "available", opencode: "available", codex: "unavailable" },
      models: { claude: ["inherit"], opencode: ["openrouter/openai/gpt-6-sol", "openrouter/xai/grok-4.7"], opencode_effort: ["medium", "high", "xhigh"] },
      credit_pressure: true,
    });
    const workflow = defaultWorkflow(pressured);
    workflow.nodes[1] = { ...workflow.nodes[1], model: "openrouter/xai/grok-4.7", disclosure: "Approved OpenCode worker" };
    expect(workflow.nodes[1]).toMatchObject({ lane: "opencode", provider: "external" });
    expect(generateNodeCommand(workflow.nodes[1], { hostHarness: "claude-code", nativeController: "claude-code" }).command).toContain("'opencode' 'run'");

    const spec = serializeWorkflow(workflow, pressured);
    expect(spec.nodes.map((node) => node.id)).not.toContain("build");
    expect(spec.omissions).toContainEqual(expect.objectContaining({ id: "build", kind: "node", reason: expect.stringContaining("Grok runs only on the Grok lane") }));
    expect(toExportText(workflow, pressured)).not.toContain("'opencode' 'run'");
  });

  it("emits no executable nodes when the workflow itself is invalid", () => {
    const workflow = defaultWorkflow(environment);
    workflow.edges.push({ id: "cycle", source: "review", target: "coordinate", kind: "forward" });

    const spec = serializeWorkflow(workflow, environment);
    expect(spec.nodes).toEqual([]);
    expect(spec.omissions.filter((item) => item.kind === "node").every((item) => item.reason.startsWith("Workflow validation failed:"))).toBe(true);
  });

  it("treats graph-wide issues as graph-wide even when an id collides with a node id", () => {
    const cycle = defaultWorkflow(environment);
    cycle.nodes[0] = { ...cycle.nodes[0], id: "forward-cycle" };
    cycle.edges = [
      { id: "a", source: "forward-cycle", target: "build", kind: "forward" },
      { id: "b", source: "build", target: "forward-cycle", kind: "forward" },
    ];
    expect(serializeWorkflow(cycle, environment).nodes).toEqual([]);

    const brokenEdge = defaultWorkflow(environment);
    brokenEdge.edges.push({ id: "build", source: "build", target: "nowhere", kind: "forward" });
    expect(serializeWorkflow(brokenEdge, environment).nodes).toEqual([]);
  });

  it("exports only the single main session as main-controller", () => {
    const grokHost = parseEnvironment({ harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7"], grok_default: "grok-4.7" }, credit_pressure: true, grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh", grok_auth: "grok.com" });
    const workflow = defaultWorkflow(grokHost);
    const main = workflow.nodes[0];
    workflow.nodes = [main, { ...main, id: "second", title: "Second", disclosure: "Approved xAI dispatch" }];
    workflow.edges = [];

    const spec = serializeWorkflow(workflow, grokHost);
    expect(spec.nodes.map((node) => [node.id, node.actor, node.shell])).toEqual([["coordinate", "main-controller", false], ["second", "maker", true]]);
  });

  it("withholds Grok shell-outs when the detector did not resolve the wrapper", () => {
    const unresolved = parseEnvironment({ harness: "codex", lanes: { codex: "available", grok: "available" }, models: { codex: ["gpt-6-sol"], grok: ["grok-4.7"] }, credit_pressure: true });
    const workflow = defaultWorkflow(unresolved);
    workflow.nodes[1] = { ...workflow.nodes[1], lane: "grok", provider: "external", model: "grok-4.7", disclosure: "Approved external worker" };

    const spec = serializeWorkflow(workflow, unresolved);
    expect(spec.nodes.map((node) => node.id)).not.toContain("build");
    expect(spec.omissions).toContainEqual(expect.objectContaining({ id: "build", reason: expect.stringContaining("wrapper was not resolved") }));
  });

  it("keeps the Grok host main native and main-controller when a custom Grok coordinator comes first", () => {
    const grokHost = parseEnvironment({ harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7", "ox-alpha"], grok_default: "grok-4.7" }, grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh", grok_auth: "grok.com" });
    const workflow = defaultWorkflow(grokHost);
    const main = workflow.nodes[0];
    workflow.nodes = [{ ...main, id: "custom", title: "Custom", model: "ox-alpha", disclosure: "Approved Grok CLI conversion" }, main];
    workflow.edges = [];

    expect(validateWorkflow(workflow, grokHost).filter((issue) => issue.id === "coordinate")).toEqual([]);
    const spec = serializeWorkflow(workflow, grokHost);
    expect(spec.nodes.map((node) => [node.id, node.actor, node.execution])).toEqual([
      ["custom", "maker", "external-provider"],
      ["coordinate", "main-controller", "native-agent"],
    ]);
  });

  it("exports a Grok host main on its configured default as native main-controller", () => {
    const grokHost = parseEnvironment({ harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7", "gpt-6-sol"], grok_default: "gpt-6-sol" } });
    const workflow = defaultWorkflow(grokHost);
    workflow.nodes = [workflow.nodes[0]];
    workflow.edges = [];

    expect(serializeWorkflow(workflow, grokHost).nodes).toEqual([
      expect.objectContaining({ id: "coordinate", actor: "main-controller", execution: "native-agent", model: "gpt-6-sol" }),
    ]);
  });

  it("never treats an edited Coordinate model as the pressure-free Grok main", () => {
    const detected = (extra: Record<string, unknown> = {}) => parseEnvironment({
      harness: "grok",
      lanes: { grok: "available" },
      models: { grok: ["grok-4.7", "gpt-6-sol"], grok_default: "gpt-6-sol" },
      grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh",
      grok_auth: "grok.com",
      ...extra,
    });
    const edited = (environment: ReturnType<typeof detected>) => {
      const workflow = defaultWorkflow(environment);
      workflow.nodes = [{ ...workflow.nodes[0], model: "grok-4.7" }];
      workflow.edges = [];
      return workflow;
    };

    const unpressured = detected();
    expect(validateWorkflow(edited(unpressured), unpressured).map((issue) => issue.message)).toContain(
      "Coordinate uses Grok without usage-credit pressure; route it to gpt-6-sol.",
    );
    expect(serializeWorkflow(edited(unpressured), unpressured).nodes).toEqual([]);

    const pressured = detected({ credit_pressure: true });
    const undisclosed = serializeWorkflow(edited(pressured), pressured);
    expect(undisclosed.nodes).toEqual([]);
    expect(undisclosed.omissions).toContainEqual(expect.objectContaining({ id: "coordinate", kind: "node" }));

    const disclosed = edited(pressured);
    disclosed.nodes[0] = { ...disclosed.nodes[0], disclosure: "Approved xAI dispatch" };
    const [node] = serializeWorkflow(disclosed, pressured).nodes;
    expect(node).toMatchObject({ id: "coordinate", actor: "maker", model: "grok-4.7", shell: true, execution: "external-provider" });
    expect(node.command).toContain("bash '/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh' --auth 'grok.com'");
  });

  it("gates Ready and Copy on the converted dispatch the export would emit", () => {
    const unconfirmed = parseEnvironment({ harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7", "ox-alpha"], grok_default: "grok-4.7" }, grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh" });
    const workflow = defaultWorkflow(unconfirmed);
    const main = workflow.nodes[0];
    workflow.nodes = [{ ...main, id: "custom", title: "Custom", model: "ox-alpha", disclosure: "Approved Grok CLI conversion" }, main];
    workflow.edges = [];

    expect(validateWorkflow(workflow, unconfirmed)).toEqual([]);
    expect(generateNodeCommand(workflow.nodes[0], { hostHarness: "grok", nativeController: "grok" }).executable).toBe(true);
    expect(dispatchIssues(workflow, unconfirmed)).toEqual([
      expect.objectContaining({ id: "custom", scope: "node", message: expect.stringContaining("No Grok auth lane was confirmed") }),
    ]);

    const spec = serializeWorkflow(workflow, unconfirmed);
    const gated = new Set([...validateWorkflow(workflow, unconfirmed), ...dispatchIssues(workflow, unconfirmed)].map((issue) => issue.id));
    for (const node of workflow.nodes) {
      expect(spec.nodes.some((emitted) => emitted.id === node.id)).toBe(!gated.has(node.id));
    }
  });

  it("exports no pressure-free main-controller on a Grok host without an observed default", () => {
    const noDefault = parseEnvironment({ harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7"] }, grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh", grok_auth: "grok.com" });
    const workflow = defaultWorkflow(noDefault);
    workflow.nodes = [{ ...workflow.nodes[0], model: "grok-4.7" }];
    workflow.edges = [];

    const spec = serializeWorkflow(workflow, noDefault);
    expect(spec.nodes).toEqual([]);
    expect(spec.nodes.some((node) => node.actor === "main-controller")).toBe(false);
  });

  it("withholds Grok shell-outs until the detector confirms a Grok auth lane", () => {
    const unconfirmed = parseEnvironment({ harness: "codex", lanes: { codex: "available", grok: "available" }, models: { codex: ["gpt-6-sol"], grok: ["grok-4.7"] }, credit_pressure: true, grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh", grok_auth: "token" });
    expect(unconfirmed.grokAuth).toBeNull();
    const workflow = defaultWorkflow(unconfirmed);
    workflow.nodes[1] = { ...workflow.nodes[1], lane: "grok", provider: "external", model: "grok-4.7", disclosure: "Approved external worker" };

    const spec = serializeWorkflow(workflow, unconfirmed);
    expect(spec.nodes.map((node) => node.id)).not.toContain("build");
    expect(spec.omissions).toContainEqual(expect.objectContaining({ id: "build", reason: expect.stringContaining("No Grok auth lane was confirmed") }));
  });

  it("converts a detected native non-4.7 Grok model to an explicit shell-out", () => {
    const grok = parseEnvironment({ harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7", "ox-alpha"] }, grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh", grok_auth: "grok.com" });
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
