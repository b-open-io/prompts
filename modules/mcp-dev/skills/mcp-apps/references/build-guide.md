# MCP Apps Build Guide

Use the installed official `create-mcp-app`, `add-app-to-server`, or `convert-web-app` skill for detailed code. This reference records the bOpen build and verification defaults.

## 1. Verify and inspect the release

```bash
bun pm view @modelcontextprotocol/ext-apps version
bun pm view @modelcontextprotocol/sdk version
git clone --branch "v$(bun pm view @modelcontextprotocol/ext-apps version)" --depth 1 \
  https://github.com/modelcontextprotocol/ext-apps.git /tmp/mcp-ext-apps
```

Read the matching examples and source types rather than copying remembered signatures. Use Node 20+ semantics or a compatible Bun runtime.

## 2. Choose the smallest architecture

```text
server.ts              MCP tools and resources
mcp-app.html           browser entry
src/mcp-app.ts[x]      View lifecycle and rendering
vite.config.ts         browser bundle
dist/mcp-app.html      served ui:// resource
```

Keep domain data and authority on the server. Keep the View focused on presentation and narrow interactions.

## 3. Install with Bun

```bash
bun add @modelcontextprotocol/ext-apps @modelcontextprotocol/sdk zod
bun add -d typescript vite vite-plugin-singlefile
```

Add the owning framework packages only when needed.

## 4. Register the tool and resource

- Use a static `ui://` URI.
- Set nested `_meta.ui.resourceUri` on the model-visible launch tool.
- Register the HTML resource with `text/html;profile=mcp-app`.
- Put current CSP/resource metadata on the resource content using the installed SDK types.
- Return concise text `content` and validated `structuredContent`.
- Use app-only tools for safe UI submissions and refreshes.

Use a separate `McpServer` instance per transport.

## 5. Connect the View

Register `ontoolinput`, `ontoolinputpartial`, `ontoolresult`, `onhostcontextchanged`, and `onteardown` before `connect()`. Apply host theme, font, safe-area, size, and display-mode information with fallbacks.

## 6. Package

Bundle browser imports. Prefer a single HTML file for portability:

```typescript
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    rollupOptions: { input: "mcp-app.html" },
    outDir: "dist",
  },
});
```

Single-file output is recommended, not a protocol requirement. If assets remain external, declare their exact origins and test every target host.

## 7. Test

```bash
bun run build
```

Then test with the `basic-host` from the checked-out Ext Apps release. Also test:

- A client without UI capability.
- Every intended production host in the canonical client matrix.
- Exact CSP and offline/text fallback behavior.
- Invalid and stale View submissions.
- Theme, keyboard, narrow layout, fullscreen, teardown, and reconnect.

Official sources:

- https://modelcontextprotocol.io/extensions/apps/build
- https://modelcontextprotocol.io/extensions/client-matrix
