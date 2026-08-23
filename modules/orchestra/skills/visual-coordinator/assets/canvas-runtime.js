/**
 * Graph builder runtime lives in examples/graph-builder.html (self-contained).
 *
 * Copy that file into the artifact. Set window.VC_SEED to the graph for THIS
 * job (nodes + labeled edges) before the page script runs. Set window.VC_ENV
 * from detect-harness.sh (harness, models, roster).
 *
 * Do not restore the old phases[] staffing list as the primary view. The
 * chart is the workflow. The inspector only staffs the selected card.
 *
 * Seed shape:
 *   {
 *     name, isolation, concurrency,
 *     nodes: [{ id, kind, x, y, label, detail, lane, model, effort, agentType, task, gateCmd }],
 *     edges: [{ id, from, to, label, kind: "forward"|"reject"|"memory" }]
 *   }
 * kind on a node: source | process | gate | artifact | memory
 */
void 0;
