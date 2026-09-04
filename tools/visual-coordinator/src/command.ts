import type { WorkflowNode } from "./workflow-schema";

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
