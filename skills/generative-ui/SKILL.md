---
name: generative-ui
version: 0.2.3
description: >-
  This skill should be used when the user asks about "generative UI", "dynamic UI",
  "AI-generated interfaces", "json-render", "render JSON as UI", "generate a dashboard",
  "create dynamic components", "AI UI generation", "MCP App UI", "deliver UI in chat",
  "interactive chat interface", or needs to decide whether to use static components vs
  AI-generated UI. Covers the json-render framework, renderer selection, catalog design,
  MCP Apps delivery (ui:// resources for in-chat interactive UIs), and integration with
  gemskills for visual asset generation.
---

# Generative UI

Produce JSON specs constrained to a catalog of predefined components. Never write arbitrary JSX — generate structured JSON that a renderer turns into platform-specific UI.

> For conceptual background, decision criteria, and common patterns, see `README.md`.

## Current Baseline

Verify package versions before implementation with `bun pm view <package> version`. The tested stable baseline is json-render `0.19.0` with React 19, Zod 4, and Tailwind 4. Pin a coherent release line; do not mix stable packages with unreleased `main` behavior.

Use the flat React spec shape published by `@json-render/react`: `root` is an element key and `elements` is a map whose `children` arrays contain keys. Validate every generated spec before rendering and retry or fall back to text on failure.

## Renderer Selection

| Need | Package | Skill |
|------|---------|-------|
| Web app UI | `@json-render/react` | `json-render-react` |
| shadcn/ui components | `@json-render/shadcn` | `json-render-shadcn` |
| MCP Apps adapter | `@json-render/mcp` | `json-render-mcp` |
| Formatting and math | `@json-render/directives` | `json-render-directives` |
| Development inspector | `@json-render/devtools*` | `json-render-devtools` |
| Mobile native | `@json-render/react-native` | `json-render-react-native` |
| Video compositions | `@json-render/remotion` | `json-render-remotion` |
| HTML email | `@json-render/react-email` | `json-render-react-email` |
| OG/social images | `@json-render/image` | `json-render-image` |
| Vue web apps | `@json-render/vue` | (no skill yet) |
| PDF documents | `@json-render/react-pdf` | (no skill yet) |

**Always invoke the renderer-specific skill** for implementation details. This skill covers when and why; the renderer skills cover how.

For React work, invoke `json-render-core` and `json-render-react` together. Add `json-render-directives` for deterministic display calculations and `json-render-devtools` during development.

## Catalog Design Principles

1. **Pick, don't spread** — Explicitly select components from `shadcnComponentDefinitions`. Never spread all 36 into your catalog.
2. **Minimal catalog** — Start with 5-8 components. Add more only when the AI needs them.
3. **Custom components** — Define with Zod schemas. Use slots for children, actions for interactivity.
4. **Two entry points** — `@json-render/shadcn/catalog` (server-safe schemas) and `@json-render/shadcn` (React implementations).
5. **Stable semantics outside the spec** — Keep authoritative IDs, permissions, and domain rules in application state or server code. Let the generated spec choose presentation, not truth.
6. **Text escape hatch** — Every generated workflow needs an accessible plain-text fallback.

## Refinement and Directives

Use `patch`, `merge`, or `diff` edit modes to refine an existing surface instead of regenerating it wholesale. Start pilots with complete validated specs; add streaming only when progressive rendering materially improves the experience.

Use standard directives for locale-aware formatting, arithmetic, concatenation, counts, truncation, pluralization, joins, and translation. Keep policy decisions and privileged calculations server-side; directives are deterministic presentation helpers.

## GemSkills Integration

Generate visual assets within generative UI workflows:

| Asset Type | Skill | Use Case |
|---|---|---|
| Hero images, backgrounds | `generate-image` | Dashboard headers, card backgrounds |
| Logos, vector graphics | `generate-svg` | Brand elements within generated UI |
| App icons | `generate-icon` | Platform-specific icon sets |
| Post-processing | `edit-image` | Crop, resize, style-transfer on generated images |
| Video backgrounds | `generate-video` | Remotion compositions with AI video |
| Style exploration | `browsing-styles` | Browse 169 visual styles before generating |

**Pipeline:** `browsing-styles` (pick style) -> `generate-image` (create) -> `edit-image` (refine) -> `optimize-images` (compress)

## MCP Apps Delivery

Generative UI specs can be delivered inside hosts that negotiate the MCP Apps extension. Serve a static `ui://` resource and pass dynamic data through tool results. Always return useful text `content` alongside UI data so unsupported hosts still work.

**Delivery path:**
1. AI generates a json-render spec (JSON)
2. MCP tool returns a text summary plus validated UI data, preferably in `structuredContent`
3. The MCP App View (sandboxed iframe) receives it via `ontoolresult`
4. View's embedded `<Renderer>` component renders the spec as interactive UI
5. User interacts — View calls server tools for fresh data, re-renders

This combines generative UI's guardrailed output with MCP Apps' context preservation and bidirectional data flow where supported.

```
AI generates spec → MCP tool returns structuredContent
                  → Host renders ui:// resource in iframe
                  → View renders spec with json-render <Renderer>
                  → User interacts → View calls tools → fresh spec
```

For building MCP Apps that deliver generative UI, use Skill(bopen-tools:mcp-apps).

## Delivery Channels

| Renderer | Package | Delivery Channel |
|----------|---------|-----------------|
| Web | `@json-render/react` | Web app **or** MCP App (`ui://` resource) |
| shadcn/ui | `@json-render/shadcn` | Web app **or** MCP App (`ui://` resource) |
| Mobile | `@json-render/react-native` | React Native app |
| Video | `@json-render/remotion` | Video file |
| Email | `@json-render/react-email` | Email (HTML) |
| Images | `@json-render/image` | Image file (PNG/SVG) |

MCP Apps delivery is available for browser renderers. A single-file bundle is the most portable default, but it is not a protocol requirement when every referenced asset and origin is declared through exact resource CSP metadata.

`@json-render/mcp@0.19.0` is useful scaffolding, not a complete production boundary: its helper serializes specs through text and uses broad CSP defaults. Wrap or replace that boundary when strict `structuredContent`, exact CSP, or app-only submission tools are required. Use the official MCP client matrix rather than assuming every host behaves the same.

## Dithered primitives

`dither-kit` (Boring-Software-Inc) is a shadcn-style registry of Bayer-matrix dithered chart and identity primitives, vendored per-component:

```bash
bunx --bun shadcn@latest add Boring-Software-Inc/dither-kit/<component>
```

**Charts** (`area`, `bar`, `pie`, `radar`, `sparkline`):
```tsx
<DitherBarChart data={rows} color="blue" />
```

**Avatar** — deterministic placeholder identity, same name -> same glyph:
```tsx
<DitherAvatar name={seed} />
```

**Standalone** (`button`, `gradient`):
```tsx
<DitherButton color="green">Ship</DitherButton>
```

**Palette constraint:** charts/buttons take a `color` prop locked to a 7-value enum (`green`/`blue`/`purple`/`pink`/`orange`/`red`/`grey`) — fork the vendored `palette.ts` for exact brand RGB triples. `DitherAvatar` and `gradient` take a continuous `hue` (0-360) instead, with no enum limit. Skip the dither treatment on dense tables or text-heavy surfaces, where the ordered-dither texture fights readability.

## Reference Files

- `references/renderer-guide.md` — Deep dive on each renderer's API and patterns
- `references/component-libraries.md` — Available components and custom component patterns
