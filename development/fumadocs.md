---
title: "Fumadocs Development Setup"
description: "Complete technical guide for setup, configuration, and integration of Fumadocs documentation framework"
---

# Fumadocs Development Setup

## Overview

This guide provides comprehensive technical documentation for setting up, configuring, and integrating Fumadocs with your Next.js application. Fumadocs is a modern documentation framework that provides MDX support, built-in search, AI integration, and extensive customization options.

## Quick Start

### Installation

```bash
# Using Bun (recommended)
bun add fumadocs-ui fumadocs-core fumadocs-mdx

# Using npm
npm install fumadocs-ui fumadocs-core fumadocs-mdx

# Using pnpm
pnpm add fumadocs-ui fumadocs-core fumadocs-mdx
```

### CLI Tool

```bash
# Interactive component installation
npx fumadocs-cli@latest add

# Non-interactive installation
npx fumadocs-cli@latest add accordion tabs steps
```

## Core Architecture

### Package Structure
- **fumadocs-core**: Headless library providing core functionality
- **fumadocs-ui**: Pre-built UI components and layouts
- **fumadocs-mdx**: MDX processing and compilation
- **fumadocs-openapi**: OpenAPI schema documentation generation
- **fumadocs-cli**: Command-line tool for setup and component management

### Technical Requirements
- Next.js 15 or later (App Router)
- Node.js 18 or later
- TypeScript 5.0 or later
- React 18 or later

## Configuration Setup

### 1. Source Configuration (source.config.ts)

```typescript
// source.config.ts - Place in project root
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from 'zod';

export const { docs, meta } = defineDocs({
  dir: "content/docs",
  docs: {
    // Use sync mode for simplicity (recommended)
    schema: z.object({
      title: z.string().optional().default("Untitled"),
      description: z.string().optional(),
      date: z.date().optional(),
      tags: z.array(z.string()).optional(),
      authors: z.array(z.string()).optional(),
      draft: z.boolean().optional().default(false),
    }),
  },
  meta: {
    // Optional: Define metadata schema
    schema: z.object({
      title: z.string(),
      pages: z.array(z.string()),
    }),
  },
});

export default defineConfig({
  // Global MDX options
  mdxOptions: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});
```

### 2. Next.js Configuration

```typescript
// next.config.ts
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  },
  // Custom image domains for MDX
  images: {
    domains: ['example.com'],
  },
};

export default withMDX(nextConfig);
```

### 3. Source Management (lib/source.ts)

```typescript
// lib/source.ts
import { docs, meta } from '@/.source';
import { createFromSource } from 'fumadocs-core/search/algolia';
import type { InferPageType, InferMetaType } from 'fumadocs-core/source';

// Type inference
export type Page = InferPageType<typeof docs>;
export type Meta = InferMetaType<typeof meta>;

// Manual source creation for better control
export const source = {
  baseUrl: '/docs',
  pageTree: {
    type: 'folder' as const,
    name: 'Documentation',
    children: docs.map(doc => ({
      type: 'page' as const,
      name: doc.title || 'Untitled',
      url: `/docs/${doc._file.path.replace('.mdx', '')}`,
    })),
  },
  
  getPage: (slugs: string[] = []) => {
    const path = slugs.join('/') || 'index';
    const doc = docs.find(d => d._file.path.replace('.mdx', '') === path);
    if (!doc) return undefined;
    
    return {
      file: {
        flattenedPath: doc._file.path.replace('.mdx', ''),
        path: doc._file.path,
        name: doc._file.path.replace('.mdx', '').split('/').pop() || 'index',
        ext: '.mdx',
        dirname: doc._file.path.split('/').slice(0, -1).join('/'),
      },
      slugs: slugs,
      url: `/docs/${path}`,
      data: doc,
    };
  },
  
  generateParams: () => {
    return docs.map(doc => ({
      slug: doc._file.path.replace('.mdx', '').split('/').filter(Boolean),
    }));
  },
  
  // Helper functions
  getPages: () => docs,
  getMeta: () => meta,
};
```

## Page Implementation

### Documentation Page Component

```typescript
// app/docs/[[...slug]]/page.tsx
import { source } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { getTableOfContents } from 'fumadocs-core/server';

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug || []);
  
  if (!page) notFound();

  const MDX = page.data.body;
  const toc = await getTableOfContents(page.data.body);

  return (
    <DocsPage 
      toc={toc}
      lastUpdate={page.data.date}
      breadcrumb={{
        enabled: true,
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description && (
        <DocsDescription>{page.data.description}</DocsDescription>
      )}
      <DocsBody>
        <MDX components={{
          ...defaultMdxComponents,
          // Add custom components here
        }} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug || []);
  
  if (!page) return {};

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      title: page.data.title,
      description: page.data.description,
    },
  };
}
```

### Layout Configuration

```typescript
// app/docs/layout.tsx
import { DocsLayout } from 'fumadocs-ui/layout';
import { RootProvider } from 'fumadocs-ui/provider';
import { source } from '@/lib/source';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        tree={source.pageTree}
        nav={{
          title: 'Documentation',
          url: '/',
          githubUrl: 'https://github.com/your-org/your-repo',
        }}
        sidebar={{
          defaultOpenLevel: 1,
          collapsible: true,
        }}
        links={[
          {
            text: 'Community',
            url: '/community',
            active: 'nested-url',
          },
        ]}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
```

## Search Integration

### Orama Search (Built-in)

```typescript
// app/api/search/route.ts
import { createSearchAPI } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

export const { GET } = createSearchAPI('simple', {
  indexes: source.getPages().map((page) => ({
    title: page.title,
    structuredData: page.data.structuredData,
    id: page.url,
    url: page.url,
  })),
});
```

### Algolia Integration

```typescript
// lib/search/algolia.ts
import { SearchClient } from 'algoliasearch';
import { source } from '@/lib/source';

export async function syncSearchIndexes(client: SearchClient) {
  const index = client.initIndex('docs');
  
  const objects = source.getPages().map((page) => ({
    objectID: page.url,
    title: page.title,
    description: page.description,
    content: page.data.structuredData,
    url: page.url,
    hierarchy: {
      lvl0: 'Documentation',
      lvl1: page.title,
    },
  }));
  
  await index.saveObjects(objects);
}
```

## MDX Features

### Remark/Rehype Plugins

```typescript
// source.config.ts
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypePrettyCode from 'rehype-pretty-code';

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [
      remarkGfm,
      remarkMath,
      // Custom remark plugin
      () => (tree) => {
        // Transform logic
      },
    ],
    rehypePlugins: [
      rehypeKatex,
      [rehypePrettyCode, {
        theme: 'github-dark',
      }],
    ],
  },
});
```

### Custom MDX Components

```tsx
// components/mdx/index.tsx
import { MDXComponents } from 'mdx/types';
import defaultComponents from 'fumadocs-ui/mdx';
import { Callout } from '@/components/callout';
import { CodeBlock } from '@/components/code-block';

export const mdxComponents: MDXComponents = {
  ...defaultComponents,
  Callout,
  pre: CodeBlock,
  // Custom component mapping
  Alert: ({ children, type }) => (
    <div className={`alert alert-${type}`}>{children}</div>
  ),
};
```

## Advanced Features

### Internationalization

```typescript
// source.config.ts
export const { docs, meta } = defineDocs({
  dir: 'content',
  docs: {
    languages: ['en', 'es', 'fr'],
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      lang: z.enum(['en', 'es', 'fr']).default('en'),
    }),
  },
});

// lib/i18n.ts
export function getI18nProps(locale: string) {
  return {
    locale,
    messages: require(`../locales/${locale}.json`),
  };
}
```

### API Documentation (OpenAPI)

```typescript
// app/api-docs/[[...slug]]/page.tsx
import { createApiDocs } from 'fumadocs-openapi/server';
import { openapi } from '@/lib/openapi';

const { getPage, getPages, pageTree } = createApiDocs({
  spec: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
    },
    // Your OpenAPI spec
  },
});

export default async function Page({ params }: PageProps) {
  const page = getPage(params.slug);
  if (!page) notFound();
  
  return <APIPage page={page} />;
}
```

### Versioning

```typescript
// lib/versions.ts
export const versions = [
  { name: 'v2.0', link: '/docs/v2' },
  { name: 'v1.0', link: '/docs/v1' },
];

// source.config.ts
export const { docs: docsV2 } = defineDocs({
  dir: 'content/v2',
});

export const { docs: docsV1 } = defineDocs({
  dir: 'content/v1',
});
```

## Performance Optimization

### Static Generation

```typescript
// next.config.ts
const nextConfig = {
  output: 'export', // Static export
  images: {
    unoptimized: true, // For static export
  },
};
```

### Lazy Loading

```tsx
// components/heavy-component.tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./actual-component'), {
  loading: () => <div>Loading...</div>,
  ssr: false,
});
```

### Image Optimization

```typescript
// MDX component for optimized images
import Image from 'next/image';

export const OptimizedImage = ({ src, alt, ...props }) => (
  <Image
    src={src}
    alt={alt}
    loading="lazy"
    placeholder="blur"
    {...props}
  />
);
```

## Testing

### Unit Testing

```typescript
// __tests__/source.test.ts
import { source } from '@/lib/source';

describe('Documentation Source', () => {
  it('should return page for valid slug', () => {
    const page = source.getPage(['getting-started']);
    expect(page).toBeDefined();
    expect(page?.data.title).toBe('Getting Started');
  });
  
  it('should return undefined for invalid slug', () => {
    const page = source.getPage(['non-existent']);
    expect(page).toBeUndefined();
  });
});
```

### E2E Testing

```typescript
// e2e/docs.spec.ts
import { test, expect } from '@playwright/test';

test('documentation navigation', async ({ page }) => {
  await page.goto('/docs');
  
  // Check sidebar
  await expect(page.locator('[role="navigation"]')).toBeVisible();
  
  // Navigate to page
  await page.click('text=Getting Started');
  await expect(page).toHaveURL('/docs/getting-started');
  
  // Check TOC
  await expect(page.locator('[aria-label="On this page"]')).toBeVisible();
});
```

## Deployment

### Vercel

```json
// vercel.json
{
  "buildCommand": "bun run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_DOCS_URL": "https://docs.example.com"
  }
}
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN npm install -g bun && bun install
COPY . .
RUN bun run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
RUN npm install -g bun && bun install --production
EXPOSE 3000
CMD ["bun", "start"]
```

## Troubleshooting

### Common Issues

1. **Build Errors**
   ```bash
   # Clear cache
   rm -rf .next .source
   bun install
   bun run build
   ```

2. **MDX Processing Issues**
   - Ensure no conflicting MDX configurations
   - Use only fumadocs-mdx, not @next/mdx
   - Check for syntax errors in MDX files

3. **Type Errors**
   - Update TypeScript to latest version
   - Ensure proper async/await for Next.js 15 params
   - Check source configuration schema matches content

4. **Search Not Working**
   - Verify API route is properly configured
   - Check search index is being generated
   - Ensure proper CORS settings for external search

## Best Practices

1. **Content Organization**
   - Use clear folder structure
   - Consistent naming conventions
   - Meaningful slugs for SEO

2. **Performance**
   - Enable static generation where possible
   - Optimize images and assets
   - Use proper caching strategies

3. **SEO**
   - Include metadata in all pages
   - Use structured data
   - Generate sitemaps

4. **Maintenance**
   - Regular dependency updates
   - Automated testing
   - Documentation versioning

## Resources

- [Official Documentation](https://fumadocs.vercel.app)
- [GitHub Repository](https://github.com/fuma-nama/fumadocs)
- [Examples](https://github.com/fuma-nama/fumadocs/tree/main/examples)
- [Discord Community](https://discord.gg/fumadocs)