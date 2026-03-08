# MCP Apps Draft Spec — Additional Details

Source: https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx

This file captures details from the draft specification that go beyond the stable spec. The draft is the living document — check the source for the latest.

## CSP Field Naming (Draft)

The draft uses domain-oriented field names (not CSP directive names):

```typescript
interface McpUiResourceCsp {
  connectDomains?: string[];   // fetch/XHR/WebSocket → maps to connect-src
  resourceDomains?: string[];  // images/scripts/styles/fonts → maps to img-src, script-src, etc.
  frameDomains?: string[];     // nested iframes → maps to frame-src
  baseUriDomains?: string[];   // base URIs → maps to base-uri
}
```

Note: The stable spec uses `connect-src`/`img-src` style names. The draft renames these. Check which format the SDK version you're using expects.

## New Resource Metadata Fields

```typescript
interface UIResourceMeta {
  csp?: McpUiResourceCsp;
  permissions?: {
    camera?: {};
    microphone?: {};
    geolocation?: {};
    clipboardWrite?: {};  // NEW: clipboard write access
  };
  domain?: string;         // NEW: dedicated sandbox origin for OAuth/CORS
  prefersBorder?: boolean; // NEW: visual boundary preference
}
```

### `domain` — Dedicated Sandbox Origin

For apps needing stable origins (OAuth callbacks, CORS policies, API key allowlists):

```json
{ "domain": "a904794854a047f6.claudemcpcontent.com" }
```

Format is host-dependent. Check host docs for expected patterns.

### `prefersBorder`

Controls whether the host renders a visible border and background:
- `true` — request visible border + background
- `false` — request no visible border
- omitted — host decides

## Metadata Location Precedence

`_meta.ui` can appear on BOTH `resources/list` (static defaults) AND `resources/read` (per-response). When both present, **content-item value (resources/read) takes precedence**.

Server guidance: prefer placing `_meta.ui` on the content item in `resources/read` for dynamic metadata. Use listing-level for static metadata hosts can review at connection time.

## Deprecation Notice

`_meta["ui/resourceUri"]` (flat format) is deprecated. Use `_meta.ui.resourceUri` (nested format). The flat format will be removed before GA.

## Host Context (Full Draft Schema)

```typescript
interface HostContext {
  toolInfo?: {
    id?: RequestId;
    tool: Tool;
  };
  theme?: "light" | "dark";
  styles?: {
    variables?: Record<McpUiStyleVariableKey, string | undefined>;
    css?: {
      fonts?: string;  // @font-face rules or @import statements
    };
  };
  displayMode?: "inline" | "fullscreen" | "pip";
  availableDisplayModes?: string[];
  containerDimensions?: /* fixed or flexible per axis */;
  locale?: string;
  timeZone?: string;
  userAgent?: string;           // NEW: host application identifier
  platform?: "web" | "desktop" | "mobile";
  deviceCapabilities?: {        // NEW
    touch?: boolean;
    hover?: boolean;
  };
  safeAreaInsets?: {             // NEW: for mobile
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}
```

## Container Dimensions (Flexible Model)

Each axis (width, height) operates independently:

| Mode | Field | Meaning |
|------|-------|---------|
| Fixed | `height` or `width` | Host controls size. View fills available space. |
| Flexible | `maxHeight` or `maxWidth` | View controls size, up to max. |
| Unbounded | Field omitted | View controls size, no limit. |

Hosts MUST listen for `ui/notifications/size-changed` when using flexible dimensions. SDK sends these automatically via ResizeObserver when `autoResize` is enabled.

## CSS Variable Spec (70+ variables)

The draft standardizes these CSS variable keys:

**Colors**: background (primary/secondary/tertiary/inverse/ghost/info/danger/success/warning/disabled), text (same set), border (same set), ring (primary/secondary/inverse/info/danger/success/warning)

**Typography**: font-sans, font-mono, weights (normal/medium/semibold/bold), text sizes (xs/sm/md/lg), heading sizes (xs through 3xl), line heights for each

**Border radius**: xs/sm/md/lg/xl

Full type: `McpUiStyleVariableKey` in the draft spec.

## App Capabilities

Apps can declare capabilities in `ui/initialize`:

```typescript
interface McpUiAppCapabilities {
  experimental?: {};
  tools?: {                              // NEW: apps can expose tools to host
    listChanged?: boolean;
  };
  availableDisplayModes?: Array<"inline" | "fullscreen" | "pip">;
}
```

## Host Capabilities

```typescript
interface HostCapabilities {
  experimental?: {};
  openLinks?: {};
  downloadFile?: {};                     // NEW
  serverTools?: { listChanged?: boolean };
  serverResources?: { listChanged?: boolean };
  logging?: {};
  sandbox?: {
    permissions?: { camera, microphone, geolocation, clipboardWrite };
    csp?: { connectDomains, resourceDomains, frameDomains, baseUriDomains };
  };
}
```

## New Notifications

- `ui/notifications/size-changed` — View reports content size change (auto-resize)
- `ui/notifications/sandbox-proxy-ready` — Sandbox proxy is ready to receive resource
- `ui/notifications/sandbox-resource-ready` — Host sends HTML to sandbox proxy

## New Requests

- `ui/request-display-mode` — View requests mode change (host has final say)
- `ui/download-file` — View requests file download (requires host `downloadFile` capability)

## Sandbox Proxy Architecture (Web Hosts)

Web hosts MUST use a sandbox proxy between host page and view:

1. Host and Sandbox MUST have different origins
2. Sandbox permissions: `allow-scripts`, `allow-same-origin`
3. Sandbox forwards all messages between Host and View (except `ui/notifications/sandbox-*`)
4. Host MUST NOT send messages to View before receiving `initialized` notification

## Vercel Deployment

Vercel supports MCP Apps with full Next.js integration (SSR + React Server Components):
- Template: https://vercel.com/templates/template/mcp-apps-next-js-starter
- Uses `ui/*` JSON-RPC over `postMessage`
- Same UI works across Cursor, Claude.ai, ChatGPT
- Deploy as standard Vercel project

## API Documentation

Full SDK API docs: https://apps.extensions.modelcontextprotocol.io/api/
