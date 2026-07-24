# Component Libraries

Available components and patterns for building generative UI catalogs.

## shadcn/ui Standard Components (36)

The `@json-render/shadcn` package provides these pre-built components:

### Layout
- **Stack** — Flex container with gap, direction, alignment
- **Card** — Container with header, content, footer slots
- **Separator** — Visual divider
- **ScrollArea** — Scrollable container

### Typography
- **Heading** — h1-h6 with size variants
- **Text** — Paragraph text with weight, size, color options

### Data Display
- **Badge** — Status labels, tags
- **Avatar** — User/entity images with fallback
- **DataTable** — Full-featured data table with sorting, filtering
- **Chart** — Data visualization (bar, line, area, pie, radar, radial)
- **Progress** — Progress bars
- **Skeleton** — Loading placeholders
- **HoverCard** — Hover-triggered info cards
- **Tooltip** — Hover tooltips

### Navigation
- **Breadcrumb** — Navigation breadcrumbs
- **Tabs** — Tab navigation with content panels
- **Accordion** — Collapsible content sections
- **Collapsible** — Toggle visibility
- **DropdownMenu** — Menu with items, separators, sub-menus
- **Carousel** — Swipeable content carousel

### Forms
- **Input** — Text input with label, placeholder, validation
- **Select** — Dropdown selection
- **Checkbox** — Boolean toggle with label
- **RadioGroup** — Single selection from options
- **Switch** — Toggle switch
- **Slider** — Range input
- **Form** — Form container with validation
- **Label** — Form field labels
- **DatePicker** — Date selection
- **Calendar** — Full calendar view

### Feedback
- **Alert** — Information, warning, error messages
- **Dialog** — Modal dialogs
- **Drawer** — Side panel overlays
- **Sheet** — Bottom/side sheets
- **Popover** — Positioned popup content

### Actions
- **Button** — Clickable actions with variants (primary, secondary, destructive, outline, ghost, link)

## Custom Component Patterns

### Defining a Custom Component

```typescript
import { z } from "zod";

// In catalog definition
const catalog = defineCatalog(schema, {
  components: {
    // Mix standard and custom
    Card: shadcnComponentDefinitions.Card,

    // Custom component with Zod schema
    PricingCard: {
      props: z.object({
        title: z.string(),
        price: z.number(),
        currency: z.enum(["USD", "EUR", "GBP"]),
        features: z.array(z.string()),
        highlighted: z.boolean().optional(),
      }),
      description: "Pricing tier card with feature list",
    },
  },
  actions: {
    subscribe: {
      params: z.object({ planId: z.string() }),
      description: "Subscribe to a pricing plan",
    },
  },
});
```

### Slots for Children

Components can accept child specs via slots:

```typescript
PageLayout: {
  props: z.object({
    title: z.string(),
  }),
  slots: {
    header: { description: "Page header content" },
    body: { description: "Main page content" },
    sidebar: { description: "Optional sidebar", optional: true },
  },
}
```

### Action Emission

Components emit actions that the host app handles:

```typescript
// In registry implementation
function PricingCard({ props, emit }) {
  return (
    <button onClick={() => emit("subscribe", { planId: props.id })}>
      Subscribe
    </button>
  );
}
```

## GemSkills Visual Pipeline

Generate visual assets for use within generative UI:

### Image Generation Flow
1. **Browse styles** — `Skill(gemskills:browsing-styles)` to explore 169 visual styles
2. **Generate** — `Skill(gemskills:generate-image)` with chosen style
3. **Refine** — `Skill(gemskills:edit-image)` for crop, resize, style transfer
4. **Optimize** — `Skill(gemskills:optimize-images)` for web-ready compression

### Vector Assets
- `Skill(gemskills:generate-svg)` for logos, icons, decorative elements
- `Skill(gemskills:generate-icon)` for platform-specific app icons (iOS, Android, web favicon)

### Video Assets
- `Skill(gemskills:generate-video)` for background videos, animations
- Combine with `@json-render/remotion` for AI-composed video sequences

## Pattern Examples

### AI Chat with Rich Cards
```json
{
  "components": [
    { "type": "Card", "props": { "title": "Flight Options" }, "children": [
      { "type": "DataTable", "props": { "columns": ["Airline", "Price", "Duration"], "rows": [...] } }
    ]},
    { "type": "Button", "props": { "label": "Book Now", "variant": "primary" }, "action": "book" }
  ]
}
```

### Personalized Dashboard
AI analyzes user data and generates a spec with relevant widgets — charts for metrics they track, alerts for items needing attention, quick actions for frequent tasks.

### Dynamic Form Builder
Natural language -> AI maps to form components: "I need a contact form with name, email, and message" -> spec with Input, Input (email type), Textarea, Button components.

### Email Template Generator
Same catalog, email registry. AI generates newsletter spec -> `@json-render/react-email` renders to HTML + plaintext.

### Social Card Generator
AI generates card layout spec -> `@json-render/image` renders to PNG for OG images.
