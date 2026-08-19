---
name: postplan
description: >-
  Publish a self-contained HTML draft so a human can open it in a browser when
  the host has no Claude Artifact pane. Use on Grok Build, Codex, or any
  non-Claude harness after writing a visual plan, recap, coordinator canvas,
  or other review HTML. Also use when the user says "postplan", "upload this
  HTML", "I can't see the file", or "host this draft". Do not use inside
  Claude Code when the Artifact tool is available.
version: 0.0.1
---

# PostPlan

https://postplan.dev hosts authenticated static HTML drafts for agents.

Claude Code can show HTML as an Artifact. Grok Build and Codex cannot. A
path in chat is not a page. On those hosts, publish the file with PostPlan
or open it on the local machine.

## When to use

Use this after you write an HTML file a human must see: a visual-coordinator
canvas, a visual-review recap, a plan board, or any other draft page.

Do not use this as a general file host. Do not upload secrets, `.env`
values, or private-repo recaps unless the user asked for a public draft.

## Delivery order

1. **Claude Code** with an Artifact tool: publish as an Artifact. Stop here.
2. **Otherwise:** PostPlan, if `postplan whoami` succeeds.
3. **Otherwise:** `open <absolute-path>` on macOS, and serve the directory
   if `open` is not enough (`python3 -m http.server` in that directory).
4. Tell the user the URL or path. Do not claim they can see a repo-relative
   path inside the TUI.

## Auth

Credentials live on the machine, never in the repo.

```bash
bunx --bun postplan whoami
```

If that fails:

1. Ask the user to open https://postplan.dev/cli/auth and sign in.
2. They run `bunx --bun postplan auth set <api-key>` or
   `bunx --bun postplan auth login`.
3. You run `whoami` again. Do not invent a key. Do not write a key into
   any project file.

An anonymous upload cannot carry inline JavaScript. Coordinator canvases
and most recaps include scripts, so they need a signed-in CLI.

## Upload

```bash
bunx --bun postplan upload ./path/to/draft.html --description "short label"
```

Print the URL PostPlan returns. That URL is what you give the user.

Useful flags:

- `--new` — always create a new draft
- `--draft <id>` — replace a known draft
- `--description <text>` — label shown on the dashboard

List drafts with `bunx --bun postplan list`.

## Rules

- One HTML file per upload. The page must be self-contained.
- Redact secrets before upload. A draft is as sensitive as its source.
- Never commit PostPlan keys, whoami output that includes a token, or
  `.postplan` credential files.
