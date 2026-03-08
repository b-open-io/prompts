# MCP Apps Patterns Reference

Common patterns for building production MCP Apps.

---

## App-Only Tools

Use `visibility: ["app"]` for tools that are pure UI interactions — pagination, sorting, drill-down, filter toggles. These tools never appear in the model's tool list and cannot be called by the LLM.

```typescript
registerAppTool(
  server,
  "load-page",
  {
    description: "Load a page of results",
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number" },
        pageSize: { type: "number" },
      },
      required: ["page"],
    },
    _meta: {
      ui: {
        resourceUri: "ui://myapp/index.html",
        visibility: ["app"],  // model never sees this
      },
    },
  },
  async ({ page = 1, pageSize = 20 }) => ({
    content: [{ type: "text", text: "" }],  // empty — model never sees this
    structuredContent: {
      items: await db.query({ page, pageSize }),
      page,
      hasMore: true,
    },
  })
);
```

In the View:

```typescript
async function loadPage(page: number) {
  const result = await app.callTool("load-page", { page });
  renderItems(result.structuredContent.items);
  updatePagination(result.structuredContent);
}
```

---

## structuredContent for Rich UI Data

Always separate model-visible text from UI data:

```typescript
async (args) => {
  const report = await generateReport(args.dateRange);
  return {
    // Model sees a summary
    content: [
      {
        type: "text",
        text: `Report generated: ${report.rowCount} rows, ${report.summary}`,
      },
    ],
    // View gets the full dataset
    structuredContent: {
      rows: report.data,
      columns: report.schema,
      summary: report.aggregates,
      exportUrl: report.csvUrl,
    },
  };
}
```

`structuredContent` can be arbitrarily large. It is not included in the model's context window.

---

## sendMessage

`app.sendMessage()` sends a `ui/message` to the Host. Use for host-native capabilities that go beyond the standard protocol.

```typescript
// Copy to clipboard (if host supports it)
await app.sendMessage({
  type: "clipboard/write",
  data: { text: "copied content" },
});

// Show a native toast notification
await app.sendMessage({
  type: "notify",
  data: { message: "Export complete", level: "success" },
});
```

Always handle the case where the host does not support the message type:

```typescript
try {
  await app.sendMessage({ type: "clipboard/write", data: { text } });
} catch {
  // Fallback: show copy input
  showCopyInput(text);
}
```

---

## updateModelContext

Push View state into the model's context for the next turn:

```typescript
// User selected items in the UI — tell the model
await app.updateModelContext({
  selected_items: selectedIds,
  current_filter: activeFilter,
  view_state: "item_detail",
});
```

The host injects this context before the model's next message. Use it to make the model context-aware without requiring a tool call.

Keep context objects small and semantically meaningful. The host may truncate large contexts.

---

## openLink

Open URLs in the user's browser:

```typescript
await app.openLink("https://docs.example.com/report/" + reportId);
```

The host shows a confirmation dialog before opening external URLs. For same-domain links declared in `connect-src`, some hosts skip the confirmation.

---

## Display Modes

### Inline (default)

Embedded in the chat thread. Use for result cards, small visualizations, quick references.

```typescript
_meta: {
  ui: {
    resourceUri: "ui://myapp/card.html",
    displayMode: "inline",  // default
  }
}
```

Inline apps receive `containerDimensions` from the host. Design responsively:

```css
.card {
  width: 100%;
  max-width: var(--container-width, 600px);
  height: auto;
}
```

### Fullscreen

Fills the host's side panel or workspace. Use for editors, dashboards, data explorers.

```typescript
_meta: {
  ui: {
    resourceUri: "ui://myapp/editor.html",
    displayMode: "fullscreen",
  }
}
```

### Picture-in-Picture (pip)

Persistent widget that survives chat scrolling. Use for timers, music players, live dashboards, ongoing tracking.

```typescript
_meta: {
  ui: {
    resourceUri: "ui://myapp/timer.html",
    displayMode: "pip",
  }
}
```

PiP apps stay visible while the user continues chatting. Design them to be compact and glanceable.

---

## Streaming via ontoolinput

Render a loading state before tool execution completes:

```typescript
app.ontoolinput = ({ toolName, arguments: args }) => {
  if (toolName === "search") {
    showSearchSkeleton(args.query);
  }
};

app.ontoolresult = (result) => {
  hideSearchSkeleton();
  renderResults(result.structuredContent);
};

await app.connect();
```

For long-running tools, update the UI progressively. The server can return intermediate results by calling the tool again with the same `ui://` resource before the final result.

---

## Multi-Tool Calls from View

The View can call multiple tools in sequence:

```typescript
async function loadDashboard() {
  // Load summary first (fast)
  const summary = await app.callTool("get-summary", {});
  renderSummary(summary.structuredContent);

  // Then load detail data (slow)
  const detail = await app.callTool("get-detail", {
    id: summary.structuredContent.topItemId,
  });
  renderDetail(detail.structuredContent);
}
```

Parallel calls are also supported:

```typescript
const [metrics, events] = await Promise.all([
  app.callTool("get-metrics", { range: "7d" }),
  app.callTool("get-events", { limit: 50 }),
]);
renderDashboard(metrics.structuredContent, events.structuredContent);
```

Each call is logged and goes through the Host proxy. Avoid fan-out beyond what is necessary for the initial render.

---

## Error Handling

```typescript
app.onerror = (err) => {
  console.error("MCP App error:", err);
  showErrorBanner(err.message);
};

// Per-call error handling
async function safeFetch(toolName: string, args: Record<string, unknown>) {
  try {
    return await app.callTool(toolName, args);
  } catch (err) {
    if (err.code === "TOOL_NOT_FOUND") {
      return null;  // Tool removed, degrade gracefully
    }
    throw err;
  }
}
```

Common error codes:

| Code | Meaning |
|---|---|
| `TOOL_NOT_FOUND` | Tool name not registered on server |
| `VISIBILITY_DENIED` | Tool has `visibility: ["model"]`, View cannot call it |
| `SANDBOX_ERROR` | Host iframe sandbox blocked the operation |
| `TIMEOUT` | Tool execution exceeded host timeout |

---

## State Management

The View is destroyed when the iframe is closed. Persist important state via:

### 1. Model Context (ephemeral, session-scoped)

```typescript
// Save to model context on change
async function saveViewState(state: AppState) {
  await app.updateModelContext({ appState: state });
}
```

The model can reconstruct the View state in its next message.

### 2. Tool Round-Trip (server-side)

Store state in the server and retrieve it via tool calls:

```typescript
registerAppTool(server, "save-state", { ... }, async ({ state }) => {
  await stateStore.set(sessionId, state);
  return { content: [{ type: "text", text: "State saved" }] };
});

registerAppTool(server, "load-state", { ... }, async () => {
  const state = await stateStore.get(sessionId);
  return { content: [], structuredContent: state ?? {} };
});
```

### 3. Flush on Teardown

Save pending state before the iframe is destroyed:

```typescript
app.onteardown = async () => {
  await app.callTool("save-state", { state: currentState });
};
```

Note: `onteardown` has limited time. Keep the flush operation fast.

---

## React Integration

Full React app inside an MCP App View:

```tsx
// src/App.tsx
import { App as McpApp } from "@modelcontextprotocol/ext-apps";
import { useState, useEffect } from "react";

let mcpApp: McpApp;

export function App() {
  const [data, setData] = useState(null);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    mcpApp = new McpApp({ name: "My App", version: "1.0.0" });

    // CRITICAL: handlers before connect
    mcpApp.ontoolresult = (result) => {
      setData(result.structuredContent);
    };

    mcpApp.onhostcontext = (ctx) => {
      setTheme(ctx.theme);
    };

    mcpApp.connect().catch(console.error);

    return () => {
      // cleanup if needed
    };
  }, []);

  return (
    <div data-theme={theme}>
      {data ? <DataView data={data} /> : <EmptyState />}
    </div>
  );
}
```

```tsx
// src/main.tsx
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
```

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
});
```

---

## Vanilla JS Integration

Minimal View without a framework:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      background: var(--color-background-primary, #fff);
      color: var(--color-text-primary, #000);
      font-family: system-ui, sans-serif;
      margin: 0;
      padding: 16px;
    }
  </style>
</head>
<body>
  <div id="root">Loading...</div>
  <script type="module">
    import { App } from "@modelcontextprotocol/ext-apps";

    const app = new App({ name: "My App", version: "1.0.0" });
    const root = document.getElementById("root");

    app.ontoolresult = (result) => {
      root.textContent = JSON.stringify(result.structuredContent, null, 2);
    };

    app.onhostcontext = (ctx) => {
      document.documentElement.dataset.theme = ctx.theme;
    };

    await app.connect();
  </script>
</body>
</html>
```

For vanilla HTML, skip Vite entirely and serve the HTML directly from the resource handler.

---

## Testing MCP Apps Locally

Run the MCP server locally and point a test host at it:

```bash
# Start the server
node dist/server.js

# Test with MCP Inspector (if available)
npx @modelcontextprotocol/inspector node dist/server.js
```

To test the View in isolation (without a host):

```typescript
// test-harness.ts — inject a mock App
import { App } from "@modelcontextprotocol/ext-apps";

// Monkey-patch connect() to skip real host negotiation
App.prototype.connect = async function () {
  this.onhostcontext?.({
    theme: "light",
    locale: "en-US",
    timezone: "UTC",
    displayMode: "inline",
    containerDimensions: { width: 640, height: 480 },
    platform: "desktop",
  });
};

// Trigger a fake tool result
app.ontoolresult?.({
  toolName: "my-tool",
  content: [{ type: "text", text: "test" }],
  structuredContent: { items: mockData },
});
```
