---
name: html-to-pdf
version: 2.0.0
description: This skill should be used when the user asks to "design a business card", "make a printable PDF", "render HTML to PDF", "generate a postcard", "build print collateral", "set up an HTML print pipeline", or needs help with bleed, safe areas, font embedding, or QR generation for print. Provides a Playwright-based pipeline with multiple bundled templates and theme variants for business cards (minimal, watercolor light, watercolor dark) and instructions for adding new templates.
---

# HTML → PDF (Playwright pipeline)

Render print-ready PDFs from HTML/CSS via Playwright (Chromium). Use this for business cards, certificates, invoices, postcards, letterhead, one-pagers — anything that ends up as a printable PDF. The pipeline is template-driven so the same renderer produces minimal black-and-white cards, editorial watercolor cards, or any other style added later. For PDF post-processing (imposition, crop marks, front+back merging), chain into `Skill(document-skills:pdf)`.

## When to use

Trigger when the user asks for:
- "design a business card", "print business cards", "redesign Luke's card"
- "render HTML as PDF", "set up an HTML print pipeline"
- "make a printable PDF", "generate a one-pager / postcard / certificate"
- Anything involving bleed, safe area, web fonts in print, or QR codes on cards

## Layout

```
html-to-pdf/
├── SKILL.md
├── README.md
├── scripts/
│   ├── render.ts            # Playwright renderer with template/style/theme selection
│   └── qr-artistic.ts       # Artistic QR generator (round dots, finder eyes, logo overlay)
├── templates/
│   └── business-cards/
│       ├── employees/       # Per-person JSON + photos
│       │   ├── example.json
│       │   └── README.md
│       ├── minimal/         # B/W editorial style — single theme
│       │   ├── card.html
│       │   └── card-back.html
│       └── watercolor/      # Editorial style with pixel-photo + watercolor back
│           ├── assets/      # Background images for both themes
│           │   ├── sky.png
│           │   └── mountains.png
│           ├── light/
│           │   ├── card.html
│           │   └── card-back.html
│           └── dark/
│               ├── card.html
│               └── card-back.html
└── references/
    ├── print-rules.md       # Bleed, font embed, color-profile gotchas
    └── creating-a-template.md  # How to add a new template / style / theme
```

## Quick start

Copy the skill to a working directory and install dependencies:

```bash
SKILL_ROOT="$CLAUDE_PLUGIN_ROOT/skills/html-to-pdf"  # or wherever installed
mkdir -p /tmp/print-job && cd /tmp/print-job
cp -R "$SKILL_ROOT/." .
bun init -y
bun add playwright qrcode @types/qrcode geist @fontsource-variable/inter \
       @fontsource-variable/fraunces bootstrap-icons
bunx playwright install chromium   # one-time
```

Render a business card:

```bash
# Minimal style (no theme — single design)
bun scripts/render.ts --template business-cards --style minimal

# Watercolor style with light theme (postcard / dream aesthetic)
bun scripts/render.ts --template business-cards --style watercolor --theme light \
  --photo templates/business-cards/employees/your-photo.png

# Watercolor style with dark theme (nocturnal mountains)
bun scripts/render.ts --template business-cards --style watercolor --theme dark \
  --photo templates/business-cards/employees/your-photo.png

# Custom employee data
bun scripts/render.ts --template business-cards --style minimal --employee luke
```

Output lands in `out/<slug>-<style>[-<theme>]-{front,back}.pdf`.

## Picking a style + theme

| Style | Theme | Tone | When to use |
|---|---|---|---|
| `minimal` | (none) | Editorial black-on-white, ample whitespace, blocky fade-out accent | Default. Reads as serious, professional, formal. Print shop friendly. |
| `watercolor` | `light` | Cream/parchment surface, Fraunces serif name, pixel-art portrait stamped on the card, watercolor sky back | When the recipient needs to remember the card. Editorial, warmer. |
| `watercolor` | `dark` | Slate-indigo surface, cyan accents, watercolor mountain night-scene back | Brand-matched to dark-mode bopen.io. Distinctive at crypto conferences. |

A new style is one directory. A new theme is one subdirectory inside a style. See `references/creating-a-template.md`.

## The non-obvious rules

These are the gotchas that break silently if you skip them — full details in `references/print-rules.md`.

1. **`@page` size + `preferCSSPageSize: true`** — set the trim+bleed dimensions in BOTH the CSS `@page` rule and Playwright's `page.pdf({ width, height, preferCSSPageSize: true })`. Without `preferCSSPageSize`, Playwright silently falls back to US Letter.

2. **`-webkit-print-color-adjust: exact`** — without this, Chromium strips background colors and images from the PDF. Black-background card backs come out white.

3. **Always embed fonts via `@font-face`** — referencing only `font-family: 'Inter', system-ui` without an `@font-face` produces a PDF using whatever `system-ui` is on the build machine (SF Pro on macOS) embedded as Type 3 path glyphs. Different RIPs render Type 3 differently. Templates use `__NODE_MODULES__/...` placeholders so fonts always come from the installed npm package.

4. **Wait for `document.fonts.ready` before `page.pdf()`** — capturing before fonts apply produces a PDF with system fallback glyphs.

5. **Bleed** — render at trim + 2×0.125 in. The template HTMLs do this; new templates must too.

Full bleed/safe-area table, ghostscript/CMYK conversion notes, and font-embed troubleshooting live in `references/print-rules.md`.

## Path placeholders in template HTML

So templates aren't tied to a specific filesystem layout, the renderer substitutes two tokens at render time:

| Placeholder | Resolves to | Use for |
|---|---|---|
| `__NODE_MODULES__/...` | `node_modules/...` (relative to working dir) | Web fonts, icon SVGs |
| `__ASSETS__/...` | `templates/<template>/<style>/assets/...` | Style-specific background images |

The template HTML can be moved to any project layout — the renderer fills in the paths.

## Data-field placeholders (employee data)

| Placeholder | From employee JSON | Notes |
|---|---|---|
| `__NAME__` | `name` | Display name |
| `__TITLE__` | `title` | Role / subtitle |
| `__EMAIL__` | `email` | HTML-escaped |
| `__PHONE__` | `phone` | Optional |
| `__HANDLE__` | `handle` | Optional, rendered with X glyph |
| `__PHOTO_SRC__` | `--photo <path>` CLI arg | Required for templates that show a portrait |
| `__QR_SVG__` | Generated from `qrUrl` | Artistic QR with optional logo overlay |
| `__QR_LABEL__` | `qrLabel` (defaults to `qrUrl`) | Display text below the QR |

Every employee data field is HTML-escaped in the substitution step so a hostile name field can't inject script into the rendered page.

## Artistic QR codes

The bundled `scripts/qr-artistic.ts` generator builds the QR SVG by hand from the matrix returned by `qrcode.create()`. It supports:

- Round, rounded-square, or square data modules
- Custom rounded-square "eye" finder patterns
- A centered logo overlay (uses error-correction level H — up to ~22% of the QR width is recoverable)
- Configurable quiet zone (for cards where the QR sits directly on a non-uniform surface like a watercolor)

Always test the rendered QR by scanning the PDF with a phone camera before sending to print. Round-dot QRs with logo overlays can occasionally fail on cheap scanners even at level H.

## Chaining with `document-skills:pdf`

After Playwright produces the per-page PDFs, invoke `Skill(document-skills:pdf)` for things HTML/CSS can't do:

- Merge front + back into a single 2-page deliverable
- 10-up imposition on US Letter for in-house cutting
- Crop marks / registration marks
- Embed PDF metadata (Title, Author, Producer)
- Compression / image downsampling

## Adding new templates, styles, or themes

A new template is one directory. A new style under an existing template is one subdirectory. A new theme is one subdirectory inside a style.

```
templates/
└── <template>/                        # e.g. business-cards, postcards, certificates
    └── <style>/                       # e.g. minimal, watercolor, brutalist
        ├── card.html                  # if single-theme
        ├── card-back.html
        └── <theme>/                   # if multi-theme
            ├── card.html
            └── card-back.html
```

The renderer auto-discovers from the directory structure. See `references/creating-a-template.md` for a step-by-step walkthrough including the file fields each template HTML needs.

## Real-world usage

This skill backs `bopen.io`'s business cards. Each teammate has a JSON file in `employees/`. The QR on every card resolves to `bopen.io/meet/<teammate>?ev=<event>` which routes through `app/meet/[teammate]/page.tsx` into the booking flow with per-card attribution. The bopen-tools designer agent (Ridd) invokes this skill whenever the task is "design and render print collateral."
