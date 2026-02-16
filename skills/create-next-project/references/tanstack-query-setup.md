# TanStack Query Setup

Provider configuration, custom hooks, and patterns for using TanStack Query as the exclusive client-side data fetching layer.

## Installation

```bash
bun add @tanstack/react-query
bun add -d @tanstack/react-query-devtools
```

## Query Client (`src/lib/query-client.ts`)

```ts
import { QueryClient } from "@tanstack/react-query"

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient()
  }
  // Browser: reuse client across renders
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}
```

## Provider (`src/components/query-provider.tsx`)

```tsx
"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { getQueryClient } from "@/lib/query-client"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

## Root Layout Integration

In `src/app/layout.tsx`, wrap children with QueryProvider (inside ThemeProvider):

```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <QueryProvider>
    {children}
  </QueryProvider>
</ThemeProvider>
```

## Custom Hook Patterns

ALL client-side data fetching goes through TanStack Query hooks. No raw `fetch()` calls in components.

### Basic Query Hook

```ts
import { useQuery } from "@tanstack/react-query"

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Failed to fetch users")
      return res.json()
    },
  })
}
```

### Mutation Hook

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query"

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to create user")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })
}
```

### Usage in Components

```tsx
"use client"

import { useUsers } from "@/hooks/use-users"

export function UserList() {
  const { data, isLoading, error } = useUsers()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {data.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

## Key Rules

- NEVER use raw `fetch()` in client components - always wrap in TanStack Query
- Put hooks in `src/hooks/` directory with `use-` prefix
- Use `queryKey` arrays for cache management
- Use `invalidateQueries` after mutations to refetch related data
- Server components can fetch data directly (no TanStack Query needed on server)
- TanStack Query is for CLIENT-SIDE data fetching only
