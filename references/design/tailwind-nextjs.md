# Tailwind CSS with Next.js Setup Guide

## Installation Steps

### 1. Create Next.js Project
```bash
npx create-next-app@latest my-project --typescript --eslint --app
cd my-project
```

### 2. Install Tailwind CSS
```bash
npm install tailwindcss @tailwindcss/postcss postcss
```

### 3. Configure PostCSS
Create `postcss.config.mjs` in project root:
```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

### 4. Import Tailwind CSS
Add to `./src/app/globals.css`:
```css
@import "tailwindcss";
```

### 5. Start Development
```bash
npm run dev
```

## Configuration

### tailwind.config.js
Next.js automatically creates this, but you can customize:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors
      },
      fontFamily: {
        // Custom fonts
      },
    },
  },
  plugins: [],
}
```

## Common Patterns

### Responsive Design
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

### Dark Mode Support
```tsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  {/* Dark mode aware */}
</div>
```

### Custom Components
```tsx
// Button with Tailwind classes
export function Button({ children, variant = 'primary' }) {
  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  }
  
  return (
    <button className={`px-4 py-2 rounded-md transition-colors ${variants[variant]}`}>
      {children}
    </button>
  )
}
```

## Optimization Tips

### 1. Use PurgeCSS (Built-in)
Tailwind automatically removes unused styles in production.

### 2. Component Classes
```tsx
// Good: Extract repeated patterns
const cardStyles = "bg-white rounded-lg shadow-md p-6"

// Use cn() utility for conditional classes
import { cn } from "@/lib/utils"
```

### 3. Avoid Dynamic Classes
```tsx
// Bad: Dynamic class generation
<div className={`text-${color}-500`} />

// Good: Use complete class names
<div className={color === 'red' ? 'text-red-500' : 'text-blue-500'} />
```

## Useful Plugins

### Official Plugins
```bash
npm install @tailwindcss/forms @tailwindcss/typography @tailwindcss/aspect-ratio
```

Add to config:
```javascript
plugins: [
  require('@tailwindcss/forms'),
  require('@tailwindcss/typography'),
  require('@tailwindcss/aspect-ratio'),
]
```

### Custom Utilities
```javascript
// In tailwind.config.js
plugins: [
  function({ addUtilities }) {
    addUtilities({
      '.text-balance': {
        'text-wrap': 'balance',
      },
    })
  }
]
```

## Integration with shadcn/ui
When using shadcn/ui, Tailwind is already configured. The setup ensures:
- Consistent design tokens
- CSS variables for theming
- Optimized for component libraries

## Resources
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Next.js + Tailwind Guide](https://tailwindcss.com/docs/guides/nextjs)
- [Tailwind UI Components](https://tailwindui.com)
- [Tailwind Play](https://play.tailwindcss.com)