# shadcn/ui Integration Guide

## Overview
shadcn/ui is a modern component library built on Radix UI and Tailwind CSS that provides copy-paste components rather than a traditional npm package.

## Installation with Next.js

```bash
# Initialize shadcn/ui in your Next.js project
npx shadcn@latest init

# Answer the prompts:
# - TypeScript: Yes/No based on your project
# - Style: Choose between New York or Default
# - Base color: Choose from available options
# - CSS variables: Yes (recommended for theming)
# - Where is your tailwind.config.js? (auto-detected)
# - Configure import alias? Yes (recommended)
```

## Key Concepts

### Component Installation
```bash
# Add individual components
npx shadcn@latest add button
npx shadcn@latest add card dialog form

# Add multiple components at once
npx shadcn@latest add button card dialog form table
```

### File Structure
- Components are copied to `components/ui/`
- Each component is self-contained with its styles
- Modify directly for customization

### Theming System

#### CSS Variables (Recommended)
Configure in your `globals.css`:
```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    /* ... other variables */
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark mode variables */
  }
}
```

#### Visual Theme Editor - tweakcn
**URL**: https://tweakcn.com

tweakcn is a powerful visual theme editor for Tailwind CSS & shadcn/ui:
- **Visual Customization**: Edit themes visually without touching code
- **Beautiful Presets**: Start with pre-designed themes
- **Advanced Controls**: Fine-tune every aspect of your UI
- **Export Ready**: Copy generated CSS variables directly

**Features**:
- Real-time preview of all shadcn/ui components
- Color picker with accessibility checks
- Radius, spacing, and typography controls
- Dark mode support
- Export themes as CSS or JSON

**Recommended Workflow**:

1. **Clear existing custom styles** (before applying tweakcn theme):
   ```bash
   # Reset your globals.css to default shadcn/ui theme
   npx shadcn@latest init -y
   ```

2. **Use tweakcn to create your theme**:
   - Visit [tweakcn.com](https://tweakcn.com)
   - Choose a preset or start from scratch
   - Customize colors, radius, and other properties
   - Preview changes on live components

3. **Export and apply the theme**:
   - Click "Copy" to get the CSS variables
   - Replace the `:root` and `.dark` variables in your `globals.css`
   - Keep the generated theme for consistency

4. **Install shadcn/ui components with your theme**:
   ```bash
   # Components will now use your custom theme
   npx shadcn@latest add button card dialog
   ```

**Pro Tips**:
- Always clear custom styles before applying a new theme
- Save your tweakcn theme URL for future edits
- Test dark mode thoroughly after applying themes
- Export as JSON for version control

This tool solves the "all shadcn sites look the same" problem by making customization accessible and visual.

#### Theme Toggle Implementation
```tsx
// Using next-themes
npm install next-themes

// In your layout.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

## Common Component Patterns

### Forms with React Hook Form + Zod
```bash
npx shadcn@latest add form
```

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

const formSchema = z.object({
  username: z.string().min(2).max(50),
})

// Use Form components for consistent styling and validation
```

### Data Tables
```bash
npx shadcn@latest add table data-table
```
- Integrates with @tanstack/react-table
- Built-in sorting, filtering, pagination
- Server-side data support

### Command Palette
```bash
npx shadcn@latest add command
```
- ⌘K style command menu
- Search and navigation
- Keyboard navigation support

## Best Practices

### 1. Use the cn() utility
```tsx
import { cn } from "@/lib/utils"

<Button
  className={cn(
    "default-classes",
    conditionalClass && "conditional-classes",
    className
  )}
/>
```

### 2. Extend Components
```tsx
// Create variants by extending base components
export function GhostButton({ className, ...props }) {
  return (
    <Button
      variant="ghost"
      className={cn("hover:bg-accent", className)}
      {...props}
    />
  )
}
```

### 3. Accessibility
- All components built on Radix UI primitives
- ARIA attributes included
- Keyboard navigation support
- Focus management handled

### 4. Performance
- Components are tree-shakeable
- Only bundle what you use
- Use dynamic imports for large components:
```tsx
const Dialog = dynamic(
  () => import("@/components/ui/dialog").then(mod => mod.Dialog),
  { ssr: false }
)
```

## Advanced Patterns

### Custom Themes
1. Modify CSS variables for brand colors
2. Use theme generator: https://ui.shadcn.com/themes
3. Create multiple theme variants

### Component Composition
```tsx
// Compose complex UI from primitives
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Integration with State Management
- Works with any state management solution
- Server Components compatible
- Client Components when needed

## Protecting shadcn/ui Components with Claude Code Hooks

### Why Protect Components
- **Component Integrity**: shadcn/ui components should not be modified directly
- **Update Safety**: Prevents conflicts when updating components via CLI
- **Best Practices**: Enforces extending components rather than modifying originals

### Simple Hook Setup

Create `.claude/settings.json` in your project root:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|MultiEdit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "file_path=$(jq -r '.tool_input.file_path // empty'); [[ \"$file_path\" == *\"/components/ui/\"* ]] && { echo \"Blocked: Do not edit shadcn/ui components directly\" >&2; exit 2; } || exit 0",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

**How it works:**
- Triggers on any file edit attempt (Edit, MultiEdit, Write)
- Blocks editing if path contains `/components/ui/`
- Shows error to Claude: "Blocked: Do not edit shadcn/ui components directly"

**Customization examples:**
```bash
# Allow specific files
[[ \"$file_path\" == *\"/components/ui/\"* && \"$file_path\" != *\"mode-toggle.tsx\" ]]

# Block multiple directories
[[ \"$file_path\" == *\"/components/ui/\"* || \"$file_path\" == *\"/node_modules/\"* ]]
```

**Requirements:** jq must be installed (pre-installed on macOS)

## Resources
- [Official Documentation](https://ui.shadcn.com)
- [Component Examples](https://ui.shadcn.com/examples)
- [Themes Gallery](https://ui.shadcn.com/themes)
- [GitHub Repository](https://github.com/shadcn-ui/ui)