# Employees

One JSON file per person, plus an optional pixel-art portrait per person
for templates that use a photo (e.g. `watercolor/`).

## Data shape

```json
{
  "name": "Your Name",
  "title": "Your · Role · Here",
  "email": "you@example.com",
  "phone": "+1 (555) 555-5555",
  "handle": "@yourhandle",
  "qrUrl": "https://example.com/meet/you?ev=launch",
  "qrLabel": "example.com/meet"
}
```

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Display name. Long names truncate gracefully. |
| `title` | yes | Role / subtitle. Goes through `text-transform: uppercase` in most templates. |
| `email` | yes | Visible on the front. Used as-is, no validation. |
| `phone` | no | Visible if present. |
| `handle` | no | X / social handle. Rendered with an X glyph. |
| `qrUrl` | yes | Encoded into the QR. Use a vanity URL so you can change the destination without reprinting. |
| `qrLabel` | no | Display text under the QR. Defaults to `qrUrl` if omitted. |

## Photos (for templates that use them)

Pass the photo path via `--photo <relative-path>` when rendering. Convention:
keep the file alongside the JSON, e.g. `employees/luke.png` for `employees/luke.json`.

Photos should be pre-stylized (the `watercolor` template treats them as a
"postage stamp" and uses `image-rendering: pixelated` to preserve crisp
pixel-art portraits — feed it a pixel-art portrait, not a raw photograph).
