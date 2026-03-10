# MCP Apps Protocol Reference

Extension ID: `io.modelcontextprotocol/ui`
Spec date: 2026-01-26
Co-authored by Anthropic and OpenAI.

---

## Capability Negotiation

### Server Declaration

Servers declare support in the `experimental` capabilities block:

```typescript
const server = new McpServer({
  name: "my-server",
  version: "1.0.0",
  capabilities: {
    experimental: {
      "io.modelcontextprotocol/ui": {
        version: "0.1",
      },
    },
  },
});
```

### Host Discovery

Hosts check for the extension key during `initialize`:

```json
{
  "method": "initialize",
  "params": {
    "capabilities": {
      "experimental": {
        "io.modelcontextprotocol/ui": { "version": "0.1" }
      }
    }
  }
}
```

If the host does not recognize `io.modelcontextprotocol/ui`, it proceeds with standard MCP behavior. All tools remain functional — only UI rendering is absent.

---

## JSON-RPC Methods

### View → Host (sent by the iframe App)

#### `ui/initialize`

Sent by the View immediately after `app.connect()` resolves. Establishes the session and requests host context.

```json
{
  "method": "ui/initialize",
  "params": {
    "clientInfo": {
      "name": "My App",
      "version": "1.0.0"
    },
    "protocolVersion": "0.1"
  }
}
```

Response:

```json
{
  "result": {
    "protocolVersion": "0.1",
    "context": {
      "theme": "dark",
      "locale": "en-US",
      "timezone": "America/New_York",
      "displayMode": "inline",
      "containerDimensions": { "width": 640, "height": 480 },
      "platform": "desktop"
    }
  }
}
```

#### `tools/call`

View-initiated tool call. The Host proxies this to the MCP server, enforcing visibility rules. Tools with `visibility: ["model"]` are rejected.

```json
{
  "method": "tools/call",
  "params": {
    "name": "my-tool",
    "arguments": { "query": "example" }
  }
}
```

Response follows standard MCP tool result shape with `content` and optional `structuredContent`.

#### `ui/message`

Arbitrary message from View to Host. Used for custom host integrations (e.g., clipboard access, native dialogs).

```json
{
  "method": "ui/message",
  "params": {
    "type": "clipboard/write",
    "data": { "text": "copied content" }
  }
}
```

Not all hosts support all message types. Check host documentation.

#### `ui/update-model-context`

Updates the context visible to the LLM without triggering a new tool call. Use to push state from the View into the conversation.

```json
{
  "method": "ui/update-model-context",
  "params": {
    "context": {
      "selected_items": ["item-1", "item-2"],
      "filter": "active"
    }
  }
}
```

The host injects this context into the model's next turn. Shape is freeform JSON.

#### `ui/open-link`

Requests the Host open a URL in the user's browser. The View cannot open links directly (no DOM navigation).

```json
{
  "method": "ui/open-link",
  "params": {
    "url": "https://example.com/report"
  }
}
```

Hosts may prompt the user before opening external links.

---

### Host → View (notifications sent to the iframe)

#### `ui/notifications/tool-input`

Sent when the model calls a tool linked to this View. Arrives before tool execution. Use for optimistic rendering or streaming UI updates.

```json
{
  "method": "ui/notifications/tool-input",
  "params": {
    "toolName": "my-tool",
    "arguments": { "query": "example" }
  }
}
```

Register handler via `app.ontoolinput`:

```typescript
app.ontoolinput = ({ toolName, arguments: args }) => {
  showLoadingState(toolName);
};
```

#### `ui/notifications/tool-result`

Sent after tool execution completes. Contains both `content` (text for model) and `structuredContent` (rich data for UI).

```json
{
  "method": "ui/notifications/tool-result",
  "params": {
    "toolName": "my-tool",
    "content": [{ "type": "text", "text": "Found 5 items" }],
    "structuredContent": {
      "items": [...],
      "total": 5
    }
  }
}
```

Register handler via `app.ontoolresult`:

```typescript
app.ontoolresult = (result) => {
  render(result.structuredContent ?? result.content);
};
```

**This handler must be set before `connect()` is called.**

#### `ui/notifications/context-update`

Sent when host context changes (e.g., user switches theme, resizes container).

```json
{
  "method": "ui/notifications/context-update",
  "params": {
    "theme": "light",
    "containerDimensions": { "width": 800, "height": 600 }
  }
}
```

Register handler via `app.onhostcontextchanged`:

```typescript
app.onhostcontextchanged = (ctx) => {
  document.documentElement.setAttribute("data-theme", ctx.theme);
};
```

#### `ui/notifications/resource-teardown`

Sent when the Host is about to destroy the iframe. Use to flush pending state.

```json
{
  "method": "ui/notifications/resource-teardown",
  "params": {}
}
```

Register handler via `app.onteardown`:

```typescript
app.onteardown = () => {
  flushPendingWrites();
};
```

---

## Tool Metadata Schema

Full `_meta.ui` schema for tool registration:

```typescript
interface AppToolMeta {
  ui: {
    resourceUri: string;          // Required. Points to ui:// resource.
    visibility?: ("model" | "app")[];  // Default: ["model", "app"]
    displayMode?: "inline" | "fullscreen" | "pip";  // Default: "inline"
    csp?: {
      "connect-src"?: string[];
      "img-src"?: string[];
      "script-src"?: string[];
      "style-src"?: string[];
      "media-src"?: string[];
    };
    permissions?: {
      camera?: boolean;
      microphone?: boolean;
      geolocation?: boolean;
    };
  };
}
```

---

## Resource Schema

`ui://` resources use the MIME type `text/html;profile=mcp-app`.

```typescript
const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";
```

Resources must be predeclared in the server manifest. Dynamic `ui://` URIs are rejected by hosts during pre-scan.

Resource URI format is freeform but must use the `ui://` scheme:

```
ui://my-server/path/to/resource.html
ui://my-server/dashboard
ui://analytics/report-viewer
```

The path is opaque to the host. Use it to organize multiple views within one server.

---

## Host Context Schema

Full `HostContext` shape returned by `ui/initialize` and `ui/notifications/context-update`:

```typescript
interface HostContext {
  theme: "light" | "dark" | "system";
  locale: string;           // BCP 47 language tag, e.g. "en-US"
  timezone: string;         // IANA timezone, e.g. "America/New_York"
  displayMode: "inline" | "fullscreen" | "pip";
  containerDimensions: {
    width: number;          // px
    height: number;         // px
  };
  platform: "desktop" | "web" | "mobile";
}
```

Not all hosts populate all fields. Always use fallbacks.

---

## Tool Result Schema

Tool handlers should return both `content` (model-visible) and `structuredContent` (UI-visible):

```typescript
interface AppToolResult {
  content: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
    | { type: "resource"; resource: { uri: string; mimeType: string; text?: string } }
  >;
  structuredContent?: Record<string, unknown>;  // Freeform JSON for the View
}
```

`structuredContent` is not sent to the model. It is only forwarded to the View via `ui/notifications/tool-result`. Use it for large datasets, binary references, or UI-specific state that would be noise in the model context.

---

## Error Handling

Tool call errors from the View follow standard JSON-RPC error shape:

```json
{
  "error": {
    "code": -32603,
    "message": "Tool execution failed",
    "data": { "details": "..." }
  }
}
```

Handle in the View:

```typescript
try {
  const result = await app.callServerTool({ name: "my-tool", arguments: args });
  render(result.structuredContent);
} catch (err) {
  showError(err.message);
}
```

---

## Protocol Version Matrix

| Protocol Version | Extension Version | Status |
|---|---|---|
| MCP 2025-11-05 | 0.1 | Current |
| MCP 2024-11-05 | — | Not supported |

Always negotiate the version explicitly. Forward-compatibility is handled via `onFallbackRequest` in the host integration layer (see `references/host-integration.md`).
