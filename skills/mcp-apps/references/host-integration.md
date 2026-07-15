# MCP Apps Host Integration

Building an MCP Apps-capable host is a separate task from building an App. Start with the `basic-host` included in the exact Ext Apps release and follow its current source rather than copying private bridge APIs.

## Host Responsibilities

- Negotiate the Apps capability and supported MIME types.
- Discover tool/resource associations.
- Fetch and preflight declared resources.
- Enforce sandbox, CSP, permissions, and tool visibility.
- Deliver tool input/results and host context to the View.
- Proxy View tool calls through normal MCP authorization and auditing.
- Handle display-mode requests, teardown, failures, and fallback content.
- Isolate Views and bound messages/resources.

## Testing a Host

Test malicious and malformed resources, unsupported versions, oversized messages, denied permissions, hidden tools, reconnects, teardown, theme changes, and clients/servers that do not implement Apps.

Do not assume the reference host mirrors Claude, ChatGPT, VS Code, Codex, or any other product. Product support and behavior must be verified independently through the canonical matrix:

https://modelcontextprotocol.io/extensions/client-matrix
