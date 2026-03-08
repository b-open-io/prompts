---
name: mcp-apps
version: 0.1.0
description: This skill provides guidance for building MCP Apps, the official MCP extension (io.modelcontextprotocol/ui) for rendering interactive HTML UIs inside MCP hosts. This skill should be used when the user asks to "create an MCP App", "add UI to MCP tool", "build interactive MCP", "MCP App server", "ui:// resource", "sandboxed iframe MCP", "interactive chat UI", "embed UI in chat", "MCP tool with interface", or needs to build interactive HTML applications that render inside Claude Desktop, ChatGPT, or VS Code Copilot.
---

# MCP Apps

MCP Apps is the first official MCP extension (spec 2026-01-26, co-authored by Anthropic and OpenAI). It enables interactive HTML UIs rendered in sandboxed iframes inside MCP hosts. Extension ID: `io.modelcontextprotocol/ui`. npm package: `@modelcontextprotocol/ext-apps`.

MCP Apps bridge the gap between LLM tool calls and rich visual interfaces — the model sees text, users see interactive UIs.

## Quick Start

The fastest path is the official `create-mcp-app` skill from the ext-apps repo:

```bash
npx skills add modelcontextprotocol/ext-apps --skill create-mcp-app
```

Then ask the agent: "Create an MCP App that displays a color picker." For manual setup, see `references/build-guide.md`.

## Architecture

Three layers:

1. **Server** — Exposes tools and `ui://` resources. Tools declare a `_meta.ui.resourceUri` pointing to the UI. Resources serve HTML via `RESOURCE_MIME_TYPE`.
2. **Host** — The MCP client (Claude Desktop, ChatGPT, VS Code Copilot). Renders iframes, proxies tool calls from the View, enforces the security sandbox.
3. **View** — The HTML app running inside the sandboxed iframe. Uses the `App` class from `@modelcontextprotocol/ext-apps` to communicate with the Host.

The View is intentionally thin. All tool calls go through the Host proxy — the View never reaches the network or the MCP server directly.

## Server Pattern

Install the package:

```bash
npm install @modelcontextprotocol/ext-apps
```

Register tools and resources using the helper functions:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { readFile } from "fs/promises";

const server = new McpServer({ name: "my-app", version: "1.0.0" });

// Register a tool that exposes a UI
registerAppTool(
  server,
  "my-tool",
  {
    description: "Does something useful",
    inputSchema: { type: "object", properties: {} },
    _meta: {
      ui: { resourceUri: "ui://myapp/index.html" },
    },
  },
  async (args) => ({
    content: [{ type: "text", text: "Model sees this text" }],
    structuredContent: { data: "UI gets this rich data" },
  })
);

// Register the HTML resource
registerAppResource(
  server,
  "ui://myapp/index.html",
  "ui://myapp/index.html",
  { mimeType: RESOURCE_MIME_TYPE },
  async () => ({
    contents: [
      {
        uri: "ui://myapp/index.html",
        mimeType: RESOURCE_MIME_TYPE,
        text: await readFile("dist/index.html", "utf-8"),
      },
    ],
  })
);
```

`ui://` resources use the MIME type `text/html;profile=mcp-app`. They must be predeclared in the server manifest — dynamic resource generation is not permitted (security requirement for pre-scanning).

## View Pattern

The View is the HTML app. Install the client package:

```bash
npm install @modelcontextprotocol/ext-apps
```

```typescript
import { App } from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "My App", version: "1.0.0" });

// CRITICAL: Set handlers BEFORE calling connect()
app.ontoolresult = (result) => {
  // result.structuredContent has rich data for the UI
  // result.content has text (what model sees)
  renderData(result.structuredContent ?? result.content);
};

app.onhostcontext = (ctx) => {
  // Apply host theme, locale, timezone
  applyTheme(ctx.theme);
};

// Connect after handlers are set
await app.connect();
```

Set `ontoolresult` before or immediately after `connect()`. The initial tool result is buffered, so either order works, but setting handlers first is safer to avoid race conditions.

## Lifecycle

1. **Discovery** — Host reads server manifest, finds `io.modelcontextprotocol/ui` in experimental capabilities.
2. **Init** — Host sends `ui/initialize`. Server responds with supported UI version.
3. **Data** — Model calls tool → Host forwards `ui/notifications/tool-input` to View → Tool executes → Host forwards `ui/notifications/tool-result` to View.
4. **Interactive** — View calls tools via `app.callTool()`. Host proxies them. Results flow back via `ontoolresult`.
5. **Teardown** — Host sends `ui/notifications/resource-teardown` when the iframe is destroyed.

## Tool Visibility

Control which audience sees each tool:

```typescript
_meta: {
  ui: {
    resourceUri: "ui://myapp/index.html",
    visibility: ["app"],  // UI-only, hidden from the model
  }
}
```

| Visibility | Default | Behavior |
|---|---|---|
| `["model", "app"]` | Yes | Both model and UI can call the tool |
| `["app"]` | No | UI-only tool, hidden from LLM |
| `["model"]` | No | LLM-only, View cannot call it |

Use `["app"]` for tools that only make sense as UI interactions (pagination, sorting, drill-down).

## Build

MCP App Views must be compiled to a single self-contained HTML file. Use Vite with `vite-plugin-singlefile`:

```bash
npm install -D vite vite-plugin-singlefile
```

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: { outDir: "dist" },
});
```

Any framework works: React, Vue, Svelte, Preact, Solid, or vanilla JS/HTML. The View is just HTML — no special runtime.

## Theming

The Host provides context via `app.onhostcontext`:

```typescript
interface HostContext {
  theme: "light" | "dark" | "system";
  locale: string;          // e.g. "en-US"
  timezone: string;        // e.g. "America/New_York"
  displayMode: "inline" | "fullscreen" | "pip";
  containerDimensions: { width: number; height: number };
  platform: "desktop" | "web" | "mobile";
}
```

CSS variables provided by the Host sandbox:

```css
:root {
  --color-background-primary: /* host bg */;
  --color-text-primary:       /* host text */;
  --color-border:             /* host border */;
  --color-accent:             /* host accent */;
}
```

Always include default values — not all hosts provide all CSS variables:

```css
body {
  background: var(--color-background-primary, #ffffff);
  color: var(--color-text-primary, #000000);
}
```

## Display Modes

| Mode | Use Case |
|---|---|
| `inline` | Default. Embedded in the chat thread. Good for results, cards, small visualizations. |
| `fullscreen` | Editors, dashboards, complex tools. Occupies the full panel. |
| `pip` | Picture-in-picture. Persistent widget that survives scrolling (calendars, timers, music players). |

Declare the preferred display mode in `_meta.ui`:

```typescript
_meta: {
  ui: {
    resourceUri: "ui://myapp/index.html",
    displayMode: "fullscreen",
  }
}
```

## Progressive Enhancement

Tools degrade gracefully on hosts without UI support. Always populate both `content` (text for the model) and `structuredContent` (rich data for the View):

```typescript
async (args) => ({
  content: [
    { type: "text", text: `Found ${results.length} items: ${summary}` }
  ],
  structuredContent: { items: results, total: results.length },
})
```

Non-UI hosts display `content`. UI hosts pass `structuredContent` to the View. This is the key design principle: MCP Apps are an enhancement, not a replacement.

## Capability Negotiation

Declare the extension in the server capabilities:

```typescript
const server = new McpServer({
  name: "my-app",
  version: "1.0.0",
  capabilities: {
    experimental: {
      "io.modelcontextprotocol/ui": { version: "0.1" },
    },
  },
});
```

Hosts that do not support MCP Apps ignore this capability and fall back to standard tool behavior.

## Reference Files

Detailed protocol and integration documentation:

- **`references/protocol.md`** — JSON-RPC methods, capability negotiation, message schemas
- **`references/security.md`** — Sandbox model, CSP, permissions, audit logging
- **`references/patterns.md`** — App-only tools, streaming, multi-tool calls, state management
- **`references/host-integration.md`** — AppBridge, @mcp-ui/client, AppRenderer, AppFrame
- **`references/client-matrix.md`** — Host support (points to canonical source at modelcontextprotocol.io)
- **`references/build-guide.md`** — Complete project setup, configuration files, testing with Claude and basic-host
- **`references/draft-spec-details.md`** — Draft spec additions: new CSS variables (70+), container dimensions, sandbox proxy, device capabilities, Vercel deployment
