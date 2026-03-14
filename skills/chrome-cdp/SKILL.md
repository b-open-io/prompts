---
name: chrome-cdp
description: Interact with local Chrome browser session (only on explicit user approval after being asked to inspect, debug, or interact with a page open in Chrome). Connects via Chrome DevTools Protocol — no extension, no Puppeteer, handles 100+ tabs.
---

# Chrome CDP

Lightweight Chrome DevTools Protocol CLI. Connects directly via WebSocket — no Puppeteer, no extensions, instant connection, handles 100+ tabs. Operates on the user's **live browser session** with existing logins and state.

## Prerequisites

1. **Chrome with remote debugging enabled.** If `list` fails with "Chrome remote debugging not enabled", run the `enable` command to open the settings page:
   ```bash
   bun ${SKILL_PATH}/scripts/cdp.ts enable
   ```
   Then tell the user: **"I've opened Chrome's remote debugging settings. Please toggle the switch to enable it, then I'll try again."**

2. **Bun runtime** (already available in this environment).

**Auto-setup flow:** Always try `list` first. If it fails, run `enable` and ask the user to toggle. Then retry `list`.

## When to Use

Trigger on explicit user approval to:
- Read content from an authenticated page (logged-in GitHub, Linear, email, etc.)
- Click buttons, fill forms, or interact with a page the user has open
- Take screenshots of live pages
- Extract structured data from JavaScript-heavy SPAs
- Debug or inspect a running web application

**Do NOT** activate speculatively. The user must ask you to interact with Chrome.

## Commands

All commands use `bun ${SKILL_PATH}/scripts/cdp.ts`. The `<target>` is a unique prefix of the targetId shown by `list`. Copy the prefix exactly as shown.

### List open tabs

```bash
bun ${SKILL_PATH}/scripts/cdp.ts list
```

Always run `list` first to see available tabs and get target prefixes.

### Read page structure (accessibility tree)

```bash
bun ${SKILL_PATH}/scripts/cdp.ts snap <target>
```

Returns a semantic tree of the page — roles, names, values. Best for understanding page structure without raw HTML noise.

### Execute JavaScript

```bash
bun ${SKILL_PATH}/scripts/cdp.ts eval <target> "document.title"
bun ${SKILL_PATH}/scripts/cdp.ts eval <target> "document.querySelectorAll('h1').length"
bun ${SKILL_PATH}/scripts/cdp.ts eval <target> "[...document.querySelectorAll('a')].map(a => a.href).join('\\n')"
```

Runs in the page context — full DOM access, can call page functions, read variables.

### Navigate

```bash
bun ${SKILL_PATH}/scripts/cdp.ts nav <target> "https://example.com"
```

Navigates and waits for page load (up to 30s).

### Click element

```bash
bun ${SKILL_PATH}/scripts/cdp.ts click <target> "button.submit"
bun ${SKILL_PATH}/scripts/cdp.ts click <target> "[data-testid='login-btn']"
```

### Type text

```bash
bun ${SKILL_PATH}/scripts/cdp.ts type <target> "Hello world"
```

Uses `Input.insertText` — works in cross-origin iframes where JS eval is blocked.

### Screenshot

```bash
bun ${SKILL_PATH}/scripts/cdp.ts shot <target>
```

Saves to `/tmp/screenshot.png`.

### Extract HTML

```bash
bun ${SKILL_PATH}/scripts/cdp.ts html <target>              # full page
bun ${SKILL_PATH}/scripts/cdp.ts html <target> ".sidebar"    # specific selector
```

### Stop daemons

```bash
bun ${SKILL_PATH}/scripts/cdp.ts stop           # all daemons
bun ${SKILL_PATH}/scripts/cdp.ts stop <target>   # specific daemon
```

## How It Works

1. Chrome writes a `DevToolsActivePort` file when remote debugging is enabled
2. The CLI reads this file to get the WebSocket URL
3. First access to a tab spawns a lightweight background daemon
4. Chrome shows an "Allow debugging" dialog **once per tab** — click Allow
5. Subsequent commands reuse the daemon silently (no more dialogs)
6. Daemons auto-terminate after 20 minutes of inactivity

## Workflow Pattern

```
1. bun cdp.ts list                          # see what's open
2. bun cdp.ts snap 6BE827FA                 # understand the page
3. bun cdp.ts eval 6BE827FA "document.title" # extract specific data
4. bun cdp.ts click 6BE827FA ".btn-submit"  # interact
```

## Safety

- **Always confirm** before clicking buttons that trigger irreversible actions (delete, send, purchase)
- **Rate limit** interactions — don't spam-click or rapid-fire requests
- **Respect authentication** — the user's live sessions are sensitive. Don't navigate away from pages without asking.
- The "Allow debugging" dialog is a security gate — the user controls which tabs are accessible
