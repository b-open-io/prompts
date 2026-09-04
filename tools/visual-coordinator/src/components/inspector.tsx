import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DetectedLane, EdgeKind, WorkflowEdge, WorkflowEnvironment, WorkflowEffort, WorkflowNode } from "@/workflow-schema";

type Props = {
  node?: WorkflowNode;
  edge?: WorkflowEdge;
  onNodeChange: (node: WorkflowNode) => void;
  onEdgeChange: (edge: WorkflowEdge) => void;
  onDeleteEdge: (id: string) => void;
  onClose: () => void;
  environment: WorkflowEnvironment;
};

const options = <T extends string>(values: readonly T[]) => values.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>);
const CUSTOM_MODEL = "__custom_model__";
const UNKNOWN_MODEL = "__unknown_model__";
const fallbackEfforts: WorkflowEffort[] = ["low", "medium", "high"];

const missingLane = (id: string): DetectedLane => ({
  id,
  label: id || "Unknown lane",
  availability: "unknown",
  isHost: false,
  models: [],
  efforts: fallbackEfforts,
  inventory: "incomplete",
});

const availabilityLabel = (lane: DetectedLane) => {
  if (lane.isHost) return "current host";
  if (lane.availability === "available") return "available shell-out";
  if (lane.availability === "unavailable") return "unavailable";
  return "not detected";
};

const LaneItem = ({ lane }: { lane: DetectedLane }) => (
  <SelectItem value={lane.id} disabled={lane.availability !== "available"}>
    {lane.label} · {availabilityLabel(lane)}
  </SelectItem>
);

export function Inspector({ node, edge, onNodeChange, onEdgeChange, onDeleteEdge, onClose, environment }: Props) {
  const [worktreeOpen, setWorktreeOpen] = useState(false);
  if (edge) return <aside className="inspector" aria-label="Handoff inspector">
    <div className="inspector-header"><div><span>Handoff</span><h2>{edge.label || `${edge.source} → ${edge.target}`}</h2></div><Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close inspector"><X /></Button></div>
    <label>Label<Input value={edge.label ?? ""} onChange={(event) => onEdgeChange({ ...edge, label: event.target.value })} /></label>
    <label>Semantic type<Select value={edge.kind} onValueChange={(kind) => onEdgeChange({ ...edge, kind: kind as EdgeKind })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options(["forward", "reject", "memory"] as const)}</SelectContent></Select></label>
    <dl><div><dt>From</dt><dd>{edge.source}</dd></div><div><dt>To</dt><dd>{edge.target}</dd></div></dl>
    <Button variant="outline" onClick={() => onDeleteEdge(edge.id)}><Trash2 /> Delete handoff</Button>
  </aside>;
  if (!node) return <aside className="inspector empty"><p>Select a step or handoff to inspect the assignment.</p></aside>;

  const update = <K extends keyof WorkflowNode>(key: K, value: WorkflowNode[K]) => onNodeChange({ ...node, [key]: value });
  const updateWorktree = (key: keyof NonNullable<WorkflowNode["worktree"]>, value: string) => onNodeChange({ ...node, worktree: { ...node.worktree!, [key]: value } });
  const lane = environment.lanes[node.lane] ?? missingLane(node.lane);
  const lanes = Object.values(environment.lanes);
  const hostLanes = lanes.filter((candidate) => candidate.isHost);
  const availableLanes = lanes.filter((candidate) => !candidate.isHost && candidate.availability === "available");
  const unavailableLanes = lanes.filter((candidate) => !candidate.isHost && candidate.availability !== "available");
  const modelIsPreset = lane.models.includes(node.model);
  const modelValue = modelIsPreset ? node.model : lane.inventory === "incomplete" ? CUSTOM_MODEL : UNKNOWN_MODEL;
  const efforts = lane.efforts.length > 0 ? lane.efforts : fallbackEfforts;
  const onLaneChange = (nextLane: string) => {
    const next = environment.lanes[nextLane] ?? missingLane(nextLane);
    onNodeChange({
      ...node,
      lane: nextLane,
      model: next.models[0] ?? "",
      effort: next.efforts[0] ?? "medium",
      provider: environment.hostLane === nextLane ? "native" : "external",
    });
  };

  return <aside className="inspector" aria-label="Node inspector">
    <div className="inspector-header"><div><span>Inspector</span><h2>{node.title}</h2></div><Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close inspector"><X /></Button></div>
    <label>Title<Input value={node.title} onChange={(event) => update("title", event.target.value)} /></label>
    <label>Task<Textarea value={node.task} onChange={(event) => update("task", event.target.value)} /></label>
    <label>Owned paths<Input value={node.ownedPaths.join(", ")} onChange={(event) => update("ownedPaths", event.target.value.split(",").map((path) => path.trim()).filter(Boolean))} /></label>
    <div className="field-grid">
      <label>Role<Select value={node.role} onValueChange={(role) => update("role", role as WorkflowNode["role"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options(["coordinator", "builder", "reviewer", "external"] as const)}</SelectContent></Select></label>
      <label>Execution<Select value={node.execution} onValueChange={(execution) => update("execution", execution as WorkflowNode["execution"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options(["write", "read-only-review"] as const)}</SelectContent></Select></label>
      <label>Provider<Select value={node.provider} onValueChange={(provider) => update("provider", provider as WorkflowNode["provider"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="native" disabled={environment.hostLane !== node.lane}>native · current host only</SelectItem><SelectItem value="external">external · shell-out</SelectItem></SelectContent></Select></label>
      <label>Effort<Select value={node.effort} onValueChange={(effort) => update("effort", effort as WorkflowNode["effort"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectLabel>{lane.label} presets</SelectLabel>{options(efforts)}</SelectGroup></SelectContent></Select></label>
    </div>
    <label>Lane<Select value={node.lane || UNKNOWN_MODEL} onValueChange={onLaneChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
      {hostLanes.length > 0 && <SelectGroup><SelectLabel>Current host</SelectLabel>{hostLanes.map((candidate) => <LaneItem key={candidate.id} lane={candidate} />)}</SelectGroup>}
      {availableLanes.length > 0 && <SelectGroup><SelectLabel>Available shell-out lanes</SelectLabel>{availableLanes.map((candidate) => <LaneItem key={candidate.id} lane={candidate} />)}</SelectGroup>}
      {unavailableLanes.length > 0 && <SelectGroup><SelectLabel>Unavailable or not detected</SelectLabel>{unavailableLanes.map((candidate) => <LaneItem key={candidate.id} lane={candidate} />)}</SelectGroup>}
      {!environment.lanes[node.lane] && node.lane && <SelectItem value={node.lane} disabled>{node.lane} · not detected</SelectItem>}
    </SelectContent></Select></label>
    <label>Model<Select value={modelValue} onValueChange={(model) => update("model", model === CUSTOM_MODEL ? "" : model)}><SelectTrigger><SelectValue placeholder="Choose a model" /></SelectTrigger><SelectContent>
      {lane.models.length > 0 && <SelectGroup><SelectLabel>Detected {lane.label} models</SelectLabel>{lane.models.map((model) => <SelectItem key={model} value={model}>{model}</SelectItem>)}</SelectGroup>}
      {lane.inventory === "incomplete" && <SelectGroup><SelectLabel>Fallback</SelectLabel><SelectItem value={CUSTOM_MODEL}>Custom model…</SelectItem></SelectGroup>}
      {lane.inventory === "complete" && !modelIsPreset && <SelectItem value={UNKNOWN_MODEL} disabled>Current model not detected</SelectItem>}
    </SelectContent></Select></label>
    {lane.inventory === "incomplete" && modelValue === CUSTOM_MODEL && <label>Custom model id<Input value={node.model} placeholder="provider/model or harness alias" onChange={(event) => update("model", event.target.value)} /></label>}
    {lane.inventory === "complete" && !modelIsPreset && <p className="field-warning">Choose one of the detected {lane.label} models before exporting.</p>}
    {node.provider === "external" && <label>Disclosure<Textarea value={node.disclosure ?? ""} placeholder="What leaves the host, where it goes, and user approval." onChange={(event) => update("disclosure", event.target.value)} /></label>}
    <button className="disclosure" aria-expanded={worktreeOpen} aria-controls="worktree-fields" onClick={() => setWorktreeOpen((open) => !open)}>{worktreeOpen ? <ChevronUp /> : <ChevronDown />} Worktree metadata</button>
    {worktreeOpen && node.worktree && <div id="worktree-fields" className="worktree-fields">{Object.entries(node.worktree).map(([key, value]) => <label key={key}>{key}<Input value={value} onChange={(event) => updateWorktree(key as keyof NonNullable<WorkflowNode["worktree"]>, event.target.value)} /></label>)}</div>}
  </aside>;
}
