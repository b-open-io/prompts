import { describe, expect, it } from "vitest";
import { defaultWorkflow, destination, groupModels, laneStatus, nextNodeId, parseEnvironment, parseSeed, reapprove, resolvedModel, restaff, runsNatively, runsOpus, runsSol, toPlan, validateWorkflow } from "./workflow-schema";

const liveCodexEnvironment = () => parseEnvironment({
  harness: "codex",
  lanes: { claude: "available", codex: "available", grok: "available", opencode: "unavailable" },
  models: {
    claude: ["claude-opus-5-5", "sonnet", "haiku"],
    claude_effort: ["low", "medium", "high", "max"],
    codex: ["gpt-6-sol", "gpt-5.6-luna"],
    codex_effort: ["minimal", "low", "medium", "high", "xhigh"],
    codex_default: "gpt-6-sol",
    grok: ["grok-4.7", "grok-4.6"],
    grok_effort: ["minimal", "low", "medium", "high", "xhigh"],
    opencode: [],
  },
});

describe("workflow schema", () => {
  it("ships a valid example with prepared worktrees", () => {
    const workflow = defaultWorkflow(liveCodexEnvironment());
    workflow.nodes[1].disclosure = "Approved Claude Opus worker";

    expect(validateWorkflow(workflow, liveCodexEnvironment())).toEqual([]);
    expect(workflow.nodes.every((node) => node.worktree?.root === "~/code/worktrees")).toBe(true);
    expect(workflow.nodes.every((node) => node.worktree?.taskPath.startsWith("~/code/worktrees/"))).toBe(true);
    expect(workflow.nodes.find((node) => node.role === "builder")).toMatchObject({
      lane: "claude",
      provider: "external",
      model: "claude-opus-5-5",
    });
    expect(workflow.nodes.find((node) => node.role === "reviewer")).toMatchObject({
      model: "gpt-6-sol",
      effort: "xhigh",
    });
  });

  it("detects missing targets and duplicate handoffs", () => {
    const workflow = defaultWorkflow();
    workflow.edges.push({ id: "duplicate", source: "coordinate", target: "build", kind: "forward" });
    workflow.edges.push({ id: "missing", source: "build", target: "nowhere", kind: "forward" });

    const messages = validateWorkflow(workflow).map((issue) => issue.message);
    expect(messages).toContain("Duplicate forward edge from coordinate to build.");
    expect(messages).toContain("Edge missing points to a missing node.");
  });

  it("rejects forward cycles while allowing explicit revision loops", () => {
    const workflow = defaultWorkflow();
    workflow.edges.push({ id: "review-coordinate", source: "review", target: "coordinate", kind: "forward" });

    expect(validateWorkflow(workflow)).toContainEqual({
      scope: "graph",
      id: "forward-cycle",
      message: "Forward handoffs form a cycle; use a reject or memory edge instead.",
    });
  });

  it("keeps untrusted seed copy as inert text", () => {
    const hostile = '<img src=x onerror="window.__owned=true">';
    const workflow = parseSeed({
      title: hostile,
      nodes: defaultWorkflow().nodes.map((node) => ({ ...node, task: hostile })),
      edges: defaultWorkflow().edges,
    });

    expect(workflow.title).toBe(hostile);
    expect(toPlan(workflow)).toContain(hostile);
  });

  it("normalizes malformed seed fields instead of crashing consumers", () => {
    const workflow = parseSeed({ title: 42, nodes: [{ id: "broken", ownedPaths: null, position: { x: "nope" } }], edges: [{ id: "bad" }] });

    expect(workflow.nodes[0].ownedPaths).toEqual([]);
    expect(workflow.nodes[0].position).toEqual({ x: 120, y: 120 });
    expect(workflow.edges[0]).toMatchObject({ source: "", target: "", kind: "forward" });
    expect(() => toPlan(workflow)).not.toThrow();
  });

  it("never reuses a surviving node id after deletion", () => {
    expect(nextNodeId([{ id: "step-2" }, { id: "step-3" }])).toBe("step-4");
  });

  it("normalizes a detector environment without trusting malformed fields", () => {
    const environment = parseEnvironment({
      harness: "claude-code",
      lanes: { claude: { available: true }, codex: false, grok: "available" },
      models: {
        claude: { models: [" sonnet ", 42, "sonnet"], complete: true },
        claude_effort: ["low", "not-an-effort", "max"],
        grok: ["grok-4.6", "grok-4.7"],
      },
      caps: { live_children: -1, agent_budget_default: "not-a-number" },
      roster: [null, { id: "reviewer" }, "ignored"],
    });

    expect(environment.harness).toBe("claude-code");
    expect(environment.hostLane).toBe("claude");
    expect(environment.simulationOnly).toBe(false);
    expect(environment.lanes.claude.models).toEqual(["sonnet"]);
    expect(environment.lanes.claude.efforts).toEqual(["low", "max"]);
    expect(environment.lanes.grok.models).toEqual(["grok-4.7"]);
    expect(environment.caps).toEqual({ liveChildren: null, agentBudgetDefault: 0 });
    expect(environment.roster).toEqual([{ id: "reviewer" }]);
  });

  it("blocks unavailable lanes, empty models, and models outside a complete inventory", () => {
    const environment = liveCodexEnvironment();
    const workflow = defaultWorkflow(environment);
    workflow.nodes[0].lane = "opencode";
    workflow.nodes[0].model = "";
    workflow.nodes[1].model = "anthropic/claude";

    const messages = validateWorkflow(workflow, environment).map((issue) => issue.message);
    expect(messages).toContain("Coordinate uses OpenCode, which is unavailable.");
    expect(messages).toContain("Coordinate needs a model.");
    expect(messages).toContain("Build uses a model not offered by Claude Code: anthropic/claude.");
  });

  it("permits an explicit custom model only when a lane inventory is incomplete", () => {
    const environment = parseEnvironment({
      harness: "opencode",
      lanes: { opencode: "available" },
      models: { opencode: [], opencode_effort: ["low", "medium", "high", "xhigh"] },
    });
    const workflow = defaultWorkflow(environment);
    workflow.nodes[0].lane = "opencode";
    workflow.nodes[0].provider = "native";
    workflow.nodes[0].model = "openrouter/anthropic/claude-opus-5-5";
    workflow.nodes[0].disclosure = undefined;
    workflow.nodes.slice(1).forEach((node) => {
      node.lane = "opencode";
      node.provider = "native";
      node.model = node.role === "reviewer" ? "openai/gpt-6-sol" : "anthropic/claude-opus-5-5";
    });

    expect(validateWorkflow(workflow, environment)).toEqual([]);
    workflow.nodes[0].model = "openai/gpt-6-astra";
    expect(validateWorkflow(workflow, environment).map((issue) => issue.message)).toEqual([
      "Coordinate is the main session on openai/gpt-6-astra, which is not claude-opus-5-5 or gpt-6-sol from its own provider.",
    ]);
  });

  it("rejects an obviously foreign native model even when the inventory is missing", () => {
    const environment = parseEnvironment({ harness: "codex", lanes: { codex: "available" }, models: {} });
    const workflow = defaultWorkflow(environment);
    workflow.nodes[0].model = "claude-opus";

    expect(validateWorkflow(workflow, environment).map((issue) => issue.message)).toContain(
      "Coordinate pairs a native Codex lane with a foreign model: claude-opus.",
    );
  });

  it("requires disclosure before converting a detected non-4.7 native Grok model", () => {
    const environment = parseEnvironment({ grok_model_targets: { "ox-alpha": "ox-alpha", "gpt-6-sol": "gpt-6-sol" }, grok_model_providers: { "ox-alpha": "openrouter", "gpt-6-sol": "openai" },
      harness: "grok",
      lanes: { grok: "available", codex: "available", claude: "available" },
      models: { grok: ["grok-4.7", "ox-alpha"], codex: ["gpt-6-sol"], codex_effort: ["medium", "high", "xhigh"], claude: ["claude-opus-5-5"] },
    });
    const workflow = defaultWorkflow(environment);
    workflow.nodes[0].model = "ox-alpha";
    workflow.nodes.slice(1).forEach((node) => { node.disclosure = "Approved external worker"; });

    expect(validateWorkflow(workflow, environment).map((issue) => issue.message)).toContain(
      "Coordinate needs an approved external-provider disclosure for this Grok CLI shell-out.",
    );
    workflow.nodes[0].disclosure = "Approved Grok CLI conversion";
    // A converted coordinator is a dispatch, so it is held to the coding-worker pin too.
    expect(validateWorkflow(workflow, environment).map((issue) => issue.message)).toEqual([
      "Coordinate uses ox-alpha, which is not the coding worker; build on claude-opus-5-5.",
    ]);
  });

  it("holds every coordinator except the observed main to the coding-worker pin", () => {
    const environment = parseEnvironment({
      harness: "codex",
      lanes: { codex: "available", claude: "available" },
      models: { codex: ["gpt-6-sol", "gpt-6-astra"], codex_default: "gpt-6-sol", codex_effort: ["medium", "high", "xhigh"], claude: ["claude-opus-5-5", "sonnet"] },
    });
    const workflow = defaultWorkflow(environment);
    workflow.nodes.slice(1).forEach((node) => { node.disclosure = "Approved external worker"; });
    expect(validateWorkflow(workflow, environment)).toEqual([]);
    const extra = { ...workflow.nodes[0], id: "plan", title: "Plan", lane: "claude", provider: "external" as const, model: "sonnet", disclosure: "Approved" };
    workflow.nodes.push(extra);
    expect(validateWorkflow(workflow, environment).map((issue) => issue.message)).toEqual([
      "Plan uses sonnet, which is not the coding worker; build on claude-opus-5-5.",
    ]);
    extra.model = "claude-opus-5-5";
    expect(validateWorkflow(workflow, environment)).toEqual([]);
  });

  describe("host-first worker defaults", () => {
    const soloSolLast = { codex: ["gpt-5.6-sol", "gpt-6-sol"], codex_effort: ["medium", "high", "xhigh"] };
    const workerNodes = (harness: string, lanes: Record<string, string>, models: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
      defaultWorkflow(parseEnvironment({ harness, lanes, models, ...extra })).nodes;

    it("builds natively on Claude Opus on a Claude host and reviews on GPT-6 Sol", () => {
      const nodes = workerNodes("claude-code", { claude: "available", codex: "available" }, {
        claude: ["opus", "sonnet", "claude-opus-5-5", "inherit"],
        ...soloSolLast,
      });

      expect(nodes[0]).toMatchObject({ lane: "claude", provider: "native", model: "inherit" });
      expect(nodes[1]).toMatchObject({ lane: "claude", provider: "native", model: "claude-opus-5-5" });
      expect(nodes[2]).toMatchObject({ lane: "codex", provider: "external", model: "gpt-6-sol", effort: "xhigh" });
      expect(nodes.some((node) => /gpt-5\.6-sol/.test(node.model))).toBe(false);
    });

    it("keeps a Grok host's workers off Grok without usage-credit pressure", () => {
      const nodes = workerNodes("grok", { grok: "available", codex: "available", claude: "available" }, { grok: ["grok-4.7"], claude: ["claude-opus-5-5"], ...soloSolLast });

      expect(nodes[1]).toMatchObject({ lane: "claude", model: "claude-opus-5-5" });
      expect(nodes[2]).toMatchObject({ lane: "codex", model: "gpt-6-sol", effort: "xhigh" });
    });

    it("skips a superseded Sol that heads the Codex inventory", () => {
      const nodes = workerNodes("codex", { codex: "available", claude: "available" }, { ...soloSolLast, claude: ["claude-opus-5-5"] });

      expect(nodes.map((node) => node.model)).toEqual(["", "claude-opus-5-5", "gpt-6-sol"]);
      expect(nodes.map((node) => node.provider)).toEqual(["native", "external", "native"]);
    });

    it("falls through to an OpenCode lane for each role when the preferred CLI is unavailable", () => {
      const lanes = { claude: "unavailable", codex: "unavailable", opencode: "available" };
      const models = { opencode: ["openai/gpt-6-sol", "anthropic/claude-opus-5-5"] };
      const nodes = workerNodes("codex", lanes, models, { opencode_read_only_agent: "review" });

      expect(nodes[1]).toMatchObject({ lane: "opencode", model: "anthropic/claude-opus-5-5" });
      expect(nodes[2]).toMatchObject({ lane: "opencode", model: "openai/gpt-6-sol" });
      // Without a read-only agent an OpenCode review could never be exported, so it is not staffed there.
      expect(workerNodes("codex", lanes, models)[2]).toMatchObject({ lane: "codex", model: "gpt-6-sol" });
    });

    it("reports a missing Claude Opus lane instead of substituting another model", () => {
      const environment = parseEnvironment({ harness: "codex", lanes: { codex: "available", claude: "unavailable" }, models: { codex: ["gpt-6-sol"] } });
      const nodes = defaultWorkflow(environment).nodes;

      expect(nodes[1]).toMatchObject({ lane: "claude", model: "claude-opus-5-5" });
      expect(validateWorkflow(defaultWorkflow(environment), environment).map((issue) => issue.message)).toContain("Build uses Claude Code, which is unavailable.");
    });
  });

  it("rejects superseded, off-policy Grok, Sol-built, and non-xhigh review models", () => {
    const environment = parseEnvironment({
      harness: "codex",
      lanes: { codex: "available", grok: "available", claude: "available" },
      models: { codex: { models: ["gpt-6-sol"], complete: false }, grok: { models: ["grok-4.7"], complete: false }, claude: { models: [], complete: false } },
    });
    const workflow = defaultWorkflow(environment);
    workflow.nodes[1] = { ...workflow.nodes[1], lane: "grok", provider: "external", model: "grok-4.7", disclosure: "Approved" };
    workflow.nodes[2] = { ...workflow.nodes[2], effort: "medium" };
    workflow.nodes.push(
      { ...workflow.nodes[1], id: "old-sol", title: "Old Sol", lane: "codex", provider: "native", model: "gpt-5.6-sol" },
      { ...workflow.nodes[1], id: "old-grok", title: "Old Grok", model: "grok-4.6" },
      { ...workflow.nodes[1], id: "sol-build", title: "Sol build", lane: "codex", provider: "native", model: "gpt-6-sol" },
      { ...workflow.nodes[1], id: "opus", title: "Opus", lane: "claude", model: "claude-opus-5-5" },
    );

    const issues = validateWorkflow(workflow, environment);
    const messages = issues.map((issue) => issue.message);
    expect(messages).toContain("Build uses Grok without usage-credit pressure; route it to claude-opus-5-5.");
    expect(messages).toContain("Review must review on gpt-6-sol at xhigh.");
    expect(messages).toContain("Old Sol uses gpt-5.6-sol; GPT-5.5, GPT-5.6, Grok 4.6, and Fable models are out of policy (build on claude-opus-5-5, review on gpt-6-sol).");
    expect(messages).toContain("Old Grok uses grok-4.6; Grok is pinned to grok-4.7.");
    expect(messages).toContain("Sol build uses gpt-6-sol, which is not the coding worker; build on claude-opus-5-5.");
    expect(issues.filter((issue) => issue.id === "opus")).toEqual([]);

    const pressured = parseEnvironment({
      harness: "codex",
      lanes: { codex: "available", grok: "available", claude: "available" },
      models: { codex: { models: ["gpt-6-sol"], complete: false }, grok: { models: ["grok-4.7"], complete: false }, claude: { models: [], complete: false } },
      credit_pressure: true,
    });
    expect(pressured.creditPressure).toBe(true);
    expect(validateWorkflow(workflow, pressured).map((issue) => issue.message)).not.toContain(
      "Build uses Grok without usage-credit pressure; route it to claude-opus-5-5.",
    );
  });

  it("fills omitted seed staffing from policy so the seed validates on a foreign host", () => {
    const environment = parseEnvironment({
      harness: "grok",
      lanes: { claude: "available", codex: "available", grok: "available" },
      models: { claude: ["claude-opus-5-5", "inherit"], codex: ["gpt-5.6-sol", "gpt-6-sol"], codex_effort: ["medium", "high", "xhigh"], grok: ["grok-4.7"] },
    });
    const workflow = parseSeed({
      nodes: [
        { id: "build", role: "builder", lane: "claude", disclosure: "Approved external Claude worker" },
        { id: "review", role: "reviewer", lane: "codex", disclosure: "Approved external Codex reviewer" },
      ],
      edges: [{ id: "build-review", source: "build", target: "review", kind: "forward" }],
    }, environment);

    expect(workflow.nodes[0]).toMatchObject({ lane: "claude", provider: "external", model: "claude-opus-5-5", effort: "medium" });
    expect(workflow.nodes[1]).toMatchObject({ lane: "codex", provider: "external", model: "gpt-6-sol", effort: "xhigh", execution: "read-only-review" });
    expect(validateWorkflow(workflow, environment)).toEqual([]);
  });

  describe("bare seeds without a lane", () => {
    const claudeHost = (codex: string, models: Record<string, unknown> = {}) => parseEnvironment({
      harness: "claude-code",
      lanes: { claude: "available", codex, opencode: "unavailable", grok: "unavailable" },
      models: { claude: ["claude-opus-5-5", "sonnet", "haiku", "inherit"], codex: ["gpt-6-sol"], codex_effort: ["medium", "high", "xhigh"], ...models },
    });
    const bareSeed = { nodes: [{ id: "build", role: "builder" }, { id: "review", role: "reviewer" }], edges: [] };

    it("staffs a bare builder on Claude Opus and a bare reviewer on GPT-6 Sol", () => {
      const environment = claudeHost("available");
      const workflow = parseSeed(bareSeed, environment);

      expect(workflow.nodes[0]).toMatchObject({ lane: "claude", provider: "native", model: "claude-opus-5-5", effort: "medium" });
      expect(workflow.nodes[1]).toMatchObject({ lane: "codex", provider: "external", model: "gpt-6-sol", effort: "xhigh", execution: "read-only-review" });
      expect(workflow.nodes.some((node) => /sonnet|haiku/.test(node.model))).toBe(false);

      workflow.nodes[1].disclosure = "Approved external Codex lane";
      expect(validateWorkflow(workflow, environment)).toEqual([]);
    });

    it("fails closed when no lane offers GPT-6 Sol for review", () => {
      const environment = claudeHost("unavailable");
      const workflow = parseSeed(bareSeed, environment);
      const messages = validateWorkflow(workflow, environment).map((issue) => issue.message);

      expect(workflow.nodes.map((node) => node.model)).toEqual(["claude-opus-5-5", "gpt-6-sol"]);
      expect(messages.some((message) => message.startsWith("build "))).toBe(false);
      expect(messages).toContain("review uses Codex, which is unavailable.");
    });

    it("flags an explicit non-Opus Claude coding worker instead of accepting it silently", () => {
      const environment = claudeHost("available");
      const workflow = parseSeed({ nodes: [{ id: "build", role: "builder", lane: "claude", model: "sonnet" }], edges: [] }, environment);

      expect(validateWorkflow(workflow, environment).map((issue) => issue.message)).toContain(
        "build uses sonnet, which is not the coding worker; build on claude-opus-5-5.",
      );
    });
  });

  describe("provider-nested model ids on OpenCode", () => {
    const nestedClaude = ["openrouter/anthropic/claude-sonnet-4.5", "anthropic/claude-opus-4", "openrouter/anthropic/claude-haiku-4"];
    const opencodeHost = (models: string[]) => parseEnvironment({
      harness: "opencode",
      lanes: { opencode: "available", codex: "unavailable", grok: "unavailable", claude: "unavailable" },
      models: { opencode: models, opencode_effort: ["medium", "high", "xhigh"] },
      opencode_read_only_agent: "review",
    });

    it("staffs only Claude Opus 5.5 and GPT-6 Sol from a nested OpenCode catalog", () => {
      const environment = opencodeHost([...nestedClaude, "openrouter/openai/gpt-6-sol", "openrouter/anthropic/claude-opus-5-5"]);
      const workflow = parseSeed({ nodes: [{ id: "build", role: "builder", lane: "opencode" }, { id: "review", role: "reviewer", lane: "opencode" }], edges: [] }, environment);
      const staffed = ["openrouter/anthropic/claude-opus-5-5", "openrouter/openai/gpt-6-sol"];

      expect(workflow.nodes.map((node) => node.model)).toEqual(staffed);
      expect(defaultWorkflow(environment).nodes.slice(1).map((node) => node.model)).toEqual(staffed);
      expect(validateWorkflow(workflow, environment)).toEqual([]);
    });

    it("fails closed when OpenCode offers only nested Claude ids", () => {
      const environment = opencodeHost(nestedClaude);
      const workflow = parseSeed({ nodes: [{ id: "build", role: "builder", lane: "opencode" }], edges: [] }, environment);
      const messages = validateWorkflow(workflow, environment).map((issue) => issue.message);

      expect(workflow.nodes[0].model).toBe("");
      expect(messages).toContain("build needs a model: opencode does not offer claude-opus-5-5; choose a lane that does or set a model explicitly.");
    });

    it("rejects explicit nested Claude and Grok ids on coding workers and reviewers", () => {
      const environment = opencodeHost([...nestedClaude, "openrouter/x-ai/grok-4.6", "openrouter/openai/gpt-6-sol"]);
      const workflow = parseSeed({
        nodes: [
          { id: "sonnet", role: "builder", lane: "opencode", model: "openrouter/anthropic/claude-sonnet-4.5" },
          { id: "opus", role: "builder", lane: "opencode", model: "anthropic/claude-opus-4" },
          { id: "grok", role: "builder", lane: "opencode", model: "openrouter/x-ai/grok-4.6" },
          { id: "review", role: "reviewer", lane: "opencode", model: "openrouter/anthropic/claude-haiku-4" },
        ],
        edges: [],
      }, environment);
      const messages = validateWorkflow(workflow, environment).map((issue) => issue.message);

      expect(messages).toContain("sonnet uses openrouter/anthropic/claude-sonnet-4.5, which is not the coding worker; build on claude-opus-5-5.");
      expect(messages).toContain("opus uses anthropic/claude-opus-4, which is not the coding worker; build on claude-opus-5-5.");
      expect(messages).toContain("grok uses openrouter/x-ai/grok-4.6; Grok is pinned to grok-4.7.");
      expect(messages).toContain("grok uses Grok without usage-credit pressure; route it to claude-opus-5-5.");
      expect(messages).toContain("review must review on gpt-6-sol at xhigh.");
    });
  });

  describe("worker defaults without GPT-6 Sol", () => {
    const luna = "openrouter/openai/gpt-5.6-luna";
    const mixed = [luna, "openrouter/openai/gpt-5.6-sol", "openrouter/anthropic/claude-sonnet-4.5", "openrouter/meta/muse-spark-1.3"];
    const opencodeOnly = (models: string[], extra: Record<string, unknown> = {}) => parseEnvironment({
      harness: "opencode",
      lanes: { opencode: "available", codex: "unavailable", grok: "available", claude: "unavailable" },
      models: { opencode: models, opencode_effort: ["medium", "high", "xhigh"], grok: ["grok-4.7"] },
      ...extra,
    });
    const laneSeed = { nodes: [{ id: "build", role: "builder", lane: "opencode" }, { id: "review", role: "reviewer", lane: "opencode" }], edges: [] };
    const noModel = (lane: string, model: string) => `needs a model: ${lane} does not offer ${model}; choose a lane that does or set a model explicitly.`;

    it("leaves lane-pinned workers unstaffed and fails validation instead of picking Luna", () => {
      const environment = opencodeOnly(mixed);
      const workflow = parseSeed(laneSeed, environment);
      const messages = validateWorkflow(workflow, environment).map((issue) => issue.message);

      expect(workflow.nodes.map((node) => node.model)).toEqual(["", ""]);
      expect(messages).toContain(`build ${noModel("opencode", "claude-opus-5-5")}`);
      expect(messages).toContain(`review ${noModel("opencode", "gpt-6-sol")}`);
    });

    it("fails closed on bare seeds and default cards when no lane offers the policy models", () => {
      const environment = opencodeOnly(mixed);
      const bare = parseSeed({ nodes: [{ id: "build", role: "builder" }, { id: "review", role: "reviewer" }], edges: [] }, environment);
      const cards = defaultWorkflow(environment);

      for (const workflow of [bare, cards]) {
        const builder = workflow.nodes.find((node) => node.role === "builder");
        const reviewer = workflow.nodes.find((node) => node.role === "reviewer");
        expect(builder).toMatchObject({ lane: "claude", model: "claude-opus-5-5" });
        expect(reviewer).toMatchObject({ lane: "codex", model: "gpt-6-sol" });
        const messages = validateWorkflow(workflow, environment).map((issue) => issue.message);
        expect(messages.filter((message) => message.includes("Claude Code, which is unavailable"))).toHaveLength(1);
        expect(messages.filter((message) => message.includes("Codex, which is unavailable"))).toHaveLength(1);
      }
    });

    it("still picks Claude Opus and GPT-6 Sol when the same catalog also lists them", () => {
      const environment = opencodeOnly([...mixed, "openrouter/openai/gpt-6-sol", "openrouter/anthropic/claude-opus-5-5"]);
      const workflow = parseSeed(laneSeed, environment);

      expect(workflow.nodes.map((node) => node.model)).toEqual(["openrouter/anthropic/claude-opus-5-5", "openrouter/openai/gpt-6-sol"]);
      expect(validateWorkflow(workflow, environment)).toEqual([]);
    });

    it("rejects explicit GPT-5.6 models on every role", () => {
      const environment = opencodeOnly(mixed);
      const workflow = parseSeed({
        nodes: [
          { id: "main", role: "coordinator", lane: "opencode", model: "openrouter/openai/gpt-5.6-sol" },
          { id: "build", role: "builder", lane: "opencode", model: luna },
          { id: "review", role: "reviewer", lane: "opencode", model: "openrouter/openai/gpt-5.6-sol", effort: "xhigh" },
        ],
        edges: [],
      }, environment);
      const messages = validateWorkflow(workflow, environment).map((issue) => issue.message);

      expect(environment.lanes.opencode.models.some((model) => model.includes("gpt-5.6"))).toBe(false);
      expect(messages).toContain("main uses openrouter/openai/gpt-5.6-sol; GPT-5.5, GPT-5.6, Grok 4.6, and Fable models are out of policy (build on claude-opus-5-5, review on gpt-6-sol).");
      expect(messages).toContain(`build uses ${luna}; GPT-5.5, GPT-5.6, Grok 4.6, and Fable models are out of policy (build on claude-opus-5-5, review on gpt-6-sol).`);
      expect(messages).toContain("review uses openrouter/openai/gpt-5.6-sol; GPT-5.5, GPT-5.6, Grok 4.6, and Fable models are out of policy (build on claude-opus-5-5, review on gpt-6-sol).");
    });

    it("never lets the OpenCode main drift to Luna or GPT-5.6 Sol", () => {
      const fiveSixOnly = opencodeOnly(["openrouter/openai/gpt-5.6-sol", luna]);
      const coordinate = defaultWorkflow(fiveSixOnly).nodes[0];

      expect(coordinate).toMatchObject({ lane: "opencode", model: "" });
      expect(validateWorkflow(defaultWorkflow(fiveSixOnly), fiveSixOnly).map((issue) => issue.message)).toContain("Coordinate needs a model.");

      const withSol = opencodeOnly(["openrouter/openai/gpt-5.6-sol", luna, "openrouter/openai/gpt-6-sol"]);
      expect(defaultWorkflow(withSol).nodes[0].model).toBe("");
    });

    it("takes the main model from the selected default, never from a Sol catalog entry", () => {
      const catalog = ["openrouter/openai/gpt-6-sol", "anthropic/claude-opus-5-5"];
      const selected = parseEnvironment({
        harness: "opencode",
        lanes: { opencode: "available" },
        models: { opencode: catalog, opencode_default: "anthropic/claude-opus-5-5" },
      });
      expect(defaultWorkflow(selected).nodes[0].model).toBe("anthropic/claude-opus-5-5");
      expect(defaultWorkflow(opencodeOnly(catalog)).nodes[0].model).toBe("");
      const codex = parseEnvironment({ harness: "codex", lanes: { codex: "available" }, models: { codex: ["gpt-6-sol"] } });
      expect(defaultWorkflow(codex).nodes[0].model).toBe("");
      expect(validateWorkflow(defaultWorkflow(codex), codex).map((issue) => issue.message)).toContain("Coordinate needs a model.");
    });

    it("never auto-staffs Grok on a non-Grok lane, even under credit pressure", () => {
      const environment = opencodeOnly([luna, "openrouter/xai/grok-4.7"], { credit_pressure: true });
      const workflow = parseSeed({
        nodes: [{ id: "build", role: "builder", lane: "opencode" }, { id: "grok-build", role: "builder", lane: "grok" }],
        edges: [],
      }, environment);
      const messages = validateWorkflow(workflow, environment).map((issue) => issue.message);

      expect(workflow.nodes.map((node) => node.model)).toEqual(["", "grok-4.7"]);
      expect(messages).toContain("build needs a model: opencode does not offer claude-opus-5-5; choose a lane that does or set a model explicitly.");
      expect(messages.filter((message) => message.startsWith("grok-build"))).toEqual(["grok-build needs an external-provider disclosure."]);
    });

    it("rejects an explicit Grok model on a non-Grok lane, with or without credit pressure", () => {
      const catalog = [luna, "openrouter/xai/grok-4.7", "grok-4.7", "openrouter/openai/gpt-6-sol"];
      const seed = {
        nodes: [
          { id: "bare", role: "builder", lane: "opencode", model: "grok-4.7" },
          { id: "nested", role: "builder", lane: "opencode", model: "openrouter/xai/grok-4.7" },
          { id: "pinned", role: "builder", lane: "grok", model: "grok-4.7", disclosure: "Approved xAI worker" },
        ],
        edges: [],
      };

      for (const extra of [{}, { credit_pressure: true }]) {
        const environment = opencodeOnly(catalog, extra);
        const messages = validateWorkflow(parseSeed(seed, environment), environment).map((issue) => issue.message);

        expect(messages).toContain("bare uses grok-4.7 on the opencode lane; Grok runs only on the Grok lane.");
        expect(messages).toContain("nested uses openrouter/xai/grok-4.7 on the opencode lane; Grok runs only on the Grok lane.");
      }

      const pressured = opencodeOnly(catalog, { credit_pressure: true });
      const pinned = validateWorkflow(parseSeed(seed, pressured), pressured).filter((issue) => issue.id === "pinned");
      expect(pinned).toEqual([]);
    });

    it("applies the Grok lane and credit rules to coordinators, observed on-pin main included", () => {
      const catalog = ["openrouter/xai/grok-4.7", "openrouter/openai/gpt-6-sol"];
      const seed = { nodes: [{ id: "main", role: "coordinator", lane: "opencode", model: "openrouter/xai/grok-4.7" }], edges: [] };

      for (const extra of [{}, { credit_pressure: true }]) {
        const environment = opencodeOnly(catalog, extra);
        expect(validateWorkflow(parseSeed(seed, environment), environment).map((issue) => issue.message)).toContain(
          "main uses openrouter/xai/grok-4.7 on the opencode lane; Grok runs only on the Grok lane.",
        );
      }

      const grokHost = (extra: Record<string, unknown> = {}) => parseEnvironment({ harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7"], grok_default: "grok-4.7" }, ...extra });
      const observed = defaultWorkflow(grokHost()).nodes[0];
      expect(observed).toMatchObject({ role: "coordinator", lane: "grok", provider: "native", model: "grok-4.7" });
      expect(validateWorkflow({ title: "main", nodes: [observed], edges: [] }, grokHost()).map((issue) => issue.message)).toEqual([
        "Coordinate uses Grok without usage-credit pressure; route it to claude-opus-5-5.",
      ]);
      expect(validateWorkflow({ title: "main", nodes: [observed], edges: [] }, grokHost({ credit_pressure: true }))).toEqual([]);

      const dispatched = parseSeed({ nodes: [{ id: "main", role: "coordinator", lane: "grok", model: "grok-4.7", provider: "external", disclosure: "Approved xAI" }], edges: [] }, opencodeOnly(catalog));
      expect(validateWorkflow(dispatched, opencodeOnly(catalog)).map((issue) => issue.message)).toContain(
        "main uses Grok without usage-credit pressure; route it to claude-opus-5-5.",
      );
    });

    it("defaults a lane-pinned Grok builder to grok-4.7 only under credit pressure, never the reviewer", () => {
      const grokSeed = { nodes: [{ id: "build", role: "builder", lane: "grok" }, { id: "review", role: "reviewer", lane: "grok" }], edges: [] };

      expect(parseSeed(grokSeed, opencodeOnly(mixed)).nodes.map((node) => node.model)).toEqual(["", ""]);
      expect(parseSeed(grokSeed, opencodeOnly(mixed, { credit_pressure: true })).nodes.map((node) => node.model)).toEqual(["grok-4.7", ""]);
    });
  });

  describe("main session and lane evidence", () => {
    describe("main session model policy", () => {
      const coordinate = (raw: Record<string, unknown>) => {
        const environment = parseEnvironment(raw);
        const workflow = defaultWorkflow(environment);
        return { main: workflow.nodes[0], messages: validateWorkflow(workflow, environment).filter((issue) => issue.id === "coordinate").map((issue) => issue.message) };
      };
      const grok = (grok_default: string, extra: Record<string, unknown> = {}) => ({
        harness: "grok", lanes: { grok: "available" }, credit_pressure: true,
        models: { grok: ["grok-4.7", grok_default], grok_default }, ...extra,
      });
      const outOfPolicy = (host: string) => `Coordinate cannot stand for the main session: the host runs ${host}; GPT-5.5, GPT-5.6, Grok 4.6, and Fable models are out of policy (build on claude-opus-5-5, review on gpt-6-sol).`;

      it.each([
        ["a Fable main", { harness: "claude-code", lanes: { claude: "available" }, models: { claude: ["claude-opus-5-5"], claude_default: "claude-fable-5-1" } }, "claude-fable-5-1"],
        ["a bare fable main", { harness: "claude-code", lanes: { claude: "available" }, models: { claude: ["claude-opus-5-5"], claude_default: "fable" } }, "fable"],
        ["a gpt-5.5 main", { harness: "codex", lanes: { codex: "available" }, models: { codex: ["gpt-6-sol"], codex_default: "gpt-5.5" } }, "gpt-5.5"],
        ["an xai/grok-4.6 main", grok("xai/grok-4.6", { grok_model_providers: { "xai/grok-4.6": "xai" }, grok_model_targets: { "xai/grok-4.6": "grok-4.6" } }), "grok-4.6 (via xai/grok-4.6)"],
        ["an xai/grok-4.7 alias that runs grok-4.6", grok("xai/grok-4.7", { grok_model_providers: { "xai/grok-4.7": "xai" }, grok_model_targets: { "xai/grok-4.7": "grok-4.6" } }), "grok-4.6 (via xai/grok-4.7)"],
        ["an OpenRouter x-ai/grok-4.6 main", { harness: "opencode", lanes: { opencode: "available" }, models: { opencode: ["anthropic/claude-opus-5-5"], opencode_default: "openrouter/x-ai/grok-4.6" } }, "openrouter/x-ai/grok-4.6"],
      ])("rejects %s", (_name, raw, host) => {
        const { main, messages } = coordinate(raw);
        expect(main.model).toBe("");
        expect(messages).toContain(outOfPolicy(host));
      });

      it("rejects a grok-4.7 main without usage-credit pressure", () => {
        const { main, messages } = coordinate(grok("grok-4.7", { credit_pressure: false }));
        expect(main.model).toBe("grok-4.7");
        expect(messages).toContain("Coordinate uses Grok without usage-credit pressure; route it to claude-opus-5-5.");
        expect(coordinate(grok("grok-4.7")).messages).toEqual([]);
      });

      it.each([
        ["gpt-6-sol", "openai.com.evil.io", "gpt-6-sol"],
        ["claude-opus-5-5", "anthropic-cdn.io", "claude-opus-5-5"],
        ["house-opus", "anthropic.co", "claude-opus-5-5"],
      ])("rejects a %s main served by the look-alike host %s", (id, provider, target) => {
        const { main, messages } = coordinate(grok(id, { grok_model_providers: { [id]: provider }, grok_model_targets: { [id]: target } }));
        expect(main.model).toBe(id);
        const shown = target === id ? id : `${target} (via ${id})`;
        expect(messages).toContain(`Coordinate is the main session on ${shown} served by ${provider}, which is not claude-opus-5-5 or gpt-6-sol from its own provider.`);
      });

      it("accepts Opus and Sol mains from their own providers", () => {
        expect(coordinate({ harness: "claude-code", lanes: { claude: "available" }, models: { claude: ["claude-opus-5-5"], claude_default: "claude-opus-5-5" } }).messages).toEqual([]);
        expect(coordinate({ harness: "codex", lanes: { codex: "available" }, models: { codex: ["gpt-6-sol"], codex_default: "gpt-6-sol" } }).messages).toEqual([]);
        expect(coordinate(grok("house-sol", { grok_model_providers: { "house-sol": "openai" }, grok_model_targets: { "house-sol": "gpt-6-sol" } })).messages).toEqual([]);
      });

      it("flags an explicit Fable choice on any node", () => {
        const environment = parseEnvironment({ harness: "claude-code", lanes: { claude: "available" }, models: { claude: ["claude-opus-5-5"], claude_default: "claude-opus-5-5" } });
        const workflow = defaultWorkflow(environment);
        workflow.nodes[1] = { ...workflow.nodes[1], model: "claude-fable-5-1-thinking-high" };
        expect(validateWorkflow(workflow, environment).map((issue) => issue.message)).toContain(
          `${workflow.nodes[1].title} uses claude-fable-5-1-thinking-high; Fable is never used to coordinate, build, review, or advise.`,
        );
      });

      it("drops every out-of-policy id from the pickers and shows resolved models", () => {
        const environment = parseEnvironment({
          harness: "opencode", lanes: { opencode: "available" },
          models: { opencode: ["openai/gpt-5.5", "openai/gpt-5.6-luna", "openrouter/x-ai/grok-4.6-fast", "anthropic/claude-fable-5-1", "anthropic/claude-opus-5-5"] },
        });
        expect(environment.lanes.opencode.models).toEqual(["anthropic/claude-opus-5-5"]);
        const grokEnv = parseEnvironment(grok("xai/grok-4.7", { grok_model_targets: { "xai/grok-4.7": "grok-4.6" } }));
        expect(resolvedModel(grokEnv, "grok", "xai/grok-4.7")).toBe("grok-4.6 (via xai/grok-4.7)");
        expect(resolvedModel(grokEnv, "grok", "grok-4.7")).toBe("grok-4.7");
      });
    });

    it("holds an observed grok-4.6 main to policy like any dispatch", () => {
      const grokHost = (grok_default: string) => parseEnvironment({ harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7", "grok-4.6"], grok_default } });
      const observed = grokHost("grok-4.6");
      expect(observed.lanes.grok.models).toEqual(["grok-4.7"]);

      const main = defaultWorkflow(observed).nodes[0];
      expect(main).toMatchObject({ role: "coordinator", lane: "grok", provider: "native", model: "" });
      expect(validateWorkflow({ title: "t", nodes: [main], edges: [] }, observed).map((issue) => issue.message)).toContain(
        "Coordinate cannot stand for the main session: the host runs grok-4.6; GPT-5.5, GPT-5.6, Grok 4.6, and Fable models are out of policy (build on claude-opus-5-5, review on gpt-6-sol).",
      );

      const pinned = { ...main, model: "grok-4.6" };
      const messages = validateWorkflow({ title: "t", nodes: [pinned], edges: [] }, observed).map((issue) => issue.message);
      expect(messages).toContain("Coordinate uses grok-4.6; Grok is pinned to grok-4.7.");
      expect(messages).toContain("Coordinate uses Grok without usage-credit pressure; route it to claude-opus-5-5.");
    });

    it("grants no pressure-free Grok main when the detector reported no default", () => {
      const noDefault = parseEnvironment({ harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7"] } });
      expect(noDefault.mainModels).toEqual({});

      const card = defaultWorkflow(noDefault).nodes[0];
      expect(card).toMatchObject({ role: "coordinator", lane: "grok", model: "" });
      expect(validateWorkflow({ title: "t", nodes: [card], edges: [] }, noDefault).map((issue) => issue.message)).toContain(
        "Coordinate needs a model: detect-harness.sh did not report the Grok host's default model; re-run it before planning.",
      );

      const explicit = { ...card, model: "grok-4.7" };
      const messages = validateWorkflow({ title: "t", nodes: [explicit], edges: [] }, noDefault).map((issue) => issue.message);
      expect(messages).toContain("Coordinate uses Grok without usage-credit pressure; route it to claude-opus-5-5.");
    });

    it("runs natively on the Grok lane only for a coordinator on the observed default", () => {
      const grokHost = (grok_default?: string) => parseEnvironment({ grok_model_targets: { "ox-alpha": "ox-alpha", "gpt-6-sol": "gpt-6-sol" }, grok_model_providers: { "ox-alpha": "openrouter", "gpt-6-sol": "openai" }, harness: "grok", lanes: { grok: "available" }, models: { grok: ["grok-4.7", "gpt-6-sol"], ...(grok_default ? { grok_default } : {}) } });

      expect(runsNatively(grokHost("gpt-6-sol"), "grok", "grok-4.7", "coordinator")).toBe(false);
      expect(runsNatively(grokHost("gpt-6-sol"), "grok", "gpt-6-sol", "coordinator")).toBe(true);
      expect(runsNatively(grokHost("grok-4.7"), "grok", "grok-4.7", "builder")).toBe(false);
      expect(runsNatively(grokHost(), "grok", "grok-4.7", "coordinator")).toBe(false);
      expect(parseSeed({ nodes: [{ id: "main", role: "coordinator", model: "grok-4.7" }], edges: [] }, grokHost("gpt-6-sol")).nodes[0].provider).toBe("external");
    });

    it("labels a Grok host main with its configured default and keeps it the native main", () => {
      const grokHost = parseEnvironment({ grok_model_targets: { "ox-alpha": "ox-alpha", "gpt-6-sol": "gpt-6-sol" }, grok_model_providers: { "ox-alpha": "openrouter", "gpt-6-sol": "openai" },
        harness: "grok",
        lanes: { grok: "available" },
        models: { grok: ["grok-4.7", "gpt-6-sol"], grok_default: "gpt-6-sol" },
      });
      const workflow = defaultWorkflow(grokHost);

      expect(workflow.nodes[0]).toMatchObject({ lane: "grok", provider: "native", model: "gpt-6-sol" });
      expect(validateWorkflow(workflow, grokHost).filter((issue) => issue.id === "coordinate")).toEqual([]);
    });

    it("labels the OpenCode coordinator with the configured main model", () => {
      const configured = (models: string[], main: string) => parseEnvironment({
        harness: "opencode",
        lanes: { opencode: "available" },
        models: { opencode: models, opencode_default: main, opencode_effort: ["medium", "high", "xhigh"] },
      });

      expect(defaultWorkflow(configured(["x/gpt-6-astra", "x/gpt-6-sol"], "x/gpt-6-astra")).nodes[0].model).toBe("x/gpt-6-astra");
      const astraOnly = configured(["x/gpt-6-astra"], "x/gpt-6-astra");
      expect(defaultWorkflow(astraOnly).nodes[0].model).toBe("x/gpt-6-astra");
      expect(validateWorkflow(defaultWorkflow(astraOnly), astraOnly).filter((issue) => issue.id === "coordinate").map((issue) => issue.message)).toEqual([
        "Coordinate is the main session on x/gpt-6-astra, which is not claude-opus-5-5 or gpt-6-sol from its own provider.",
      ]);
      const opus = configured(["anthropic/claude-opus-5-5"], "anthropic/claude-opus-5-5");
      expect(validateWorkflow(defaultWorkflow(opus), opus).some((issue) => issue.id === "coordinate")).toBe(false);
      expect(defaultWorkflow(configured(["x/gpt-6-sol"], "x/gpt-5.6-sol")).nodes[0].model).toBe("");
    });

    it("prefers a detected OpenCode Sol over a fallback-only Codex lane", () => {
      const environment = parseEnvironment({
        harness: "claude-code",
        lanes: { claude: "available", codex: "available", opencode: "available" },
        models: { claude: ["inherit"], codex: [], opencode: ["openai/gpt-6-sol"] },
        opencode_read_only_agent: "review",
      });

      expect(environment.lanes.codex).toMatchObject({ detected: false, models: ["gpt-6-sol"] });
      expect(defaultWorkflow(environment).nodes[2]).toMatchObject({ lane: "opencode", model: "openai/gpt-6-sol" });
    });
  });

  it("restaffs a step when its role changes between builder and reviewer", () => {
    const environment = liveCodexEnvironment();
    const build = defaultWorkflow(environment).nodes[1];

    const review = restaff(build, "reviewer", environment);
    expect(review).toMatchObject({ role: "reviewer", lane: "codex", provider: "native", model: "gpt-6-sol", effort: "xhigh", execution: "read-only-review" });

    const rebuilt = restaff(review, "builder", environment);
    expect(rebuilt).toMatchObject({ role: "builder", lane: "claude", provider: "external", model: "claude-opus-5-5", effort: "medium", execution: "write" });
    expect(restaff(rebuilt, "builder", environment)).toBe(rebuilt);
    expect(validateWorkflow({ title: "t", nodes: [review], edges: [] }, environment)).toEqual([]);
  });

  it("keeps a former review step read-only when it becomes external and drops its approval", () => {
    const environment = liveCodexEnvironment();
    const review = { ...defaultWorkflow(environment).nodes[2], disclosure: "Approved OpenAI reviewer" };

    const external = restaff(review, "external", environment);
    expect(external).toMatchObject({ role: "external", lane: "codex", model: "gpt-6-sol", effort: "xhigh", execution: "read-only-review", disclosure: undefined });
    expect(validateWorkflow({ title: "t", nodes: [external], edges: [] }, environment)).toEqual([]);
    expect(restaff(review, "builder", environment)).toMatchObject({ lane: "claude", model: "claude-opus-5-5", effort: "medium", execution: "write", disclosure: undefined });
  });

  it("holds every review-executing node to Sol at xhigh, whatever its role", () => {
    const environment = liveCodexEnvironment();
    const build = defaultWorkflow(environment).nodes[1];
    const reviewer = { ...build, id: "ext", title: "External review", role: "external" as const, execution: "read-only-review" as const, disclosure: "Approved Claude" };

    expect(reviewer).toMatchObject({ model: "claude-opus-5-5", effort: "medium" });
    expect(validateWorkflow({ title: "t", nodes: [reviewer], edges: [] }, environment).map((issue) => issue.message)).toContain("External review must review on gpt-6-sol at xhigh.");
    const solMedium = { ...reviewer, lane: "codex", provider: "native" as const, model: "gpt-6-sol" };
    expect(validateWorkflow({ title: "t", nodes: [solMedium], edges: [] }, environment).map((issue) => issue.message)).toEqual(["External review must review on gpt-6-sol at xhigh."]);
  });

  it("treats a lane as verified only when the detector says so", () => {
    const environment = parseEnvironment({
      harness: "codex",
      lanes: { claude: "available", codex: "available" },
      lane_access: { claude: "unverified" },
      models: { claude: ["claude-opus-5-5"], codex: ["gpt-6-sol"] },
    });

    expect(environment.lanes.claude.access).toBe("unverified");
    expect(environment.lanes.codex.access).toBe("unverified");
    expect(laneStatus(environment.lanes.claude)).toBe("available shell-out · access unverified");
    expect(laneStatus(environment.lanes.codex)).toBe("current host · access unverified");
    const verified = parseEnvironment({ harness: "codex", lanes: { claude: "available" }, lane_access: { claude: "verified", codex: "bogus" } });
    expect(verified.lanes.claude.access).toBe("verified");
    expect(verified.lanes.codex.access).toBe("unverified");
    expect(laneStatus(verified.lanes.claude)).toBe("available shell-out");
  });

  it("sanitizes node ids before using them in generated worktree metadata", () => {
    const workflow = parseSeed({
      nodes: [{ id: "../../escape", title: "Unsafe" }, { id: "../../escape", title: "Collision" }],
      edges: [{ id: "edge", source: "../../escape", target: "../../escape", kind: "forward" }],
    }, liveCodexEnvironment());

    expect(workflow.nodes.map((node) => node.id)).toEqual(["escape", "escape-2"]);
    expect(workflow.nodes.every((node) => !node.worktree?.taskPath.includes(".."))).toBe(true);
    expect(workflow.edges[0]).toMatchObject({ source: "escape", target: "escape" });
  });

  it("rejects worktree paths that escape their root and unsafe branch metadata", () => {
    const environment = liveCodexEnvironment();
    const workflow = defaultWorkflow(environment);
    workflow.nodes[0].worktree!.taskPath = "~/code/elsewhere";
    workflow.nodes[1].worktree!.branch = "codex/../../master";

    const messages = validateWorkflow(workflow, environment).map((issue) => issue.message);
    expect(messages).toContain("Coordinate needs a task worktree inside its declared worktree root.");
    expect(messages).toContain("Build has an unsafe worktree branch name.");
  });

  it("enforces the host-reported live child cap", () => {
    const environment = liveCodexEnvironment();
    environment.caps.liveChildren = 2;

    expect(validateWorkflow(defaultWorkflow(environment), environment)).toContainEqual({
      scope: "graph",
      id: "live-children",
      message: "This plan has 3 steps, above the 2-child safety cap reported by codex.",
    });
  });
});

describe("model picker groups", () => {
  it("groups OpenCode providers named after Object.prototype keys without throwing", () => {
    const environment = parseEnvironment({
      harness: "opencode",
      lanes: { opencode: "available" },
      models: { opencode: ["__proto__/gpt-6-sol", "constructor/gpt-6-sol", "openai/gpt-6-sol", "openai/gpt-6-astra"] },
    });
    expect(groupModels(environment.lanes.opencode)).toEqual([
      ["__proto__", ["__proto__/gpt-6-sol"]],
      ["constructor", ["constructor/gpt-6-sol"]],
      ["openai", ["openai/gpt-6-sol", "openai/gpt-6-astra"]],
    ]);
  });
});

describe("disclosure approval", () => {
  const environment = parseEnvironment({
    harness: "codex",
    lanes: { codex: "available", opencode: "available", grok: "available" },
    models: { codex: ["gpt-6-sol"], codex_default: "gpt-6-sol", opencode: ["anthropic/claude-opus-5-5", "openrouter/anthropic/claude-opus-5-5"], grok: ["grok-4.7", "ox-alpha"] },
    grok_model_providers: { "ox-alpha": "openrouter" },
  });
  const node = { ...defaultWorkflow(environment).nodes[1], lane: "opencode", provider: "external" as const, model: "anthropic/claude-opus-5-5", disclosure: "Approved direct Anthropic" };

  it("names the provider a model sends content to", () => {
    expect(destination(environment, "opencode", "openrouter/anthropic/claude-opus-5-5")).toBe("openrouter");
    expect(destination(environment, "grok", "ox-alpha")).toBe("openrouter");
    expect(destination(environment, "grok", "grok-4.7")).toBe("xai");
    expect(destination(environment, "codex", "gpt-6-sol")).toBe("codex");
  });

  it("clears the approval when the model provider changes", () => {
    expect(reapprove(environment, node, { ...node, model: "openrouter/anthropic/claude-opus-5-5" }).disclosure).toBeUndefined();
    expect(reapprove(environment, node, { ...node, model: "anthropic/claude-sonnet-5" }).disclosure).toBe("Approved direct Anthropic");
  });

  it("clears the approval when the execution provider or lane changes", () => {
    expect(reapprove(environment, node, { ...node, provider: "native" }).disclosure).toBeUndefined();
    expect(reapprove(environment, node, { ...node, lane: "codex" }).disclosure).toBeUndefined();
  });
});

describe("pinned model matching", () => {
  const environment = parseEnvironment({
    harness: "codex",
    grok_model_providers: { sol: "openai", routed: "openrouter", fake: "openrouter", elsewhere: "example.com", opus: "anthropic" },
    grok_model_targets: { sol: "gpt-6-sol", routed: "openai/gpt-6-sol", fake: "evil/gpt-6-sol", elsewhere: "gpt-6-sol", opus: "claude-opus-5-5" },
  });

  it("takes only the bare id on Claude and Codex lanes", () => {
    expect(runsSol(environment, "codex", "gpt-6-sol")).toBe(true);
    expect(runsSol(environment, "codex", "x/gpt-6-sol")).toBe(false);
    expect(runsSol(environment, "codex", "openai/gpt-6-sol")).toBe(false);
    expect(runsOpus(environment, "claude", "claude-opus-5-5")).toBe(true);
    expect(runsOpus(environment, "claude", "x/claude-opus-5-5")).toBe(false);
  });

  it("takes only the owner-qualified id, optionally behind an approved router, on OpenCode", () => {
    expect(runsSol(environment, "opencode", "openai/gpt-6-sol")).toBe(true);
    expect(runsSol(environment, "opencode", "openrouter/openai/gpt-6-sol")).toBe(true);
    expect(runsSol(environment, "opencode", "x/gpt-6-sol")).toBe(false);
    expect(runsSol(environment, "opencode", "openrouter/x/gpt-6-sol")).toBe(false);
    expect(runsSol(environment, "opencode", "gpt-6-sol")).toBe(false);
    expect(runsOpus(environment, "opencode", "anthropic/claude-opus-5-5")).toBe(true);
    expect(runsOpus(environment, "opencode", "openai/claude-opus-5-5")).toBe(false);
  });

  it("takes a Grok CLI alias only when its provider and target match the pinned model", () => {
    expect(runsSol(environment, "grok", "sol")).toBe(true);
    expect(runsSol(environment, "grok", "routed")).toBe(true);
    expect(runsSol(environment, "grok", "fake")).toBe(false);
    expect(runsSol(environment, "grok", "elsewhere")).toBe(false);
    expect(runsOpus(environment, "grok", "opus")).toBe(true);
    expect(runsSol(environment, "grok", "unlisted")).toBe(false);
  });
});

describe("qualified Grok ids on the Grok lane", () => {
  const grokEnv = (providers: Record<string, string>, targets: Record<string, string>) => parseEnvironment({
    harness: "codex",
    credit_pressure: true,
    lanes: { codex: "available", grok: "available" },
    models: { codex: ["gpt-6-sol"], codex_default: "gpt-6-sol", grok: ["grok-4.7", "xai/grok-4.7"] },
    grok_model_providers: providers,
    grok_model_targets: targets,
  });
  const messages = (environment: ReturnType<typeof parseEnvironment>, model: string) => {
    const workflow = parseSeed({ nodes: [{ id: "build", role: "builder", lane: "grok", model, provider: "external", disclosure: "Approved" }], edges: [] }, environment);
    return validateWorkflow(workflow, environment).map((issue) => issue.message);
  };

  it("resolves a qualified id through config.toml like any custom id", () => {
    expect(messages(grokEnv({}, {}), "xai/grok-4.7")).toContain(
      "build uses custom id xai/grok-4.7, but detect-harness.sh could not resolve its config.toml model and base_url; re-run it before planning.",
    );
    expect(messages(grokEnv({ "xai/grok-4.7": "xai" }, { "xai/grok-4.7": "grok-4.7" }), "xai/grok-4.7").join("\n")).not.toMatch(/custom id|not xAI|pinned/);
    expect(messages(grokEnv({ "xai/grok-4.7": "xai" }, { "xai/grok-4.7": "grok-4.6" }), "xai/grok-4.7")).toContain(
      "build uses xai/grok-4.7, an xAI alias for grok-4.6; Grok is pinned to grok-4.7.",
    );
  });

  it("rejects a Grok id whose entry sends content somewhere other than xAI", () => {
    expect(messages(grokEnv({ "grok-4.7": "example.com" }, {}), "grok-4.7")).toContain(
      "build uses grok-4.7, but its Grok CLI entry sends content to example.com, not xAI or an approved router.",
    );
    expect(messages(grokEnv({}, {}), "grok-4.7").join("\n")).not.toMatch(/custom id|not xAI/);
  });
});
