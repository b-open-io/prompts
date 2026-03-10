# MCP Apps Security Reference

Security is a first-class concern in MCP Apps. The sandboxed iframe model, CSP enforcement, and predeclared resource templates exist specifically to prevent malicious servers from compromising host environments.

---

## Sandbox Model

MCP App Views run in sandboxed iframes. The sandbox removes:

- **DOM access** — No access to the parent document or host window
- **Cookies and storage** — No `localStorage`, `sessionStorage`, or `document.cookie`
- **Navigation** — Cannot navigate the parent frame or open popups directly
- **Network** — No direct `fetch()` or `XMLHttpRequest` to arbitrary origins (blocked by CSP)
- **Eval** — `eval()` and `new Function()` blocked by default CSP

What the View can do:

- Render HTML/CSS/JS in the iframe
- Call tools via `app.callServerTool()` (proxied through Host)
- Open links via `app.openLink()` (Host approval required)
- Send messages via `app.sendMessage()` (Host-defined capabilities only)
- Update model context via `app.updateModelContext()`

The Host is the single choke point for all external interactions.

---

## Content Security Policy

Hosts apply a restrictive default CSP to all MCP App iframes:

```
default-src 'none';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
connect-src 'none';
frame-src 'none';
object-src 'none';
base-uri 'none';
```

`unsafe-inline` is allowed for script and style because the entire app is inlined into a single HTML file (vite-plugin-singlefile output). There are no separate script src URLs to allowlist.

`connect-src 'none'` is the critical rule. The View cannot make any network requests without explicit declaration.

### Relaxing CSP

To allow network access, declare `csp` in the tool's `_meta.ui`:

```typescript
_meta: {
  ui: {
    resourceUri: "ui://myapp/index.html",
    csp: {
      "connect-src": ["https://api.example.com"],
      "img-src": ["https://cdn.example.com", "data:"],
    },
  },
}
```

Hosts validate declared origins during pre-scan before rendering the iframe. Undeclared origins are blocked even if the View tries to reach them at runtime.

### CSP Fields

| Field | Default | Use |
|---|---|---|
| `connect-src` | `'none'` | API endpoints the View may fetch |
| `img-src` | `'self' data:` | External image sources |
| `script-src` | `'self' 'unsafe-inline'` | External script sources (rarely needed) |
| `style-src` | `'self' 'unsafe-inline'` | External style sources |
| `media-src` | `'none'` | Audio/video sources |

Only declare origins that are genuinely required. Over-broad allowlists (e.g., `*`) may be rejected by strict hosts.

---

## Hardware Permissions

Camera, microphone, and geolocation access require both declaration in `_meta.ui.permissions` and explicit user approval at runtime.

### Declaration

```typescript
_meta: {
  ui: {
    resourceUri: "ui://myapp/index.html",
    permissions: {
      camera: true,
      microphone: true,
      geolocation: false,
    },
  },
}
```

Undeclared permissions cannot be requested at runtime — the browser API will return a `NotAllowedError`.

### User Approval Flow

1. Server declares permission in manifest
2. Host pre-scans manifest during server connection
3. Host may display a permission summary to the user before the first tool call
4. View requests permission via standard Web API (`navigator.mediaDevices.getUserMedia`, `navigator.geolocation.getCurrentPosition`)
5. Host browser sandbox shows native permission dialog
6. User grants or denies
7. View receives the stream or an error

Do not assume permissions are granted. Always handle the denial case:

```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  startCapture(stream);
} catch (err) {
  if (err.name === "NotAllowedError") {
    showPermissionDeniedMessage();
  }
}
```

---

## Audit Logging

All JSON-RPC traffic between View and Host is logged by the Host. This includes:

- `tools/call` requests from the View (tool name, arguments)
- `ui/update-model-context` payloads
- `ui/open-link` requests
- `ui/message` payloads

Tool calls initiated by the model (not the View) are logged by the MCP server as usual.

Logs are accessible via host-specific tooling (e.g., Claude Desktop's activity log, VS Code's MCP output channel).

Do not put sensitive data (API keys, PII) in tool arguments or model context updates. These values appear in audit logs.

---

## Predeclared Resource Templates

`ui://` resource URIs must be predeclared in the server manifest. The Host pre-scans all declared resources before rendering any iframe.

Pre-scanning allows hosts to:

- Validate CSP declarations against known-good allowlists
- Check for malicious patterns in HTML/JS before execution
- Build an inventory of required permissions for user disclosure

**Dynamic URIs are rejected.** Do not construct `ui://` URIs at runtime or return them conditionally from tool calls. All URIs must be static strings registered at server startup via `registerAppResource`.

Example of what not to do:

```typescript
// WRONG: Dynamic URI based on user input
_meta: {
  ui: { resourceUri: `ui://myapp/${userId}/view.html` }
}
```

Correct approach — use a single URI and pass the identifier in `structuredContent`:

```typescript
// CORRECT: Static URI, dynamic data in result
_meta: {
  ui: { resourceUri: "ui://myapp/view.html" }
},
async (args) => ({
  content: [{ type: "text", text: `Viewing user ${args.userId}` }],
  structuredContent: { userId: args.userId, data: await fetchUser(args.userId) },
})
```

---

## Tool Visibility Enforcement

The Host enforces tool visibility rules. When the View calls a tool:

1. Host checks the tool's declared `visibility`
2. If `visibility` does not include `"app"`, the call is rejected with a `403`-equivalent error
3. The rejection is logged

This prevents a compromised View from calling LLM-only tools (e.g., tools that read local files, execute shell commands) that were never intended for View access.

Design principle: tools with elevated privileges (file system, shell, network) should use `visibility: ["model"]`. Only tools that are safe for the View to call directly should include `"app"` in their visibility.

---

## Origin Isolation

Each `ui://` resource is rendered with a unique opaque origin. Two different MCP App iframes cannot communicate via `postMessage` or `SharedArrayBuffer`. They are fully isolated from each other.

The Host is the only communication channel between Views and between Views and the outside world.

---

## Threat Model

| Threat | Mitigation |
|---|---|
| Malicious server exfiltrates user data via View → network | CSP `connect-src 'none'` default; declared origins pre-scanned |
| View escapes sandbox and modifies host DOM | Sandboxed iframe, no parent DOM access |
| View reads host cookies or localStorage | Sandbox removes storage access |
| View calls privileged model-only tool | Host enforces visibility at proxy layer |
| Malicious server injects code via dynamic `ui://` URI | Predeclared-only resources, pre-scanning |
| View requests undeclared hardware permissions | Browser blocks; declaration required |
| Sensitive data in audit log | Design responsibility — do not put secrets in arguments |

---

## Security Best Practices

- Keep `connect-src` declarations minimal — list only exact API origins, not wildcards
- Use `visibility: ["app"]` only for tools that are safe to call from untrusted UI code
- Never put API keys, tokens, or PII in `structuredContent` that gets displayed in the View (it may be cached or logged)
- Declare only required permissions — undeclared hardware APIs fail with a clear error rather than a silent grant
- Sign and integrity-check your HTML if distributing pre-built artifacts; hosts may verify checksums
- Treat the View as untrusted code — validate all data returned from `app.callServerTool()` before rendering
