export type NodeRole = "coordinator" | "builder" | "reviewer" | "external";
export type EdgeKind = "forward" | "reject" | "memory";

export type WorkflowNode = {
  id: string;
  role: NodeRole;
  title: string;
  task: string;
  ownedPaths: string[];
  lane: string;
  provider: "native" | "external";
  model: string;
  effort: "low" | "medium" | "high";
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

const worktree = (id: string, owner: string) => ({
  root: "~/code/worktrees",
  repoPath: "{repo}",
  taskPath: `~/code/worktrees/{repo}-${id}`,
  baseRef: "origin/dev",
  branch: `codex/${id}`,
  owner,
  cleanup: "Only after human-approved merge",
});

export const defaultWorkflow = (): Workflow => ({
  title: "Visual Coordinator plan",
  nodes: [
    { id: "coordinate", role: "coordinator", title: "Coordinate", task: "Resolve the plan and assign bounded work.", ownedPaths: ["tools/visual-coordinator"], lane: "control", provider: "native", model: "gpt-5.6-sol", effort: "high", position: { x: 72, y: 74 }, worktree: worktree("coordinate", "coordinator") },
    { id: "build", role: "builder", title: "Build", task: "Implement the visual coordinator surface.", ownedPaths: ["tools/visual-coordinator/src"], lane: "delivery", provider: "native", model: "gpt-5.6-luna", effort: "medium", position: { x: 390, y: 212 }, worktree: worktree("build", "builder") },
    { id: "review", role: "reviewer", title: "Review", task: "Check executable state and export readiness.", ownedPaths: ["tools/visual-coordinator/src/**/*.test.ts"], lane: "quality", provider: "native", model: "gpt-5.6-luna", effort: "medium", position: { x: 716, y: 74 }, worktree: worktree("review", "reviewer") },
  ],
  edges: [
    { id: "coordinate-build", source: "coordinate", target: "build", kind: "forward", label: "assign" },
    { id: "build-review", source: "build", target: "review", kind: "forward", label: "verify" },
    { id: "review-build", source: "review", target: "build", kind: "reject", label: "revise" },
    { id: "build-coordinate", source: "build", target: "coordinate", kind: "memory", label: "report" },
  ],
});

export const parseSeed = (value: unknown): Workflow => {
  if (!value || typeof value !== "object") return defaultWorkflow();
  const seed = value as Partial<Workflow>;
  return {
    title: typeof seed.title === "string" ? seed.title : "Visual Coordinator plan",
    nodes: Array.isArray(seed.nodes) ? seed.nodes.filter((node): node is WorkflowNode => Boolean(node && typeof node === "object" && typeof (node as WorkflowNode).id === "string")) : defaultWorkflow().nodes,
    edges: Array.isArray(seed.edges) ? seed.edges.filter((edge): edge is WorkflowEdge => Boolean(edge && typeof edge === "object" && typeof (edge as WorkflowEdge).id === "string")) : defaultWorkflow().edges,
  };
};

export const validateWorkflow = (workflow: Workflow): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
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
    if (node.provider === "external" && !node.disclosure?.trim()) issues.push({ id: node.id, message: `${node.title} needs an external-provider disclosure.` });
    if (node.provider === "native" && /^(gpt|claude|gemini)/i.test(node.model) === false) issues.push({ id: node.id, message: `${node.title} pairs a native provider with a foreign model.` });
    if (!node.worktree || [node.worktree.root, node.worktree.repoPath, node.worktree.taskPath, node.worktree.baseRef, node.worktree.branch, node.worktree.owner, node.worktree.cleanup].some((value) => !value?.trim())) issues.push({ id: node.id, message: `${node.title} has incomplete worktree metadata.` });
  }
  return issues;
};

export const toPlan = (workflow: Workflow) => workflow.nodes.map((node, index) => `${index + 1}. ${node.title} (${node.role}) — ${node.task}\n   Owns: ${node.ownedPaths.join(", ") || "No paths assigned"}\n   ${node.provider}/${node.model}, ${node.effort} effort`).join("\n\n");
