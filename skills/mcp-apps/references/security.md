# MCP Apps Security Reference

Treat the View as untrusted, sandboxed input. The host mediates capabilities, but the server remains responsible for authorization and validation.

## Resource CSP

Start deny-by-default. Declare current CSP metadata on the resource content returned to the host, following the installed Ext Apps types.

Allow only exact required origins:

- `connectDomains` for network connections.
- `resourceDomains` for scripts, styles, fonts, images, and media.
- `frameDomains` only for required nested frames.

Avoid `*`, `https:`, broad CDNs, and environment-wide allowlists. Prefer an app-only server tool over direct View networking.

## Tool Visibility

- Model-visible launch tools may expose the View.
- App-only tools should perform narrow, safe UI operations.
- Privileged filesystem, shell, tracker administration, and credential operations remain model-only.

Visibility is not authorization. Recheck the user/session, scope, current resource revision, and domain permissions in every handler.

## Data Boundaries

Return only data required to render or complete the interaction. Keep secrets and credentials out of tool arguments, `content`, `structuredContent`, model-context updates, and logs.

Validate:

- Tool inputs.
- Tool outputs before returning them.
- `structuredContent` inside the View.
- UI submissions again on the server.
- External links and identifiers before use.

Bound payload size, collection lengths, strings, and nesting depth.

## Stale and Replayed Views

Include an interaction nonce or authoritative revision for mutable workflows. Reject submissions when:

- The nonce was already consumed.
- The underlying object changed.
- Ownership or a tracker claim changed.
- The option no longer exists.
- Numeric bounds or invariants no longer hold.

Prefer idempotent handlers and explicit conflict responses.

## Lifecycle and Permissions

Declare only necessary device permissions and handle denial. Flush only small, non-sensitive drafts during teardown. Use `viewUUID` when a workflow genuinely needs per-view state recovery.

Audit View-initiated tool calls and security-relevant failures. Avoid logging sensitive payloads.

Official security behavior and metadata are versioned. Verify against the checked-out release and:

https://modelcontextprotocol.io/extensions/apps/build
