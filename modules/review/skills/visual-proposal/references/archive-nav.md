# Archive side menu

Every proposal page includes a left menu of other proposals on disk. The
component lives at `examples/archive-nav.html`. Copy it into the page.

The browser cannot scan the computer. The Artifact CSP also blocks fetches.
The agent lists the files, then inlines the JSON.

## Where files live

Canonical path in each project:

```text
docs/proposals/<slug>.html
```

Write every proposal there, including Artifact copies. Keep the slug stable
across revisions of the same proposal.

## Where the list comes from

Run the bundled script from the project root:

```bash
bash scripts/list-proposals.sh --current <slug>
```

Pass every extra workspace root this session can see:

```bash
bash scripts/list-proposals.sh --current <slug> /Users/satchmo/code/other-app
```

| Harness | Roots to pass |
|---|---|
| Claude Code | Session cwd, plus each `--add-dir` folder |
| Grok Build | Session cwd (`GROK_AGENT=1`) |
| Codex | Session cwd |

Optional env: `BOPEN_PROPOSAL_ROOTS` is a colon-separated list of extra
project roots. The script also scans `$PWD/docs/proposals`.

The script prints JSON. Paste it as `window.VP_ARCHIVE` in the page,
before the archive-nav script runs. Same-folder entries use `foo.html`.
Entries from another project use a `file://` URL.

Set `data-vp-title` on `<html>` or keep a real `<title>` so the list
shows a human title instead of the slug.

## Layout

Wrap the proposal body:

```html
<div class="vp-shell">
  <!-- paste examples/archive-nav.html here -->
  <main class="vp-main">
    ...proposal...
  </main>
</div>
```

## Artifact vs local file

Local `file://` and `python3 -m http.server` follow sibling `href`s.
A Claude Artifact cannot open `docs/proposals/` on disk. Keep the menu
anyway: titles still orient the reviewer. Prefer PostPlan or `open` for
the local file when the reviewer needs the other pages.
