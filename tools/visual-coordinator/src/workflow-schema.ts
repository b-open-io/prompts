export type NodeRole = "coordinator" | "builder" | "reviewer" | "external";
export type EdgeKind = "forward" | "reject" | "memory";
export type WorkflowEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
export type WorkflowLane = "claude" | "codex" | "grok" | "opencode" | (string & {});
export type LaneAvailability = "available" | "unavailable" | "unknown";
export type InventoryCompleteness = "complete" | "incomplete";

export type DetectedLane = {
  id: WorkflowLane;
  label: string;
  availability: LaneAvailability;
  isHost: boolean;
  models: string[];
  efforts: WorkflowEffort[];
  inventory: InventoryCompleteness;
};

export type WorkflowEnvironment = {
  harness: string;
  hostLane: WorkflowLane | null;
  simulationOnly: boolean;
  nativeWorkflow: boolean;
  caps: { liveChildren: number | null; agentBudgetDefault: number };
  lanes: Record<string, DetectedLane>;
  roster: unknown[];
};

export type WorkflowNode = {
  id: string;
  role: NodeRole;
  title: string;
  task: string;
  ownedPaths: string[];
  lane: string;
  provider: "native" | "external";
  model: string;
  effort: WorkflowEffort;
  execution: "write" | "read-only-review";
  position: { x: number; y: number };
  disclosure?: string;
  worktree?: {
    root: string;
    repoPath: string;
    taskPath: string;
    baseRef: string;
    branch: string;
    owner: string;
    cleanup: string;
  };
};

export type WorkflowEdge = { id: string; source: string; target: string; kind: EdgeKind; label?: string };
export type Workflow = { title: string; nodes: WorkflowNode[]; edges: WorkflowEdge[] };

export type ValidationIssue = { id: string; message: string };

const roles: NodeRole[] = ["coordinator", "builder", "reviewer", "external"];
const efforts: WorkflowNode["effort"][] = ["none", "minimal", "low", "medium", "high", "xhigh", "max"];
const executions: WorkflowNode["execution"][] = ["write", "read-only-review"];
const edgeKinds: EdgeKind[] = ["forward", "reject", "memory"];
const text = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const member = <T extends string>(value: unknown, values: readonly T[], fallback: T): T =>
  typeof value === "string" && values.includes(value as T) ? value as T : fallback;

const knownLanes = ["claude", "codex", "grok", "opencode"] as const;
const laneLabels: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  grok: "Grok Build",
  opencode: "OpenCode",
};
const fallbackModels: Record<string, string[]> = {
  claude: ["sonnet", "haiku", "opus", "fable", "inherit"],
  codex: ["gpt-5.6-luna", "gpt-5.6-sol"],
  grok: ["grok-4.6"],
  opencode: [],
};
const fallbackEfforts: WorkflowEffort[] = ["low", "medium", "high"];

const safeStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))];
};

const safeNumber = (value: unknown, fallback: number | null): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;

const canonicalHarness = (value: unknown): string => {
  const harness = text(value).trim().toLowerCase();
  return harness === "claude" ? "claude-code" : harness;
};

export const hostLaneFor = (harness: unknown): WorkflowLane | null => {
  switch (canonicalHarness(harness)) {
    case "claude-code": return "claude";
    case "codex": return "codex";
    case "grok": return "grok";
    case "opencode": return "opencode";
    default: return null;
  }
};

const laneKey = (value: string): string => value.trim().toLowerCase() === "claude-code" ? "claude" : value.trim().toLowerCase();

const statusOf = (value: unknown): LaneAvailability => {
  if (value === true) return "available";
  if (value === false) return "unavailable";
  if (typeof value === "string") {
    const status = value.trim().toLowerCase();
    if (["available", "installed", "ready", "true"].includes(status)) return "available";
    if (["unavailable", "missing", "disabled", "false"].includes(status)) return "unavailable";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("available" in record) return statusOf(record.available);
    if ("status" in record) return statusOf(record.status);
    if ("availability" in record) return statusOf(record.availability);
  }
  return "unknown";
};

const inventoryValue = (value: unknown): { values: string[]; complete: boolean } => {
  if (Array.isArray(value)) return { values: safeStrings(value), complete: safeStrings(value).length > 0 };
  if (!value || typeof value !== "object") return { values: [], complete: false };
  const record = value as Record<string, unknown>;
  const values = safeStrings(record.models ?? record.values ?? record.items);
  const complete = typeof record.complete === "boolean" ? record.complete : values.length > 0;
  return { values, complete };
};

const effortValues = (value: unknown): WorkflowEffort[] => safeStrings(value).filter((item): item is WorkflowEffort => efforts.includes(item as WorkflowEffort));

/** Normalize the detector's untrusted JSON at the browser boundary. */
export const parseEnvironment = (value: unknown): WorkflowEnvironment => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const harness = canonicalHarness(raw.harness);
  const hostLane = hostLaneFor(harness);
  const simulationOnly = !hostLane;
  const rawLanes = raw.lanes && typeof raw.lanes === "object" ? raw.lanes as Record<string, unknown> : {};
  const rawModels = raw.models && typeof raw.models === "object" ? raw.models as Record<string, unknown> : {};
  const ids = [...new Set([...knownLanes, ...Object.keys(rawLanes).map(laneKey), ...Object.keys(rawModels).filter((key) => !key.endsWith("_effort") && key !== "opencode_default").map(laneKey)])];
  const lanes = Object.fromEntries(ids.map((rawId) => {
    const id = laneKey(rawId);
    const modelInventory = inventoryValue(rawModels[id] ?? rawModels[rawId]);
    const detectedModels = modelInventory.values.filter((model) => !(id === "grok" && model === "grok-4.5"));
    const effortInventory = effortValues(rawModels[`${id}_effort`] ?? rawModels[`${rawId}_effort`]);
    const rawLane = rawLanes[id] ?? rawLanes[rawId];
    const availability = statusOf(rawLane);
    return [id, {
      id,
      label: laneLabels[id] ?? id.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      availability,
      isHost: id === hostLane,
      models: detectedModels.length > 0 ? detectedModels : (modelInventory.complete ? [] : (fallbackModels[id] ?? [])),
      efforts: effortInventory.length > 0 ? effortInventory : fallbackEfforts,
      inventory: modelInventory.complete ? "complete" as const : "incomplete" as const,
    } satisfies DetectedLane];
  }));
  const rawCaps = raw.caps && typeof raw.caps === "object" ? raw.caps as Record<string, unknown> : {};
  return {
    harness: harness || "demo",
    hostLane,
    simulationOnly,
    nativeWorkflow: raw.native_workflow === true || raw.nativeWorkflow === true,
    caps: {
      liveChildren: safeNumber(rawCaps.live_children ?? rawCaps.liveChildren, null),
      agentBudgetDefault: safeNumber(rawCaps.agent_budget_default ?? rawCaps.agentBudgetDefault, 0) ?? 0,
    },
    lanes,
    roster: Array.isArray(raw.roster) ? raw.roster.filter((entry) => entry && typeof entry === "object") : [],
  };
};

export const defaultEnvironment = (): WorkflowEnvironment => parseEnvironment(undefined);

const preferredLane = (environment: WorkflowEnvironment): WorkflowLane => environment.hostLane ?? "codex";
const firstModel = (environment: WorkflowEnvironment, lane: WorkflowLane): string => environment.lanes[lane]?.models[0] ?? fallbackModels[lane]?.[0] ?? "";
const providerFor = (environment: WorkflowEnvironment, lane: WorkflowLane): WorkflowNode["provider"] => environment.hostLane === lane || environment.simulationOnly ? "native" : "external";

const looksLikeForeignNativeModel = (lane: string, model: string): boolean => {
  const foreignByLane: Record<string, RegExp> = {
    claude: /^(?:gpt|grok|openai\/|xai\/)/i,
    codex: /^(?:claude|grok|anthropic\/|xai\/)/i,
    grok: /^(?:gpt|claude|openai\/|anthropic\/)/i,
  };
  return foreignByLane[lane]?.test(model) ?? false;
};

const worktree = (id: string, owner: string) => ({
  root: "~/code/worktrees",
  repoPath: "{repo}",
  taskPath: `~/code/worktrees/{repo}-${id}`,
  baseRef: "origin/dev",
  branch: `codex/${id}`,
  owner,
  cleanup: "Only after human-approved merge",
});

export const defaultWorkflow = (environment: WorkflowEnvironment = defaultEnvironment()): Workflow => ({
  title: "Visual Coordinator plan",
  nodes: [
    { id: "coordinate", role: "coordinator", title: "Coordinate", task: "Resolve the plan and assign bounded work.", ownedPaths: ["tools/visual-coordinator"], lane: preferredLane(environment), provider: providerFor(environment, preferredLane(environment)), model: firstModel(environment, preferredLane(environment)), effort: "high", execution: "write", position: { x: 72, y: 74 }, worktree: worktree("coordinate", "coordinator") },
    { id: "build", role: "builder", title: "Build", task: "Implement the visual coordinator surface.", ownedPaths: ["tools/visual-coordinator/src"], lane: preferredLane(environment), provider: providerFor(environment, preferredLane(environment)), model: firstModel(environment, preferredLane(environment)), effort: "medium", execution: "write", position: { x: 390, y: 212 }, worktree: worktree("build", "builder") },
    { id: "review", role: "reviewer", title: "Review", task: "Check executable state and export readiness.", ownedPaths: ["tools/visual-coordinator/src/**/*.test.ts"], lane: preferredLane(environment), provider: providerFor(environment, preferredLane(environment)), model: firstModel(environment, preferredLane(environment)), effort: "medium", execution: "read-only-review", position: { x: 716, y: 74 }, worktree: worktree("review", "reviewer") },
  ],
  edges: [
    { id: "coordinate-build", source: "coordinate", target: "build", kind: "forward", label: "assign" },
    { id: "build-review", source: "build", target: "review", kind: "forward", label: "verify" },
    { id: "review-build", source: "review", target: "build", kind: "reject", label: "revise" },
    { id: "build-coordinate", source: "build", target: "coordinate", kind: "memory", label: "report" },
  ],
});

const safeNodeId = (value: unknown, fallback: string, used: Set<string>): string => {
  const raw = text(value).trim().toLowerCase();
  const normalized = raw.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63);
  const base = normalized || fallback;
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base.slice(0, Math.max(1, 63 - String(suffix).length - 1))}-${suffix++}`;
  used.add(id);
  return id;
};

export const parseSeed = (value: unknown, environment: WorkflowEnvironment = defaultEnvironment()): Workflow => {
  if (!value || typeof value !== "object") return defaultWorkflow(environment);
  const seed = value as Partial<Workflow>;
  const fallback = defaultWorkflow(environment);
  const usedIds = new Set<string>();
  const idMap = new Map<string, string>();
  return {
    title: typeof seed.title === "string" ? seed.title : "Visual Coordinator plan",
    nodes: Array.isArray(seed.nodes) ? seed.nodes.flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object" || typeof (candidate as WorkflowNode).id !== "string") return [];
      const node = candidate as Partial<WorkflowNode>;
      const role = member(node.role, roles, "builder");
      const originalId = text(node.id);
      const id = safeNodeId(originalId, `step-${usedIds.size + 1}`, usedIds);
      if (!idMap.has(originalId)) idMap.set(originalId, id);
      const suppliedWorktree = node.worktree && typeof node.worktree === "object" ? node.worktree : undefined;
      const legacyLane = ["control", "delivery", "quality"].includes(text(node.lane).toLowerCase());
      const lane = legacyLane ? preferredLane(environment) : laneKey(text(node.lane, preferredLane(environment)));
      const model = legacyLane ? firstModel(environment, lane) : text(node.model, firstModel(environment, lane));
      const provider = legacyLane ? providerFor(environment, lane) : member(node.provider, ["native", "external"] as const, "native");
      return [{
        id,
        role,
        title: text(node.title, id || "Untitled step"),
        task: text(node.task, "Describe the bounded outcome."),
        ownedPaths: Array.isArray(node.ownedPaths) ? node.ownedPaths.filter((path): path is string => typeof path === "string") : [],
        lane,
        provider,
        model,
        effort: member(node.effort, efforts, "medium"),
        execution: member(node.execution, executions, role === "reviewer" ? "read-only-review" : "write"),
        position: {
          x: typeof node.position?.x === "number" && Number.isFinite(node.position.x) ? node.position.x : 120,
          y: typeof node.position?.y === "number" && Number.isFinite(node.position.y) ? node.position.y : 120,
        },
        disclosure: text(node.disclosure) || undefined,
        worktree: suppliedWorktree ? {
          root: text(suppliedWorktree.root), repoPath: text(suppliedWorktree.repoPath),
          taskPath: text(suppliedWorktree.taskPath), baseRef: text(suppliedWorktree.baseRef),
          branch: text(suppliedWorktree.branch), owner: text(suppliedWorktree.owner),
          cleanup: text(suppliedWorktree.cleanup),
        } : worktree(id, id),
      }];
    }) : fallback.nodes,
    edges: Array.isArray(seed.edges) ? seed.edges.flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object" || typeof (candidate as WorkflowEdge).id !== "string") return [];
      const edge = candidate as Partial<WorkflowEdge>;
      return [{ id: text(edge.id), source: idMap.get(text(edge.source)) ?? text(edge.source), target: idMap.get(text(edge.target)) ?? text(edge.target), kind: member(edge.kind, edgeKinds, "forward"), label: text(edge.label) || undefined }];
    }) : fallback.edges,
  };
};

export const nextNodeId = (nodes: Pick<WorkflowNode, "id">[], prefix = "step") => {
  const used = new Set(nodes.map((node) => node.id));
  let index = nodes.length + 1;
  while (used.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
};

export const validateWorkflow = (workflow: Workflow, environment: WorkflowEnvironment = defaultEnvironment()): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  if (environment.simulationOnly) issues.push({ id: "environment", message: "Simulation only: attach a detected host environment before exporting or dispatching." });
  if (environment.caps.liveChildren !== null && workflow.nodes.length > environment.caps.liveChildren) {
    issues.push({ id: "live-children", message: `This plan has ${workflow.nodes.length} steps, above the ${environment.caps.liveChildren}-child safety cap reported by ${environment.harness}.` });
  }
  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
  const knownEdges = new Set<string>();
  const forward = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) issues.push({ id: edge.id, message: `Edge ${edge.id} points to a missing node.` });
    const fingerprint = `${edge.source}:${edge.target}:${edge.kind}`;
    if (knownEdges.has(fingerprint)) issues.push({ id: edge.id, message: `Duplicate ${edge.kind} edge from ${edge.source} to ${edge.target}.` });
    knownEdges.add(fingerprint);
    if (edge.kind === "forward") forward.set(edge.source, [...(forward.get(edge.source) ?? []), edge.target]);
  }
  const visiting = new Set<string>(); const visited = new Set<string>();
  const walk = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const cyclical = (forward.get(id) ?? []).some(walk);
    visiting.delete(id); visited.add(id); return cyclical;
  };
  if (workflow.nodes.some((node) => walk(node.id))) issues.push({ id: "forward-cycle", message: "Forward handoffs form a cycle; use a reject or memory edge instead." });
  for (const node of workflow.nodes) {
    const model = typeof node.model === "string" ? node.model.trim() : "";
    if (!model) issues.push({ id: node.id, message: `${node.title} needs a model.` });
    const lane = environment.lanes[node.lane];
    if (!lane) issues.push({ id: node.id, message: `${node.title} uses an undetected lane: ${node.lane}.` });
    else {
      if (lane.availability !== "available") issues.push({ id: node.id, message: `${node.title} uses ${lane.label}, which is ${lane.availability === "unknown" ? "not detected" : "unavailable"}.` });
      if (lane.inventory === "complete" && !lane.models.includes(model)) issues.push({ id: node.id, message: `${node.title} uses a model not offered by ${lane.label}: ${model || "(empty)"}.` });
      if (lane.efforts.length > 0 && !lane.efforts.includes(node.effort)) issues.push({ id: node.id, message: `${node.title} uses an effort unavailable on ${lane.label}: ${node.effort}.` });
      if (node.provider === "native" && environment.hostLane !== node.lane) issues.push({ id: node.id, message: `${node.title} marks ${lane.label} as native, but the current host is ${environment.hostLane ?? "unknown"}.` });
      if (node.provider === "native" && looksLikeForeignNativeModel(node.lane, model)) issues.push({ id: node.id, message: `${node.title} pairs a native ${lane.label} lane with a foreign model: ${model}.` });
      if (node.lane === "grok" && node.provider === "native" && model === "grok-4.5") issues.push({ id: node.id, message: `${node.title} cannot use the retired Grok 4.5 native model; choose Grok 4.6.` });
    }
    if (node.provider === "external" && !node.disclosure?.trim()) issues.push({ id: node.id, message: `${node.title} needs an external-provider disclosure.` });
    if (node.role === "reviewer" && node.execution !== "read-only-review") issues.push({ id: node.id, message: `${node.title} must use read-only review execution.` });
    if (!node.worktree || [node.worktree.root, node.worktree.repoPath, node.worktree.taskPath, node.worktree.baseRef, node.worktree.branch, node.worktree.owner, node.worktree.cleanup].some((value) => !value?.trim())) {
      issues.push({ id: node.id, message: `${node.title} has incomplete worktree metadata.` });
    } else {
      const root = node.worktree.root.replace(/\/$/, "");
      const taskPath = node.worktree.taskPath.replace(/\/$/, "");
      const hasTraversal = (value: string) => /(?:^|\/)\.\.(?:\/|$)/.test(value) || value.includes("\\");
      if (["/", "~"].includes(root) || hasTraversal(root) || hasTraversal(taskPath) || !taskPath.startsWith(`${root}/`)) {
        issues.push({ id: node.id, message: `${node.title} needs a task worktree inside its declared worktree root.` });
      }
      if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(node.worktree.branch) || hasTraversal(node.worktree.branch) || node.worktree.branch.includes("//")) {
        issues.push({ id: node.id, message: `${node.title} has an unsafe worktree branch name.` });
      }
    }
  }
  return issues;
};

export const toPlan = (workflow: Workflow) => workflow.nodes.map((node, index) => `${index + 1}. ${node.title} (${node.role}) — ${node.task}\n   Owns: ${node.ownedPaths.join(", ") || "No paths assigned"}\n   ${node.provider}/${node.model}, ${node.effort} effort, ${node.execution}`).join("\n\n");
