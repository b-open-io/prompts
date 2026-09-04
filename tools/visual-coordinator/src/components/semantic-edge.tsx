import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import type { EdgeKind } from "@/workflow-schema";

type Data = { kind: EdgeKind; label?: string };

export function SemanticEdge(props: EdgeProps) {
  const data = props.data as Data | undefined;
  const [path, labelX, labelY] = getBezierPath(props);
  const kind = data?.kind ?? "forward";
  return <>
    <BaseEdge id={props.id} path={path} className={`semantic-edge ${kind}`} />
    {data?.label && <EdgeLabelRenderer><span className={`edge-label ${kind}`} style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}>{data.label}</span></EdgeLabelRenderer>}
  </>;
}
