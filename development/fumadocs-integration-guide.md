---
name: "Fumadocs Complete Integration Guide"
version: "1.0.0"
description: "Complete, tested setup guide for Fumadocs latest version with BigBlocks and Next.js 15"
category: "development"
tags: ["fumadocs", "documentation", "mdx", "nextjs", "bigblocks", "setup"]
author: "BSV Development Team"
requirements:
  tools: ["Next.js 15", "Bun", "TypeScript"]
  environment: ["Node.js 18+"]
  dependencies: ["fumadocs-ui", "fumadocs-core", "fumadocs-mdx"]
metadata:
  llm_provider: ["claude"]
  complexity: "critical"
  estimated_tokens: 8000
  time_estimate: "30-45 minutes"
  tested_status: "working"
---

# Fumadocs Complete Integration Guide

**⚠️ CRITICAL: Tested and working configuration - took hours to debug!**

## 🎯 Overview

This guide provides the **exact working configuration** for integrating Fumadocs with:
- Next.js 15 (App Router)
- BigBlocks components
- TypeScript
- MDX content

**DO NOT deviate from this configuration** - it's been thoroughly tested and debugged.

## 🚨 Critical Configuration Rules

### ❌ What NOT to Do
1. **NEVER use async mode** - sync mode is simpler and more reliable
2. **NEVER mix @next/mdx with fumadocs-mdx** - use ONLY fumadocs createMDX
3. **NEVER use fumadocs-core loader** - manual source creation avoids type conflicts
4. **NEVER forget to await params** in Next.js 15
5. **NEVER skip the build step** after config changes

### ✅ What TO Do
1. **Use sync mode** for simplicity and reliability
2. **Manual source creation** to bypass loader issues
3. **Always build after changes** to catch errors early
4. **Follow exact TypeScript patterns** shown below

## 📦 Step 1: Install Dependencies

```bash
# Core Fumadocs packages
bun add fumadocs-ui fumadocs-core fumadocs-mdx

# Additional dependencies
bun add zod

# Development dependencies (if needed)
bun add -D @types/mdx
```

## ⚙️ Step 2: Configuration Files

### 2.1 source.config.ts (SYNC MODE ONLY!)

```typescript
// source.config.ts - ROOT OF PROJECT
import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { z } from 'zod';

export const { docs, meta } = defineDocs({
  dir: "content/docs",
  docs: {
    // ❌ NO async: true - use sync mode for simplicity
    schema: z.object({
      title: z.string().optional().default("Untitled"),
      description: z.string().optional(),
    }),
  },
});

export default defineConfig();
```

### 2.2 next.config.ts (FUMADOCS MDX ONLY!)

```typescript
// next.config.ts
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

const nextConfig = {
  // Your existing config
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:4100']
    }
  },
  // ❌ Remove pageExtensions if present - fumadocs handles this
};

// ❌ NEVER mix with @next/mdx - use ONLY fumadocs createMDX!
export default withMDX(nextConfig);
```

### 2.3 lib/source.ts (MANUAL SOURCE - BYPASS LOADER!)

```typescript
// lib/source.ts
import { docs, meta } from '@/.source';

// Manual source creation - fumadocs-core loader has issues with generated docs
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
      data: doc, // Contains body, toc, title, description from MarkdownProps
    };
  },
  
  generateParams: () => {
    return docs.map(doc => ({
      slug: doc._file.path.replace('.mdx', '').split('/').filter(Boolean),
    }));
  },
};
```

## 📄 Step 3: Page Implementation

### 3.1 app/docs/[[...slug]]/page.tsx (SYNC PATTERN!)

```typescript
// app/docs/[[...slug]]/page.tsx
import { source } from '@/lib/source';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import defaultMdxComponents from 'fumadocs-ui/mdx';

interface PageProps {
  params: Promise<{ slug?: string[] }>; // Next.js 15 async params!
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug || []);
  
  if (!page) notFound();

  // SYNC MODE - direct access to body and toc
  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description && (
        <DocsDescription>{page.data.description}</DocsDescription>
      )}
      <DocsBody>
        <MDX components={defaultMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

// Generate static params for all docs
export function generateStaticParams() {
  return source.generateParams();
}

// Generate metadata
export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const page = source.getPage(params.slug || []);
  
  if (!page) return {};

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
```

### 3.2 app/docs/layout.tsx (DOCS LAYOUT)

```typescript
// app/docs/layout.tsx
import { DocsLayout } from 'fumadocs-ui/layout';
import { source } from '@/lib/source';
import type { ReactNode } from 'react';

export default function Layout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'Documentation',
      }}
      sidebar={{
        banner: (
          <div className="rounded-md border bg-card p-2 text-sm">
            💡 <strong>Tip:</strong> Use Cmd+K to search
          </div>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
```

## 📝 Step 4: Content Structure

### 4.1 Create Content Directory

```bash
# Create content structure
mkdir -p content/docs

# Create index page
touch content/docs/index.mdx

# Create example pages
touch content/docs/getting-started.mdx
touch content/docs/components.mdx
```

### 4.2 Example Content Files

```mdx
---
title: Getting Started
description: Quick start guide for the documentation
---

# Getting Started

Welcome to our documentation! This guide will help you get started.

## Installation

```bash
npm install our-package
```

## Quick Example

Here's a simple example:

```typescript
import { Component } from 'our-package';

export default function App() {
  return <Component />;
}
```
```

## 🔧 Step 5: BigBlocks Integration

### 5.1 Custom MDX Components with BigBlocks

```typescript
// lib/mdx-components.tsx
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { MDXComponents } from 'mdx/types';

// Import BigBlocks components
import { Button } from '@/components/bigblocks/Button';
import { CodeBlock } from '@/components/bigblocks/CodeBlock';

export const mdxComponents: MDXComponents = {
  ...defaultMdxComponents,
  
  // Custom BigBlocks components in MDX
  Button,
  CodeBlock,
  
  // Custom wrapper for code blocks
  pre: ({ children, ...props }) => (
    <CodeBlock {...props}>
      {children}
    </CodeBlock>
  ),
};
```

### 5.2 Update Page to Use Custom Components

```typescript
// app/docs/[[...slug]]/page.tsx (updated)
import { mdxComponents } from '@/lib/mdx-components'; // Instead of defaultMdxComponents

export default async function Page(props: PageProps) {
  // ... existing code ...

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {page.data.description && (
        <DocsDescription>{page.data.description}</DocsDescription>
      )}
      <DocsBody>
        <MDX components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}
```

## 🚨 Step 6: Critical Build Process

### 6.1 Always Build After Changes

```bash
# CRITICAL: Always run after ANY fumadocs config changes
bun run build

# Check for errors
bun run lint

# Test the docs
bun dev
# Visit http://localhost:3000/docs
```

### 6.2 Troubleshooting Build Issues

```bash
# Clear Next.js cache if issues persist
rm -rf .next

# Regenerate fumadocs source
rm -rf .source

# Clean build
bun run build
```

## 🐛 Common Issues & Solutions

### Issue 1: "Property 'body' does not exist"
**Cause**: Wrong async/sync mode configuration
**Solution**: Ensure sync mode in source.config.ts, no `async: true`

### Issue 2: "Unexpected FunctionDeclaration" 
**Cause**: Mixing @next/mdx with fumadocs-mdx
**Solution**: Remove @next/mdx, use ONLY fumadocs createMDX in next.config.ts

### Issue 3: "Property 'load' does not exist"
**Cause**: Attempting async mode with manual source
**Solution**: Use sync mode and manual source creation

### Issue 4: Runtime createCompiler errors
**Cause**: Async mode setup complexity
**Solution**: Stick to sync mode, simpler and more reliable

### Issue 5: "Cannot read properties of undefined"
**Cause**: Next.js 15 params not awaited
**Solution**: Always `await props.params` in page components

## 📋 Verification Checklist

- [ ] ✅ source.config.ts uses sync mode (no `async: true`)
- [ ] ✅ next.config.ts uses ONLY fumadocs createMDX  
- [ ] ✅ lib/source.ts implements manual source creation
- [ ] ✅ Page component awaits params for Next.js 15
- [ ] ✅ MDX component uses page.data.body directly
- [ ] ✅ Build completes without errors
- [ ] ✅ Documentation pages load correctly
- [ ] ✅ TOC (table of contents) appears
- [ ] ✅ Search functionality works
- [ ] ✅ Navigation between pages works

## 🎯 Production Deployment

### Environment Variables
```env
# No special environment variables needed for basic setup
# Add these if using advanced features:
NEXT_PUBLIC_SEARCH_API=your-search-api-key
```

### Build Commands
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "dev": "next dev",
    "docs:build": "next build && next start"
  }
}
```

## 🔄 Maintenance

### Updating Fumadocs
```bash
# Update to latest versions
bun update fumadocs-ui fumadocs-core fumadocs-mdx

# Always test after updates
bun run build
bun dev
```

### Adding New Documentation
1. Create new .mdx file in content/docs/
2. Add frontmatter with title and description
3. Run build to verify
4. Check navigation appears correctly

---

**⚠️ REMEMBER: This configuration is tested and working. Any deviation may require hours of debugging. Always build after changes!**