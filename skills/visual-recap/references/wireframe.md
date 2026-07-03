# Wireframe quality for visual recaps

Read this in full before authoring any wireframe in a recap. The rules exist so
wireframes read as evidence of the change, not decoration — adapted from
BuilderIO's shared wireframe core for our self-contained template
(`assets/template.html`).

## The contract

A wireframe is a semantic HTML mockup inside a `.screen` frame from the
template. The template's CSS owns the frame chrome, theme, and tokens; you write
the content — real layout, real product labels, grounded in the diff and the
actual component code you read.

```html
<div class="screen" data-surface="popover">
  <div class="body" style="padding:14px;display:flex;flex-direction:column;gap:10px">
    <div class="wf-row">
      <strong>Share settings</strong>
      <div class="wf-spacer"></div>
      <span class="wf-btn">✕</span>
    </div>
    <label class="wf-row"><input type="checkbox" checked /> Anyone with the link</label>
    <span class="wf-btn primary">Copy link</span>
  </div>
  <div class="caption">Layout inferred from SharePopover.tsx, not a screenshot.</div>
</div>
```

## Surfaces — match the real footprint

Set `data-surface` to what the user actually sees. Never default to a desktop
page plus a phone frame.

- `browser` — a web page needing browser chrome (add the `.chrome` bar with
  `.dots` and a `.url`).
- `desktop` — a full desktop app shell.
- `mobile` — a phone screen, only when the work is genuinely mobile.
- `popover` — a small floating menu, dropdown, or inline popover.
- `panel` — a side panel, inspector, or sidebar widget.

For a small sub-surface (popover, dialog, toast), show only that sub-surface at
its real size; do not redraw the whole page around it unless placement in the
page is itself the change.

## Colors and styling

- **Every color goes through a `--wf-*` token** (`--wf-ink`, `--wf-muted`,
  `--wf-line`, `--wf-paper`, `--wf-card`, `--wf-accent`, `--wf-accent-soft`,
  `--wf-ok`, `--wf-warn`, `--wf-danger`). The template flips them for
  light/dark; a hard-coded hex breaks one of the two themes.
- Never set `font-family` and never use host/Tailwind theme classes
  (`bg-white`, `text-zinc-950`, `shadow-xl`) — they don't exist in the
  self-contained page and would leak theme assumptions if they did.
- No decorative shadows on frames or cards. Mockups read as flat bordered
  surfaces; use spacing, borders, and labels for separation.
- Use literal CSS lengths for spacing (`padding:16px`, `gap:12px`) — tokens are
  for color, not layout.
- Icons: use compact unicode glyphs (`✕ ⌄ ⌕ ⚙ ⋯ ＋ ←`) or a short real label —
  never the word "chevron" or "icon" where the product shows a symbol.

## Layout discipline

- **Root padding first.** Wrap content in a root with ≥14px padding,
  `height:100%` where the frame is fixed, and `gap` between rows — the first
  row never sits flush against the frame edge.
- **Chrome bars span full width.** Headers, toolbars, and tab bars are
  `display:flex;align-items:center;width:100%` with a `.wf-spacer` pushing
  trailing actions to the edge — never centered content that collapses to its
  own width. In a Before/After pair the bar stays full-width in BOTH states;
  the spacer absorbs the difference so surviving controls hold their edges.
- **Pin bottom bars.** Frame = flex column, scrolling body gets `flex:1`,
  bottom bar is the last child — flush at the bottom, no empty band beneath.
- **Single-line rows never wrap.** Toolbars, breadcrumbs, file paths, chips:
  `white-space:nowrap` on the row, `overflow:hidden;text-overflow:ellipsis` on
  labels that can grow.
- **Fill the frame.** Compose enough real rows for even vertical rhythm — no
  large empty bands, especially on `mobile`.
- Flex/grid with `gap` and `min-width:0`; no negative margins or absolute
  positioning that can collide across themes.

## Content discipline

- **Real product content.** Real labels, counts, names, button text taken from
  the diff and component code — never lorem or gray bars (except deliberate
  skeleton states, built as textless `.wf-skel` boxes with explicit sizes).
- **Modify, don't redesign.** Reproduce the current screen's real layout first,
  change only the delta, and mark it with `.wf-highlight` plus at most one
  `.wf-callout`. Don't restack the page into a layout the product doesn't have.
- **Keep product screens pure.** No file paths, architecture arrows, or
  implementation notes inside the screen — those belong in captions,
  annotations, or the diagram/narrative sections.
- **Ground or label.** If the rendered layout is inferred from code rather than
  captured from a running app, say so in the `.caption`.

## Before/after comparability

- Put the pair in the template's `.ba-grid`; the `Before` / `After` labels live
  in the column `h4` headers — never baked inside the frame as a pill or title.
- Same frame size, scale, outer padding, and density on both sides unless the
  change itself alters them. Preserve unchanged controls in both states so the
  reviewer sees exactly what moved; place the new affordance where the
  implementation actually puts it, not floating in a generic spot.
- The grid auto-stacks wide surfaces (`browser`, `desktop`) full-width and puts
  narrow ones side by side — author with the real surface and let it decide.
- Use an after-only wireframe when the change is purely additive and "before"
  would only show absence. Use a state sequence (3+ frames) when the change is
  a flow: entry point → opened surface → resulting state.
