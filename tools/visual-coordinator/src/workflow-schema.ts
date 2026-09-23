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
  /** True when `models` came from the detector rather than the built-in fallback list. */
  detected: boolean;
};

export type WorkflowEnvironment = {
  harness: string;
  hostLane: WorkflowLane | null;
  simulationOnly: boolean;
  nativeWorkflow: boolean;
  creditPressure: boolean;
  /** Main-session model each lane reports as configured (`models.<lane>_default`). */
  mainModels: Record<string, string>;
  /** Absolute path of the installed run-grok-worker.sh, when the detector resolved it. */
  grokWorker: string | null;
  /** Grok auth lane whose `grok models` listing produced the Grok inventory; the wrapper must use the same one. */
  grokAuth: "grok.com" | "api" | null;
  /** Provider behind each listed custom Grok-CLI id, from its config.toml `base_url`. */
  grokModelProviders: Record<string, string>;
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

/** `graph` issues invalidate the whole workflow; `node` issues invalidate only the node named by `id`. */
export type ValidationIssue = { id: string; message: string; scope: "graph" | "node" };

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
  claude: ["claude-opus-5-5", "opus", "sonnet", "haiku", "inherit"],
  codex: ["gpt-6-sol"],
  grok: ["grok-4.7"],
  opencode: [],
};
const fallbackEfforts: WorkflowEffort[] = ["low", "medium", "high", "xhigh"];

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
  const ids = [...new Set([...knownLanes, ...Object.keys(rawLanes).map(laneKey), ...Object.keys(rawModels).filter((key) => !key.endsWith("_effort") && !key.endsWith("_default")).map(laneKey)])];
  const lanes = Object.fromEntries(ids.map((rawId) => {
    const id = laneKey(rawId);
    const modelInventory = inventoryValue(rawModels[id] ?? rawModels[rawId]);
    const detectedModels = modelInventory.values.filter((model) =>
      !isSuperseded(model) && (id !== "grok" || !model.startsWith("grok-") || model === "grok-4.7")
    );
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
      detected: detectedModels.length > 0,
    } satisfies DetectedLane];
  }));
  const mainModels = Object.fromEntries(Object.entries(rawModels)
    .filter(([key, model]) => key.endsWith("_default") && typeof model === "string" && model.trim().length > 0)
    .map(([key, model]) => [laneKey(key.slice(0, -"_default".length)), (model as string).trim()]));
  const grokWorker = typeof raw.grok_worker === "string" && /^\/[^\0\n\r'"`$\\]*\/run-grok-worker\.sh$/.test(raw.grok_worker) ? raw.grok_worker : null;
  const rawCaps = raw.caps && typeof raw.caps === "object" ? raw.caps as Record<string, unknown> : {};
  return {
    harness: harness || "demo",
    hostLane,
    simulationOnly,
    nativeWorkflow: raw.native_workflow === true || raw.nativeWorkflow === true,
    creditPressure: raw.credit_pressure === true || raw.creditPressure === true,
    mainModels,
    grokWorker,
    grokAuth: raw.grok_auth === "grok.com" || raw.grok_auth === "api" ? raw.grok_auth : null,
    grokModelProviders: raw.grok_model_providers && typeof raw.grok_model_providers === "object"
      ? Object.fromEntries(Object.entries(raw.grok_model_providers as Record<string, unknown>)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string" && /^[a-z0-9.-]+$/.test(entry[1])))
      : {},
    caps: {
      liveChildren: safeNumber(rawCaps.live_children ?? rawCaps.liveChildren, null),
      agentBudgetDefault: safeNumber(rawCaps.agent_budget_default ?? rawCaps.agentBudgetDefault, 0) ?? 0,
    },
    lanes,
    roster: Array.isArray(raw.roster) ? raw.roster.filter((entry) => entry && typeof entry === "object") : [],
  };
};

export const defaultEnvironment = (): WorkflowEnvironment => parseEnvironment(undefined);

export const SOL = "gpt-6-sol";
const isSol = (model: string) => model === SOL || model.endsWith(`/${SOL}`);
// Coding uses GPT-6 models only; the whole gpt-5.6 family is out of policy, even by explicit choice.
function isSuperseded(model: string) { return /(?:^|\/)gpt-5\.6(?:$|-)/i.test(model); }
// Provider catalogs nest ids (`openrouter/anthropic/claude-sonnet-4.5`), so match any path segment.
export const isGrokFamily = (model: string) => /(?:^|\/)grok-/i.test(model);
const isApprovedGrok = (model: string) => /(?:^|\/)grok-4\.7$/i.test(model);
const isOpus = (model: string) => /(?:^|\/)(?:claude-)?opus(?:$|[-.:@\d])/i.test(model);
const isClaudeFamily = (model: string) => /(?:^|\/)(?:anthropic\/|(?:claude|opus|sonnet|haiku)(?:$|[-.:@\d]))/i.test(model);

const preferredLane = (environment: WorkflowEnvironment): WorkflowLane => environment.hostLane ?? "codex";
const laneModels = (environment: WorkflowEnvironment, lane: WorkflowLane): string[] => environment.lanes[lane]?.models ?? fallbackModels[lane] ?? [];

// The coordinator is the current main session. Only an allowed model is picked; otherwise it stays
// empty so validation fails closed instead of drifting to the next catalog entry.
const mainModel = (environment: WorkflowEnvironment, lane: WorkflowLane): string => {
  const configured = environment.mainModels[lane];
  if (configured) return isSuperseded(configured) ? "" : configured;
  const models = laneModels(environment, lane);
  if (lane === "claude") return models.includes("inherit") ? "inherit" : "";
  // A Grok main is only ever the detector-reported default; never assume grok-4.7.
  if (lane === "grok") return "";
  return models.find(isSol) ?? "";
};

const solFor = (environment: WorkflowEnvironment, lane: WorkflowLane): string | null => {
  if (environment.lanes[lane]?.availability === "unavailable") return null;
  return laneModels(environment, lane).find(isSol) ?? null;
};

/**
 * Pick the lane that runs GPT-6 Sol, independent of which model the host lists first. A lane whose
 * Sol was actually detected on an available CLI wins over a lane that only has the fallback list.
 */
export const codingTarget = (environment: WorkflowEnvironment): { lane: WorkflowLane; model: string } => {
  const order = [...new Set([environment.hostLane, "codex", "opencode", "grok"].filter((lane): lane is string => Boolean(lane)))];
  for (const lane of order) {
    const detected = environment.lanes[lane];
    const model = detected?.detected && detected.availability === "available" ? solFor(environment, lane) : null;
    if (model) return { lane, model };
  }
  for (const lane of order) {
    const model = solFor(environment, lane);
    if (model) return { lane, model };
  }
  return { lane: "codex", model: SOL };
};

/**
 * The single node that stands for the current main session: the first native coordinator on the host
 * lane whose model is the observed host main: the detector's configured default for that lane when
 * it reports one, otherwise `grok-4.7` on a Grok host or any model elsewhere. An edited model is a
 * dispatch, never the pressure-free main session.
 */
export const mainNodeId = (workflow: Workflow, environment: WorkflowEnvironment): string | null => {
  const host = environment.hostLane;
  const observed = host ? environment.mainModels[host] : undefined;
  // A Grok host has no pressure-free main unless the detector observed its default model.
  if (host === "grok" && !observed) return null;
  return workflow.nodes.find((node) => node.role === "coordinator"
    && node.provider === "native"
    && node.lane === host
    && (observed ? node.model === observed : true))?.id ?? null;
};

/**
 * Default model for a node placed on a lane. Workers get GPT-6 Sol, or grok-4.7 only for a builder
 * pinned to the Grok lane under usage-credit pressure; otherwise the model stays empty so
 * validation fails closed.
 */
export const modelFor = (environment: WorkflowEnvironment, lane: WorkflowLane, role: NodeRole): string => {
  if (role === "coordinator") return mainModel(environment, lane);
  const models = laneModels(environment, lane);
  const sol = models.find(isSol);
  if (sol) return sol;
  if (lane === "grok" && role !== "reviewer" && environment.creditPressure) return models.find(isApprovedGrok) ?? "";
  return "";
};

/**
 * Whether a node on this lane runs natively in the host. On the Grok lane only the observed main
 * session (a coordinator on the detector's `grok_default`) is native; every other Grok-lane node is
 * dispatched through the wrapper so its model pin and credit gate apply at run time.
 */
export const runsNatively = (environment: WorkflowEnvironment, lane: WorkflowLane, model: string, role: NodeRole): boolean =>
  environment.simulationOnly || (environment.hostLane === lane && (lane !== "grok"
    || (role === "coordinator" && (model === "" || model === environment.mainModels.grok))));

const defaultProvider = (environment: WorkflowEnvironment, lane: WorkflowLane, model: string, role: NodeRole): WorkflowNode["provider"] =>
  runsNatively(environment, lane, model, role) ? "native" : "external";

const looksLikeForeignNativeModel = (lane: string, model: string): boolean => {
  const foreignByLane: Record<string, RegExp> = {
    claude: /^(?:gpt|grok|openai\/|xai\/)/i,
    codex: /^(?:claude|grok|anthropic\/|xai\/)/i,
    grok: /^(?:gpt|claude|openai\/|anthropic\/)/i,
  };
  return foreignByLane[lane]?.test(model) ?? false;
};

const rejectedDisclosures = new Set(["", "pending", "denied", "missing", "required", "unapproved"]);
const hasApprovedDisclosure = (value: string | undefined): boolean =>
  !rejectedDisclosures.has(value?.trim().toLowerCase() ?? "");

const worktree = (id: string, owner: string) => ({
  root: "~/code/worktrees",
  repoPath: "{repo}",
  taskPath: `~/code/worktrees/{repo}-${id}`,
  baseRef: "origin/dev",
  branch: `codex/${id}`,
  owner,
  cleanup: "Only after human-approved merge",
});

export const defaultWorkflow = (environment: WorkflowEnvironment = defaultEnvironment()): Workflow => {
  const host = preferredLane(environment);
  const main = mainModel(environment, host);
  const sol = codingTarget(environment);
  const solProvider = defaultProvider(environment, sol.lane, sol.model, "builder");
  return {
    title: "Visual Coordinator plan",
    nodes: [
      { id: "coordinate", role: "coordinator", title: "Coordinate", task: "Resolve the plan and assign bounded work.", ownedPaths: ["tools/visual-coordinator"], lane: host, provider: defaultProvider(environment, host, main, "coordinator"), model: main, effort: "high", execution: "write", position: { x: 72, y: 74 }, worktree: worktree("coordinate", "coordinator") },
      { id: "build", role: "builder", title: "Build", task: "Implement the visual coordinator surface.", ownedPaths: ["tools/visual-coordinator/src"], lane: sol.lane, provider: solProvider, model: sol.model, effort: "medium", execution: "write", position: { x: 390, y: 212 }, worktree: worktree("build", "builder") },
      { id: "review", role: "reviewer", title: "Review", task: "Check executable state and export readiness.", ownedPaths: ["tools/visual-coordinator/src/**/*.test.ts"], lane: sol.lane, provider: solProvider, model: sol.model, effort: "xhigh", execution: "read-only-review", position: { x: 716, y: 74 }, worktree: worktree("review", "reviewer") },
    ],
    edges: [
      { id: "coordinate-build", source: "coordinate", target: "build", kind: "forward", label: "assign" },
      { id: "build-review", source: "build", target: "review", kind: "forward", label: "verify" },
      { id: "review-build", source: "review", target: "build", kind: "reject", label: "revise" },
      { id: "build-coordinate", source: "build", target: "coordinate", kind: "memory", label: "report" },
    ],
  };
};

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
      const suppliedLane = text(node.lane).trim();
      const legacyLane = ["control", "delivery", "quality"].includes(suppliedLane.toLowerCase());
      const policyTarget = role === "coordinator"
        ? { lane: preferredLane(environment), model: mainModel(environment, preferredLane(environment)) }
        : codingTarget(environment);
      const staffFromPolicy = legacyLane || !suppliedLane;
      const lane = staffFromPolicy ? policyTarget.lane : laneKey(suppliedLane);
      const model = legacyLane ? policyTarget.model : text(node.model) || (staffFromPolicy ? policyTarget.model : modelFor(environment, lane, role));
      const provider = legacyLane ? defaultProvider(environment, lane, model, role) : member(node.provider, ["native", "external"] as const, defaultProvider(environment, lane, model, role));
      return [{
        id,
        role,
        title: text(node.title, id || "Untitled step"),
        task: text(node.task, "Describe the bounded outcome."),
        ownedPaths: Array.isArray(node.ownedPaths) ? node.ownedPaths.filter((path): path is string => typeof path === "string") : [],
        lane,
        provider,
        model,
        effort: member(node.effort, efforts, role === "reviewer" ? "xhigh" : "medium"),
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
  if (environment.simulationOnly) issues.push({ scope: "graph", id: "environment", message: "Simulation only: attach a detected host environment before exporting or dispatching." });
  if (environment.caps.liveChildren !== null && workflow.nodes.length > environment.caps.liveChildren) {
    issues.push({ scope: "graph", id: "live-children", message: `This plan has ${workflow.nodes.length} steps, above the ${environment.caps.liveChildren}-child safety cap reported by ${environment.harness}.` });
  }
  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
  const knownEdges = new Set<string>();
  const forward = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) issues.push({ scope: "graph", id: edge.id, message: `Edge ${edge.id} points to a missing node.` });
    const fingerprint = `${edge.source}:${edge.target}:${edge.kind}`;
    if (knownEdges.has(fingerprint)) issues.push({ scope: "graph", id: edge.id, message: `Duplicate ${edge.kind} edge from ${edge.source} to ${edge.target}.` });
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
  const mainId = mainNodeId(workflow, environment);
  if (workflow.nodes.some((node) => walk(node.id))) issues.push({ scope: "graph", id: "forward-cycle", message: "Forward handoffs form a cycle; use a reject or memory edge instead." });
  for (const node of workflow.nodes) {
    const model = typeof node.model === "string" ? node.model.trim() : "";
    if (!model) issues.push({ scope: "node", id: node.id, message: node.role === "coordinator"
      ? node.lane === "grok" && environment.hostLane === "grok" && !environment.mainModels.grok
        ? `${node.title} needs a model: detect-harness.sh did not report the Grok host's default model; re-run it before planning.`
        : `${node.title} needs a model.`
      : `${node.title} needs a model: ${node.lane || "this lane"} does not offer ${SOL}; choose a lane that does or set a model explicitly.` });
    if (isSuperseded(model)) issues.push({ scope: "node", id: node.id, message: `${node.title} uses ${model}; coding uses GPT-6 models only (${SOL}).` });
    // The single observed native main keeps the model the detector saw it running, even an
    // out-of-policy Grok id; every dispatch, edit, and inventory choice stays pinned.
    const observedMainModel = node.id === mainId && model !== "" && model === environment.mainModels[node.lane];
    if (isGrokFamily(model) && !isApprovedGrok(model) && !observedMainModel) issues.push({ scope: "node", id: node.id, message: `${node.title} uses ${model}; Grok is pinned to grok-4.7.` });
    if (isGrokFamily(model) && node.lane !== "grok") issues.push({ scope: "node", id: node.id, message: `${node.title} uses ${model} on the ${node.lane || "unset"} lane; Grok runs only on the Grok lane.` });
    // A Grok host's own main session is an observed fact, not a dispatch; every other Grok use needs pressure.
    const observedGrokMain = node.id === mainId && environment.hostLane === "grok";
    if (isGrokFamily(model) && !observedGrokMain && !environment.creditPressure) issues.push({ scope: "node", id: node.id, message: `${node.title} uses Grok without usage-credit pressure; route it to ${SOL}.` });
    if (node.role !== "coordinator") {
      if (node.role !== "reviewer" && isOpus(model)) issues.push({ scope: "node", id: node.id, message: `${node.title} uses Claude Opus, which is the advisor, not a coding worker; use ${SOL}.` });
      else if (node.role !== "reviewer" && (node.lane === "claude" || isClaudeFamily(model))) issues.push({ scope: "node", id: node.id, message: `${node.title} uses Claude (${model || "no model"}), which is not a coding worker; use ${SOL}.` });
      if (node.role === "reviewer" && (!isSol(model) || node.effort !== "xhigh")) issues.push({ scope: "node", id: node.id, message: `${node.title} must review on ${SOL} at xhigh.` });
    }
    const lane = environment.lanes[node.lane];
    if (!lane) issues.push({ scope: "node", id: node.id, message: `${node.title} uses an undetected lane: ${node.lane}.` });
    else {
      const detectedGrokShellOut = node.id !== mainId
        && node.provider === "native"
        && node.lane === "grok";
      if (lane.availability !== "available") issues.push({ scope: "node", id: node.id, message: `${node.title} uses ${lane.label}, which is ${lane.availability === "unknown" ? "not detected" : "unavailable"}.` });
      if (lane.inventory === "complete" && !lane.models.includes(model) && !observedMainModel) issues.push({ scope: "node", id: node.id, message: `${node.title} uses a model not offered by ${lane.label}: ${model || "(empty)"}.` });
      // The wrapper's preflight dispatches only ids its fresh `grok models` listing shows, so every Grok
      // dispatch needs that listing as evidence; an unlisted or fallback-only id is never Ready.
      if (node.lane === "grok" && node.id !== mainId && lane.inventory !== "complete" && !(lane.detected && lane.models.includes(model))) {
        issues.push({ scope: "node", id: node.id, message: `${node.title} uses ${model || "no model"} on the Grok lane, but the detector's grok models listing does not show it; re-run detect-harness.sh or choose a listed model.` });
      }
      if (lane.efforts.length > 0 && !lane.efforts.includes(node.effort)) issues.push({ scope: "node", id: node.id, message: `${node.title} uses an effort unavailable on ${lane.label}: ${node.effort}.` });
      if (node.provider === "native" && environment.hostLane !== node.lane) issues.push({ scope: "node", id: node.id, message: `${node.title} marks ${lane.label} as native, but the current host is ${environment.hostLane ?? "unknown"}.` });
      if (node.provider === "native" && !observedMainModel && !detectedGrokShellOut && looksLikeForeignNativeModel(node.lane, model)) issues.push({ scope: "node", id: node.id, message: `${node.title} pairs a native ${lane.label} lane with a foreign model: ${model}.` });
      if (detectedGrokShellOut && !hasApprovedDisclosure(node.disclosure)) issues.push({ scope: "node", id: node.id, message: `${node.title} needs an approved external-provider disclosure for this Grok CLI shell-out.` });
    }
    if (node.provider === "external" && !node.disclosure?.trim()) issues.push({ scope: "node", id: node.id, message: `${node.title} needs an external-provider disclosure.` });
    if (node.role === "reviewer" && node.execution !== "read-only-review") issues.push({ scope: "node", id: node.id, message: `${node.title} must use read-only review execution.` });
    if (!node.worktree || [node.worktree.root, node.worktree.repoPath, node.worktree.taskPath, node.worktree.baseRef, node.worktree.branch, node.worktree.owner, node.worktree.cleanup].some((value) => !value?.trim())) {
      issues.push({ scope: "node", id: node.id, message: `${node.title} has incomplete worktree metadata.` });
    } else {
      const root = node.worktree.root.replace(/\/$/, "");
      const taskPath = node.worktree.taskPath.replace(/\/$/, "");
      const hasTraversal = (value: string) => /(?:^|\/)\.\.(?:\/|$)/.test(value) || value.includes("\\");
      if (["/", "~"].includes(root) || hasTraversal(root) || hasTraversal(taskPath) || !taskPath.startsWith(`${root}/`)) {
        issues.push({ scope: "node", id: node.id, message: `${node.title} needs a task worktree inside its declared worktree root.` });
      }
      if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(node.worktree.branch) || hasTraversal(node.worktree.branch) || node.worktree.branch.includes("//")) {
        issues.push({ scope: "node", id: node.id, message: `${node.title} has an unsafe worktree branch name.` });
      }
    }
  }
  return issues;
};

export const toPlan = (workflow: Workflow) => workflow.nodes.map((node, index) => `${index + 1}. ${node.title} (${node.role}) — ${node.task}\n   Owns: ${node.ownedPaths.join(", ") || "No paths assigned"}\n   ${node.provider}/${node.model}, ${node.effort} effort, ${node.execution}`).join("\n\n");
