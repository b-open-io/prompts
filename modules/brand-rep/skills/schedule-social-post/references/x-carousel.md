# X split carousel

Checked 2026-11-25.

## How X lays out multi-image posts

- Since 2026-11-12, an organic post can carry up to 20 photos or videos (it
  was 4). Sources: https://x.com/dinkin_flickaa/status/2120946118267732158 and
  https://x.com/XCreators/status/2121034947280753090. help.x.com and the API
  reference prose may still say 4; the live API accepts 20. A 20-image post:
  https://x.com/manonsarachela/status/2121010475638952141.
- Since August 2026, any post with 2 or more images renders as a horizontal
  strip the reader swipes. There is no grid; four images are a strip too.
  Source: https://x.com/dinkin_flickaa/status/2088353968682402047.

Cutting one wide master scene into equal slices and uploading them left to
right turns that strip into a continuous panorama.

## Slice size

| Slices | Each slice | Status |
|---|---|---|
| 2–3 | 1024×2048 (1:2) | Proven |
| 4 or more | 1024×2048 (1:2) | Not verified as one continuous panorama; preview before committing |

Reference: three 1024×2048 photos uploaded left to right,
https://x.com/DennisAdriaans/status/2093068486209597599

Some clients, mainly web, may crop an image taller than 4:5. Check how the
first slice reads cropped before you rely on the full 1:2 height.

## bopen.ai limit

X allows up to 20 images per post. bopen.ai currently rejects more than 4 per
item (`media_count`), and its composer stops at 4. Plan carousels of 2–4
slices through bopen.ai until that cap is raised. Do not tell the user a
5–20 slice post can go through bopen.ai.

## X Ads carousels are a different product

X Ads Carousels have 2–6 cards, each with its own headline and link, and one
aspect ratio across the set (4:5, 2:3, 1:1, 1.91:1, 16:9, or 9:16). Images are
at most 5 MB. Spec:
https://help.x.com/en/business-and-advertising/creative-ad-specifications (the
business.x.com `creative-ad-specifications-old` page is a superseded copy).
They are the wrong format for a split panorama. This reference covers organic
posts only.

## Brief for Lisa (`gemskills:content`)

Alex owns the count, the per-slice size, the cut lines, and the upload order.
Give Lisa:

- Count and per-slice pixel size (for example `3 × 1024×2048`).
- Equal vertical cuts across one master scene.
- What must stay whole on one side of each cut: faces, type, UI chrome, logos.
- File names in upload order: `01-left.png`, `02-middle.png`, `03-right.png`.
- PNG or JPEG under 10 MB each.

## Before you upload

Open every slice and confirm identical width and height and that `01-left` is
the left edge of the scene. Every slice must share one pixel size; the
bopen.ai API rejects mixed sizes on one item (`media_dimensions`). Treat that
error as a tripwire, not a substitute for looking.

Upload in order and put the returned ids in the item's `media` array in the
same order. Order in the array is the order X shows.

## What the bopen.ai preview shows

The review page and its **Post preview** dialog render 2–4 portrait images
with identical dimensions as a side-by-side pair (2) or a swipe strip (3–4).
Landscape or mixed sets still render as the older grid layout in that
preview, which no longer matches X. Treat a grid in the preview as a sign the
export is wrong (one slice differs in size or is landscape), not as how X will
show the post. Fix the export, re-upload, and update the post.

## Story telling with the strip

- Read left to right as one sentence: setup, turn, payoff.
- Slice 1 is the hook; it is the one shown first in feeds and share cards.
- Keep any text inside a slice at least 96 px from the cut lines.
- One scene, one palette. Unrelated images make a strip, not a panorama.
