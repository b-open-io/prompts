import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WorkflowNode } from "@/workflow-schema";

type Props = { node?: WorkflowNode; onChange: (node: WorkflowNode) => void; onClose: () => void };

export function Inspector({ node, onChange, onClose }: Props) {
  const [worktreeOpen, setWorktreeOpen] = useState(false);
  if (!node) return <aside className="inspector empty"><p>Select a node to inspect its assignment and worktree details.</p></aside>;
  const update = (key: keyof WorkflowNode, value: string) => onChange({ ...node, [key]: value });
  return <aside className="inspector" aria-label="Node inspector">
    <div className="inspector-header"><div><span>Inspector</span><h2>{node.title}</h2></div><Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close inspector"><X /></Button></div>
    <label>Title<Input value={node.title} onChange={(event) => update("title", event.target.value)} /></label>
    <label>Task<Textarea value={node.task} onChange={(event) => update("task", event.target.value)} /></label>
    <label>Owned paths<Input value={node.ownedPaths.join(", ")} onChange={(event) => onChange({ ...node, ownedPaths: event.target.value.split(",").map((path) => path.trim()).filter(Boolean) })} /></label>
    <dl><div><dt>Role</dt><dd>{node.role}</dd></div><div><dt>Provider</dt><dd className={node.provider === "external" ? "external" : ""}>{node.provider} / {node.model}</dd></div><div><dt>Effort</dt><dd>{node.effort}</dd></div></dl>
    <button className="disclosure" onClick={() => setWorktreeOpen((open) => !open)}>{worktreeOpen ? <ChevronUp /> : <ChevronDown />} Worktree metadata</button>
    {worktreeOpen && node.worktree && <dl className="worktree">{Object.entries(node.worktree).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
  </aside>;
}
