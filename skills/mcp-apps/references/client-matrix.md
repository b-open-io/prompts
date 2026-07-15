# MCP Apps Client Support

Host support changes independently from the SDK. Always check the canonical matrix immediately before implementation or release:

https://modelcontextprotocol.io/extensions/client-matrix

## Rules

- Negotiate `io.modelcontextprotocol/ui`; do not infer support from the product name.
- Treat transport support and Apps rendering support as separate capabilities.
- Test every intended host. Layout, display modes, style variables, persistence, and helper APIs can differ.
- Always return meaningful text `content` for hosts without the extension.
- Offer a standalone/local browser surface when the workflow genuinely requires richer interaction.
- Do not advertise Codex or any other host as supported unless the current official matrix and a smoke test confirm it.

Use the `basic-host` bundled with the same Ext Apps release for protocol-level development, not as proof of production-host behavior.
