# MCP Apps Build Guide

Complete guide for creating MCP Apps from scratch, including project setup, configuration, and testing.

## Official Skills

The ext-apps repo ships Claude Code skills for bootstrapping MCP Apps:

```bash
# Via Claude Code plugin marketplace
/plugin marketplace add modelcontextprotocol/ext-apps
/plugin install mcp-apps@modelcontextprotocol-ext-apps

# Via Vercel Skills CLI (cross-agent)
npx skills add modelcontextprotocol/ext-apps
```

Skills directory by agent:

| Agent | Skills Directory (macOS/Linux) |
|-------|-------------------------------|
| Claude Code | `~/.claude/skills/` |
| VS Code / GitHub Copilot | `~/.copilot/skills/` |
| Gemini CLI | `~/.gemini/skills/` |
| Cline | `~/.cline/skills/` |
| Goose | `~/.config/goose/skills/` |
| Codex | `~/.codex/skills/` |

## Manual Project Setup

### Project Structure

```
my-mcp-app/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── server.ts          # MCP server with tool + resource
├── mcp-app.html       # UI entry point
└── src/
    └── mcp-app.ts     # UI logic
```

### package.json

```json
{
  "type": "module",
  "scripts": {
    "build": "INPUT=mcp-app.html vite build",
    "serve": "npx tsx server.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/ext-apps": "latest",
    "@modelcontextprotocol/sdk": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "vite": "latest",
    "vite-plugin-singlefile": "latest",
    "@types/bun": "latest"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["*.ts", "src/**/*.ts"]
}
```

### vite.config.ts

```typescript
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: process.env.INPUT,
    },
  },
});
```

## Complete Server Example

**IMPORTANT:** Use a `createServer()` factory — each transport needs its own McpServer instance. A single McpServer cannot be shared across multiple transports.

```typescript
// server.ts
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { Hono } from "hono";
import { cors } from "hono/cors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const resourceUri = "ui://get-time/mcp-app.html";

function createServer(): McpServer {
  const server = new McpServer(
    { name: "My MCP App Server", version: "1.0.0" },
    {
      capabilities: {
        resources: {},
        tools: {},
        experimental: {
          "io.modelcontextprotocol/ui": { version: "0.1" },
        },
      },
    },
  );

  registerAppTool(
    server,
    "get-time",
    {
      title: "Get Time",
      description: "Returns the current server time.",
      inputSchema: {},
      _meta: { ui: { resourceUri } },
    },
    async () => {
      const time = new Date().toISOString();
      return {
        content: [{ type: "text", text: time }],
        _meta: { viewUUID: randomUUID() }, // REQUIRED for host to create UI instance
      };
    },
  );

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async () => {
      const html = await readFile(join(__dirname, "dist", "mcp-app.html"), "utf-8");
      return {
        contents: [
          { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
        ],
      };
    },
  );

  return server;
}

// Dual-mode: --stdio for Claude Code/Desktop, HTTP for web hosts
if (process.argv.includes("--stdio")) {
  const server = createServer();
  await server.connect(new StdioServerTransport());
} else {
  const port = Number(process.env.PORT) || 3001;
  const app = new Hono();
  app.use("/*", cors());

  app.all("/mcp", async (c) => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = createServer();
    await server.connect(transport);
    return transport.handleRequest(c.req.raw);
  });

  app.get("/", (c) => c.json({ status: "ok" }));
  Bun.serve({ fetch: app.fetch, port });
  console.log(`Server listening on http://localhost:${port}/mcp`);
}
```

## Complete View Example

### mcp-app.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Get Time App</title>
  </head>
  <body>
    <p>
      <strong>Server Time:</strong>
      <code id="server-time">Loading...</code>
    </p>
    <button id="get-time-btn">Get Server Time</button>
    <script type="module" src="/src/mcp-app.ts"></script>
  </body>
</html>
```

### src/mcp-app.ts

```typescript
import { App } from "@modelcontextprotocol/ext-apps";

const serverTimeEl = document.getElementById("server-time")!;
const getTimeBtn = document.getElementById("get-time-btn")!;

const app = new App({ name: "Get Time App", version: "1.0.0" });

// Connect to the host
app.connect();

// Handle tool result pushed by the host
app.ontoolresult = (result) => {
  const time = result.content?.find((c) => c.type === "text")?.text;
  serverTimeEl.textContent = time ?? "[ERROR]";
};

// Call tools on user interaction
getTimeBtn.addEventListener("click", async () => {
  const result = await app.callServerTool({
    name: "get-time",
    arguments: {},
  });
  const time = result.content?.find((c) => c.type === "text")?.text;
  serverTimeEl.textContent = time ?? "[ERROR]";
});
```

Note: The official build guide shows `app.connect()` before setting `ontoolresult`. This works because the initial tool result is buffered. However, setting handlers before `connect()` is safer to avoid race conditions — either order works in practice.

## Testing

### Build and run

```bash
npm run build && npm run serve
```

Server available at `http://localhost:3001/mcp`.

### Testing with Claude (via cloudflared tunnel)

Expose local server to the internet:

```bash
npx cloudflared tunnel --url http://localhost:3001
```

Copy the generated URL and add it as a custom connector in Claude:
Profile → Settings → Connectors → Add custom connector.

Requires a paid Claude plan (Pro, Max, or Team).

### Testing with basic-host (local)

```bash
git clone https://github.com/modelcontextprotocol/ext-apps.git
cd ext-apps/examples/basic-host
npm install
SERVERS='["http://localhost:3001/mcp"]' npm start
```

Navigate to `http://localhost:8080` to see the test interface. Select a tool, call it, and verify the UI renders in the sandboxed iframe.

## Transport Options

**Claude Desktop and Claude Code both use stdio.** HTTP is for web-based hosts (ChatGPT, Claude.ai web, basic-host).

| Host | Transport | Config |
|------|-----------|--------|
| Claude Desktop | stdio | `claude_desktop_config.json` `command`/`args` |
| Claude Code CLI | stdio | `.mcp.json` or plugin `start.sh` |
| ChatGPT | HTTP | Custom connector URL |
| Claude.ai web | HTTP | Settings > Connectors |
| basic-host (testing) | HTTP | `SERVERS='["http://localhost:3001/mcp"]'` |

Use `--stdio` flag for dual-mode servers. Default to HTTP for easy testing with basic-host.

## Common Mistakes

1. **Using CDN `<script src="">` in view HTML** — doesn't work in srcdoc iframes. Install as npm packages and let Vite bundle them.
2. **Bare module imports in view** — `import { App } from "@modelcontextprotocol/ext-apps"` fails without Vite bundling.
3. **Missing `_meta.viewUUID`** — host won't create a UI instance without `randomUUID()` in the tool result.
4. **Shared McpServer across transports** — each transport needs its own McpServer. Use a factory function.
5. **Missing capability declaration** — server MUST declare `io.modelcontextprotocol/ui` in `capabilities.experimental`.
6. **Using Express** — use Hono instead. Express is outdated. Use `WebStandardStreamableHTTPServerTransport` with Hono for HTTP mode.
