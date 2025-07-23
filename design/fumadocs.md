# Fumadocs Documentation Framework Guide

## Overview
Fumadocs is a modern documentation framework built on Next.js that provides a complete solution for creating beautiful, fast documentation sites with full AI/LLM support.

## Key Features (from llms.txt)
- **MDX Support**: Write documentation in Markdown with React components
- **Built on Next.js 15**: Leverages App Router for optimal performance
- **Type-safe**: Full TypeScript support throughout
- **AI Integration**: Built-in support for AI functionality (`/docs/ui/llms`)
- **Search Options**: Multiple search providers (Algolia, Orama, Trieve)
- **Component Library**: Pre-built documentation components
- **OpenAPI Support**: Generate docs from OpenAPI schemas
- **Internationalization**: Multi-language support
- **CLI Tool**: Automates setups and component installation

## Core Packages
- **fumadocs-core**: Headless library for core functionality
- **fumadocs-ui**: Pre-built UI components and layouts
- **fumadocs-mdx**: MDX processing and compilation
- **fumadocs-openapi**: OpenAPI schema documentation

## Critical Setup Rules

### ✅ DO's
1. **Use sync mode** for simplicity and reliability
2. **Manual source creation** to bypass loader issues
3. **Always build after changes** to catch errors early
4. **Follow exact TypeScript patterns**
5. **Use only fumadocs MDX plugin** (not @next/mdx)

### ❌ DON'Ts
1. **Never use async mode** - sync is simpler and more reliable
2. **Never mix @next/mdx with fumadocs-mdx**
3. **Never use fumadocs-core loader** - manual source creation avoids conflicts
4. **Never forget to await params** in Next.js 15
5. **Never skip the build step** after config changes

## Available Components (from llms.txt)

### Layout Components
- **Docs Layout** (`/docs/ui/layouts/docs`): Main documentation layout
- **Home Layout** (`/docs/ui/layouts/home-layout`): For landing pages
- **Notebook** (`/docs/ui/layouts/notebook`): Compact docs layout
- **Root Provider** (`/docs/ui/layouts/root-provider`): Context provider

### UI Components
- **Accordion**: Collapsible content sections
- **Tabs**: Multi-tab interfaces with persistence
- **Steps**: Step-by-step guides
- **Code Block**: Syntax-highlighted code with dynamic features
- **Files**: Display file structures
- **Type Table**: Document TypeScript types
- **Inline TOC**: Embedded table of contents
- **Image Zoom**: Zoomable images
- **Banner**: Site-wide announcements

### MDX Features
- **Remark Admonition**: Callout boxes
- **Remark Image**: Next.js Image optimization
- **Remark TS to JS**: Auto-generate JS from TS
- **Package Install**: Multi-package manager install blocks
- **Include**: Reuse content from other files
- **Math**: LaTeX math equations
- **Mermaid**: Diagrams and flowcharts
- **Twoslash**: TypeScript playground in docs

## Search Integration Options
1. **Orama** (default): Built-in search, no external dependencies
2. **Orama Cloud**: Cloud-hosted search
3. **Algolia**: Enterprise search solution
4. **Trieve**: Advanced semantic search

## AI/LLM Features
- Located at `/docs/ui/llms`
- Integrates AI functionality directly into documentation
- Supports chat interfaces and AI-powered search

## Quick Setup Example

```bash
# Install dependencies
bun add fumadocs-ui fumadocs-core fumadocs-mdx

# Use CLI for components
npx fumadocs-cli@latest add
```

## Advanced Features

### OpenAPI Documentation
- Auto-generate API docs from OpenAPI/Swagger specs
- Interactive API playground
- Media adapter support
- CORS proxy configuration

### Internationalization
```typescript
export const { docs, meta } = defineDocs({
  dir: "content/docs",
  languages: ['en', 'es', 'fr'],
});
```

### Custom Search
```typescript
// Configure search provider in layout
import { OramaClient } from 'fumadocs-core/search/client';

export default function Layout() {
  return (
    <DocsLayout
      search={{
        provider: 'orama',
        options: {
          // Custom search options
        }
      }}
    />
  );
}
```

## Performance Features
- Static export support
- Automatic code splitting
- Image optimization
- Metadata API integration
- RSS feed generation

## Resources
- [Official Documentation](https://fumadocs.vercel.app)
- [GitHub Repository](https://github.com/fuma-nama/fumadocs)
- [LLMs.txt](https://fumadocs.dev/llms.txt) - Complete feature list
- [Examples](https://github.com/fuma-nama/fumadocs/tree/main/examples)