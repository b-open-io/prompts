import { describe, expect, it } from "vitest";
import { defaultWorkflow, nextNodeId, parseEnvironment, parseSeed, toPlan, validateWorkflow } from "./workflow-schema";

const liveCodexEnvironment = () => parseEnvironment({
  harness: "codex",
  lanes: { claude: "available", codex: "available", grok: "available", opencode: "unavailable" },
  models: {
    claude: ["sonnet", "haiku"],
    claude_effort: ["low", "medium", "high", "max"],
    codex: ["gpt-5.6-luna", "gpt-5.6-sol"],
    codex_effort: ["minimal", "low", "medium", "high", "xhigh"],
    grok: ["grok-4.6", "grok-4.5"],
    grok_effort: ["minimal", "low", "medium", "high", "xhigh"],
    opencode: [],
  },
});

describe("workflow schema", () => {
  it("ships a valid example with prepared worktrees", () => {
    const workflow = defaultWorkflow(liveCodexEnvironment());

    expect(validateWorkflow(workflow, liveCodexEnvironment())).toEqual([]);
    expect(workflow.nodes.every((node) => node.worktree?.root === "~/code/worktrees")).toBe(true);
    expect(workflow.nodes.every((node) => node.worktree?.taskPath.startsWith("~/code/worktrees/"))).toBe(true);
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
        grok: ["grok-4.5", "grok-4.6"],
      },
      caps: { live_children: -1, agent_budget_default: "not-a-number" },
      roster: [null, { id: "reviewer" }, "ignored"],
    });

    expect(environment.harness).toBe("claude-code");
    expect(environment.hostLane).toBe("claude");
    expect(environment.simulationOnly).toBe(false);
    expect(environment.lanes.claude.models).toEqual(["sonnet"]);
    expect(environment.lanes.claude.efforts).toEqual(["low", "max"]);
    expect(environment.lanes.grok.models).toEqual(["grok-4.6"]);
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
    expect(messages).toContain("Build uses a model not offered by Codex: anthropic/claude.");
  });

  it("permits an explicit custom model only when a lane inventory is incomplete", () => {
    const environment = parseEnvironment({
      harness: "opencode",
      lanes: { opencode: "available" },
      models: { opencode: [], opencode_effort: ["low", "medium", "high"] },
    });
    const workflow = defaultWorkflow(environment);
    workflow.nodes[0].lane = "opencode";
    workflow.nodes[0].provider = "native";
    workflow.nodes[0].model = "openai/gpt-5.6-luna";
    workflow.nodes[0].disclosure = undefined;
    workflow.nodes.slice(1).forEach((node) => {
      node.lane = "opencode";
      node.provider = "native";
      node.model = "openai/gpt-5.6-luna";
    });

    expect(validateWorkflow(workflow, environment)).toEqual([]);
  });

  it("rejects an obviously foreign native model even when the inventory is missing", () => {
    const environment = parseEnvironment({ harness: "codex", lanes: { codex: "available" }, models: {} });
    const workflow = defaultWorkflow(environment);
    workflow.nodes[0].model = "claude-opus";

    expect(validateWorkflow(workflow, environment).map((issue) => issue.message)).toContain(
      "Coordinate pairs a native Codex lane with a foreign model: claude-opus.",
    );
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
      id: "live-children",
      message: "This plan has 3 steps, above the 2-child safety cap reported by codex.",
    });
  });
});
