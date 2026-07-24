# html-to-pdf

Print-ready PDF rendering via Playwright (Chromium) for HTML/CSS layouts. Multi-template, multi-theme — business cards, certificates, postcards, one-pagers, letterhead.

See `SKILL.md` for the full reference. Read it first.

## Layout

```
html-to-pdf/
├── SKILL.md                                       # main entry — start here
├── README.md                                      # this file
├── scripts/
│   ├── render.ts                                  # Playwright renderer + template/style/theme selection
│   └── qr-artistic.ts                             # artistic QR generator
├── templates/
│   └── business-cards/
│       ├── employees/                             # per-person JSON + photos
│       │   ├── README.md                          # data shape + photo guidance
│       │   └── example.json
│       ├── minimal/                               # B/W editorial style (single theme)
│       │   ├── card.html
│       │   └── card-back.html
│       └── watercolor/                            # editorial style with pixel-photo + watercolor back
│           ├── assets/                            # background images
│           │   ├── sky.png
│           │   └── mountains.png
│           ├── light/
│           │   ├── card.html
│           │   └── card-back.html
│           └── dark/
│               ├── card.html
│               └── card-back.html
└── references/
    ├── print-rules.md                             # bleed, fonts, color-profile gotchas
    └── creating-a-template.md                     # adding new templates / styles / themes
```

## Quick smoke test

```bash
SKILL_ROOT="$(pwd)"
mkdir -p /tmp/print-test && cd /tmp/print-test
cp -R "$SKILL_ROOT/." .
bun init -y
bun add playwright qrcode @types/qrcode geist @fontsource-variable/inter \
       @fontsource-variable/fraunces bootstrap-icons
bunx playwright install chromium

# Minimal style — no photo needed
bun scripts/render.ts --template business-cards --style minimal --employee example

# Watercolor light — needs a pixel-portrait
bun scripts/render.ts --template business-cards --style watercolor --theme light \
  --employee example --photo path/to/your-portrait.png

open out/example-minimal-front.pdf out/example-minimal-back.pdf
```

## Choosing a style + theme

| Style | Theme | When to pick |
|---|---|---|
| `minimal` | — | Serious / professional. Black-and-white editorial. Print-shop friendly. Default. |
| `watercolor` | `light` | Cream parchment + dreamy sky. Editorial, warm, memorable. Needs a pixel-art portrait. |
| `watercolor` | `dark` | Slate-indigo + nocturnal mountains. Distinctive at conferences. Same photo input. |

Add a new theme: copy a theme directory, edit the CSS variables. No code changes.

Add a new style: copy an existing style directory, redesign the HTML. No code changes.

Add a new template (different deliverable type — postcards, certificates): create the new dir, author the HTML, optionally extend the substitution map in `scripts/render.ts` if you need new data fields.

See `references/creating-a-template.md` for the walk-through.

## Pairs with `document-skills:pdf`

After Playwright produces the per-page PDFs, chain into `Skill(document-skills:pdf)` for imposition, crop marks, front+back merging, and metadata embedding. See SKILL.md for the pattern.
