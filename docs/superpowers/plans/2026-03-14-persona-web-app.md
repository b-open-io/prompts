# Persona Web App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing `playground.ts` Hono server into a unified 5-screen web app with shared sidebar navigation, matching the Pencil mockups. No framework, no build step — server-rendered HTML with the Twitter shadcn theme.

**Architecture:** Add 4 new HTML-serving routes + shared layout helpers + 3 API routes to the existing Hono server. Each screen reads from `.claude/persona/` JSON files. Navigation uses simple `<a>` links. CSS theme shared via `themeCSS()`.

**Tech Stack:** Bun, Hono, server-rendered HTML strings, Lucide icons via CDN, Twitter shadcn theme (oklch CSS variables)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `scripts/playground.ts` | Modify | Add routes, layout helpers, page templates |

All changes go in the single existing file. If it exceeds ~2500 lines, consider splitting templates into a `templates/` directory in a follow-up.

---

## Task 1: Shared Layout Helpers

Add reusable functions for the sidebar, page shell, and theme that all screens share.

**Files:**
- Modify: `scripts/playground.ts`

- [ ] **Step 1: Add `layoutHTML(currentPage, title, content)` wrapper**

Function that wraps any page content in the app shell:
- Full HTML document with `<head>`, theme CSS, Lucide icon CDN link
- Horizontal flex: sidebar (240px) + divider (1px) + main content (fill)
- Sidebar: logo, "+ New Draft" button, nav items with icons + active state
- Main content: page header (64px, title) + divider + content area
- Heartbeat script (shared)

```typescript
function layoutHTML(currentPage: string, title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Persona</title>
<script src="https://unpkg.com/lucide@latest"></script>
<style>${themeCSS()}</style>
</head><body>
<div style="display:flex;height:100vh">
  ${sidebarHTML(currentPage)}
  <div style="width:1px;background:var(--border);flex-shrink:0"></div>
  <div style="flex:1;display:flex;flex-direction:column;overflow:auto">
    <div style="display:flex;align-items:center;justify-content:space-between;height:64px;padding:0 32px;flex-shrink:0">
      <h1 style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:var(--foreground)">${title}</h1>
    </div>
    <div style="height:1px;background:var(--border);flex-shrink:0"></div>
    <div style="flex:1;overflow:auto;padding:24px 32px">
      ${content}
    </div>
  </div>
</div>
<script>
setInterval(()=>fetch('/heartbeat').catch(()=>{}),10000);
</script>
</body></html>`;
}
```

- [ ] **Step 2: Add `sidebarHTML(currentPage)` helper**

```typescript
function sidebarHTML(currentPage: string): string {
  const nav = [
    { id: 'pool', label: 'Persona Pool', icon: 'users', href: '/pool' },
    { id: 'intel', label: 'Social Intel', icon: 'zap', href: '/intel' },
    { id: 'editor', label: 'Post Editor', icon: 'pen-tool', href: '/' },
    { id: 'settings', label: 'Settings', icon: 'settings', href: '/settings' },
  ];
  const items = nav.map(n => {
    const active = n.id === currentPage;
    const bg = active ? 'background:var(--accent)' : '';
    const color = active ? 'color:var(--primary)' : 'color:var(--muted-foreground)';
    const weight = active ? 'font-weight:600' : 'font-weight:400';
    return `<a href="${n.href}" style="display:flex;align-items:center;gap:10px;height:36px;padding:0 10px;border-radius:8px;text-decoration:none;${bg};${color};${weight};font-size:13px;font-family:var(--font-sans)">
      <i data-lucide="${n.icon}" style="width:16px;height:16px"></i>${n.label}</a>`;
  }).join('');

  return `<div style="width:240px;flex-shrink:0;background:var(--card);padding:20px 16px;display:flex;flex-direction:column;gap:24px">
    <div style="display:flex;align-items:center;gap:10px">
      <img src="/persona-icon" style="width:28px;height:28px;border-radius:8px" alt="">
      <span style="font-family:var(--font-mono);font-size:16px;font-weight:700;color:var(--foreground)">Persona</span>
    </div>
    <a href="/" style="display:flex;align-items:center;justify-content:center;height:40px;border-radius:10px;background:var(--primary);color:var(--primary-foreground);font-size:14px;font-weight:600;font-family:var(--font-sans);text-decoration:none">+ New Draft</a>
    <div style="display:flex;flex-direction:column;gap:4px">
      <span style="font-size:10px;font-weight:600;color:var(--muted-foreground);letter-spacing:2px;font-family:var(--font-sans)">WORKSPACE</span>
      ${items}
    </div>
    <div style="flex:1"></div>
  </div>`;
}
```

- [ ] **Step 3: Add persona icon route**

```typescript
app.get("/persona-icon", (c) => {
  const iconPath = resolve(dirname(import.meta.dir), "images/persona-icon.png");
  if (!existsSync(iconPath)) return c.text("", 404);
  return new Response(readFileSync(iconPath), {
    headers: { "Content-Type": "image/png", "Cache-Control": "max-age=3600" },
  });
});
```

- [ ] **Step 4: Update themeCSS() to use the exact Twitter shadcn dark theme**

Replace the current themeCSS() with the exact `.dark` oklch values from the tweakcn Twitter theme the user provided. Add Lucide initialization script.

- [ ] **Step 5: Commit**

```bash
git add scripts/playground.ts
git commit -m "Add shared layout helpers — sidebar, page shell, Twitter theme"
```

---

## Task 2: Persona Pool Page

**Files:**
- Modify: `scripts/playground.ts`

- [ ] **Step 1: Add data helper**

```typescript
interface PoolUser { username: string; added_at: string; note: string }
interface PoolData { users: PoolUser[] }

function readPoolData(): { users: PoolUser[]; profiles: Record<string, { fresh: boolean; age: number; sampleCount: number }> } {
  const personaDir = process.env.PERSONA_DIR || ".claude/persona";
  const poolPath = resolve(personaDir, "pool.json");
  if (!existsSync(poolPath)) return { users: [], profiles: {} };
  const pool: PoolData = JSON.parse(readFileSync(poolPath, "utf-8"));
  const profiles: Record<string, any> = {};
  for (const user of pool.users) {
    const profilePath = resolve(personaDir, `${user.username}.json`);
    if (existsSync(profilePath)) {
      const stat = statSync(profilePath);
      const ageDays = Math.floor((Date.now() - stat.mtimeMs) / 86400000);
      const profile = JSON.parse(readFileSync(profilePath, "utf-8"));
      profiles[user.username] = { fresh: ageDays < 7, age: ageDays, sampleCount: profile.sample_count || 0 };
    }
  }
  return { users: pool.users, profiles };
}
```

- [ ] **Step 2: Add pool HTML template**

Renders the persona list matching the Pencil mockup — flat rows with dividers, status dots, action buttons with icons. No cards.

- [ ] **Step 3: Add routes**

```typescript
app.get("/pool", (c) => {
  const data = readPoolData();
  return c.html(layoutHTML("pool", "Persona Pool", poolHTML(data)));
});
```

- [ ] **Step 4: Commit**

---

## Task 3: Profile Viewer Page

**Files:**
- Modify: `scripts/playground.ts`

- [ ] **Step 1: Add data helper** — reads `{username}.json`, extracts metrics, examples, patterns

- [ ] **Step 2: Add profile HTML template** — split pane: metrics + patterns (left), sample tweets as cards (right). "Draft as @user" CTA.

- [ ] **Step 3: Add route**

```typescript
app.get("/profile/:user", (c) => {
  const username = c.req.param("user");
  const data = readProfileData(username);
  if (!data) return c.text("Profile not found", 404);
  return c.html(layoutHTML("pool", `@${username}`, profileHTML(data)));
});
```

- [ ] **Step 4: Commit**

---

## Task 4: Social Intelligence Page

**Files:**
- Modify: `scripts/playground.ts`

- [ ] **Step 1: Add data helper** — reads `last-scan.json` + `topics.json`

- [ ] **Step 2: Add intel HTML template** — section headers with lines, opportunity items with category tags, early signals with direction badges, timeline for developments, activity with engagement bars

- [ ] **Step 3: Add route + API routes**

```typescript
app.get("/intel", (c) => {
  const data = readIntelData();
  return c.html(layoutHTML("intel", "Social Intelligence", intelHTML(data)));
});

app.post("/api/intel/refresh", async (c) => {
  const scriptDir = dirname(import.meta.url).replace("file://", "");
  const proc = Bun.spawn(["bash", resolve(scriptDir, "scan.sh"), "--refresh"], {
    stdout: "pipe", stderr: "pipe",
    env: { ...process.env, PERSONA_DIR: process.env.PERSONA_DIR || ".claude/persona" }
  });
  await proc.exited;
  return c.json({ ok: true });
});
```

- [ ] **Step 4: Commit**

---

## Task 5: Settings Page

**Files:**
- Modify: `scripts/playground.ts`

- [ ] **Step 1: Add data helper** — checks env vars, reads file stats, reads topics.json + work.json

- [ ] **Step 2: Add settings HTML template** — token status rows, data storage stats, content rules, topic pills

- [ ] **Step 3: Add routes**

```typescript
app.get("/settings", (c) => {
  const data = readSettingsData();
  return c.html(layoutHTML("settings", "Settings", settingsHTML(data)));
});

app.post("/api/work", async (c) => {
  const body = await c.req.json();
  // Add/remove projects from work.json
});
```

- [ ] **Step 4: Commit**

---

## Task 6: Integrate Post Editor with Layout

**Files:**
- Modify: `scripts/playground.ts`

- [ ] **Step 1: Wrap existing `editorHTML()` in `layoutHTML()`**

The current editor becomes one page within the app shell. Modify `GET /` to use the shared layout with sidebar. The editor content area replaces the generic content div — it has its own split pane (editor + preview).

- [ ] **Step 2: Wire "View Profile" and "Draft" links**

Pool page buttons link to `/profile/:user` and `/` (with query param for pre-loading persona).

- [ ] **Step 3: Wire Social Intel "Draft" buttons**

Each opportunity's Draft button links to `/?topic=...` which pre-fills the editor with that topic context.

- [ ] **Step 4: Final commit + push**

```bash
git push
```

---

## Verification

- [ ] All 5 screens render with shared sidebar nav
- [ ] Active nav item highlighted on each page
- [ ] Pool shows real data from pool.json with freshness indicators
- [ ] Profile shows metrics, patterns, sample tweets from {user}.json
- [ ] Intel shows scan sections from last-scan.json
- [ ] Settings shows token status + data stats
- [ ] "Draft" buttons navigate to editor with context
- [ ] "Refresh" buttons trigger shell scripts via API
- [ ] Theme is consistent (Twitter shadcn dark) across all pages
- [ ] Spacing matches the standardized values (24px content padding, 64px headers, etc.)
