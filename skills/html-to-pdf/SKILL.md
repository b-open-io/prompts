---
name: html-to-pdf
version: 1.0.0
description: Render print-ready PDFs from HTML/CSS using Playwright (Chromium). Use when producing business cards, postcards, certificates, invoices, one-pagers, letterhead, or any other print collateral driven from structured data. Pairs with `document-skills:pdf` for imposition, crop marks, and front/back merging.
---

# HTML → PDF (Playwright pipeline)

For any deliverable that ends up as a printable PDF — business cards, certificates, invoices, postcards, letterhead, one-pagers, ID cards — render with **Playwright (Chromium)** rather than wkhtmltopdf (stale WebKit), weasyprint (partial CSS), or jsPDF (manual drawing).

Why Playwright wins:
- Full modern CSS (grid, container queries, variable fonts, gradients, custom properties)
- Inline SVG renders as vector (infinite print resolution)
- Web fonts embed correctly when loaded from `file://` or via `@font-face`
- Exact `@page { size: W H; margin: 0 }` honored when `preferCSSPageSize: true`

For things Playwright can't do — combining N cards onto a 10-up sheet, adding crop marks, merging front+back into a 2-page PDF, embedding metadata — chain into `Skill(document-skills:pdf)` (pypdf + reportlab).

## When to use

Trigger this skill when the user says any of:
- "design a business card", "print business cards"
- "make me an invoice PDF", "generate a certificate"
- "print-ready PDF", "one-pager PDF"
- "render this HTML as PDF"
- "set up an HTML print pipeline"

## Quick start

The canonical reference template lives in `templates/business-cards/`. Copy it into a working directory and replace the JSON inputs.

```bash
SKILL_ROOT="$CLAUDE_PLUGIN_ROOT/skills/html-to-pdf"  # or wherever the skill is installed
mkdir -p /tmp/print-job && cd /tmp/print-job
cp -R "$SKILL_ROOT/templates/business-cards/." .
cp "$SKILL_ROOT/scripts/render.ts" .
cp "$SKILL_ROOT/scripts/qr-artistic.ts" .
bun init -y
bun add playwright qrcode @types/qrcode geist @fontsource-variable/inter bootstrap-icons
bunx playwright install chromium  # one-time
bun render.ts employees/example.json
```

Output: `out/<slug>-front.pdf` and `out/<slug>-back.pdf`.

## The non-obvious rules

These are the things that break silently if you skip them:

### 1. `@page` size + `preferCSSPageSize`

```css
@page { size: 3.75in 2.25in; margin: 0; }
```

```ts
await page.pdf({
  width: "3.75in",
  height: "2.25in",
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  preferCSSPageSize: true,  // <-- without this, the @page rule is ignored
});
```

Set the width/height in BOTH places. Otherwise Playwright defaults to Letter and your card prints onto an 8.5×11 sheet.

### 2. `print-color-adjust: exact`

```css
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
```

Without this Chromium strips background colors and images on PDF output. Black-background card backs come out white.

### 3. Bleed + safe area

Print shops trim through the bleed. Every value within 0.125 in of the visible edge gets cut. Always render at `trim + 2 × bleed` and keep text inside a `safe area` centered inside the trim.

| Spec | Standard business card |
|------|------------------------|
| Trim | 3.5 × 2 in |
| Bleed per side | 0.125 in |
| Render size | 3.75 × 2.25 in |
| Safe area | 3.25 × 1.75 in centered |

For other formats:

| Format | Trim | Render size (incl. bleed) |
|---|---|---|
| US Letter one-pager | 8.5 × 11 in | 8.75 × 11.25 in |
| Postcard 4×6 | 4 × 6 in | 4.25 × 6.25 in |
| A4 certificate | 210 × 297 mm | 216 × 303 mm |

### 4. Fonts: `@font-face` with `format("woff2")`, NOT `system-ui` fallback

```css
@font-face {
  font-family: 'Geist';
  src: url('node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
body { font-family: 'Geist', sans-serif; }
```

If you write `font-family: 'Inter', system-ui, sans-serif` without an `@font-face` for Inter, Chromium falls back to whatever system-ui is on the build machine (San Francisco on macOS), which embeds as Type 3 path glyphs and may render differently on the print shop's RIP. **Always declare the font and load it from `node_modules` via `file://`.**

Use `await page.evaluate(() => document.fonts.ready)` before `page.pdf()` to ensure fonts are fully applied before capture.

### 5. Color profile

Render in sRGB. Most modern digital presses (MOO, Vistaprint, Overnight, Printful) accept sRGB and convert internally. **Don't preemptively dull your colors to "CMYK-safe."** Convert with ghostscript only if your specific shop requires PDF/X-1a:

```bash
gs -dPDFX -dBATCH -dNOPAUSE -dNOOUTERSAVE -sDEVICE=pdfwrite \
   -sColorConversionStrategy=CMYK -sOutputFile=out-cmyk.pdf in.pdf
```

### 6. Crop marks

Most modern shops add their own crop marks from the bleed area. Only add marks in-file if the shop explicitly requires it — and use `Skill(document-skills:pdf)` (reportlab) for that, not the HTML layer.

## Field substitution from JSON

**Never hand-edit templates per recipient.** Drive everything from JSON via `data-field` attributes:

```html
<div class="name" data-field="name">__NAME__</div>
<span data-field="email">__EMAIL__</span>
```

In `render.ts`, replace the `__TOKEN__`s using HTML escaping on every value:

```ts
function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const filled = template.replace("__NAME__", escape(employee.name));
```

This stops a `<script>` in someone's name field from injecting arbitrary content into the PDF (the chromium renderer would happily execute it during render).

## Artistic QR codes

The plain `qrcode` library produces blocky squares. For a designed QR — round dots, custom finder corners, centered logo — use the `qr-artistic.ts` script in this skill's `scripts/` directory. It builds the SVG by hand using the matrix from `qrcode.create()` (high error-correction level H lets you overlay a logo up to ~22% of the QR width without breaking scannability).

Pattern:

```ts
import { renderArtisticQR } from "./qr-artistic.ts";

const qrSvg = await renderArtisticQR({
  url: "https://bopen.io/meet/luke?ev=v1",
  size: 1000,
  fg: "#000000",
  dotShape: "circle",       // "circle" | "rounded" | "square"
  logoSvg: BOPEN_MARK_SVG,  // inline <svg> string
  logoScale: 0.20,
});
```

Always test the QR by scanning the rendered PDF with a phone camera before sending to print. Round-dot QRs with logo overlays sometimes fail on cheap scanners even at error level H.

## Chaining with `document-skills:pdf`

After Playwright renders the per-page PDFs, invoke `Skill(document-skills:pdf)` for:

```python
# Merge front + back into a single 2-page deliverable
from pypdf import PdfWriter, PdfReader
w = PdfWriter()
for path in ["out/satchmo-front.pdf", "out/satchmo-back.pdf"]:
    w.add_page(PdfReader(path).pages[0])
w.add_metadata({"/Title": "bOpen Business Card - Luke Rohenaz",
                "/Creator": "bOpen", "/Producer": "bOpen Print Pipeline"})
with open("out/satchmo.pdf", "wb") as f:
    w.write(f)
```

For 10-up imposition (10 cards on a US Letter sheet for in-house cutting), reportlab gives finer control than pypdf — see the `pdf` skill's reference.md.

## Anti-patterns

- **Don't use `next/image` or `<img>` for the logo.** Inline SVG embeds as vector; raster PNG becomes pixelated when the print shop scales for bleed.
- **Don't use CDN font URLs (`fonts.googleapis.com`).** Network flakes during render leave fonts unloaded and Chromium falls back silently. Always embed locally.
- **Don't trust user input in `data-field` slots without escaping.** A name with `<script>` injects HTML into the render context.
- **Don't render at the wrong DPI.** Chromium's `page.pdf()` outputs vector — there's no DPI dial. If you're rasterizing the PDF to PNG for previews, use `sips -s format png -Z 1600` (high resolution, preserves aspect).
- **Don't skip `document.fonts.ready`.** Capturing before fonts apply produces a PDF with system fallback glyphs.

## Files in this skill

- `templates/business-cards/card.html` — front template (3.5 × 2 with bleed)
- `templates/business-cards/card-back.html` — back template (dark, with QR slot)
- `templates/business-cards/employees/example.json` — input data shape
- `scripts/render.ts` — Playwright renderer, field substitution, font ready
- `scripts/qr-artistic.ts` — artistic QR with round dots + logo overlay
