# html-to-pdf

Print-ready PDF rendering via Playwright (Chromium) for any HTML/CSS layout — business cards, certificates, invoices, postcards, one-pagers, letterhead.

See `SKILL.md` for the full reference (when-to-use, gotchas, font embedding rules, bleed/safe-area specs, artistic QR generation, and the chain into `document-skills:pdf` for imposition).

## Layout

```
html-to-pdf/
├── SKILL.md                              # main entry — read this first
├── README.md                             # this file
├── scripts/
│   ├── render.ts                         # Playwright renderer + field substitution
│   └── qr-artistic.ts                    # artistic QR generator (round dots + logo overlay)
└── templates/
    └── business-cards/                   # canonical reference template
        ├── card.html                     # front (3.5x2 with 0.125 bleed)
        ├── card-back.html                # back (dark, with QR slot)
        └── employees/
            └── example.json              # input data shape
```

## Quick smoke test

```bash
SKILL_ROOT="$(pwd)"                       # from inside the skill dir
mkdir -p /tmp/print-test && cd /tmp/print-test
cp -R "$SKILL_ROOT/templates/business-cards/." .
cp "$SKILL_ROOT/scripts/render.ts" .
cp "$SKILL_ROOT/scripts/qr-artistic.ts" .
bun init -y
bun add playwright qrcode @types/qrcode geist
bunx playwright install chromium
bun render.ts employees/example.json
open out/example-square-front.pdf out/example-square-back.pdf
```

## Real-world usage in production

This skill backs `bopen.io`'s business card pipeline. The same template renders for every teammate listed in `lib/team.ts` — change the JSON, rerun. The QR points at `bopen.io/meet/<teammate>?ev=<event>`, which routes through `/meet/[teammate]/page.tsx` into the booking system with attribution (`requestedTeammateId`, `sourceCard`, `sourceEvent`, `referredBy`) so the right person gets the email and analytics knows which event drove the meeting.
