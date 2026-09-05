# One reading layout across delivery surfaces

Use this baseline for local, Artifact, and BitPlan proposals. It incorporates the
reading aesthetic of BitPlan's `docs/templates/plan.html`: warm paper, dark ink,
rust accents, system typography, thin section rules, and compact rounded cards.
The proposal owns its content; BitPlan owns the surrounding plan library. Do not
add a left archive menu, scan other repositories, or embed their plan metadata.

Start with these inline styles. Apply the tokens to every component, including
SVG diagrams and the questionnaire in `interactive-choices.md`.

```html
<style>
  :root {
    color-scheme: light;
    --bg:#fbfaf7; --fg:#1a1a1a; --muted:#5f5b53; --line:#ddd8cf;
    --card:#fff; --accent:#b5471f; --soft:#f1ede4;
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
    line-height:1.6;
  }
  @media(prefers-color-scheme:dark) {
    :root:not([data-theme="light"]) {
      color-scheme:dark;
      --bg:#121110; --fg:#ece8df; --muted:#a39d92; --line:#2c2a26;
      --card:#1b1a17; --accent:#e8825a; --soft:#1f1d19;
    }
  }
  :root[data-theme="dark"] {
    color-scheme:dark;
    --bg:#121110; --fg:#ece8df; --muted:#a39d92; --line:#2c2a26;
    --card:#1b1a17; --accent:#e8825a; --soft:#1f1d19;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); }
  main { max-width:868px; margin:auto; padding:48px 24px 96px; }
  h1,h2,h3 { line-height:1.2; letter-spacing:-.02em; }
  h1 { font-size:clamp(2rem,6vw,3.4rem); margin:0 0 .5rem; letter-spacing:-.04em; }
  h2 { margin-top:3rem; padding-top:1rem; border-top:1px solid var(--line); }
  p,li { max-width:68ch; }
  a { color:var(--accent); text-underline-offset:.15em; }
  .eyebrow { font-size:.78rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); }
  .lede { font-size:1.15rem; color:var(--muted); }
  .meta { font-size:.88rem; color:var(--muted); }
  .card { padding:16px 18px; border:1px solid var(--line); border-radius:10px; background:var(--card); }
  .panel { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr)); gap:12px; }
  .wrap { overflow-x:auto; max-width:100%; }
  code,pre { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.92em; }
  pre { padding:14px 16px; background:var(--soft); border:1px solid var(--line); border-radius:8px; overflow-x:auto; }
  table { border-collapse:collapse; width:100%; }
  th,td { text-align:left; vertical-align:top; padding:.55rem .6rem; border-bottom:1px solid var(--line); }
  :focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
  @media(prefers-reduced-motion:reduce) {
    *,*::before,*::after { animation:none!important; transition:none!important; scroll-behavior:auto!important; }
  }
</style>
```

Add a labeled theme control that sets `data-theme="light"` or `"dark"` on the
root element; System removes that attribute. Hide the control until its handler
is installed. The CSS follows the system preference when scripts are disabled.

Use accent for hierarchy, links, and selected controls, not a winning option.
Use `--bg` for text on accent-filled buttons to preserve contrast in both themes.
Keep all options equally sized and structured. Use the same card treatment for
advocates and judges; distinguish roles through labels and avatar attribution.
The CEO gets a separate section, not a different visual brand.

Draw SVG fills and strokes through CSS classes using these same tokens. Give
wide diagrams a scrollable wrapper and an accessible title or caption. Branch
labels match questionnaire IDs; leaf captions explain the consequence and next
step. Keep information visible without relying on animation or JavaScript.

Keep the opening about the actual problem. Metadata identifies the repository,
issue, reader, and draft. Add revision changes only after draft one. Show settled
decisions, steps with done conditions, and deferred work only when applicable.
End with the questionnaire or an implementation brief, not a library browser.
