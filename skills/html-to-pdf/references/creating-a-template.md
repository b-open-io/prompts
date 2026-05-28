# Creating a new template

Walk-through for adding a new deliverable type (template), a new style
within an existing template, or a new theme within an existing style.
The renderer is convention-based — it auto-discovers from directory
structure, so most additions are zero-code.

## Layout convention

```
templates/
└── <template>/                    # deliverable type (business-cards, postcards, ...)
    ├── employees/                 # (optional) per-recipient data + photos
    │   ├── README.md
    │   └── example.json
    └── <style>/                   # visual style (minimal, watercolor, brutalist, ...)
        ├── card.html              # if single-theme
        ├── card-back.html
        └── <theme>/               # OR multi-theme: subdirectory per theme
            ├── card.html
            └── card-back.html
```

The renderer command always takes `--template <name> --style <name>` and
optionally `--theme <name>`. If a `<theme>/` subdirectory exists, you
must pass `--theme`. Otherwise the renderer reads `card.html` and
`card-back.html` directly from `<style>/`.

## Add a new theme to an existing style

Easiest case — when an existing style needs a new color variant.

```bash
cd templates/business-cards/watercolor
mkdir sepia
cp light/card.html sepia/card.html
cp light/card-back.html sepia/card-back.html
# Edit the CSS variables in sepia/*.html to retune the palette
```

Then render:

```bash
bun scripts/render.ts --template business-cards --style watercolor --theme sepia
```

No renderer changes. No skill metadata updates. Just files.

## Add a new style to an existing template

When a new visual treatment is needed for the same deliverable type.

```bash
cd templates/business-cards
mkdir -p brutalist
# Author card.html + card-back.html using the data-field placeholders
```

The card HTML must include the substitution tokens the renderer fills in:

| Token | What | Required? |
|---|---|---|
| `__NAME__` | Employee name | yes |
| `__TITLE__` | Role / subtitle | yes |
| `__EMAIL__` | Email address | yes |
| `__PHONE__` | Phone | no |
| `__HANDLE__` | X / social handle | no |
| `__PHOTO_SRC__` | Path to portrait file (set via `--photo`) | only if style uses a photo |
| `__QR_SVG__` | Generated artistic QR | yes for the back |
| `__QR_LABEL__` | Display text below QR | yes for the back |

And the path placeholders that the renderer substitutes at render time:

| Token | What |
|---|---|
| `__NODE_MODULES__/...` | Web fonts, icon SVGs from npm packages |
| `__ASSETS__/...` | Style-local images in `<style>/assets/` |

## Add a new template (new deliverable type)

Same pattern, one level up:

```bash
cd templates
mkdir -p postcards/employees
mkdir -p postcards/minimal
# Author postcards/minimal/card.html + card-back.html
# Add postcards/employees/example.json with whatever fields a postcard needs
```

Then render:

```bash
bun scripts/render.ts --template postcards --style minimal --employee example
```

Output: `out/example-minimal-front.pdf` + `out/example-minimal-back.pdf`.

### Different data fields

If your new template uses different data fields than `business-cards`,
adjust the substitution logic in `scripts/render.ts`. Currently the
substitution map is hardcoded; for a new template with e.g. `__EVENT__`
and `__VENUE__` fields, add lines to `fillFront`:

```ts
function fillFront(html: string): string {
  return applyPlaceholders(html)
    .replace("__PHOTO_SRC__", photoRelative)
    .replace(/__NAME__/g, escape(employee.name))
    // ... existing replacements ...
    .replace(/__EVENT__/g, escape((employee as any).event ?? ""))
    .replace(/__VENUE__/g, escape((employee as any).venue ?? ""));
}
```

(The longer-term refactor is to drive substitutions from the JSON keys —
loop the employee object, substitute `__<KEY-UPPERCASED>__` for each
value. That's deferred until the second non-card template lands.)

## Mandatory CSS rules (every new template)

Every `card.html` and `card-back.html` must include these. They're not
defaults — without them, Chromium produces a broken or unprintable PDF.

```css
@page { size: <trim+bleed-w> <trim+bleed-h>; margin: 0; }

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

html, body {
  width: <trim+bleed-w>;
  height: <trim+bleed-h>;
}
```

And embed every font via `@font-face` with `__NODE_MODULES__/...` paths
(never `font-family: 'Inter', system-ui` without a face declaration).
See `print-rules.md` for the rationale.

## Validating a new template

Render to PDF:

```bash
bun scripts/render.ts --template <name> --style <name>
```

Then verify against the print-rules checklist:

```bash
# Page geometry — must match the @page rule
pdfinfo out/example-<style>-front.pdf | grep "Page size"

# Font embedding — every font should say "yes" under emb + sub
pdffonts out/example-<style>-front.pdf

# Visual check at print resolution
sips -s format png -Z 1800 out/example-<style>-front.pdf --out preview.png
open preview.png
```

If `pdffonts` lists any font as `Type 3` with `sub: no`, you have a font
fallback bug. Fix the `@font-face` declaration before printing.

## Naming conventions

- Template names: lowercase, hyphenated, plural noun (`business-cards`,
  `postcards`, `certificates`)
- Style names: lowercase, single word when possible, describes aesthetic
  (`minimal`, `watercolor`, `brutalist`, `editorial`)
- Theme names: lowercase, single word, describes mode/variant
  (`light`, `dark`, `sepia`, `monochrome`)

The renderer's output filename pattern is
`<employee>-<style>[-<theme>]-{front,back}.pdf`.
