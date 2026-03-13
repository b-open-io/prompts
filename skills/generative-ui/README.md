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

The json-render framework has five core concepts:

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

For full API details, see the `json-render-core` skill.

## Common Patterns

### AI Chat with Rich Cards
AI streams a spec containing Card, Table, Chart components. The `<Renderer>` component renders them inline in the chat message.

### Personalized Dashboard
User preferences + data -> AI generates a dashboard spec -> Renderer displays it with real-time data binding.

### Dynamic Form Builder
Schema definition -> AI generates form spec from natural language -> Form renders with validation.

### Cross-Platform Rendering
Same catalog definition, different registries. One spec renders to web (React), mobile (React Native), and email (React Email).

## Available Renderers

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

## MCP Apps Delivery

Generative UI specs can be delivered directly inside chat hosts (Claude, ChatGPT, VS Code Copilot) via **MCP Apps**. The json-render React renderer runs inside a Vite-bundled single-file HTML served as a `ui://` resource.

This combines generative UI's guardrailed output with MCP Apps' context preservation and bidirectional data flow — no tab switching, no separate web app.

For building MCP Apps that deliver generative UI, use `Skill(bopen-tools:mcp-apps)`.

## Invoking This Skill

Ask Claude about any of these topics to trigger this skill automatically:

- "generate a dashboard"
- "create dynamic components"
- "use json-render"
- "render JSON as UI"
- "generative UI" or "AI-generated interfaces"
- "deliver UI in chat" or "MCP App UI"
- "should I use static components or generative UI?"
