import type { Workflow, WorkflowEnvironment, WorkflowNode } from "./workflow-schema";

/**
 * Inputs that are known by the host of the visual coordinator.  The
 * coordinator only describes a dispatch; it never starts a process.
 */
export type CommandGenerationOptions = {
  /** The harness that owns the current session. */
  hostHarness?: string;
  /** The native harness that is supervising an external provider. */
  nativeController?: string;
  /** The configured read-only OpenCode agent, when one exists. */
  readOnlyAgent?: string;
};

export type CommandExecution = "native-agent" | "external-provider";
export type CommandPermissions = "read-only" | "workspace-write";

export type NodeCommandSpec = {
  nodeId: string;
  role: WorkflowNode["role"];
  lane: string;
  model: string;
  provider: WorkflowNode["provider"];
  execution: CommandExecution;
  /** True when the emitted request is constrained to inspection only. */
  readOnly: boolean;
  permissions: CommandPermissions;
  /** The exact prompt that a native API or external CLI would receive. */
  prompt: string;
  /** A shell-safe, descriptive command. Null means it must not be executed. */
  command: string | null;
  /** Native nodes are dispatched through the host API, not a shell command. */
  nativeController: string | null;
  /** External nodes are executable only after this disclosure is approved. */
  disclosure: string | null;
  executable: boolean;
  reason?: string;
};

export type EmittedNodeSpec = {
  id: string;
  kind: "process";
  label: string;
  lane: string;
  model: string;
  effort: WorkflowNode["effort"];
  actor: "maker" | "reviewer" | "main-controller";
  execution: CommandExecution;
  agentType: string | null;
  task: string;
  shell: boolean;
  command: string | null;
  nativeController: string | null;
  provider: string;
  disclosure: string | null;
  context: string;
  converted?: boolean;
};

export type EmittedWorkflowSpec = {
  version: 2;
  harness: string;
  name: string;
  isolation: "shared-tree" | "worktree-per-agent";
  concurrency: number;
  cwd: string;
  isolationPolicy: {
    worktreeRoot: string;
    branchTemplate: string;
    baseRef: string;
    owner: string;
    cleanupPolicy: string;
  };
  correctionBudget: { max: 1; scope: "review+deterministic-test"; exhausted: "return-to-main" };
  nodes: EmittedNodeSpec[];
  edges: Array<{
    from: string;
    to: string;
    label?: string;
    kind: Workflow["edges"][number]["kind"];
    failureOwner?: string;
    failureCondition?: string;
    correctionBudget?: "workflow";
    onExhausted?: "return-to-main";
  }>;
  gates: Array<{ id: string; command: string; correctionBudget: "workflow" }>;
  gateNode: string | null;
  worktreeLifecycle: string[];
  omissions: Array<{ id: string; kind: "node" | "edge"; label: string; reason: string; omit: true }>;
};

const NON_APPROVAL_DISCLOSURES = new Set(["pending", "denied", "missing", "required", "unapproved"]);

const isApprovedDisclosure = (disclosure: string | undefined): disclosure is string => {
  const normalized = disclosure?.trim().toLowerCase();
  return Boolean(normalized && !NON_APPROVAL_DISCLOSURES.has(normalized));
};

/**
 * Quote one argument for a POSIX shell.  Keeping this in one small function
 * makes it difficult for a future command template to accidentally put task
 * text into shell syntax.
 */
export const shellQuote = (value: string): string => {
  if (value.includes("\0")) throw new Error("Cannot shell-quote a string containing NUL.");
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
};

const worktreeHandoff = (node: WorkflowNode): string => {
  const worktree = node.worktree;
  if (!worktree) return "Prepared-worktree metadata is missing; do not edit or execute this task.";

  return [
    "Prepared worktree handoff:",
    "You are already inside the prepared worktree. Do not create a nested worktree.",
    `Repository root: ${worktree.repoPath}`,
    `Task worktree: ${worktree.taskPath}`,
    `Branch: ${worktree.branch}`,
    `Base ref: ${worktree.baseRef}`,
    `Owned paths: ${node.ownedPaths.join(", ") || "none"}`,
    `Worktree owner: ${worktree.owner}`,
    `Cleanup: ${worktree.cleanup}`,
    "Do not create or switch branches. Do not commit, push, merge, or clean up.",
  ].join("\n");
};

const taskPrompt = (node: WorkflowNode): string => {
  const readOnly = node.role === "reviewer" || node.execution === "read-only-review";
  const boundary = readOnly
    ? [
        "Read-only review boundary:",
        "Inspect the repository and diff only. Do not edit files, run write-capable commands, or alter git state.",
        "Return findings and evidence; leave the worktree exactly as you found it.",
      ].join("\n")
    : worktreeHandoff(node);

  return [
    `# ${node.title}`,
    boundary,
    "",
    `Task: ${node.task}`,
    `Owned paths: ${node.ownedPaths.join(", ") || "none"}`,
  ].join("\n");
};

const hasCompleteWorktree = (node: WorkflowNode): boolean => {
  const worktree = node.worktree;
  return Boolean(worktree && [worktree.root, worktree.repoPath, worktree.taskPath, worktree.baseRef, worktree.branch, worktree.owner, worktree.cleanup].every((value) => typeof value === "string" && value.trim().length > 0));
};

const externalCommand = (
  node: WorkflowNode,
  prompt: string,
  options: CommandGenerationOptions,
): { command: string | null; reason?: string } => {
  const readOnly = node.role === "reviewer" || node.execution === "read-only-review";
  const repo = node.worktree?.taskPath ?? node.worktree?.repoPath;
  if (!repo) return { command: null, reason: "External dispatch requires the exact prepared worktree path." };

  const model = node.model;
  const lane = node.lane.toLowerCase();
  const promptArg = shellQuote(prompt);
  const repoArg = shellQuote(repo);

  if (lane === "codex") {
    const args = ["codex", "exec", "--sandbox", readOnly ? "read-only" : "workspace-write", "--ask-for-approval", "never", "--cd", repo, "--model", model];
    return { command: `printf '%s\\n' ${promptArg} | ${args.map(shellQuote).join(" ")}` };
  }

  if (lane === "claude") {
    const args = ["claude", "--print", "--permission-mode", readOnly ? "plan" : "acceptEdits", "--model", model];
    if (readOnly) args.push("--tools", "Read,Grep,Glob");
    return { command: `cd ${repoArg} && printf '%s\\n' ${promptArg} | ${args.map(shellQuote).join(" ")}` };
  }

  if (lane === "grok") {
    const args = ["grok", "--prompt-file", "/dev/stdin", "-m", model, "--permission-mode", readOnly ? "plan" : "acceptEdits", "--sandbox", "workspace", "--output-format", "plain", "--cwd", repo];
    return { command: `printf '%s\\n' ${promptArg} | ${args.map(shellQuote).join(" ")}` };
  }

  if (lane === "opencode") {
    if (readOnly && !options.readOnlyAgent) {
      return { command: null, reason: "OpenCode has no portable read-only CLI flag; configure a read-only agent before emitting this reviewer." };
    }
    const args = ["opencode", "run", "--model", model, "--dir", repo];
    if (readOnly) args.push("--agent", options.readOnlyAgent!);
    return { command: `${args.map(shellQuote).join(" ")} ${promptArg}` };
  }

  return { command: null, reason: `No executable adapter is registered for lane ${node.lane}.` };
};

/**
 * Generate a truthful dispatch description for one canvas node.
 *
 * This is intentionally a pure function. It returns a command/spec only;
 * callers decide whether and when a human-approved workflow may run it.
 */
export const generateNodeCommand = (node: WorkflowNode, options: CommandGenerationOptions = {}): NodeCommandSpec => {
  const readOnly = node.role === "reviewer" || node.execution === "read-only-review";
  const execution: CommandExecution = node.provider === "native" ? "native-agent" : "external-provider";
  const prompt = taskPrompt(node);
  const base: NodeCommandSpec = {
    nodeId: node.id,
    role: node.role,
    lane: node.lane,
    model: node.model,
    provider: node.provider,
    execution,
    readOnly,
    permissions: readOnly ? "read-only" : "workspace-write",
    prompt,
    command: null,
    nativeController: node.provider === "native" ? options.hostHarness ?? null : options.nativeController ?? options.hostHarness ?? null,
    disclosure: node.disclosure?.trim() || null,
    executable: false,
  };

  if (!hasCompleteWorktree(node)) return { ...base, reason: "Complete prepared-worktree metadata is required before dispatch." };

  if (node.provider === "native") {
    return options.hostHarness
      ? { ...base, executable: true }
      : { ...base, reason: "Native dispatch requires the current host harness identity." };
  }

  if (!base.nativeController) {
    return { ...base, reason: "External dispatch requires a native controller identity." };
  }

  if (!isApprovedDisclosure(node.disclosure)) {
    return { ...base, reason: "External-provider disclosure must be approved before executable output is emitted." };
  }

  const generated = externalCommand(node, prompt, options);
  return {
    ...base,
    command: generated.command,
    executable: Boolean(generated.command),
    ...(generated.reason ? { reason: generated.reason } : {}),
  };
};

/** A string-only convenience for renderers that need the command line. */
export const commandForNode = (node: WorkflowNode, options: CommandGenerationOptions = {}): string | null => generateNodeCommand(node, options).command;

/** Alias for callers that describe the exported object as a spec. */
export const generateNodeSpec = generateNodeCommand;

const providerForLane: Record<string, string> = {
  claude: "anthropic",
  codex: "openai",
  grok: "xai",
  opencode: "opencode",
};

const providerForNode = (node: WorkflowNode): string => {
  if (node.lane.toLowerCase() === "opencode" && node.model.includes("/")) {
    return node.model.split("/", 1)[0] || "opencode";
  }
  return providerForLane[node.lane.toLowerCase()] ?? node.provider;
};

const actorForNode = (node: WorkflowNode): EmittedNodeSpec["actor"] =>
  node.role === "reviewer" ? "reviewer" : node.role === "coordinator" ? "main-controller" : "maker";

const rosterId = (environment: WorkflowEnvironment, node: WorkflowNode): string | null => {
  const entry = environment.roster.find((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    const record = candidate as Record<string, unknown>;
    return record.id === node.id || record.name === node.id;
  });
  if (!entry || typeof entry !== "object") return null;
  const id = (entry as Record<string, unknown>).id;
  return typeof id === "string" && id.trim() ? id : null;
};

const convertedGrokNode = (node: WorkflowNode, environment: WorkflowEnvironment): boolean =>
  node.provider === "native"
  && node.lane.toLowerCase() === "grok"
  && node.model !== "grok-4.6"
  && environment.lanes.grok?.models.includes(node.model) === true;

const worktreePolicy = (workflow: Workflow) => {
  const first = workflow.nodes.find((node) => node.worktree)?.worktree;
  if (!first) return { worktreeRoot: "", branchTemplate: "", baseRef: "", owner: "", cleanupPolicy: "" };
  const branchTemplate = first.branch.replace(/[^/]+$/, "{node}");
  return {
    worktreeRoot: first.root,
    branchTemplate,
    baseRef: first.baseRef,
    owner: first.owner,
    cleanupPolicy: first.cleanup,
  };
};

/** Serialize the live canvas into the versioned paste-back contract. */
export const serializeWorkflow = (
  workflow: Workflow,
  environment: WorkflowEnvironment,
  options: CommandGenerationOptions = {},
): EmittedWorkflowSpec => {
  const dispatchOptions = {
    ...options,
    hostHarness: options.hostHarness ?? (environment.simulationOnly ? undefined : environment.harness),
    nativeController: options.nativeController ?? (environment.simulationOnly ? undefined : environment.harness),
  };
  const emitted: EmittedNodeSpec[] = [];
  const omissions: EmittedWorkflowSpec["omissions"] = [];

  for (const original of workflow.nodes) {
    const converted = convertedGrokNode(original, environment);
    const node = converted ? { ...original, provider: "external" as const } : original;
    const lane = environment.lanes[original.lane];
    const generated = generateNodeCommand(node, dispatchOptions);
    const unavailable = lane && lane.availability !== "available";
    if (unavailable) {
      omissions.push({ id: original.id, kind: "node", label: original.title, reason: `${lane.label} is ${lane.availability === "unknown" ? "not detected" : "unavailable"}.`, omit: true });
      continue;
    }
    if (!generated.executable) {
      omissions.push({ id: original.id, kind: "node", label: original.title, reason: generated.reason ?? "The dispatch is not executable.", omit: true });
      continue;
    }
    emitted.push({
      id: original.id,
      kind: "process",
      label: original.title,
      lane: original.lane,
      model: original.model,
      effort: original.effort,
      actor: actorForNode(original),
      execution: generated.execution,
      agentType: rosterId(environment, original),
      task: original.task,
      shell: generated.command !== null,
      command: generated.command,
      nativeController: generated.nativeController,
      provider: providerForNode(original),
      disclosure: generated.disclosure,
      context: generated.prompt,
      ...(converted ? { converted: true } : {}),
    });
  }

  const emittedIds = new Set(emitted.map((node) => node.id));
  for (const edge of workflow.edges) {
    if (emittedIds.has(edge.source) && emittedIds.has(edge.target)) continue;
    const missing = [edge.source, edge.target].filter((id) => !emittedIds.has(id));
    omissions.push({
      id: edge.id,
      kind: "edge",
      label: edge.label || `${edge.source} → ${edge.target}`,
      reason: `Handoff omitted because ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not executable.`,
      omit: true,
    });
  }
  const edges = workflow.edges
    .filter((edge) => emittedIds.has(edge.source) && emittedIds.has(edge.target))
    .map((edge) => edge.kind === "reject"
    ? {
        from: edge.source,
        to: edge.target,
        ...(edge.label ? { label: edge.label } : {}),
        kind: edge.kind,
        failureOwner: edge.source,
        failureCondition: edge.label || "gate failed",
        correctionBudget: "workflow" as const,
        onExhausted: "return-to-main" as const,
      }
    : {
        from: edge.source,
        to: edge.target,
        ...(edge.label ? { label: edge.label } : {}),
        kind: edge.kind,
      });
  const policy = worktreePolicy(workflow);
  const cwd = workflow.nodes.find((node) => node.worktree?.taskPath)?.worktree?.taskPath
    ?? workflow.nodes.find((node) => node.worktree?.repoPath)?.worktree?.repoPath
    ?? ".";
  const isolation = workflow.nodes.length > 0 && workflow.nodes.every((node) => Boolean(node.worktree)) ? "worktree-per-agent" : "shared-tree";
  const concurrency = Math.min(environment.caps.liveChildren ?? emitted.length, emitted.length);
  const gates: EmittedWorkflowSpec["gates"] = [];

  return {
    version: 2,
    harness: environment.harness,
    name: workflow.title,
    isolation,
    concurrency: Math.max(0, concurrency),
    cwd,
    isolationPolicy: policy,
    correctionBudget: { max: 1, scope: "review+deterministic-test", exhausted: "return-to-main" },
    nodes: emitted,
    edges,
    gates,
    gateNode: gates[0]?.id ?? null,
    worktreeLifecycle: ["controller-creates", "maker-edits-owned-paths", "main-integrates-and-verifies", "human-approves", "cleanup-after-merge"],
    omissions,
  };
};

const edgePlanLabel = (kind: Workflow["edges"][number]["kind"]) =>
  kind === "reject" ? "fail · retry" : kind === "memory" ? "carried forward" : "";

/** Render the human plan and machine block from one serialized snapshot. */
export const toExportText = (workflow: Workflow, environment: WorkflowEnvironment, options: CommandGenerationOptions = {}): string => {
  const spec = serializeWorkflow(workflow, environment, options);
  const lines = [
    `# Workflow: ${spec.name}`,
    `Host harness: ${spec.harness}`,
    `Isolation: ${spec.isolation}`,
    `Concurrency: ${spec.concurrency}`,
    `cwd: ${spec.cwd}`,
    `Isolation policy: ${spec.isolationPolicy.worktreeRoot || "none"}; branch ${spec.isolationPolicy.branchTemplate || "none"}; base ${spec.isolationPolicy.baseRef || "none"}; owner ${spec.isolationPolicy.owner || "none"}; cleanup ${spec.isolationPolicy.cleanupPolicy || "none"}`,
    "",
    "## Graph",
    ...spec.edges.map((edge) => `- ${edge.from} —${edge.kind} · ${edge.label || edgePlanLabel(edge.kind)}→ ${edge.to}`),
    "",
    "## Nodes",
    ...spec.nodes.flatMap((node) => [
      `- **${node.label}** (${node.id})`,
      `  ${node.shell ? "SHELL-OUT" : "Native"} · ${node.provider}/${node.model} · ${node.effort} effort`,
      `  actor: ${node.actor} · execution: ${node.execution}`,
      ...(node.shell ? [`  controller: ${node.nativeController ?? "unknown"} · disclosure: ${node.disclosure ?? "none"} · context: exact prompt`, `  command: ${node.command}`] : []),
    ]),
    "",
    "## Verification gate",
    ...(spec.gates.length ? spec.gates.map((gate) => `${gate.id}: ${gate.command}`) : ["None configured."]),
    ...(spec.omissions.length ? ["", "Not emitted:", ...spec.omissions.map((item) => `- ${item.kind} · ${item.label} (${item.id}) — ${item.reason}`)] : []),
    "",
    "---",
    "",
    JSON.stringify(spec, null, 2),
  ];
  return lines.join("\n");
};
