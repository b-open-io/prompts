import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import { ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import { Toolbar } from "@/components/ai-elements/toolbar";
import { Button } from "@/components/ui/button";
import type { WorkflowNode as WorkflowNodeData } from "@/workflow-schema";

type Data = WorkflowNodeData & { onDelete: (id: string) => void };
type WorkflowFlowNode = Node<Data, "workflow">;

export function WorkflowNode({ data, selected }: NodeProps<WorkflowFlowNode>) {
  return (
    <article className={`workflow-node ${selected ? "is-selected" : ""}`}>
      <NodeResizer minWidth={220} minHeight={120} isVisible={selected} color="#e38f1a" />
      <Toolbar isVisible={selected}>
        <Button variant="ghost" size="icon-xs" aria-label={`Delete ${data.title}`} onClick={() => data.onDelete(data.id)}><Trash2 /></Button>
        <Button variant="ghost" size="icon-xs" aria-label="Node details"><MoreHorizontal /></Button>
      </Toolbar>
      <Handle type="target" position={Position.Left} />
      <header>
        <span className={`role role-${data.role}`}>{data.role}</span>
        {data.provider === "external" && <ExternalLink size={13} aria-label="External provider" />}
      </header>
      <h3>{data.title}</h3>
      <p>{data.task}</p>
      <footer><code>{data.lane}</code><code>{data.model}</code></footer>
      <Handle type="source" position={Position.Right} />
    </article>
  );
}
