---
name: visual-wayfinder
description: This skill should be used when the user asks to "open Visual Wayfinder", "answer a Wayfinder ticket visually", "turn this decision into a configurator", "show Wayfinder choices as a dashboard", "prototype the Wayfinder questionnaire", or wants interactive choice cards, tradeoff controls, rankings, ranges, toggles, and consequence previews for one active Wayfinder decision. It wraps the Wayfinder skill and JSON Render; it never replaces the tracker or resolves more than the active decision.
---

# Visual Wayfinder

Turn one active Wayfinder decision ticket into a focused visual workbench. Preserve Wayfinder as the planner and tracker authority. Use JSON Render only for the dynamic decision canvas, then return a renderer-independent semantic answer to Wayfinder.

## Load dependencies first

Read the installed **Wayfinder** skill completely before acting. Treat every Wayfinder invariant as authoritative, including ticket claiming, one-ticket scope, HITL behavior, resolution comments, map updates, fog graduation, and concurrency.

For implementation work, also read the current installed skills for:

- `json-render-core`
- the selected renderer, normally `json-render-react`
- `json-render-shadcn` when using its components
- `json-render-mcp` and `mcp-apps` when embedding the workbench in an MCP host
- `generative-ui` when designing or changing the catalog

Stop and report the missing dependency when Wayfinder is unavailable. Fall back to a text conversation when a renderer or visual host is unavailable.

## Preserve the boundary

Apply these invariants throughout:

1. Work on exactly one claimed Wayfinder ticket. Never chart a second map, select a different ticket, or answer surrounding fog from the canvas.
2. Keep the issue tracker canonical. Treat UI state as a draft, never as the recorded decision.
3. Keep the shell static and the decision canvas generative. Do not let generated JSON create navigation, tracker calls, arbitrary links, or the submit boundary.
4. Generate only from a fixed, allowlisted component catalog. Never render arbitrary HTML, JavaScript, URLs, tool names, or code supplied by the model.
5. Return a semantic answer envelope independent of JSON Render. Never persist the rendered component tree as the decision.
6. Validate ticket identity and expected revision at submission time. Reject stale drafts instead of overwriting concurrent tracker changes.
7. Always retain a complete text path. Visual interaction is progressive enhancement, not a prerequisite for resolving a ticket.
8. Never invent a completion percentage. Wayfinder's fog makes total progress unknowable.

## Decide whether visualization helps

Use a visual workbench when the decision benefits from comparing alternatives or manipulating several coupled settings. Prefer plain conversation for a single obvious yes/no question, a sensitive disclosure, an open-ended conceptual answer, or any case where controls would add ceremony without improving judgment.

Map question shapes to controls:

| Decision shape | Preferred control |
| --- | --- |
| Pick one path | `ChoiceCards` |
| Select several constraints | `ToggleGroup` |
| Order priorities | `RankList` |
| Set a bounded preference | `RangeControl` |
| Compare consequences | `TradeoffTable` |
| Explain nuance | `TextResponse` |
| Inspect derived effects | `ConsequencePanel` |

Combine controls only when their state contributes to the same ticket answer.

## Build the workbench

### 1. Orient through Wayfinder

Load the map at low resolution, select or accept the active frontier ticket, and claim it through the tracker before generating UI. Read related tickets only as needed. Extract:

- destination and map title;
- active ticket name, question, URL, identity, and revision marker;
- relevant decisions so far;
- constraints and terminology required to answer this ticket;
- question type and allowed answer shape.

Do not expose unrelated ticket bodies or secrets to the renderer prompt.

### 2. Define the semantic answer first

Choose the answer envelope fields before selecting components. Keep choices identified by stable semantic keys rather than labels or element IDs. Define every control's units, bounds, direction, empty value, and default semantics; never make the renderer guess whether a larger number means more autonomy, more confirmation, or more risk. Read `references/answer-envelope.md` for the schema and validation rules.

### 3. Compose a static shell

Render destination, ticket identity, concise context, draft status, fallback access, and the final submit control outside JSON Render. Label the generated area as the decision workbench. Keep tracker mutation and navigation in host-owned code.

### 4. Generate the canvas

Expose only this minimal catalog unless a ticket clearly needs another reviewed component:

- `Stack`, `Grid`, `Section`, `Text`, `Notice`
- `ChoiceCards`, `ToggleGroup`, `RankList`, `RangeControl`
- `TradeoffTable`, `ConsequencePanel`, `TextResponse`

Do not register a generic `Button`, `Link`, iframe, HTML block, code runner, file picker, or tool-call component in the generated catalog. Implement deterministic consequences as registered functions or reviewed directives. Keep business rules and tracker operations outside model-generated expressions.

Generate the current flat JSON Render form with a string `root` and `elements` map. Read `references/json-render-spec.md` before producing or implementing a spec.

### 5. Validate before rendering

Validate the spec against the catalog and reject unknown types, actions, state paths, URLs, or oversized content. Apply only known lossless repairs. Regenerate once when validation fails; then switch to the semantic text fallback. Never show a broken or partially trusted canvas as authoritative.

### 6. Preview consequences

Recompute previews locally from answer state. Mark estimates and assumptions plainly. Present effects as decision support, not predictions of fact. Preserve manual rationale even when the preview suggests a different choice.

### 7. Submit through the static boundary

Have the host-owned submit action:

1. validate required fields;
2. construct the semantic answer envelope;
3. compare the ticket identity and expected revision;
4. show a human-readable review;
5. hand the answer back to the active Wayfinder session.

Let Wayfinder decide whether more grilling is needed. Only Wayfinder records the resolution comment, closes the ticket, updates Decisions-so-far, and graduates fog.

## Deliver without a build step

Treat the skill itself as build-free. Produce a JSON spec, semantic answer, or static HTML asset as appropriate. Add a compiled application only when an owning host explicitly requests one.

For Agent Master or another plugin-settings host, expose a lightweight **Open Visual Wayfinder** link from the skill's settings/detail surface. Point the link to a host route or served bundled demo asset; do not require Visual Wayfinder to own a separate build. Keep this integration optional so CLI and unsupported desktop hosts retain the text path. Read `references/architecture.md` before wiring a host.

## Embed as an MCP App

Negotiate `io.modelcontextprotocol/ui` support before returning a UI resource. Return useful text content and structured semantic data on every path. Serve a static `ui://` resource, deliver dynamic ticket/spec data through `structuredContent`, use exact CSP allowlists, and mark draft/submit helpers app-only. Keep tracker administration and privileged Wayfinder tools unavailable to the iframe.

Use a local browser asset or text exchange when the host lacks MCP Apps support. Never assume a particular desktop client implements the extension.

## Meet interaction quality standards

Preserve keyboard operation, visible focus, labels, fieldsets, sufficient contrast, reduced-motion behavior, and error announcements. Do not encode choice only through color. Provide an explicit Other path and a rationale field whenever predefined choices may be incomplete. Preserve draft state locally per ticket without treating it as tracker state.

## Resources

- `references/architecture.md` — ownership boundaries, lifecycle, host linking, MCP delivery, and threat model.
- `references/answer-envelope.md` — renderer-independent answer contract and validation.
- `references/json-render-spec.md` — safe catalog guidance and current flat-spec examples.
- `assets/visual-wayfinder-demo.html` — polished build-free interactive example; open directly in a browser to inspect the intended experience.
