---
description: TanStack Query patterns for data fetching and state management
allowed-tools: Read, Edit, MultiEdit, Write, Grep, Glob, WebFetch
argument-hint: [pattern] | setup | mutations | infinite | optimistic
---

## Help Check
!`[[ "$ARGUMENTS" == *"--help"* ]] && echo "HELP_REQUESTED" || echo "CONTINUE"`

$IF_HELP_REQUESTED:
**tanstack** - TanStack Query patterns for data fetching and state management

**Usage:** `/tanstack [pattern]`

**Description:**
Comprehensive TanStack Query (formerly React Query) patterns for Next.js App Router. Covers setup, queries, mutations, infinite scrolling, optimistic updates, and advanced caching strategies.

**Arguments:**
- `setup`      : Provider and configuration setup
- `mutations`  : Mutation patterns with error handling
- `infinite`   : Infinite scrolling implementation
- `optimistic` : Optimistic update strategies
- `<pattern>`  : Search for specific patterns
- `--help`     : Show this help message

**Examples:**
- `/tanstack`           : Overview of TanStack Query
- `/tanstack setup`     : Initial setup with App Router
- `/tanstack mutations` : Mutation patterns and best practices
- `/tanstack infinite`  : Infinite query implementation

**Features:**
- App Router integration
- Query client setup
- Basic and dependent queries
- Mutations with optimistic updates
- Infinite queries
- Prefetching strategies
- Background refetching

$STOP_EXECUTION_IF_HELP

# TanStack Query Patterns

$ARGUMENTS

## Setup

### Install Dependencies
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
# or
bun add @tanstack/react-query @tanstack/react-query-devtools
```

### Provider Setup (App Router)
```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
```

## Common Patterns

### Basic Query
```typescript
import { useQuery } from '@tanstack/react-query';

function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
    enabled: !!id,
  });
}
```

### Mutations with Optimistic Updates
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update');
      return res.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['user', id] });
      const previousUser = queryClient.getQueryData(['user', id]);
      queryClient.setQueryData(['user', id], (old: any) => ({ ...old, ...data }));
      return { previousUser };
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData(['user', id], context?.previousUser);
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
    },
  });
}
```

### Infinite Queries
```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

function usePosts() {
  return useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/posts?cursor=${pageParam || ''}`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      return res.json();
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

// Usage in component
function PostList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = usePosts();
  
  return (
    <>
      {data?.pages.map((page) => 
        page.items.map((post) => <PostCard key={post.id} post={post} />)
      )}
      <button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
        {isFetchingNextPage ? 'Loading...' : hasNextPage ? 'Load More' : 'No more posts'}
      </button>
    </>
  );
}
```

### Prefetching
```typescript
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

// In Server Component
export default async function UserPage({ params }: { params: { id: string } }) {
  const queryClient = new QueryClient();
  
  await queryClient.prefetchQuery({
    queryKey: ['user', params.id],
    queryFn: () => fetchUser(params.id),
  });
  
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserProfile id={params.id} />
    </HydrationBoundary>
  );
}
```

## Advanced Patterns

### Dependent Queries
```typescript
const { data: user } = useQuery({
  queryKey: ['user', userId],
  queryFn: fetchUser,
});

const { data: projects } = useQuery({
  queryKey: ['projects', user?.id],
  queryFn: () => fetchProjects(user!.id),
  enabled: !!user?.id,
});
```

### Background Refetching
```typescript
const queryClient = useQueryClient();

// Refetch in background
queryClient.invalidateQueries({ queryKey: ['todos'] });

// Refetch immediately
queryClient.refetchQueries({ queryKey: ['todos'] });
```

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Practical React Query](https://tkdodo.eu/blog/practical-react-query)