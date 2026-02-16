# Layout Architecture

Single-layout pattern where the navbar/sidebar persists across all routes and only the content area changes.

## Principle

ONE layout renders the app shell (navbar, sidebar). Route segments render into `{children}`. No route should redefine or restate the navigation structure.

## Structure After dashboard-01

The `shadcn@latest add dashboard-01` block generates components for a dashboard layout. Extract the layout shell and restructure:

```
src/
├── app/
│   ├── layout.tsx              # Root layout: html, body, ThemeProvider, QueryProvider
│   ├── (app)/
│   │   ├── layout.tsx          # App shell: sidebar + navbar + content area
│   │   ├── page.tsx            # Dashboard home (default route)
│   │   ├── settings/
│   │   │   └── page.tsx        # Settings content only
│   │   └── [other-routes]/
│   │       └── page.tsx        # Route-specific content only
│   └── (auth)/
│       ├── layout.tsx          # Centered layout, no navbar
│       ├── login/
│       │   └── page.tsx        # login-05 block
│       └── signup/
│           └── page.tsx        # signup-05 block
├── components/
│   ├── app-sidebar.tsx         # Sidebar navigation (from dashboard-01)
│   ├── nav-main.tsx            # Main nav items
│   ├── nav-user.tsx            # User menu in sidebar
│   ├── theme-provider.tsx      # next-themes wrapper
│   ├── theme-toggle.tsx        # Light/dark/system toggle
│   └── ui/                     # shadcn/ui components
└── lib/
    ├── auth.ts                 # better-auth server config
    ├── auth-client.ts          # better-auth client
    └── query-client.ts         # TanStack Query client
```

## App Shell Layout (`(app)/layout.tsx`)

```tsx
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
```

Each page inside `(app)/` renders ONLY its content. The sidebar and any header come from the layout, not from individual pages.

## Navigation

Use Next.js `<Link>` for navigation. The sidebar items should use `usePathname()` for active state:

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

// Active state: compare pathname to item href
const pathname = usePathname()
const isActive = pathname === item.url
```

## Auth Layout (`(auth)/layout.tsx`)

Auth pages (login, signup) use a separate layout WITHOUT the sidebar:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center">
      {children}
    </div>
  )
}
```

## Key Rules

- NEVER duplicate sidebar/navbar in individual page components
- NEVER use `"use client"` on layout files unless they need client interactivity (sidebar state)
- Route segments only export their unique content
- Shared UI (breadcrumbs, page headers) can go in the app layout or as composable components passed as children
- The dashboard-01 block is a STARTING POINT - restructure it into this pattern, do not keep it as a monolithic page
