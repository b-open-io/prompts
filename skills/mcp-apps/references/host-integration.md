# MCP Apps Host Integration Reference

This document covers the AppBridge, `@mcp-ui/client` package, and how to build a compliant MCP Apps host.

---

## AppBridge

AppBridge is the runtime component embedded in the host. It:

1. Renders the sandboxed iframe for each `ui://` resource
2. Intercepts `postMessage` from the View
3. Proxies tool calls from the View to the MCP server
4. Forwards server notifications to the View
5. Enforces security rules (visibility, CSP, permissions)

AppBridge is not a public package — it is part of the host's internal MCP Apps implementation. Understanding it helps when debugging unexpected behavior.

### Message Flow

```
View (iframe)
  │  postMessage({ method: "tools/call", params: {...} })
  ▼
AppBridge (host runtime)
  │  validates visibility, rate limits, origin
  │  forwards to MCP server
  ▼
MCP Server
  │  executes tool
  │  returns { content, structuredContent }
  ▼
AppBridge
  │  postMessage({ method: "ui/notifications/tool-result", params: {...} })
  ▼
View (iframe)
  │  app.ontoolresult fires
```

All postMessages are origin-checked. The iframe's opaque origin must match what AppBridge assigned at creation time.

---

## @mcp-ui/client

`@mcp-ui/client` is the official package for embedding MCP Apps in a host application. It provides two components:

```bash
npm install @mcp-ui/client
```

### AppRenderer (high-level)

`AppRenderer` is the recommended component for most hosts. It handles the full lifecycle: fetching the HTML resource, creating the iframe, setting up AppBridge, and managing teardown.

```tsx
import { AppRenderer } from "@mcp-ui/client";

function ChatMessage({ toolCall, toolResult }) {
  if (!toolResult._meta?.ui?.resourceUri) {
    return <TextResult content={toolResult.content} />;
  }

  return (
    <AppRenderer
      resourceUri={toolResult._meta.ui.resourceUri}
      toolResult={toolResult}
      mcpClient={mcpClient}
      hostContext={{
        theme: userPrefs.theme,
        locale: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        displayMode: "inline",
        containerDimensions: { width: containerRef.current.width, height: 480 },
        platform: "desktop",
      }}
      onToolCall={(toolName, args) => {
        // Called when View initiates a tool call
        return mcpClient.callTool(toolName, args);
      }}
      onLinkOpen={(url) => {
        window.open(url, "_blank", "noopener");
      }}
    />
  );
}
```

Props:

| Prop | Type | Required | Description |
|---|---|---|---|
| `resourceUri` | `string` | Yes | `ui://` resource URI |
| `toolResult` | `AppToolResult` | Yes | Initial tool result to send to View |
| `mcpClient` | `McpClient` | Yes | Connected MCP client for proxying tool calls |
| `hostContext` | `HostContext` | Yes | Theme, locale, dimensions, etc. |
| `onToolCall` | `(name, args) => Promise<result>` | Yes | Tool call proxy handler |
| `onLinkOpen` | `(url) => void` | No | URL open handler |
| `onMessage` | `(msg) => void` | No | `ui/message` handler |
| `onModelContextUpdate` | `(ctx) => void` | No | Model context update handler |

### AppFrame (low-level)

`AppFrame` gives full control over the iframe lifecycle. Use when `AppRenderer` does not fit your host's architecture.

```tsx
import { AppFrame, createAppBridge } from "@mcp-ui/client";
import { useRef, useEffect } from "react";

function CustomAppHost({ resourceUri, htmlContent, mcpClient }) {
  const frameRef = useRef(null);

  useEffect(() => {
    if (!frameRef.current) return;

    const bridge = createAppBridge({
      frame: frameRef.current,
      mcpClient,
      hostContext: {
        theme: "dark",
        locale: "en-US",
        timezone: "UTC",
        displayMode: "fullscreen",
        containerDimensions: { width: 1200, height: 800 },
        platform: "web",
      },
    });

    bridge.initialize();

    return () => bridge.destroy();
  }, []);

  return (
    <AppFrame
      ref={frameRef}
      html={htmlContent}
      sandbox="allow-scripts allow-same-origin"
      csp={buildCspString(toolMeta.ui.csp)}
    />
  );
}
```

`createAppBridge` returns:
- `initialize()` — Sends `ui/initialize` to the View
- `sendToolResult(result)` — Forwards a tool result notification
- `sendContextUpdate(ctx)` — Sends a context update notification
- `sendTeardown()` — Sends the teardown notification
- `destroy()` — Tears down the bridge and removes event listeners

---

## onFallbackRequest

Use `onFallbackRequest` to handle forward-compatibility. When the View sends an unknown `ui/` method, `onFallbackRequest` fires instead of throwing an error:

```typescript
const bridge = createAppBridge({
  frame: frameRef.current,
  mcpClient,
  hostContext,
  onFallbackRequest: (method, params) => {
    console.warn("Unhandled MCP Apps method:", method, params);
    // Return null to send a "not supported" response to the View
    return null;
  },
});
```

This allows Views built against newer protocol versions to degrade gracefully on older hosts.

---

## Sandbox Proxy HTML

Some hosts (especially web-based) cannot load `ui://` resources directly because browsers do not understand the `ui://` scheme. The solution is a sandbox proxy: a host-served HTML page that the iframe actually loads, which then renders the MCP App content.

Pattern:

1. Host serves a static `sandbox-proxy.html` from its own origin
2. `<iframe src="/sandbox-proxy.html">` loads the proxy
3. Proxy receives the App HTML via `postMessage` from AppBridge
4. Proxy writes the HTML into an inner iframe using a `blob:` URL

```html
<!-- sandbox-proxy.html -->
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; frame-src blob:;">
</head>
<body>
  <iframe id="app-frame" style="width:100%;height:100%;border:none;"></iframe>
  <script>
    window.addEventListener("message", (event) => {
      if (event.data.type !== "mcp-app-init") return;
      const blob = new Blob([event.data.html], { type: "text/html" });
      document.getElementById("app-frame").src = URL.createObjectURL(blob);
    });
  </script>
</body>
</html>
```

AppBridge sends the HTML to the proxy:

```typescript
frame.contentWindow.postMessage(
  { type: "mcp-app-init", html: appHtmlContent },
  proxyOrigin
);
```

The proxy approach ensures the App runs with an opaque origin, preventing it from accessing the host's cookies or localStorage.

---

## basic-host Example

The `@mcp-ui/client` package ships a `basic-host` example showing a minimal compliant host:

```
@mcp-ui/client/examples/basic-host/
├── index.html
├── src/
│   ├── main.ts          — MCP client setup + tool call handling
│   ├── chat.ts          — Simple chat UI
│   └── renderer.ts      — AppRenderer integration
└── vite.config.ts
```

To run:

```bash
cd node_modules/@mcp-ui/client/examples/basic-host
npm install
npm run dev
```

Point it at any MCP server that exposes `ui://` resources.

---

## Resource Fetching

The Host fetches `ui://` resources via a standard MCP `resources/read` call:

```json
{
  "method": "resources/read",
  "params": {
    "uri": "ui://myapp/index.html"
  }
}
```

The server returns the HTML as `text/html;profile=mcp-app`:

```json
{
  "result": {
    "contents": [
      {
        "uri": "ui://myapp/index.html",
        "mimeType": "text/html;profile=mcp-app",
        "text": "<!DOCTYPE html>..."
      }
    ]
  }
}
```

Hosts cache this response. The HTML is fetched once and reused for subsequent renders of the same resource.

---

## Container Dimensions

Pass accurate dimensions so the View can layout correctly:

```typescript
hostContext: {
  containerDimensions: {
    width: containerElement.offsetWidth,
    height: containerElement.offsetHeight,
  },
}
```

Send a context update when the container resizes:

```typescript
const observer = new ResizeObserver(([entry]) => {
  bridge.sendContextUpdate({
    containerDimensions: {
      width: entry.contentRect.width,
      height: entry.contentRect.height,
    },
  });
});
observer.observe(containerElement);
```

---

## Iframe Lifecycle Events

Monitor iframe health:

```typescript
frameRef.current.addEventListener("load", () => {
  bridge.initialize();
});

frameRef.current.addEventListener("error", (err) => {
  console.error("MCP App iframe failed to load:", err);
  showFallbackContent();
});
```

Always handle the error case. The iframe may fail to load if:
- The `ui://` resource returns an error
- The HTML is malformed
- CSP blocks a required resource

---

## Host Capability Declaration

Hosts declare their MCP Apps support during `initialize`:

```json
{
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-05",
    "capabilities": {
      "experimental": {
        "io.modelcontextprotocol/ui": { "version": "0.1" }
      }
    },
    "clientInfo": { "name": "MyHost", "version": "1.0.0" }
  }
}
```

Servers that receive this capability know UI rendering is available. They can conditionally include `_meta.ui` in tool registrations.
