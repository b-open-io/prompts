# MCP Apps Client Support

This list changes frequently. Always check the canonical source:

**https://modelcontextprotocol.io/extensions/client-matrix**

## Known Hosts (as of spec launch, 2026-01-26)

Claude Desktop, ChatGPT, VS Code GitHub Copilot, Goose (Block), Postman, MCPJam.

Launch partners: Amplitude, Asana, Box, Canva, Clay, Figma, Hex, monday.com, Slack, Salesforce.

## Progressive Enhancement

Hosts that do not support MCP Apps ignore `_meta.ui` and fall back to standard text `content` in tool results. No special handling required — design tools to work as text tools first, then layer on UI.

## Testing Locally

- **basic-host** — reference host from ext-apps repo (`examples/basic-host`). See `references/build-guide.md`.
- **Claude** — expose local server via `npx cloudflared tunnel --url http://localhost:3001`, add as custom connector.
- **MCPJam** — connect at mcpjam.com with server URL.

## Checking Host Capabilities

Use capability negotiation at connection time. The host declares `io.modelcontextprotocol/ui` in its `experimental` capabilities. Check the version field to determine supported features. Use `onFallbackRequest` in host implementations for forward compatibility.
