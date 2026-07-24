---
name: github-stars
version: 1.0.0
description: This skill should be used when adding GitHub star counts, star buttons, star widgets, or GitHub social proof to a website or app. Applies when the user says "add GitHub stars", "show star count", "add a star badge", "GitHub badge", "star widget", "GitHub social proof", "stargazer count", or wants to display how many stars a repo has on a marketing page, header, or landing page. Also applies when integrating the GitHub API for repository metadata display.
---

# GitHub Star Count Integration

Add live GitHub star counts to websites as social proof. Two patterns depending on traffic level — pick the right one and go.

## Decision: Client-Side vs Server-Side

**Client-side hook** (default) — fetch directly from GitHub API in the browser.
- No API key needed for public repos
- GitHub allows 60 requests/hour per IP (unauthenticated)
- Fine for most sites — each visitor makes their own request
- Star count simply doesn't render if the fetch fails

**Server-side caching** — proxy through your own API route with a `GITHUB_TOKEN`.
- Raises the limit to 5,000 requests/hour
- Add `next: { revalidate: 300 }` to cache for 5 minutes
- Use this for high-traffic pages or when you need the count at build time

## Client-Side Hook

```typescript
import { useEffect, useState } from "react";

export function useGitHubStars(repo: string) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch(`https://api.github.com/repos/${repo}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.stargazers_count !== undefined) {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {}); // Intentional: star count is non-critical social proof — icon renders without it
  }, [repo]);

  return stars;
}
```

## Display Pattern

```tsx
import { Github } from "lucide-react";

const stars = useGitHubStars("owner/repo");

<a
  href="https://github.com/owner/repo"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
>
  <Github className="h-4 w-4" />
  {stars !== null && <span className="text-xs tabular-nums">{stars}</span>}
</a>
```

**Why `tabular-nums`**: prevents layout shift as the digit count changes — all numerals occupy the same width.

**Why `stars !== null`**: the GitHub icon always renders; the count only appears after the fetch succeeds. If GitHub is down or rate-limited, the link still works as a plain GitHub link.

## For More

Read `references/patterns.md` for:
- Server-side caching API route (Next.js)
- Mobile-responsive display (collapsed on small screens, badge on large)
- Rate limit details and when to add a token
- Animated star count (number counting up on mount)
- Reference implementation from our theme-token project
