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
import { defaultWorkflow, parseSeed, toPlan, validateWorkflow, type EdgeKind, type Workflow, type WorkflowNode as WorkflowNodeData } from "@/workflow-schema";
import "./styles.css";

declare global { interface Window { VC_ENV?: { harness?: string }; VC_SEED?: unknown } }
type FlowNode = Node<WorkflowNodeData & { onDelete: (id: string) => void }>;
type FlowEdge = Edge<{ kind: EdgeKind; label?: string }>;
const nodeTypes = { workflow: WorkflowNode } as NodeTypes;
const edgeTypes = { semantic: SemanticEdge };

function VisualCoordinator() {
  const initial = useMemo(() => parseSeed(window.VC_SEED), []);
  const [title, setTitle] = useState(initial.title);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  const deleteNode = useCallback((id: string) => {
    setNodes((current) => current.filter((node) => node.id !== id));
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
    setSelectedId((selected) => selected === id ? undefined : selected);
  }, []);

  const loadWorkflow = useCallback((workflow: Workflow) => {
    setTitle(workflow.title);
    setNodes(workflow.nodes.map((node) => ({ id: node.id, type: "workflow", position: node.position, data: { ...node, onDelete: deleteNode } })));
    setEdges(workflow.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, type: "semantic", markerEnd: { type: MarkerType.ArrowClosed }, data: { kind: edge.kind, label: edge.label } })));
    setSelectedId(undefined);
  }, [deleteNode]);

  useEffect(() => { loadWorkflow(initial); }, [initial, loadWorkflow]);

  const workflow = useMemo<Workflow>(() => ({
    title,
    nodes: nodes.map(({ data, position }) => { const { onDelete: _onDelete, ...node } = data; return { ...node, position }; }),
    edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, kind: edge.data?.kind ?? "forward", label: edge.data?.label })),
  }), [edges, nodes, title]);
  const issues = useMemo(() => validateWorkflow(workflow), [workflow]);
  const selected = nodes.find((node) => node.id === selectedId)?.data;
  const exportText = `${toPlan(workflow)}\n\n---\n\n${JSON.stringify(workflow, null, 2)}`;

  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => setNodes((current) => applyNodeChanges(changes, current)), []);
  const onEdgesChange = useCallback((changes: EdgeChange<FlowEdge>[]) => setEdges((current) => applyEdgeChanges(changes, current)), []);
  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge({ ...connection, id: `edge-${crypto.randomUUID()}`, type: "semantic", markerEnd: { type: MarkerType.ArrowClosed }, data: { kind: "forward", label: "handoff" } }, current)), []);

  const addNode = () => {
    const id = `step-${nodes.length + 1}`;
    const node: WorkflowNodeData = { id, role: "builder", title: "New step", task: "Describe the bounded outcome.", ownedPaths: [], lane: "delivery", provider: "native", model: "gpt-5.6-luna", effort: "medium", position: { x: 180 + nodes.length * 36, y: 180 + nodes.length * 28 }, worktree: { root: "~/code/worktrees", repoPath: "{repo}", taskPath: `~/code/worktrees/{repo}-${id}`, baseRef: "origin/dev", branch: `codex/${id}`, owner: id, cleanup: "Only after human-approved merge" } };
    setNodes((current) => [...current, { id, type: "workflow", position: node.position, data: { ...node, onDelete: deleteNode } }]);
    setSelectedId(id); setInspectorOpen(true);
  };
  const updateSelected = (updated: WorkflowNodeData) => setNodes((current) => current.map((node) => node.id === updated.id ? { ...node, data: { ...updated, onDelete: deleteNode } } : node));
  const copyExport = async () => { if (!issues.length) await navigator.clipboard.writeText(exportText); };

  return <div className={`app-shell ${inspectorOpen ? "inspector-visible" : ""}`}>
    <header className="topbar">
      <div className="brand-lockup"><span className="eyebrow">Orchestra</span><input aria-label="Workflow title" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
      <div className="host-status"><span />{window.VC_ENV?.harness ?? "demo"} host</div>
      <div className="topbar-actions">
        <Button variant="outline" onClick={() => setInspectorOpen((open) => !open)}><PanelRight /> Inspector</Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions <ChevronDown /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={addNode}><Plus /> Add step</DropdownMenuItem><DropdownMenuItem onSelect={() => loadWorkflow(defaultWorkflow())}><RotateCcw /> Load example</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setExportOpen(true)}><Download /> Preview export</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        <Button onClick={() => setExportOpen(true)}><Download /> Export plan</Button>
      </div>
    </header>
    <main className="workspace">
      <section className="canvas-pane" aria-label="Editable workflow canvas">
        <Canvas nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange as OnNodesChange} onEdgesChange={onEdgesChange as OnEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => { setSelectedId(node.id); setInspectorOpen(true); }} onPaneClick={() => setSelectedId(undefined)} fitViewOptions={{ padding: .22 }}>
          <Controls position="bottom-left" showInteractive={false} />
          <Panel position="top-left" className="canvas-summary"><strong>{nodes.length} steps</strong><span>{edges.length} handoffs</span><span className={issues.length ? "has-issues" : "ready"}>{issues.length ? `${issues.length} checks` : "Ready"}</span></Panel>
        </Canvas>
      </section>
      <section className="mobile-review" aria-label="Workflow review list"><p className="mobile-note">Review mode · edit this workflow on a wider screen.</p>{workflow.nodes.map((node, index) => <button key={node.id} onClick={() => { setSelectedId(node.id); setInspectorOpen(true); }}><span>{String(index + 1).padStart(2, "0")}</span><strong>{node.title}</strong><small>{node.task}</small></button>)}</section>
      {inspectorOpen && <Inspector node={selected} onChange={updateSelected} onClose={() => setInspectorOpen(false)} />}
    </main>
    <Dialog open={exportOpen} onOpenChange={setExportOpen}><DialogContent className="export-dialog"><DialogHeader><DialogTitle>Export workflow</DialogTitle><DialogDescription>Human-readable staffing and executable graph data come from the same live canvas.</DialogDescription></DialogHeader>{issues.length > 0 && <div className="issue-list"><strong>Resolve before copying</strong><ul>{issues.map((issue) => <li key={`${issue.id}-${issue.message}`}>{issue.message}</li>)}</ul></div>}<pre>{exportText}</pre><DialogFooter><Button onClick={copyExport} disabled={issues.length > 0}>Copy approved spec</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><VisualCoordinator /></StrictMode>);
