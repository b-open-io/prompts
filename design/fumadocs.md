---
name: "Fumadocs Design & Theming"
version: "1.0.0"
description: "Complete guide for UI theming, styling, and visual customization of Fumadocs documentation sites"
category: "design"
tags: ["fumadocs", "theming", "ui", "styling", "customization", "design-system"]
author: "BSV Development Team"
requirements:
  tools: ["Fumadocs UI", "Tailwind CSS", "CSS"]
  environment: ["Next.js 15+"]
  dependencies: ["fumadocs-ui"]
metadata:
  llm_provider: ["claude"]
  complexity: "intermediate"
  estimated_tokens: 5000
  time_estimate: "20-30 minutes"
---

# Fumadocs Design & Theming

## Overview

This guide focuses on the visual customization and theming capabilities of Fumadocs, including UI components, styling options, layout customization, and creating a cohesive design system for your documentation.

## Core Design Features

### Theme System
- **Light/Dark Mode**: Built-in theme switching with system preference detection
- **CSS Variables**: Comprehensive theming through CSS custom properties
- **Tailwind Integration**: Full Tailwind CSS support with custom configurations
- **Component Theming**: Individual component style customization

### Layout Options
- **Docs Layout**: Traditional documentation layout with sidebar navigation
- **Home Layout**: Landing page layout for documentation home
- **Notebook Layout**: Compact, linear documentation layout
- **Custom Layouts**: Build your own layouts using Fumadocs primitives

## UI Components Library

### Navigation Components
```tsx
// Customizable navigation with theming
<DocsLayout
  nav={{
    title: 'My Docs',
    transparentMode: 'top', // Transparent header on scroll
    githubUrl: 'https://github.com/...',
    links: [
      { text: 'Blog', url: '/blog' },
      { text: 'API', url: '/api' }
    ]
  }}
/>
```

### Content Display Components

#### Accordion
```mdx
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Section Title</AccordionTrigger>
    <AccordionContent>
      Collapsible content with smooth animations
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

#### Tabs
```mdx
<Tabs defaultValue="tab1" className="custom-tabs">
  <TabsList>
    <TabsTrigger value="tab1">Design</TabsTrigger>
    <TabsTrigger value="tab2">Code</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Design content</TabsContent>
  <TabsContent value="tab2">Code examples</TabsContent>
</Tabs>
```

#### Steps
```mdx
<Steps>
  <Step>
    ### First Step
    Design your component structure
  </Step>
  <Step>
    ### Second Step
    Apply custom styling
  </Step>
</Steps>
```

#### Banner
```tsx
// Site-wide announcement banner
<Banner variant="warning" dismissible>
  🎨 New theme customization options available!
</Banner>
```

### Media Components

#### Image Zoom
```mdx
<ImageZoom
  src="/design-system.png"
  alt="Design System Overview"
  width={800}
  height={600}
  className="rounded-lg shadow-lg"
/>
```

#### Code Blocks with Theming
```tsx
// Custom syntax highlighting themes
<CodeBlock
  lang="tsx"
  title="component.tsx"
  showLineNumbers
  highlightLines={[3, 4, 5]}
  theme="github-dark" // or custom theme
>
  {codeContent}
</CodeBlock>
```

## Theme Customization

### CSS Variables System
```css
/* app/globals.css */
:root {
  /* Primary Colors */
  --fd-primary: 220 90% 56%;
  --fd-primary-foreground: 0 0% 100%;
  
  /* Background Colors */
  --fd-background: 0 0% 100%;
  --fd-foreground: 0 0% 9%;
  
  /* Card Colors */
  --fd-card: 0 0% 100%;
  --fd-card-foreground: 0 0% 9%;
  
  /* Border and Ring */
  --fd-border: 0 0% 89.8%;
  --fd-ring: 220 90% 56%;
  
  /* Muted Colors */
  --fd-muted: 0 0% 96.1%;
  --fd-muted-foreground: 0 0% 45.1%;
  
  /* Accent Colors */
  --fd-accent: 0 0% 96.1%;
  --fd-accent-foreground: 0 0% 9%;
  
  /* Semantic Colors */
  --fd-destructive: 0 84.2% 60.2%;
  --fd-destructive-foreground: 0 0% 98%;
}

.dark {
  /* Dark mode overrides */
  --fd-background: 0 0% 3.9%;
  --fd-foreground: 0 0% 98%;
  --fd-card: 0 0% 3.9%;
  --fd-card-foreground: 0 0% 98%;
  --fd-border: 0 0% 14.9%;
  --fd-muted: 0 0% 14.9%;
  --fd-muted-foreground: 0 0% 63.9%;
}
```

### Component-Specific Styling

#### Sidebar Customization
```tsx
<DocsLayout
  sidebar={{
    defaultOpenLevel: 0, // Collapsed by default
    collapsible: true,
    banner: (
      <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg">
        <h3 className="font-bold">Pro Tip</h3>
        <p className="text-sm">Use Cmd+K for quick search</p>
      </div>
    ),
    footer: (
      <div className="border-t pt-4">
        <Link href="/support">Get Support</Link>
      </div>
    )
  }}
/>
```

#### Search UI Theming
```tsx
// Custom search dialog styling
<DocsLayout
  search={{
    hot: ['cmd', 'k'], // Keyboard shortcut
    placeholder: 'Search documentation...',
    // Custom search result rendering
    render: (result) => (
      <div className="custom-search-result">
        <h4>{result.title}</h4>
        <p className="text-muted-foreground">{result.description}</p>
      </div>
    )
  }}
/>
```

### Typography System

```css
/* Custom typography scales */
.prose {
  --fd-prose-body: 1rem;
  --fd-prose-headings: var(--fd-foreground);
  --fd-prose-lead: 1.25rem;
  --fd-prose-links: var(--fd-primary);
  --fd-prose-bold: 600;
  --fd-prose-counters: var(--fd-muted-foreground);
  --fd-prose-bullets: var(--fd-muted-foreground);
  --fd-prose-hr: var(--fd-border);
  --fd-prose-quotes: var(--fd-foreground);
  --fd-prose-quote-borders: var(--fd-border);
  --fd-prose-captions: var(--fd-muted-foreground);
  --fd-prose-code: var(--fd-foreground);
  --fd-prose-pre-code: var(--fd-muted);
  --fd-prose-pre-bg: var(--fd-muted);
  --fd-prose-th-borders: var(--fd-border);
  --fd-prose-td-borders: var(--fd-border);
}
```

## Advanced Theming Patterns

### Custom Theme Provider
```tsx
// app/providers/theme-provider.tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={['light', 'dark', 'blue', 'purple']} // Custom themes
    >
      {children}
    </NextThemesProvider>
  );
}
```

### Dynamic Theme Switching
```tsx
// components/theme-switcher.tsx
import { useTheme } from 'next-themes';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  
  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="blue">Ocean Blue</option>
      <option value="purple">Royal Purple</option>
    </select>
  );
}
```

### Brand-Specific Theming
```tsx
// lib/themes/brand-theme.ts
export const brandTheme = {
  colors: {
    primary: {
      DEFAULT: '#FF6B6B',
      foreground: '#FFFFFF',
      50: '#FFE5E5',
      // ... more shades
    },
    // Brand-specific color palette
  },
  fonts: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  components: {
    button: {
      borderRadius: '0.5rem',
      fontWeight: '600',
    },
    card: {
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    },
  },
};
```

## Responsive Design

### Mobile-First Approach
```tsx
<DocsLayout
  sidebar={{
    // Mobile-optimized sidebar
    collapsible: true,
    defaultOpenLevel: -1, // Closed on mobile
  }}
  nav={{
    // Responsive navigation
    transparentMode: 'top',
    enableSearch: true,
  }}
/>
```

### Breakpoint Customization
```css
/* Custom breakpoints for documentation */
@media (max-width: 768px) {
  .docs-sidebar {
    position: fixed;
    transform: translateX(-100%);
  }
  
  .docs-sidebar.open {
    transform: translateX(0);
  }
}
```

## Animation & Transitions

### Page Transitions
```css
/* Smooth page transitions */
.docs-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Interactive Elements
```tsx
// Hover effects and micro-interactions
<Card className="transition-all hover:shadow-lg hover:scale-[1.02]">
  <CardHeader>
    <CardTitle>Interactive Card</CardTitle>
  </CardHeader>
</Card>
```

## Accessibility Considerations

### Color Contrast
```css
/* Ensure WCAG AA compliance */
:root {
  --fd-contrast-ratio: 4.5; /* Minimum for normal text */
  --fd-large-text-ratio: 3; /* For large text */
}
```

### Focus Indicators
```css
/* Custom focus styles */
:focus-visible {
  outline: 2px solid var(--fd-ring);
  outline-offset: 2px;
}

.focus-ring {
  @apply ring-2 ring-offset-2 ring-offset-background ring-primary;
}
```

## Integration with Design Systems

### Importing External Design Tokens
```tsx
// Import your design system
import { tokens } from '@company/design-system';

// Apply to Fumadocs theme
const customTheme = {
  ...tokens,
  // Map to Fumadocs variables
  '--fd-primary': tokens.colors.brand.primary,
  '--fd-secondary': tokens.colors.brand.secondary,
};
```

### Component Library Integration
```tsx
// Use your component library with Fumadocs
import { Button } from '@company/ui';

export const mdxComponents = {
  // Replace default button with your design system button
  button: Button,
  // Add custom components
  FeatureCard: CustomFeatureCard,
};
```

## Performance Optimization

### CSS Loading Strategy
```tsx
// Optimize CSS delivery
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
```

### Theme Switching Performance
```tsx
// Prevent flash of unstyled content
<script
  dangerouslySetInnerHTML={{
    __html: `
      try {
        const theme = localStorage.getItem('theme') || 'system';
        document.documentElement.classList.add(theme);
      } catch (e) {}
    `,
  }}
/>
```

## Best Practices

1. **Consistency**: Use CSS variables for all theme values
2. **Accessibility**: Test with screen readers and keyboard navigation
3. **Performance**: Minimize CSS bundle size with PurgeCSS
4. **Responsive**: Test on all device sizes
5. **Dark Mode**: Ensure all components work in both themes
6. **Brand Alignment**: Match your organization's design guidelines

## Resources

- [Fumadocs UI Components](https://fumadocs.vercel.app/docs/ui)
- [Tailwind CSS Integration](https://fumadocs.vercel.app/docs/ui/theme)
- [Custom Themes Gallery](https://fumadocs.vercel.app/showcase)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)