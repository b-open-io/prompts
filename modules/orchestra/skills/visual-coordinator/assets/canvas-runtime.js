/**
 * Graph builder runtime lives in examples/graph-builder.html (self-contained).
 *
 * Copy that file into the artifact. Set window.VC_SEED to the graph for THIS
 * job (nodes + labeled edges) before the page script runs. Set window.VC_ENV
 * from detect-harness.sh (harness, models, roster, lanes, caps).
 *
 * Do not restore the old phases[] staffing list as the primary view. The
 * chart is the workflow. The inspector only staffs the selected card.
 *
 * Seed shape:
 *   {
 *     name, isolation, concurrency, cwd,
 *     nodes: [{ id, kind, x, y, label, detail, lane, model, effort,
 *               agentType, controller, provider, disclosure, context,
 *               task, gateCmd, schema, paths, command }],
 *     edges: [{ id, from, to, label, kind: "forward"|"reject"|"memory" }]
 *   }
 * Env: {
 *   harness,
 *   models: { grok, grok_effort, claude, claude_effort, codex, codex_effort,
 *             opencode, opencode_effort },
 *   roster: [{ id, display_name, avatar? }],
 *   lanes: { grok, claude, codex, opencode }  // "available" | "unavailable"
 *   caps: { live_children },
 *   cwd
 * }
 * kind on a node: source | process | gate | artifact | memory
 */
void 0;
