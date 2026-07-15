# Visual Wayfinder architecture

Read this reference when implementing a renderer, MCP App, Agent Master link, or tracker adapter.

## Ownership model

Keep five layers distinct:

| Layer | Owns | Must not own |
| --- | --- | --- |
| Wayfinder | map lifecycle, claim, ticket question, resolution, fog | UI draft state |
| Tracker adapter | issue reads/writes, dependencies, revision checks | question interpretation |
| Visual Wayfinder host | static shell, draft lifecycle, validation, submission review | ticket closure policy |
| JSON Render canvas | allowlisted layout and answer controls | navigation, arbitrary tools, tracker writes |
| Answer envelope | semantic user intent | component IDs or visual layout |

Treat the tracker issue as the source of truth. Treat the local draft as disposable and the rendered spec as replaceable.

## One-ticket lifecycle

1. Let Wayfinder select and claim one ticket.
2. Snapshot ticket identity, URL, title, question, and revision.
3. Define the semantic answer contract.
4. Generate and validate the decision canvas.
5. Collect state locally and compute previews deterministically.
6. Prepare an answer envelope through the host-owned submit boundary.
7. Re-read or revision-check the active ticket.
8. Return the envelope to Wayfinder.
9. Let Wayfinder continue grilling or record and close the ticket.
10. Discard or archive the draft after confirmed resolution.

Never close an issue directly from a generated event. Never resolve a second ticket in the same visual session.

## Static shell versus generated canvas

Keep these elements static and host-owned:

- map and ticket identity;
- destination and relevant prior decisions;
- stale-draft and validation errors;
- text fallback;
- reset/regenerate controls;
- submit/review control;
- external navigation and tracker links.

Allow JSON Render to arrange only reviewed decision primitives. Omit general-purpose buttons and links from the catalog. This prevents an otherwise valid generated spec from impersonating submission or navigation.

## Consequence preview

Register deterministic functions by name. Accept only expression arguments that resolve from allowlisted answer-state paths. Keep prices, permissions, policy, tracker status, and other authoritative data in host state.

Label every preview value as one of:

- **Derived** — deterministic from current controls;
- **Estimated** — based on documented assumptions;
- **Unknown** — requires research or another Wayfinder ticket.

Never turn an unknown into an invented score. If a consequence affects a different unresolved decision, surface it as context for Wayfinder rather than answering that ticket in place.

## Agent Master / plugin settings integration

Keep Visual Wayfinder build-free. Add integration in the owning desktop/configurator application rather than adding an application build to this skill.

Recommended settings detail affordances:

- **Open interactive example** — serve or open `assets/visual-wayfinder-demo.html`.
- **Open current decision** — route to the host's Visual Wayfinder surface when an active map/ticket is available.
- **Renderer status** — show JSON Render and MCP App capability/version detection.
- **Fallback** — open the current task with a prefilled `$visual-wayfinder` prompt.

Prefer an optional metadata or route registration understood by Agent Master. Avoid hard-coded filesystem URLs in a distributed plugin. Resolve the installed skill root at runtime, then serve the asset through the application's existing UI server or copy it during the host's existing build.

Do not add a separate build step solely for the skill. A static HTML demo and the host's existing UI server are sufficient.

## MCP Apps delivery

Use MCP Apps only after capability negotiation. Follow the current MCP Apps and JSON Render MCP skills rather than copying protocol constants here.

Apply these durable rules:

- Predeclare a static `ui://` resource for the application shell.
- Return useful text `content` plus validated `structuredContent`.
- Send dynamic map, ticket, spec, state, and answer schema as structured data.
- Keep CSP allowlists exact and minimize external origins.
- Mark draft, preview, and submit-envelope tools app-only.
- Keep tracker mutation tools model-only and outside iframe reach.
- Include a canvas/session nonce and expected ticket revision.
- Validate every UI-originated tool argument on the server.
- Log submission attempts without secrets or unnecessary answer content.
- Preserve local-browser and text fallbacks.

Return the same semantic envelope from MCP, local-browser, and text paths.

## Failure behavior

| Failure | Response |
| --- | --- |
| UI capability unavailable | Continue in text with the same answer schema |
| Spec invalid after one retry | Render a static semantic form or use text |
| Ticket revision changed | Block submission, reload context, preserve draft |
| Generated component unavailable | Reject spec; never silently substitute semantics |
| Preview calculation fails | Mark preview unknown; keep answer controls usable |
| Tracker write fails | Keep envelope and draft; do not claim resolution |
| Active ticket closes elsewhere | Stop submission and return to Wayfinder frontier selection |

## Security review checklist

- Confirm no arbitrary HTML, URL, script, or tool-name props.
- Confirm generated elements cannot submit or navigate.
- Confirm state paths are confined to `/answer` and read-only `/context`.
- Confirm ticket identity and revision are host-supplied, not model-supplied.
- Confirm rationale and Other text are escaped at every render boundary.
- Confirm secrets and unrelated issue bodies never enter the prompt or iframe.
- Confirm tracker tools remain inaccessible from app-only tool calls.
