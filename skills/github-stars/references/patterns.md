# GitHub Stars — Implementation Patterns

## Table of Contents

1. [Server-Side Caching](#server-side-caching)
2. [Mobile-Responsive Display](#mobile-responsive-display)
3. [Animated Star Count](#animated-star-count)
4. [Rate Limits](#rate-limits)
5. [Reference Implementation](#reference-implementation)

---

## Server-Side Caching

For high-traffic sites, proxy through your own API route to avoid GitHub's 60 req/hr unauthenticated limit.

### Next.js API Route

```typescript
// app/api/github-stars/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");
  if (!repo) {
    return Response.json({ error: "repo parameter required" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "your-app-name",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    headers,
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) return Response.json({ stars: null });
  const data = await res.json();
  return Response.json({ stars: data.stargazers_count });
}
```

### Client Hook (Server-Side Version)

```typescript
export function useGitHubStars(repo: string) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/github-stars?repo=${encodeURIComponent(repo)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.stars !== null) setStars(data.stars);
      })
      .catch(() => {}); // Intentional: star count is non-critical — icon renders without it
  }, [repo]);

  return stars;
}
```

---

## Mobile-Responsive Display

The theme-token implementation uses two different layouts — compact in the header on desktop, and a full-width link in the mobile menu.

### Desktop Header (Hidden on Mobile)

```tsx
<a
  href={`https://github.com/${repo}`}
  target="_blank"
  rel="noopener noreferrer"
  className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
>
  <Github className="h-4 w-4" />
  {stars !== null && (
    <span className="text-xs tabular-nums">{stars}</span>
  )}
</a>
```

### Mobile Menu Item

```tsx
<a
  href={`https://github.com/${repo}`}
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
>
  <Github className="h-5 w-5" />
  <span className="flex-1 text-sm font-medium">GitHub</span>
  {stars !== null && (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
      {stars}
    </span>
  )}
</a>
```

The mobile version uses a pill-shaped badge (`rounded-full bg-muted`) for the count, making it visually distinct from the label text.

---

## Animated Star Count

For landing pages where the star count serves as a hero metric, animate the number counting up:

```typescript
import { useEffect, useRef, useState } from "react";

function useAnimatedCount(target: number | null, duration = 1000) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (target === null) return;

    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration]);

  return target === null ? null : count;
}
```

Usage:
```tsx
const stars = useGitHubStars("owner/repo");
const animatedStars = useAnimatedCount(stars);

{animatedStars !== null && (
  <span className="text-4xl font-bold tabular-nums">
    {animatedStars.toLocaleString()}
  </span>
)}
```

---

## Rate Limits

| Auth Level | Limit | How |
|---|---|---|
| Unauthenticated | 60 req/hr per IP | Default — fine for dev and low-traffic |
| Personal Access Token | 5,000 req/hr | `GITHUB_TOKEN` env var in API route |
| GitHub App | 5,000 req/hr per installation | Overkill for star counts |

### When to Add a Token

- **Don't bother** if your site gets < 60 unique visitors per hour (most sites)
- **Add a token** if you're server-side caching (the server IP makes all requests)
- **Add a token** if you notice `403` responses in your logs

### Creating a Token

1. GitHub Settings > Developer Settings > Personal Access Tokens > Fine-grained
2. No permissions needed — public repo metadata is accessible with zero scopes
3. Set expiration to 1 year max
4. Add to your deployment: `GITHUB_TOKEN=github_pat_xxx`

A zero-scope token still counts as authenticated and gets the 5,000/hr limit.

---

## Reference Implementation

Our live implementation is in the theme-token project:

**File (internal):** `~/code/theme-token/src/components/header.tsx`

Key patterns used:
- `useGitHubStars()` hook fetching from `https://api.github.com/repos/b-open-io/theme-token`
- Desktop: inline star count next to GitHub icon in header nav
- Mobile: full-width link with pill badge in slide-out menu
- Framer Motion animations on the mobile menu
- `tabular-nums` on all star count displays
- Graceful degradation — icon always renders, count only when available
