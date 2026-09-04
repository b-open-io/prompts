import { StrictMode, useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { addEdge, applyEdgeChanges, applyNodeChanges, MarkerType, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type NodeTypes, type OnEdgesChange, type OnNodesChange } from "@xyflow/react";
import { ChevronDown, Download, PanelRight, Plus, RotateCcw } from "lucide-react";
import { Canvas } from "@/components/ai-elements/canvas";
import { Controls } from "@/components/ai-elements/controls";
import { Panel } from "@/components/ai-elements/panel";
import { Inspector } from "@/components/inspector";
import { SemanticEdge } from "@/components/semantic-edge";
import { WorkflowNode } from "@/components/workflow-node";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { generateNodeCommand } from "@/command";
import { defaultWorkflow, nextNodeId, parseEnvironment, parseSeed, toPlan, validateWorkflow, type EdgeKind, type Workflow, type WorkflowEdge, type WorkflowNode as WorkflowNodeData } from "@/workflow-schema";
import "./styles.css";

declare global { interface Window { VC_ENV?: unknown; VC_SEED?: unknown } }
type FlowNode = Node<WorkflowNodeData & { onDelete: (id: string) => void }>;
type FlowEdge = Edge<{ kind: EdgeKind; label?: string }>;
const nodeTypes = { workflow: WorkflowNode } as NodeTypes;
const edgeTypes = { semantic: SemanticEdge };

function VisualCoordinator() {
  const environment = useMemo(() => parseEnvironment(window.VC_ENV), []);
  const initial = useMemo(() => parseSeed(window.VC_SEED, environment), [environment]);
  const [title, setTitle] = useState(initial.title);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "downloaded">("idle");

  const deleteNode = useCallback((id: string) => {
    setNodes((current) => current.filter((node) => node.id !== id));
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
    setSelectedId((selected) => selected === id ? undefined : selected);
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setEdges((current) => current.filter((edge) => edge.id !== id));
    setSelectedEdgeId((selected) => selected === id ? undefined : selected);
  }, []);

  const loadWorkflow = useCallback((workflow: Workflow) => {
    setTitle(workflow.title);
    setNodes(workflow.nodes.map((node) => ({ id: node.id, type: "workflow", position: node.position, data: { ...node, onDelete: deleteNode } })));
    setEdges(workflow.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, type: "semantic", markerEnd: { type: MarkerType.ArrowClosed }, data: { kind: edge.kind, label: edge.label } })));
    setSelectedId(undefined);
    setSelectedEdgeId(undefined);
  }, [deleteNode]);

  useEffect(() => { loadWorkflow(initial); }, [initial, loadWorkflow]);

  const workflow = useMemo<Workflow>(() => ({
    title,
    nodes: nodes.map(({ data, position }) => { const { onDelete: _onDelete, ...node } = data; return { ...node, position }; }),
    edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, kind: edge.data?.kind ?? "forward", label: edge.data?.label })),
  }), [edges, nodes, title]);
  const issues = useMemo(() => validateWorkflow(workflow, environment), [environment, workflow]);
  const selected = nodes.find((node) => node.id === selectedId)?.data;
  const selectedEdge = workflow.edges.find((edge) => edge.id === selectedEdgeId);
  const commands = useMemo(() => workflow.nodes.map((node) => generateNodeCommand(node, {
    hostHarness: environment.simulationOnly ? undefined : environment.harness,
    nativeController: environment.simulationOnly ? undefined : environment.harness,
  })), [environment, workflow]);
  const commandIssues = commands.filter((command) => !command.executable).map((command) => ({ id: command.nodeId, message: command.reason ?? `${command.nodeId} is not executable.` }));
  const allIssues = [...issues, ...commandIssues];
  const exportText = `${toPlan(workflow)}\n\n---\n\n${JSON.stringify({ ...workflow, dispatch: commands }, null, 2)}`;

  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => setNodes((current) => applyNodeChanges(changes, current)), []);
  const onEdgesChange = useCallback((changes: EdgeChange<FlowEdge>[]) => setEdges((current) => applyEdgeChanges(changes, current)), []);
  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge({ ...connection, id: `edge-${crypto.randomUUID()}`, type: "semantic", markerEnd: { type: MarkerType.ArrowClosed }, data: { kind: "forward", label: "handoff" } }, current)), []);

  const addNode = () => {
    const id = nextNodeId(workflow.nodes);
    const lane = environment.hostLane ?? "codex";
    const detectedLane = environment.lanes[lane];
    const node: WorkflowNodeData = { id, role: "builder", title: "New step", task: "Describe the bounded outcome.", ownedPaths: [], lane, provider: environment.hostLane === lane || environment.simulationOnly ? "native" : "external", model: detectedLane?.models[0] ?? "", effort: detectedLane?.efforts[0] ?? "medium", execution: "write", position: { x: 180 + nodes.length * 36, y: 180 + nodes.length * 28 }, worktree: { root: "~/code/worktrees", repoPath: "{repo}", taskPath: `~/code/worktrees/{repo}-${id}`, baseRef: "origin/dev", branch: `codex/${id}`, owner: id, cleanup: "Only after human-approved merge" } };
    setNodes((current) => [...current, { id, type: "workflow", position: node.position, data: { ...node, onDelete: deleteNode } }]);
    setSelectedId(id); setInspectorOpen(true);
  };
  const updateSelected = (updated: WorkflowNodeData) => setNodes((current) => current.map((node) => node.id === updated.id ? { ...node, data: { ...updated, onDelete: deleteNode } } : node));
  const updateSelectedEdge = (updated: WorkflowEdge) => setEdges((current) => current.map((edge) => edge.id === updated.id ? { ...edge, source: updated.source, target: updated.target, data: { kind: updated.kind, label: updated.label } } : edge));
  const copyExport = async () => {
    if (allIssues.length) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(exportText);
      setCopyState("copied");
    } catch {
      const url = URL.createObjectURL(new Blob([exportText], { type: "text/markdown" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "visual-coordinator-plan.md"; anchor.click();
      URL.revokeObjectURL(url); setCopyState("downloaded");
    }
  };

  return <div className={`app-shell ${inspectorOpen ? "inspector-visible" : ""}`}>
    <header className="topbar">
      <div className="brand-lockup"><span className="eyebrow">Orchestra</span><input aria-label="Workflow title" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
      <div className="host-status"><span />{environment.simulationOnly ? "simulation only" : `${environment.harness} host`}</div>
      <div className="topbar-actions">
        <Button variant="outline" onClick={() => setInspectorOpen((open) => !open)}><PanelRight /> Inspector</Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions <ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={addNode}><Plus /> Add step</DropdownMenuItem><DropdownMenuItem onSelect={() => loadWorkflow(defaultWorkflow(environment))}><RotateCcw /> Load example</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setExportOpen(true)}><Download /> Preview export</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        <Button onClick={() => setExportOpen(true)} disabled={environment.simulationOnly}><Download /> Export plan</Button>
      </div>
    </header>
    <main className="workspace">
      <section className="canvas-pane" aria-label="Editable workflow canvas">
        <Canvas nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange as OnNodesChange} onEdgesChange={onEdgesChange as OnEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => { setSelectedId(node.id); setSelectedEdgeId(undefined); setInspectorOpen(true); }} onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedId(undefined); setInspectorOpen(true); }} onPaneClick={() => { setSelectedId(undefined); setSelectedEdgeId(undefined); }} fitViewOptions={{ padding: .22 }}>
          <Controls position="bottom-left" showInteractive={false} />
          <Panel position="top-left" className="canvas-summary"><strong>{nodes.length} steps</strong><span>{edges.length} handoffs</span><span className={allIssues.length ? "has-issues" : "ready"}>{allIssues.length ? `${allIssues.length} checks` : "Ready"}</span></Panel>
        </Canvas>
      </section>
      <section className="mobile-review" aria-label="Workflow review list"><p className="mobile-note">Review mode · edit this workflow on a wider screen.</p>{workflow.nodes.map((node, index) => <button key={node.id} onClick={() => { setSelectedId(node.id); setInspectorOpen(true); }}><span>{String(index + 1).padStart(2, "0")}</span><strong>{node.title}</strong><small>{node.task}</small></button>)}</section>
      {inspectorOpen && <Inspector node={selected} edge={selectedEdge} onNodeChange={updateSelected} onEdgeChange={updateSelectedEdge} onDeleteEdge={deleteEdge} onClose={() => setInspectorOpen(false)} environment={environment} />}
    </main>
    <Dialog open={exportOpen} onOpenChange={(open) => { setExportOpen(open); if (!open) setCopyState("idle"); }}><DialogContent className="export-dialog"><DialogHeader><DialogTitle>Export workflow</DialogTitle><DialogDescription>Human-readable staffing and executable graph data come from the same live canvas.</DialogDescription></DialogHeader>{allIssues.length > 0 && <div className="issue-list"><strong>Resolve before copying</strong><ul>{allIssues.map((issue) => <li key={`${issue.id}-${issue.message}`}>{issue.message}</li>)}</ul></div>}<pre>{exportText}</pre><DialogFooter><Button onClick={copyExport} disabled={allIssues.length > 0}>{copyState === "copied" ? "Copied" : copyState === "downloaded" ? "Downloaded" : "Copy approved spec"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><VisualCoordinator /></StrictMode>);
