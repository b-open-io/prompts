# Archive side menu

Every proposal page includes a left menu of other proposals on disk. The
component lives at `examples/archive-nav.html`. Copy it into the page.

The browser cannot scan the computer. The Artifact CSP also blocks fetches.
The agent lists the files, then inlines the JSON.

A local Artifact or `file://` page cannot open a sibling HTML file. Those
rows copy instructions. A published HTTPS URL is a real link.

## Where files live

Canonical path in each project:

```text
docs/proposals/<slug>.html
```

Write every proposal there, including Artifact copies. Keep the slug stable
across revisions of the same proposal.

Set `data-vp-title` on `<html>` so the list shows a human title. After
After the publishing provider returns an `https://` URL, stamp it on the same tag:

```html
<html data-vp-title="Referenced-content collections"
      data-vp-url="https://bitplan.dev/d/…">
```

Then run the list script again and replace `window.VP_ARCHIVE` so other
pages in this archive get the link.

Do not stamp `file://` or `http://`. The menu treats only `https://` as a
navigable URL.

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
before the archive-nav script runs.

| Field | When it is set |
|---|---|
| `path` | Always. Absolute path on disk. |
| `url` | Only when `data-vp-url` on that file is `https://…`. |
| `current` | True for the page being built, in this project's folder. |

## Two actions in the menu

The current page is a marker, not a control.

A row with `url` is an `<a href>` to that published HTTPS page.
The Artifact CSP blocks embeds. It does not block outbound links.

A row with no `url` is a copy button. A click copies this block:

```text
Show me the previous visual proposal.

Title: <title>
Path: <absolute path>

Open that HTML and show me the page. Use an Artifact when that tool exists.
Otherwise load the installed BitPlan skill or open the file in the browser. Do
not summarize the file.
```

The button then reads **Instructions copied** and shows a **?** mark. The
tooltip on that mark says: paste the copied text into your agent. The
agent then serves and opens the other proposal.

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

## Artifact vs BitPlan vs local file

| Host | Row action |
|---|---|
| Claude Artifact | Copy instructions. Sibling `file://` links do not open. |
| Local `file://` | Copy instructions. Same reason. |
| BitPlan `https://` | Real link, after `data-vp-url` is stamped. |

The installed BitPlan skill prints the URL. Stamp it, rebuild `VP_ARCHIVE`, then
give the user that URL.
