---
allowed-tools: Read, Write, Edit, Bash, WebFetch
description: Access design tools, frameworks, and UI component resources
argument-hint: [topic] - e.g., shadcn, tailwind, fumadocs, inspiration, ai-components
---

## Help Check
!`[[ "$ARGUMENTS" == *"--help"* ]] && echo "HELP_REQUESTED" || echo "CONTINUE"`

$IF_HELP_REQUESTED:
**design** - Access design tools, frameworks, and UI component resources

**Usage:** `/design [topic]`

**Description:**
Comprehensive design and UI development resources including component libraries (shadcn/ui), CSS frameworks (Tailwind), documentation tools (Fumadocs), design inspiration galleries, and AI-powered component generation tools.

**Arguments:**
- `shadcn`        : Modern component library with Radix UI and Tailwind
- `tailwind`      : Tailwind CSS setup and configuration
- `fumadocs`      : Documentation framework with MDX and AI
- `inspiration`   : UI galleries and design resources
- `ultracite`     : Zero-config code formatting preset
- `biome`         : Fast formatter and linter
- `ai-components` : AI-powered component generation (21st.dev)
- `--help`        : Show this help message

**Examples:**
- `/design`             : Overview of all design resources
- `/design shadcn`      : shadcn/ui component setup
- `/design inspiration` : Browse design galleries

$STOP_EXECUTION_IF_HELP

# Design & UI Development Resources

You have access to comprehensive design and UI development resources. Here's what's available:

## Component Libraries & Frameworks

### shadcn/ui
@https://raw.githubusercontent.com/b-open-io/prompts/master/design/shadcn.md

Modern component library with copy-paste components built on Radix UI and Tailwind CSS.

### Tailwind CSS with Next.js
@https://raw.githubusercontent.com/b-open-io/prompts/master/design/tailwind-nextjs.md

Complete setup guide for Tailwind CSS in Next.js projects.

## Documentation Frameworks

### Fumadocs
@https://raw.githubusercontent.com/b-open-io/prompts/master/design/fumadocs.md

Modern documentation framework with MDX support, AI integration, and beautiful themes.

## Design Inspiration & Tools

### UI Inspiration Resources
@https://raw.githubusercontent.com/b-open-io/prompts/master/design/ui-inspiration.md

Curated collection of design galleries including Mobbin, Screens Design, FFFuel for effects, and favicon generation tools.

## Code Quality & Formatting

### Ultracite
@https://raw.githubusercontent.com/b-open-io/prompts/master/design/ultracite.md

Zero-config preset for Biome that provides instant code formatting and linting for JavaScript/TypeScript projects.

### Biome
@https://raw.githubusercontent.com/b-open-io/prompts/master/design/biome.md

Fast formatter and linter written in Rust that replaces ESLint and Prettier with a single tool.

## AI-Powered Tools

### 21st.dev Magic MCP
@https://raw.githubusercontent.com/b-open-io/prompts/master/design/21st-dev-magic.md

AI component generation tool that creates UI components from natural language descriptions.

## How to Use This Command

### View Specific Topic
```
/design shadcn
/design tailwind
/design fumadocs
/design inspiration
/design ultracite
/design biome
/design ai-components
```

### Get Started with a Framework
Ask me to help you:
- Set up shadcn/ui in your project
- Configure Tailwind CSS properly
- Create a documentation site with Fumadocs
- Generate components with 21st.dev Magic
- Find design inspiration for specific UI patterns

### Common Tasks
1. **Component Setup**: "Help me add shadcn/ui to my Next.js project"
2. **Theme Configuration**: "Set up a dark mode theme with Tailwind"
3. **Documentation**: "Create a docs site with Fumadocs"
4. **UI Generation**: "Use 21st.dev to create a pricing component"
5. **Design Research**: "Find examples of onboarding flows"

## Quick Links
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [Fumadocs](https://fumadocs.vercel.app)
- [Mobbin](https://mobbin.com)
- [Screens Design](https://screensdesign.com)
- [FFFuel](https://www.fffuel.co)
- [21st.dev Console](https://console.21st.dev)

## Integration Tips
- All these tools work well together
- shadcn/ui + Tailwind is a powerful combination
- Fumadocs supports custom MDX components from shadcn/ui
- Use design galleries for inspiration, then generate with AI tools
- Always customize generated components to match your brand

What aspect of design would you like to explore?