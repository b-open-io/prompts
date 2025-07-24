---
allowed-tools: Read, Write, Edit, Bash, WebFetch
description: AI-powered design tools and component generation resources
argument-hint: [tool] - e.g., magic, v0, galileo, framer
---

# AI Design & Component Generation Tools

Leverage AI to accelerate your design and development workflow with these powerful tools.

## Primary AI Design Tools

### 21st.dev Magic MCP
@/Users/satchmo/code/prompts/design/21st-dev-magic.md

**The most integrated AI design tool** - Generate UI components directly in your IDE using natural language. Works with Cursor, Windsurf, and VSCode through MCP (Model Context Protocol).

Quick start:
```
/ui Create a modern pricing table with three tiers and annual/monthly toggle
```

### v0 by Vercel
**URL**: https://v0.dev  
**Purpose**: AI-powered UI generation with React/Next.js/Tailwind  
**Features**:
- Natural language to component
- Live preview and iteration
- Copy-paste ready code
- shadcn/ui integration
- Multiple variations per prompt

### Galileo AI
**URL**: https://www.usegalileo.ai  
**Purpose**: AI-driven UI/UX design with Figma export  
**Features**:
- Complete app design generation
- High-fidelity mockups
- Design system aware
- Mobile and web layouts
- Figma plugin integration

### Framer AI
**URL**: https://www.framer.com  
**Purpose**: AI website builder with visual editing  
**Features**:
- Full website generation
- No-code visual editing
- Responsive design
- CMS integration
- Custom code injection

## Traditional Inspiration Resources

For manual inspiration and reference:
- **Mobbin**: https://mobbin.com - Real app UI patterns
- **Screens Design**: https://screensdesign.com - Curated app designs
- **FFFuel**: https://www.fffuel.co - SVG generators and effects

See `/design inspiration` for detailed traditional resources.

## AI Workflow Best Practices

### 1. Start with AI Generation
```
# Use 21st.dev Magic for component generation
/ui Create a dashboard sidebar with collapsible sections and dark mode

# Or use v0 for web-based generation
# Visit v0.dev and prompt: "Modern SaaS dashboard with charts"
```

### 2. Refine with Specifics
- Add brand colors
- Specify interactions
- Include accessibility needs
- Define responsive behavior

### 3. Integrate & Customize
- Review generated code
- Apply your design system
- Add business logic
- Optimize performance

## Comparison Guide

### For Component Development
**Best**: 21st.dev Magic (IDE integrated)  
**Alternative**: v0.dev (web-based, shadcn/ui ready)

### For Complete Designs
**Best**: Galileo AI (Figma export)  
**Alternative**: Framer AI (live website)

### For Inspiration
**Best**: Traditional galleries (Mobbin, Screens)  
**Enhancement**: Use AI to recreate patterns you like

## Example Workflows

### Rapid Prototyping
1. Browse Mobbin for patterns
2. Use 21st.dev Magic to generate similar components
3. Customize with your brand
4. Iterate with natural language

### Design System Components
```
/ui Create a button component with variants: primary, secondary, ghost, destructive. Include hover states, loading spinner, and disabled state. Use our brand colors.
```

### Complex Interactions
```
/ui Build a multi-select dropdown with search, keyboard navigation, select all option, and tag display for selected items
```

## Tips for AI Prompting

### Be Specific
✅ "Create a pricing card with $99/month, purple gradient, and animated hover effect"  
❌ "Make a pricing component"

### Include Context
✅ "Design a mobile-first navigation menu that collapses to hamburger on small screens"  
❌ "Create a nav menu"

### Mention Technologies
✅ "Build a data table using Tailwind CSS and shadcn/ui table primitives"  
❌ "Make a table"

## Quick Commands

### With 21st.dev Magic
```
/ui [your component description]
```

### Component Ideas
- `/ui Modern authentication form with social login`
- `/ui Kanban board with drag and drop`
- `/ui Analytics dashboard with charts`
- `/ui File upload with progress and preview`
- `/ui Timeline component with animations`

## Resources
- [21st.dev Magic Setup](https://console.21st.dev)
- [v0.dev](https://v0.dev)
- [Galileo AI](https://www.usegalileo.ai)
- [Framer](https://www.framer.com)
- [AI Design Patterns](https://github.com/ai-design-patterns)

Remember: AI tools are powerful assistants, but always review and customize the output to ensure it meets your specific needs and maintains code quality.