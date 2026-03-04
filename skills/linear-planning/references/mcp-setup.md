# Linear MCP Server Setup

## The Official Server

Linear provides an official MCP server hosted at `https://mcp.linear.app/mcp`. No local npm package needed — it connects over HTTP with OAuth authentication.

## Install in Claude Code

```bash
claude mcp add --transport http linear-server https://mcp.linear.app/mcp
```

Then run `/mcp` in your Claude Code session to complete the OAuth authentication flow.

## Install in Claude Desktop (Free/Pro)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"]
    }
  }
}
```

Restart Claude Desktop afterward.

## Other Clients

| Client | Method |
|--------|--------|
| **Cursor** | Search "Linear" in MCP directory, or use the deeplink on linear.app/docs/mcp |
| **VS Code** | `CTRL/CMD + P` → "MCP: Add Server" → Command → `npx mcp-remote https://mcp.linear.app/mcp` |
| **Windsurf** | Settings → Cascade → MCP servers → Add Server |
| **Generic** | `npx -y mcp-remote https://mcp.linear.app/mcp` |

## Authentication

**Default (OAuth)**: Interactive OAuth 2.1 flow — authenticates with your Linear account and grants scoped access.

**Alternative (API Key)**: Pass your Linear API key directly as a Bearer token in the Authorization header. Get a key at Linear → Settings → Account → Security & Access → Personal API Keys.

## Discover Available Tools

After connecting, check what tools are available:

```
/mcp
```

The Linear MCP server provides tools for finding, creating, and updating issues, projects, and comments. Tool names are not fully documented — run `/mcp` after setup to see the full list in Claude Code.

## Find Your IDs

After connecting, use the available tools to look up the IDs you'll need:

```
# Get your teams and their IDs
[use the teams lookup tool]

# Get projects for a team
[use the projects lookup tool]

# Get workflow state IDs (Todo, In Progress, In Review, Done)
[use the workflow states or team details tool]
```

Note these IDs — you'll reference them when creating issues.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Auth issues / internal error | Run `rm -rf ~/.mcp-auth` in Terminal, reconnect |
| WSL on Windows | Use SSE endpoint: `https://mcp.linear.app/sse` with `--transport sse-only` |
| Node compatibility error | Update Node.js to a recent LTS version |
| MCP server not appearing | Restart Claude Code after running `claude mcp add` |

## Official Docs

Full setup instructions at: https://linear.app/docs/mcp
