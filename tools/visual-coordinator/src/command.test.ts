import { describe, expect, it } from "vitest";
import { defaultWorkflow, parseEnvironment, restaff, validateWorkflow, type WorkflowNode } from "./workflow-schema";
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
    lanes: { codex: "available", grok: "available", claude: "available" },
    models: { codex: ["gpt-6-sol"], grok: ["grok-4.7"], claude: ["claude-opus-5-5"] },
  });
  const approvedDefault = () => {
    const workflow = defaultWorkflow(environment);
    workflow.nodes[1].disclosure = "Approved Claude Opus worker";
    return workflow;
  };

  it("serializes metadata, actors, graph edges, and lifecycle from the live workflow", () => {
    const spec = serializeWorkflow(approvedDefault(), environment);

    expect(spec.version).toBe(2);
    expect(spec.harness).toBe("codex");
    expect(spec.isolation).toBe("worktree-per-agent");
    expect(spec.isolationPolicy).toMatchObject({ worktreeRoot: "~/code/worktrees", baseRef: "origin/dev" });
    expect(spec.nodes.map((node) => node.id)).toEqual(["coordinate", "build", "review"]);
    expect(spec.nodes[0]).toMatchObject({ kind: "process", actor: "main-controller", execution: "native-agent", shell: false, command: null });
    expect(spec.nodes[1]).toMatchObject({ lane: "claude", model: "claude-opus-5-5", provider: "anthropic", actor: "maker", shell: true });
    expect(spec.nodes[2]).toMatchObject({ lane: "codex", model: "gpt-6-sol", effort: "xhigh", actor: "reviewer" });
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
      models: { claude: ["inherit"], opencode: ["openrouter/anthropic/claude-opus-5-5", "openrouter/openai/gpt-6-sol", "openrouter/xai/grok-4.7"], opencode_effort: ["medium", "high", "xhigh"] },
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

  it("withholds a restaffed step from export until its new provider is approved", () => {
    const build = approvedDefault().nodes[1];
    const options = { hostHarness: "codex", nativeController: "codex" };
    expect(generateNodeCommand(build, options).executable).toBe(true);

    const review = restaff(build, "reviewer", environment);
    const external = { ...review, provider: "external" as const };
    expect(generateNodeCommand(external, options)).toMatchObject({ executable: false, disclosure: null });
    expect(generateNodeCommand(external, options).reason).toContain("disclosure must be approved");

    const approved = generateNodeCommand({ ...external, disclosure: "Approved OpenAI reviewer" }, options);
    expect(approved).toMatchObject({ executable: true, readOnly: true, permissions: "read-only" });
    expect(approved.command).toContain("'--sandbox' 'read-only'");
  });

  it("emits no executable nodes when the workflow itself is invalid", () => {
    const workflow = approvedDefault();
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
    const grokHost = parseEnvironment({ grok_model_targets: { "ox-alpha": "ox-alpha", "gpt-6-sol": "gpt-6-sol" }, grok_model_providers: { "ox-alpha": "openrouter", "gpt-6-sol": "openai" }, harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7", "ox-alpha"], grok_default: "grok-4.7" }, grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh", grok_auth: "grok.com", credit_pressure: true });
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
    const grokHost = parseEnvironment({ grok_model_targets: { "ox-alpha": "ox-alpha", "gpt-6-sol": "gpt-6-sol" }, grok_model_providers: { "ox-alpha": "openrouter", "gpt-6-sol": "openai" }, harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7", "gpt-6-sol"], grok_default: "gpt-6-sol" } });
    const workflow = defaultWorkflow(grokHost);
    workflow.nodes = [workflow.nodes[0]];
    workflow.edges = [];

    expect(serializeWorkflow(workflow, grokHost).nodes).toEqual([
      expect.objectContaining({ id: "coordinate", actor: "main-controller", execution: "native-agent", model: "gpt-6-sol" }),
    ]);
  });

  it("never treats an edited Coordinate model as the pressure-free Grok main", () => {
    const detected = (extra: Record<string, unknown> = {}) => parseEnvironment({ grok_model_targets: { "ox-alpha": "ox-alpha", "gpt-6-sol": "gpt-6-sol" }, grok_model_providers: { "ox-alpha": "openrouter", "gpt-6-sol": "openai" },
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
      "Coordinate uses Grok without usage-credit pressure; route it to claude-opus-5-5.",
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
    const unconfirmed = parseEnvironment({ grok_model_targets: { "ox-alpha": "ox-alpha", "gpt-6-sol": "gpt-6-sol" }, grok_model_providers: { "ox-alpha": "openrouter", "gpt-6-sol": "openai" }, harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7", "ox-alpha"], grok_default: "grok-4.7" }, grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh", credit_pressure: true });
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

  it("labels custom Opus and Sol ids on the Grok CLI by their real provider, never xAI", () => {
    const grokHost = (extra: Record<string, unknown> = {}) => parseEnvironment({ grok_model_targets: { "ox-alpha": "ox-alpha", "gpt-6-sol": "gpt-6-sol", "claude-opus-5-5": "claude-opus-5-5" }, grok_model_providers: { "ox-alpha": "openrouter", "gpt-6-sol": "openai", "claude-opus-5-5": "anthropic" },
      harness: "grok",
      lanes: { grok: "available" },
      models: { grok: ["grok-4.7", "gpt-6-sol", "claude-opus-5-5"], grok_default: "grok-4.7" },
      grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh",
      grok_auth: "grok.com",
      ...extra,
    });
    const disclosed = (environment: ReturnType<typeof grokHost>) => {
      const workflow = defaultWorkflow(environment);
      workflow.nodes.slice(1).forEach((node) => { node.disclosure = "Approved custom dispatch"; });
      return workflow;
    };

    const noBaseUrl = grokHost({ grok_model_providers: {} });
    expect(defaultWorkflow(noBaseUrl).nodes.filter((node) => node.lane === "grok" && node.id !== "coordinate")).toEqual([]);
    const pinnedToGrok = (environment: ReturnType<typeof grokHost>) => {
      const workflow = disclosed(environment);
      workflow.nodes.slice(1).forEach((node) => { node.lane = "grok"; node.model = "gpt-6-sol"; node.provider = "external"; });
      return workflow;
    };
    expect(validateWorkflow(pinnedToGrok(noBaseUrl), noBaseUrl).map((issue) => issue.message)).toContain(
      "Build uses custom id gpt-6-sol, but detect-harness.sh could not resolve its config.toml model and base_url; re-run it before planning.",
    );
    const spec = serializeWorkflow(pinnedToGrok(noBaseUrl), noBaseUrl);
    expect(spec.nodes.filter((node) => node.id !== "coordinate")).toEqual([]);
    expect(toExportText(pinnedToGrok(noBaseUrl), noBaseUrl)).not.toContain("run-grok-worker.sh");

    const configured = grokHost({ grok_model_providers: { "gpt-6-sol": "openai", "claude-opus-5-5": "anthropic" }, credit_pressure: true });
    expect(serializeWorkflow(disclosed(configured), configured).nodes.filter((node) => node.id !== "coordinate").map((node) => [node.model, node.provider])).toEqual([["claude-opus-5-5", "anthropic"], ["gpt-6-sol", "openai"]]);
    expect(serializeWorkflow(disclosed(configured), configured).nodes.find((node) => node.id === "coordinate")).toMatchObject({ actor: "main-controller" });
  });

  it("exports the observed grok-4.6 main as native main-controller and nothing else on 4.6", () => {
    const observed = parseEnvironment({ harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7", "grok-4.6"], grok_default: "grok-4.6" }, credit_pressure: true, grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh", grok_auth: "grok.com" });
    const workflow = defaultWorkflow(observed);
    const main = workflow.nodes[0];
    workflow.nodes = [main, { ...main, id: "second", title: "Second", disclosure: "Approved xAI" }];
    workflow.edges = [];

    const spec = serializeWorkflow(workflow, observed);
    expect(spec.nodes).toEqual([expect.objectContaining({ id: "coordinate", actor: "main-controller", execution: "native-agent", model: "grok-4.6" })]);
    expect(spec.omissions).toContainEqual(expect.objectContaining({ id: "second", reason: expect.stringContaining("pinned to grok-4.7") }));
  });

  it("never exports an unlisted Grok-host model as a native-agent dispatch", () => {
    const empty = (extra: Record<string, unknown> = {}) => parseEnvironment({
      harness: "grok",
      lanes: { grok: "available" },
      models: { grok: [] },
      ...extra,
    });
    const custom = (environment: ReturnType<typeof empty>, changes: Partial<WorkflowNode> = {}) => {
      const workflow = defaultWorkflow(environment);
      workflow.nodes = [{ ...workflow.nodes[0], model: "ox-alpha", provider: "native", ...changes }];
      workflow.edges = [];
      return workflow;
    };

    const bare = empty();
    const workflow = custom(bare);
    const messages = validateWorkflow(workflow, bare).map((issue) => issue.message);
    expect(messages).toContain("Coordinate uses ox-alpha on the Grok lane, but the detector's grok models listing does not show it; re-run detect-harness.sh or choose a listed model.");
    expect(messages).toContain("Coordinate needs an approved external-provider disclosure for this Grok CLI shell-out.");
    expect(dispatchIssues(workflow, bare)).toContainEqual(expect.objectContaining({ id: "coordinate" }));
    expect(serializeWorkflow(workflow, bare).nodes).toEqual([]);

    const ready = empty({ credit_pressure: true, grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh", grok_auth: "grok.com" });
    const disclosed = custom(ready, { disclosure: "Approved Grok CLI dispatch" });
    expect(validateWorkflow(disclosed, ready).map((issue) => issue.message)).toContain(
      "Coordinate uses ox-alpha on the Grok lane, but the detector's grok models listing does not show it; re-run detect-harness.sh or choose a listed model.",
    );
    const spec = serializeWorkflow(disclosed, ready);
    expect(spec.nodes).toEqual([]);
    expect(spec.nodes.some((node) => node.execution === "native-agent")).toBe(false);
  });

  it("holds xAI-backed custom aliases to the Grok credit gate and grok-4.7 pin", () => {
    const grokHost = (extra: Record<string, unknown> = {}) => parseEnvironment({
      harness: "grok",
      lanes: { grok: "available" },
      models: { grok: ["grok-4.7", "ox-alpha", "or-grok", "or-luna"] },
      grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh",
      grok_auth: "grok.com",
      grok_model_providers: { "ox-alpha": "xai", "or-grok": "openrouter", "or-luna": "openai" },
      ...extra,
    });
    const builder = (environment: ReturnType<typeof grokHost>, model: string) => {
      const workflow = defaultWorkflow(environment);
      workflow.nodes = [{ ...workflow.nodes[1], lane: "grok", provider: "external", model, disclosure: "Approved xAI dispatch" }];
      workflow.edges = [];
      return workflow;
    };
    const messages = (environment: ReturnType<typeof grokHost>, model: string) =>
      validateWorkflow(builder(environment, model), environment).map((issue) => issue.message);

    const unpressured = grokHost();
    expect(messages(unpressured, "ox-alpha")).toEqual(expect.arrayContaining([
      "Build uses Grok without usage-credit pressure; route it to claude-opus-5-5.",
      "Build uses ox-alpha, an xAI alias for an unreported model; Grok is pinned to grok-4.7.",
    ]));
    expect(dispatchIssues(builder(unpressured, "ox-alpha"), unpressured)).toEqual([]);
    expect(serializeWorkflow(builder(unpressured, "ox-alpha"), unpressured).nodes).toEqual([]);

    const oldTarget = grokHost({ credit_pressure: true, grok_model_targets: { "ox-alpha": "grok-4.6", "or-grok": "x-ai/grok-4.6", "or-luna": "gpt-5.6-luna" } });
    expect(messages(oldTarget, "ox-alpha")).toContain("Build uses ox-alpha, an xAI alias for grok-4.6; Grok is pinned to grok-4.7.");
    expect(messages(oldTarget, "or-grok")).toContain("Build uses or-grok, an xAI alias for x-ai/grok-4.6; Grok is pinned to grok-4.7.");
    expect(messages(oldTarget, "or-luna")).toContain("Build uses or-luna, an alias for gpt-5.6-luna; GPT-5.6 models are out of policy (build on claude-opus-5-5, review on gpt-6-sol).");
    expect(serializeWorkflow(builder(oldTarget, "ox-alpha"), oldTarget).nodes).toEqual([]);

    const pinned = grokHost({ credit_pressure: true, grok_model_targets: { "ox-alpha": "grok-4.7" } });
    expect(messages(pinned, "ox-alpha")).toEqual([]);
    expect(serializeWorkflow(builder(pinned, "ox-alpha"), pinned).nodes).toEqual([
      expect.objectContaining({ id: "build", provider: "xai", shell: true, command: expect.stringContaining("run-grok-worker.sh") }),
    ]);

    const observed = grokHost({ models: { grok: ["grok-4.7", "ox-alpha"], grok_default: "ox-alpha" }, grok_model_targets: { "ox-alpha": "grok-4.6" } });
    const main = defaultWorkflow(observed).nodes[0];
    expect(main).toMatchObject({ model: "ox-alpha", provider: "native" });
    expect(validateWorkflow({ title: "t", nodes: [main], edges: [] }, observed)).toEqual([]);
  });

  it("keeps provider-qualified xAI ids on the Grok lane behind its gates", () => {
    const host = (extra: Record<string, unknown> = {}) => parseEnvironment({
      harness: "codex",
      lanes: { codex: "available", opencode: "available", grok: "available" },
      models: { codex: ["gpt-6-sol"], opencode: ["gpt-6-sol", "xai/ox-alpha"], grok: ["grok-4.7", "xai/ox-alpha"] },
      grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh",
      grok_auth: "grok.com",
      ...extra,
    });
    const builder = (environment: ReturnType<typeof host>, lane: string) => {
      const workflow = defaultWorkflow(environment);
      workflow.nodes = [{ ...workflow.nodes[1], lane, provider: "external", model: "xai/ox-alpha", disclosure: "Approved xAI dispatch" }];
      workflow.edges = [];
      return workflow;
    };

    for (const environment of [host(), host({ credit_pressure: true })]) {
      const workflow = builder(environment, "opencode");
      expect(validateWorkflow(workflow, environment).map((issue) => issue.message)).toContain("Build uses xai/ox-alpha on the opencode lane; Grok runs only on the Grok lane.");
      expect(serializeWorkflow(workflow, environment).nodes).toEqual([]);
      expect(toExportText(workflow, environment)).not.toContain("opencode run --model xai/");
    }

    const unverified = host({ credit_pressure: true });
    expect(validateWorkflow(builder(unverified, "grok"), unverified).map((issue) => issue.message)).toContain("Build uses xai/ox-alpha; Grok is pinned to grok-4.7.");

    const pinned = host({ credit_pressure: true, grok_model_providers: { "xai/ox-alpha": "xai" }, grok_model_targets: { "xai/ox-alpha": "grok-4.7" } });
    expect(validateWorkflow(builder(pinned, "grok"), pinned)).toEqual([]);
    expect(serializeWorkflow(builder(pinned, "grok"), pinned).nodes).toEqual([
      expect.objectContaining({ id: "build", provider: "xai", shell: true, command: expect.stringContaining("run-grok-worker.sh") }),
    ]);
    expect(toExportText(builder(pinned, "grok"), pinned)).not.toContain("opencode run");

    const unpressured = host({ grok_model_providers: { "xai/ox-alpha": "xai" }, grok_model_targets: { "xai/ox-alpha": "grok-4.7" } });
    expect(validateWorkflow(builder(unpressured, "grok"), unpressured).map((issue) => issue.message)).toContain("Build uses Grok without usage-credit pressure; route it to claude-opus-5-5.");
  });

  it("refuses a listed custom Grok id whose entry names a base_url but no model", () => {
    const environment = parseEnvironment({
      harness: "grok",
      lanes: { grok: "available" },
      models: { grok: ["grok-4.7", "ox-alpha"], grok_default: "grok-4.7" },
      grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh",
      grok_auth: "grok.com",
      credit_pressure: true,
      grok_model_providers: { "ox-alpha": "openrouter" },
    });
    const workflow = defaultWorkflow(environment);
    workflow.nodes = [workflow.nodes[0], { ...workflow.nodes[1], lane: "grok", provider: "external", model: "ox-alpha", disclosure: "Approved custom dispatch" }];
    workflow.edges = [];
    expect(validateWorkflow(workflow, environment).map((issue) => issue.message)).toContain(
      "Build uses custom id ox-alpha, but detect-harness.sh could not resolve its config.toml model and base_url; re-run it before planning.",
    );
    expect(serializeWorkflow(workflow, environment).nodes.map((node) => node.id)).toEqual(["coordinate"]);
    expect(toExportText(workflow, environment)).not.toContain("run-grok-worker.sh");
  });

  it("judges a Grok CLI Sol alias by the model its entry really runs", () => {
    const host = (targets: Record<string, string>, providers: Record<string, string>, extra: Record<string, unknown> = {}) => parseEnvironment({
      harness: "grok",
      lanes: { grok: "available", codex: "available", claude: "available" },
      models: { grok: ["grok-4.7", "gpt-6-sol"], grok_default: "grok-4.7", codex: ["gpt-6-sol"], claude: ["claude-opus-5-5"] },
      grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh",
      grok_auth: "grok.com",
      grok_model_targets: targets,
      grok_model_providers: providers,
      ...extra,
    });
    const onGrok = (environment: ReturnType<typeof host>) => {
      const workflow = defaultWorkflow(environment);
      workflow.nodes.slice(1).forEach((node) => { node.disclosure = "Approved custom dispatch"; });
      workflow.nodes[2] = { ...workflow.nodes[2], lane: "grok", model: "gpt-6-sol", provider: "external" };
      return workflow;
    };

    const muse = host({ "gpt-6-sol": "openrouter/muse-spark-1.3" }, { "gpt-6-sol": "openrouter" }, { credit_pressure: true });
    expect(defaultWorkflow(muse).nodes.slice(1).map((node) => [node.id, node.lane, node.model])).toEqual([["build", "claude", "claude-opus-5-5"], ["review", "codex", "gpt-6-sol"]]);
    const museMessages = validateWorkflow(onGrok(muse), muse).map((issue) => issue.message);
    expect(museMessages).toEqual(expect.arrayContaining([
      "Review uses gpt-6-sol, but its Grok CLI entry runs openrouter/muse-spark-1.3, not gpt-6-sol.",
      "Review must review on gpt-6-sol at xhigh.",
    ]));
    expect(serializeWorkflow(onGrok(muse), muse).nodes.map((node) => node.id)).toEqual(["coordinate", "build"]);

    const xai = host({ "gpt-6-sol": "gpt-6-sol" }, { "gpt-6-sol": "xai" });
    expect(defaultWorkflow(xai).nodes.slice(1).map((node) => node.lane)).toEqual(["claude", "codex"]);
    expect(validateWorkflow(onGrok(xai), xai).map((issue) => issue.message)).toEqual(expect.arrayContaining([
      "Review uses Grok without usage-credit pressure; route it to gpt-6-sol.",
      "Review must review on gpt-6-sol at xhigh.",
    ]));

    const real = host({ "gpt-6-sol": "gpt-6-sol" }, { "gpt-6-sol": "openai" }, { credit_pressure: true });
    expect(validateWorkflow(onGrok(real), real)).toEqual([]);
    expect(serializeWorkflow(onGrok(real), real).nodes.filter((node) => node.id !== "coordinate").map((node) => node.provider)).toEqual(["anthropic", "openai"]);
  });

  it("never resolves models or lanes through Object.prototype", () => {
    const environment = parseEnvironment({
      harness: "grok",
      lanes: { grok: "available" },
      models: { grok: ["grok-4.7", "constructor", "toString"], grok_default: "grok-4.7" },
      grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh",
      grok_auth: "grok.com",
      credit_pressure: true,
    });
    const workflow = defaultWorkflow(environment);
    workflow.nodes = [workflow.nodes[0], ...["constructor", "toString"].map((model) => ({
      ...workflow.nodes[1], id: model, title: model, lane: "grok", provider: "external" as const, model, disclosure: "Approved custom dispatch",
    })), { ...workflow.nodes[1], id: "odd-lane", title: "Odd lane", lane: "constructor", model: "gpt-6-sol" }];
    workflow.edges = [];
    const messages = validateWorkflow(workflow, environment).map((issue) => issue.message);
    expect(messages).toEqual(expect.arrayContaining([
      "constructor uses custom id constructor, but detect-harness.sh could not resolve its config.toml model and base_url; re-run it before planning.",
      "toString uses custom id toString, but detect-harness.sh could not resolve its config.toml model and base_url; re-run it before planning.",
      "Odd lane uses an undetected lane: constructor.",
    ]));
    const spec = serializeWorkflow(workflow, environment);
    expect(spec.nodes.map((node) => node.id)).toEqual(["coordinate"]);
    expect(spec.nodes.every((node) => typeof node.provider === "string")).toBe(true);
  });

  it("exports a Grok CLI id's configured provider before assuming xAI", () => {
    const host = (providers: Record<string, string>) => parseEnvironment({
      harness: "codex",
      lanes: { codex: "available", grok: "available" },
      models: { codex: ["gpt-6-sol"], grok: ["grok-4.7", "openrouter/x-ai/grok-4.7"] },
      grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh",
      grok_auth: "grok.com",
      credit_pressure: true,
      grok_model_targets: { "openrouter/x-ai/grok-4.7": "openrouter/x-ai/grok-4.7" },
      grok_model_providers: providers,
    });
    const builder = (environment: ReturnType<typeof host>, model: string) => {
      const workflow = defaultWorkflow(environment);
      workflow.nodes = [{ ...workflow.nodes[1], lane: "grok", provider: "external", model, disclosure: "Approved xAI dispatch" }];
      workflow.edges = [];
      return workflow;
    };

    const routed = host({ "openrouter/x-ai/grok-4.7": "openrouter" });
    expect(validateWorkflow(builder(routed, "openrouter/x-ai/grok-4.7"), routed)).toEqual([]);
    expect(serializeWorkflow(builder(routed, "openrouter/x-ai/grok-4.7"), routed).nodes).toEqual([
      expect.objectContaining({ id: "build", provider: "openrouter", shell: true, command: expect.stringContaining("run-grok-worker.sh") }),
    ]);
    const text = toExportText(builder(routed, "openrouter/x-ai/grok-4.7"), routed);
    expect(text).toContain("SHELL-OUT · openrouter/openrouter/x-ai/grok-4.7");
    expect(text).not.toContain("xai/openrouter/x-ai/grok-4.7");

    const bare = host({});
    expect(serializeWorkflow(builder(bare, "grok-4.7"), bare).nodes).toEqual([expect.objectContaining({ id: "build", provider: "xai" })]);
  });

  it("limits the observed-main Grok exemption to grok-4.6", () => {
    const observed = (grok_default: string, extra: Record<string, unknown> = {}) => {
      const environment = parseEnvironment({
        harness: "grok",
        lanes: { grok: "available" },
        models: { grok: ["grok-4.7", grok_default], grok_default },
        grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh",
        grok_auth: "grok.com",
        ...extra,
      });
      const workflow = defaultWorkflow(environment);
      workflow.nodes = [workflow.nodes[0]];
      workflow.edges = [];
      return { environment, workflow };
    };

    for (const version of ["grok-4.5", "grok-5.0"]) {
      const { environment, workflow } = observed(version);
      expect(workflow.nodes[0]).toMatchObject({ model: version, provider: "native" });
      expect(validateWorkflow(workflow, environment).map((issue) => issue.message)).toContain(`Coordinate uses ${version}; Grok is pinned to grok-4.7.`);
      expect(serializeWorkflow(workflow, environment).nodes).toEqual([]);
    }

    const alias = observed("ox-old", { grok_model_providers: { "ox-old": "xai" }, grok_model_targets: { "ox-old": "grok-4.5" } });
    expect(validateWorkflow(alias.workflow, alias.environment).map((issue) => issue.message)).toContain(
      "Coordinate uses ox-old, an xAI alias for grok-4.5; Grok is pinned to grok-4.7.",
    );

    const unpressured = observed("grok-4.7");
    expect(validateWorkflow(unpressured.workflow, unpressured.environment).map((issue) => issue.message)).toEqual([
      "Coordinate uses Grok without usage-credit pressure; route it to claude-opus-5-5.",
    ]);
    expect(serializeWorkflow(unpressured.workflow, unpressured.environment).nodes).toEqual([]);

    for (const allowed of [observed("grok-4.6"), observed("grok-4.7", { credit_pressure: true }), observed("ox-legacy", { grok_model_providers: { "ox-legacy": "xai" }, grok_model_targets: { "ox-legacy": "grok-4.6" } })]) {
      expect(validateWorkflow(allowed.workflow, allowed.environment)).toEqual([]);
      expect(serializeWorkflow(allowed.workflow, allowed.environment).nodes).toEqual([
        expect.objectContaining({ id: "coordinate", actor: "main-controller", execution: "native-agent" }),
      ]);
    }
  });

  it("rejects an observed main whose alias points at a GPT-5.6 model", () => {
    const observed = parseEnvironment({
      harness: "grok",
      lanes: { grok: "available" },
      models: { grok: ["grok-4.7", "ox-luna"], grok_default: "ox-luna" },
      grok_model_providers: { "ox-luna": "openai" },
      grok_model_targets: { "ox-luna": "gpt-5.6-luna" },
      grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh",
      grok_auth: "grok.com",
    });
    const workflow = defaultWorkflow(observed);
    workflow.nodes = [workflow.nodes[0]];
    workflow.edges = [];

    expect(workflow.nodes[0]).toMatchObject({ model: "ox-luna", provider: "native" });
    expect(validateWorkflow(workflow, observed).map((issue) => issue.message)).toContain(
      "Coordinate uses ox-luna, an alias for gpt-5.6-luna; GPT-5.6 models are out of policy (build on claude-opus-5-5, review on gpt-6-sol).",
    );
    expect(serializeWorkflow(workflow, observed).nodes).toEqual([]);
  });

  it("refuses a listed custom Grok id whose config entry the detector could not resolve", () => {
    const unresolved = parseEnvironment({
      harness: "grok",
      lanes: { grok: "available" },
      models: { grok: ["grok-4.7", "ox-alpha"], grok_default: "grok-4.7" },
      credit_pressure: true,
      grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh",
      grok_auth: "grok.com",
    });
    const workflow = defaultWorkflow(unresolved);
    workflow.nodes = [workflow.nodes[0], { ...workflow.nodes[1], lane: "grok", provider: "external", model: "ox-alpha", disclosure: "Approved" }];
    workflow.edges = [];

    expect(validateWorkflow(workflow, unresolved).map((issue) => issue.message)).toContain(
      "Build uses custom id ox-alpha, but detect-harness.sh could not resolve its config.toml model and base_url; re-run it before planning.",
    );
    expect(serializeWorkflow(workflow, unresolved).nodes.map((node) => node.id)).toEqual(["coordinate"]);
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
    const grok = parseEnvironment({ grok_model_targets: { "ox-alpha": "ox-alpha", "gpt-6-sol": "gpt-6-sol" }, grok_model_providers: { "ox-alpha": "openrouter", "gpt-6-sol": "openai" }, harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7", "ox-alpha"] }, grok_worker: "/opt/orchestra/skills/coordinator/scripts/run-grok-worker.sh", grok_auth: "grok.com" });
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
