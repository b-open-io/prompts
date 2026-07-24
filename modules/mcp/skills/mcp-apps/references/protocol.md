# MCP Apps Protocol Reference

Do not hand-implement the Apps wire protocol from this file. Use `@modelcontextprotocol/ext-apps` and the types/examples from the exact installed release.

Canonical sources:

- https://modelcontextprotocol.io/extensions/apps/overview
- https://modelcontextprotocol.io/extensions/apps/build
- https://github.com/modelcontextprotocol/ext-apps

## Stable Integration Invariants

- Negotiate `io.modelcontextprotocol/ui`.
- Link a model-visible tool to a static `ui://` resource with nested `_meta.ui.resourceUri`.
- Serve `text/html;profile=mcp-app`.
- Keep dynamic data in tool results rather than dynamic resource URIs.
- Return useful text `content` and validated `structuredContent`.
- Register View lifecycle handlers before connecting.
- Put resource policy such as CSP on the resource content using current SDK types.
- Use app-only visibility only for safe View-callable tools.
- Treat host context fields and display modes as optional capabilities.
- Preserve a text-only fallback.

Clone the matching tag before relying on method names or payload fields:

```bash
git clone --branch "v$(bun pm view @modelcontextprotocol/ext-apps version)" --depth 1 \
  https://github.com/modelcontextprotocol/ext-apps.git /tmp/mcp-ext-apps
```
