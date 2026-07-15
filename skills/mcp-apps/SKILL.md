---
name: mcp-apps
version: 0.1.2
description: This skill provides guidance for building MCP Apps, the official io.modelcontextprotocol/ui extension for interactive HTML interfaces inside MCP hosts. This skill should be used when the user asks to "create an MCP App", "add UI to an MCP tool", "build interactive MCP", "ui:// resource", "sandboxed iframe MCP", "interactive chat UI", "embed UI in chat", "MCP tool with interface", or needs capability negotiation, resource CSP, app-only tools, host lifecycle, or progressive text fallbacks.
---

# MCP Apps

Build MCP tools that progressively enhance into sandboxed interactive interfaces. Keep every tool useful without UI support.

## Verify the Current Baseline

Check the live packages and clone the matching official examples before implementation:

```bash
bun pm view @modelcontextprotocol/ext-apps version
bun pm view @modelcontextprotocol/sdk version
git clone --branch "v$(bun pm view @modelcontextprotocol/ext-apps version)" --depth 1 \
  https://github.com/modelcontextprotocol/ext-apps.git /tmp/mcp-ext-apps
```

The verified July 2026 baseline is Ext Apps `1.7.4` and MCP SDK `1.29.0`. Treat those as a tested snapshot, not an evergreen instruction. Use Node 20+ semantics or a compatible Bun runtime.

Prefer the installed official skills:

- `create-mcp-app` for a new server and View.
- `add-app-to-server` for an existing MCP server.
- `convert-web-app` for a standalone/MCP hybrid.

Use this skill for cross-cutting architecture, security, and generative UI integration.

## Core Contract

Pair two static server registrations:

1. A model-visible tool that returns useful text and points to a `ui://` resource through nested `_meta.ui.resourceUri`.
2. A predeclared resource that returns the HTML View with MIME type `text/html;profile=mcp-app`.

Pass dynamic data in tool results. Do not generate resource URIs per user, ticket, or request.

```typescript
const resourceUri = "ui://visual-wayfinder/decision.html";

registerAppTool(server, "open-decision", {
  description: "Open the current decision with an optional interactive view.",
  inputSchema,
  _meta: { ui: { resourceUri } },
}, async (args) => ({
  content: [{
    type: "text",
    text: summarizeDecision(await loadDecision(args)),
  }],
  structuredContent: {
    decision: await loadDecision(args),
  },
}));

registerAppResource(server, {
  uri: resourceUri,
  name: "Decision workbench",
  mimeType: RESOURCE_MIME_TYPE,
}, async () => ({
  contents: [{
    uri: resourceUri,
    mimeType: RESOURCE_MIME_TYPE,
    text: await Bun.file("dist/decision.html").text(),
    _meta: {
      ui: {
        csp: {
          connectDomains: [],
          resourceDomains: [],
        },
      },
    },
  }],
}));
```

Follow the current SDK signatures from the checked-out release. The exact resource registration overload and CSP field names are versioned APIs.

## Progressive Enhancement

Always return both:

- `content`: concise, complete text for the model and non-UI hosts.
- `structuredContent`: validated data intended for the View.

Keep both payloads bounded. Do not put secrets, credentials, unnecessary PII, or privileged tracker state into either channel. Validate `structuredContent` again in the View before rendering.

Negotiate `io.modelcontextprotocol/ui` support. Use the canonical client matrix rather than a remembered host list. When support is absent, continue through the normal text interaction or offer a standalone local/browser interface.

## Tool Visibility and Authority

Use:

- Model-visible tools to open a View or request a meaningful domain operation.
- `visibility: ["app"]` for safe UI-only actions such as submitting a draft, refreshing a read-only projection, pagination, or filtering.
- `visibility: ["model"]` for privileged filesystem, tracker, shell, or administrative operations.

Treat the View as untrusted input. Validate authorization, ownership, current revision/nonces, option IDs, numeric bounds, and domain invariants server-side. A UI submission must not bypass the normal domain workflow.

## View Lifecycle

Register all handlers before connecting:

```typescript
const app = new App({ name: "Decision workbench", version: "1.0.0" });

app.ontoolinput = (input) => renderPending(input);
app.ontoolinputpartial = (input) => renderPartial(input);
app.ontoolresult = (result) => renderResult(result);
app.onhostcontextchanged = (context) => applyHostContext(context);
app.onteardown = async () => {
  await flushSmallPendingDraft();
  return {};
};

await app.connect(new PostMessageTransport());
```

Apply host theme, fonts, safe-area insets, container dimensions, and available display modes with fallbacks. Pause expensive animation or polling when the View is not visible.

Use `viewUUID` when per-view persistence or state recovery requires a stable instance identifier. Do not treat it as universally required for every tool result.

## Packaging

Bundle JavaScript and CSS so browser imports resolve inside the sandbox. A single self-contained HTML file through Vite and `vite-plugin-singlefile` is the most portable default.

Single-file output is not itself a protocol requirement. Multiple assets can work when the resource metadata declares exact origins and the target host supports them. Prefer single-file delivery unless bundle size or asset reuse provides a concrete reason not to.

Use Bun for local project operations unless the owning project specifies another package manager:

```bash
bun add @modelcontextprotocol/ext-apps @modelcontextprotocol/sdk zod
bun add -d typescript vite vite-plugin-singlefile
bun run build
```

## CSP and Security

Declare CSP on the resource content returned to the host, following the installed SDK's current types. Start deny-by-default and add exact origins only:

- `connectDomains` for API or socket destinations.
- `resourceDomains` for scripts, styles, fonts, images, audio, or video.
- `frameDomains` only for required nested frames.

Never use wildcard or scheme-wide allowlists such as `*` or `https:`. Prefer server-side tools over direct View networking. Declare only required device permissions and handle denial.

Audit every View-initiated tool call. Keep submission tools narrow, idempotent where practical, and protected against stale views.

## Generative UI

For JSON Render, invoke `json-render-core`, `json-render-react`, and the relevant catalog skill. Add `json-render-directives` for deterministic formatting/calculation and `json-render-devtools` during development.

Pin a coherent stable JSON Render release. Use its flat `root`/`elements` React spec and validate before rendering.

Treat `@json-render/mcp@0.19.0` as scaffolding. Its helper currently serializes specs through text and uses broad CSP defaults. Wrap or replace its result/resource boundary when production requirements call for `structuredContent`, exact CSP, or app-only submission tools.

## Testing Gate

Test all of the following:

1. Text-only operation with UI capability absent.
2. Rendering in the official `basic-host`.
3. Every intended production host listed as supporting the negotiated extension.
4. Light/dark themes, narrow and fullscreen layouts, keyboard use, and reduced motion.
5. Exact CSP with no unexpected requests.
6. Invalid, oversized, stale, and unauthorized submission payloads.
7. Teardown and reconnect behavior.
8. Build output without unresolved imports or undeclared assets.

## References

- `references/patterns.md` — App-only tools, state, results, and interaction patterns.
- `references/security.md` — CSP, sandbox, validation, and threat model.
- `references/client-matrix.md` — Pointer to the canonical support matrix.
- `references/build-guide.md` — Bun-first setup and verification checklist.
- Official specification: https://modelcontextprotocol.io/extensions/apps/overview
- Official build guide: https://modelcontextprotocol.io/extensions/apps/build
- Canonical client matrix: https://modelcontextprotocol.io/extensions/client-matrix
