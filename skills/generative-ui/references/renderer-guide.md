# Renderer Guide

Deep dive on each json-render renderer, their APIs, and when to use them.

## React (`@json-render/react`)

The primary web renderer. Use for dashboards, dynamic forms, AI chat UIs, and any browser-based generative UI.

**Key APIs:**
- `defineRegistry(catalog, implementations)` — Maps catalog to React components
- `<Renderer spec={spec} registry={registry} />` — Renders a spec
- `<SpecStreamRenderer stream={stream} registry={registry} />` — Renders streaming specs

**Features:**
- Context providers for state management (Redux, Zustand, Jotai, XState adapters)
- Hook support within custom components
- Action emission for interactivity
- State stores for cross-component communication

**Pattern:**
```typescript
import { defineRegistry } from "@json-render/react";
import { Renderer } from "@json-render/react";

const { registry } = defineRegistry(catalog, {
  components: { Card: MyCard, Button: MyButton },
});

<Renderer spec={aiGeneratedSpec} registry={registry} />
```

## shadcn/ui (`@json-render/shadcn`)

36 pre-built components on Radix UI + Tailwind CSS. The fastest path to production-quality generative UI on the web.

**Two entry points:**
- `@json-render/shadcn/catalog` — Server-safe Zod schemas (no React dependency)
- `@json-render/shadcn` — React component implementations

**Available components (36):**
Accordion, Alert, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Carousel, Chart, Checkbox, Collapsible, DataTable, DatePicker, Dialog, Drawer, DropdownMenu, Form, Heading, HoverCard, Input, Label, Popover, Progress, RadioGroup, ScrollArea, Select, Separator, Sheet, Skeleton, Slider, Stack, Switch, Tabs, Text, Tooltip

**Critical rule:** Pick specific components. Never spread all definitions.

```typescript
// Good - explicit selection
components: {
  Card: shadcnComponentDefinitions.Card,
  Stack: shadcnComponentDefinitions.Stack,
  Button: shadcnComponentDefinitions.Button,
}

// Bad - spreading everything
components: { ...shadcnComponentDefinitions }
```

## React Native (`@json-render/react-native`)

Mobile generative UI with standard mobile components.

**Features:**
- Native mobile component mappings
- Data binding for dynamic content
- Visibility rules (show/hide based on conditions)
- Action system for navigation and mutations
- Platform-specific adaptations (iOS/Android)

**Use when:** Building mobile apps that need AI-generated screens, personalized feeds, or dynamic forms.

## Remotion (`@json-render/remotion`)

Video from JSON timeline specs. Compositions with frames, fps, dimensions.

**Key concepts:**
- Specs define timeline sequences (intro, body, outro)
- Each sequence maps to Remotion compositions
- Frame-accurate timing via `useCurrentFrame()`
- Pairs with `remotion-best-practices` skill for production patterns

**Use when:** Generating video content from AI — personalized video messages, dynamic presentations, social video clips.

**Pipeline with gemskills:**
`generate-image` (backgrounds) + `generate-video` (clips) -> Remotion composition spec -> Rendered video

## React Email (`@json-render/react-email`)

HTML + plaintext emails from JSON specs using @react-email/components.

**Features:**
- Dual output: HTML for rich clients, plaintext for fallback
- Standard email components (Button, Link, Image, Section, Row, Column)
- Compatible with all major email clients

**Use when:** AI generates personalized email content — marketing sequences, transactional emails, newsletters.

## Image (`@json-render/image`)

OG images, social cards, and static images via Satori.

**Output formats:** SVG and PNG
**Use cases:** Open Graph images, social media cards, dynamic banners

**How it works:** Spec defines layout with text, images, and styling. Satori converts to SVG/PNG without a browser.

## Combining Renderers

The power of json-render is **write once, render everywhere**:

1. Define one catalog with shared component definitions
2. Create separate registries for each platform
3. Same AI-generated spec renders to web, mobile, email, video

```typescript
// Shared catalog
const catalog = defineCatalog(schema, { components: { ... } });

// Platform-specific registries
const webRegistry = defineRegistry(catalog, { components: webComponents });
const mobileRegistry = defineRegistry(catalog, { components: mobileComponents });
const emailRegistry = defineRegistry(catalog, { components: emailComponents });
```

This enables true cross-platform generative UI from a single AI prompt.
