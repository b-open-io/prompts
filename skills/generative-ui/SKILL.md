---
name: generative-ui
version: 0.1.0
description: >-
  This skill should be used when the user asks about "generative UI", "dynamic UI",
  "AI-generated interfaces", "json-render", "render JSON as UI", "generate a dashboard",
  "create dynamic components", "AI UI generation", or needs to decide whether to use
  static components vs AI-generated UI. Covers the json-render framework, renderer selection,
  catalog design, and integration with gemskills for visual asset generation.
user-invocable: false
---

# Generative UI

## What is Generative UI

Generative UI is AI generating **JSON specs** constrained to a **catalog** of predefined components. The AI never writes arbitrary JSX — it produces structured JSON that a renderer turns into real UI. This gives you:

- **Guardrailed output** — AI can only use components you define
- **Cross-platform** — Same spec renders to web, mobile, email, video, images
- **Type-safe** — Zod schemas validate every spec at runtime
- **Streamable** — SpecStream (JSONL) enables progressive rendering

This is NOT "AI writes arbitrary code." It's structured generation within strict boundaries.

## When to Use Generative UI vs Static Components

| Use Static Components When | Use Generative UI When |
|---|---|
| Layout is known at build time | Layout varies per user/context |
| Content is fixed or CMS-driven | AI determines what to show |
| Performance is critical (SSR/SSG) | Personalization matters more than TTI |
| Simple CRUD forms | Dynamic forms from schemas |
| Marketing/landing pages | AI chat with rich card responses |

**Decision rule:** If a human designs the layout once and it rarely changes, use static. If the layout adapts to data, user context, or AI decisions, use generative UI.

## The json-render Stack

**Core concepts** (see `json-render-core` skill):
- **Schema** — `defineSchema()` defines the structure specs must follow
- **Catalog** — `defineCatalog()` maps component names to Zod-validated definitions
- **Spec** — JSON output from AI conforming to the schema
- **SpecStream** — JSONL streaming for progressive spec building
- **Registry** — `defineRegistry()` maps catalog entries to renderer implementations

**Workflow:**
1. Define a schema with `defineSchema`
2. Create a catalog with `defineCatalog` (pick only the components you need)
3. AI generates a spec (JSON) constrained to your catalog
4. A renderer turns the spec into platform-specific UI via a registry

## Renderer Selection

| Need | Package | Skill |
|------|---------|-------|
| Web app UI | `@json-render/react` | `json-render-react` |
| shadcn/ui components | `@json-render/shadcn` | `json-render-shadcn` |
| Mobile native | `@json-render/react-native` | `json-render-react-native` |
| Video compositions | `@json-render/remotion` | `json-render-remotion` |
| HTML email | `@json-render/react-email` | `json-render-react-email` |
| OG/social images | `@json-render/image` | `json-render-image` |
| Vue web apps | `@json-render/vue` | (no skill yet) |
| PDF documents | `@json-render/react-pdf` | (no skill yet) |

**Always invoke the renderer-specific skill** for implementation details. This skill covers when and why; the renderer skills cover how.

## Catalog Design Principles

1. **Pick, don't spread** — Explicitly select components from `shadcnComponentDefinitions`. Never spread all 36 into your catalog.
2. **Minimal catalog** — Start with 5-8 components. Add more only when the AI needs them.
3. **Custom components** — Define with Zod schemas. Use slots for children, actions for interactivity.
4. **Two entry points** — `@json-render/shadcn/catalog` (server-safe schemas) and `@json-render/shadcn` (React implementations).

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

## Common Patterns

### AI Chat with Rich Cards
AI streams a spec containing Card, Table, Chart components. The `<Renderer>` component renders them inline in the chat message.

### Personalized Dashboard
User preferences + data -> AI generates a dashboard spec -> Renderer displays it with real-time data binding.

### Dynamic Form Builder
Schema definition -> AI generates form spec from natural language -> Form renders with validation.

### Cross-Platform Rendering
Same catalog definition, different registries. One spec renders to web (React), mobile (React Native), and email (React Email).

## Reference Files

- `references/renderer-guide.md` — Deep dive on each renderer's API and patterns
- `references/component-libraries.md` — Available components and custom component patterns
