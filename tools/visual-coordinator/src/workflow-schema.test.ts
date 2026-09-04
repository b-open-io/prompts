import { describe, expect, it } from "vitest";
import { defaultWorkflow, parseSeed, toPlan, validateWorkflow } from "./workflow-schema";

describe("workflow schema", () => {
  it("ships a valid example with prepared worktrees", () => {
    const workflow = defaultWorkflow();

    expect(validateWorkflow(workflow)).toEqual([]);
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
});
