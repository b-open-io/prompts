# Print Rules — gotchas, dimensions, color, fonts

Detailed reference for getting Chromium-rendered PDFs through to a print
shop intact. Read on demand — SKILL.md has the short version.

## Trim, bleed, safe area

Print shops trim through the bleed area. Anything within `bleed` distance
of the trim edge gets cut. Anything within an additional `safe area` from
the trim edge risks looking cropped because cutters drift up to 1/32 in.

| Format | Trim | Bleed/side | Render @ | Safe area |
|---|---|---|---|---|
| US business card | 3.5 × 2 in | 0.125 in | 3.75 × 2.25 in | 3.25 × 1.75 in |
| Square business card | 2.5 × 2.5 in | 0.125 in | 2.75 × 2.75 in | 2.25 × 2.25 in |
| Postcard 4×6 | 4 × 6 in | 0.125 in | 4.25 × 6.25 in | 3.75 × 5.75 in |
| US Letter one-pager | 8.5 × 11 in | 0.125 in | 8.75 × 11.25 in | 8 × 10.5 in |
| A4 certificate | 210 × 297 mm | 3 mm | 216 × 303 mm | 200 × 287 mm |

Set BOTH:

```css
@page { size: 3.75in 2.25in; margin: 0; }
```

```ts
await page.pdf({
  width: "3.75in",
  height: "2.25in",
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  preferCSSPageSize: true,        // <- without this, @page rule is silently ignored
});
```

## `print-color-adjust: exact` is mandatory

Chromium's default behavior on `page.pdf()` is to strip background colors,
images, and shadows for "ink saving." Every template must override:

```css
* {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
```

Without this:
- Black backgrounds print white
- Watercolor `<img>` backgrounds disappear
- Colored pills become outline-only
- Box shadows render as solid blocks (or vanish)

## Font embedding

The most common silent failure. The fix is always the same: declare every
font with `@font-face` pointing at a local woff2 file from a known package,
then wait for `document.fonts.ready` before capturing.

```css
@font-face {
  font-family: 'Geist';
  src: url('node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2')
       format('woff2-variations');
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
body { font-family: 'Geist', sans-serif; }
```

```ts
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({...});
```

### Why this is non-negotiable

If you write `font-family: 'Inter', system-ui, sans-serif` without an
`@font-face` for Inter, Chromium falls back to `system-ui` which resolves
to whatever the host OS uses (SF Pro on macOS, Segoe UI on Windows). It
gets embedded as **Type 3 path glyphs** — a per-character series of vector
paths rather than a font subset. Different print shop RIPs render Type 3
inconsistently:
- Some print correctly
- Some apply hinting that thickens strokes
- Some substitute the visually-closest installed font

You discover this when 100 cards arrive looking heavier than your proof.

### Don't load fonts from a CDN

Network flakes during `page.pdf()` capture leave fonts unloaded and
Chromium falls back silently. Always install via npm and reference the
local woff2. Templates use `__NODE_MODULES__/...` placeholders so paths
are project-agnostic.

## Color profile

Render in **sRGB**. Most digital presses (MOO, Vistaprint, Overnight,
Printful, GotPrint, Mixam) accept sRGB and do CMYK conversion internally
without surprises. Do not preemptively dull your colors to "CMYK-safe"
values — that just hands flat output to the press.

### When to convert to CMYK

Only convert if your specific shop demands PDF/X-1a (typical for offset
runs above ~500 units, or for spot-color jobs with foils):

```bash
gs -dPDFX -dBATCH -dNOPAUSE -dNOOUTERSAVE -sDEVICE=pdfwrite \
   -sColorConversionStrategy=CMYK -sOutputFile=out-cmyk.pdf in.pdf
```

For most short-run digital business-card jobs (under 500 cards), skip the
conversion.

## Crop marks

Most modern shops ADD their own crop marks from the bleed area on import.
Only embed crop marks in-file if your specific shop explicitly requires
them. Use `Skill(document-skills:pdf)` with reportlab for that — don't
draw them in HTML/CSS where they'll trim with the rest of the card.

## Vector vs raster

Everything in a Chromium PDF render is vector by default:
- HTML/CSS shapes → vector
- Inline SVG → vector
- Web fonts → vector glyphs
- Backgrounds via `linear-gradient`, `radial-gradient` → vector

The only raster elements are `<img>` tags pointing at PNG/JPEG, or any
CSS that ends up rasterized (`backdrop-filter: blur(...)` sometimes
rasterizes the blurred layer in Chromium PDF output).

For raster elements (e.g. a watercolor background, a photo), size them at
print resolution: at least 300 PPI relative to their on-card display size.
A 1.25 × 1.25 in QR code displayed at print = 375 × 375 pixel source
minimum. Anything less and the print shop's preflight will flag it.

## QR code reliability

Round-dot QRs with logo overlays — even at error correction level H —
can fail to scan on:
- Cheap inventory scanners
- Older Android camera apps
- Anything using ZXing's default decoder (Android Camera was based on
  this until 2022)

Test reliability:
1. Render the PDF
2. Convert to PNG at 1800 ppi: `sips -s format png -Z 1800 in.pdf --out test.png`
3. Open the PNG on screen
4. Scan with: iPhone Camera, Android Camera, a third-party scanner app
5. All three must lock within 1 second from 6 in away

If any fail:
- Reduce logo overlay size from 0.20 → 0.16 of QR width
- Switch dot shape from "circle" → "rounded" (more module fill = stronger contrast)
- Increase quiet zone modules from 2 → 3

## Debugging a print job

If the printed card looks different from the on-screen proof, check in order:

1. **Open the PDF in Preview/Acrobat and inspect at 100% / 200%** — does it match the screen? If no, the bug is in Playwright.
2. **`pdffonts your.pdf`** — every font listed should say "yes" under `emb` and `sub`. Any "no" means missing font.
3. **`pdfinfo your.pdf`** — page size should match your `@page` rule exactly.
4. **Convert to high-res PNG: `sips -s format png -Z 2400 your.pdf --out check.png`** — does the PNG match? If yes, the print issue is the press, not the file.
5. **Ask the shop to send back their preflight report.** Reputable shops will share what their RIP did with the file.

## File-size guidance

A 3.5 × 2 in business card front+back PDF should be 50–250 KB with subset
fonts and one watercolor image. If the file is 5+ MB, something is
embedding full font sets or non-subsetted raster images:

```bash
# Check what's bloating it
pdfinfo your.pdf            # page count, producer
pdffonts your.pdf            # fonts (look for "no" under sub)
qpdf --pages . 1 -- ./front.pdf out.pdf  # extract one page
ls -lh out.pdf               # size per page
```
