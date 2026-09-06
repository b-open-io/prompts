# X split carousel

X lays multiple images on one post out by count and shape. When every image on
the post is portrait and shares one pixel size, X presents them as a strip the
reader swipes. Cutting one wide master scene into equal slices turns that strip
into a continuous panorama. Two formats are verified; do not claim others.

| Count | Each slice | What the reader sees | Master |
|---|---|---|---|
| 2 | Equal portrait tiles, same width and height | Side-by-side pair | One scene, one vertical cut |
| 3 | 1024×2048 (1:2) | Swipe carousel | One scene, two vertical cuts; mosaic about 3092×2048 with gutters |

Reference: three 1024×2048 photos uploaded left to right,
https://x.com/DennisAdriaans/status/2093068486209597599

## Brief for Lisa (`gemskills:content`)

Alex owns the count, the per-slice size, the cut lines, and the upload order.
Give Lisa:

- Count and per-slice pixel size (`3 × 1024×2048` or `2 × W×H portrait`).
- Equal vertical cuts across one master scene.
- What must stay whole on one side of each cut: faces, type, UI chrome, logos.
- File names in upload order: `01-left.png`, `02-middle.png`, `03-right.png`.
- PNG or JPEG under 10 MB each.

## Before you upload

Open every slice and confirm identical width and height, 1:2 on the
three-slice set, and that `01-left` is the left edge of the scene. The
bopen.ai API rejects mixed sizes on one item (`media_dimensions`), which is a
useful tripwire, not a substitute for looking.

Upload in order and put the returned ids in the item's `media` array in the
same order. Order in the array is the order X shows.

## What the bopen.ai preview shows

The review page and its **Post preview** dialog detect the carousel case
(2–4 images, all portrait, identical dimensions) and render it the way X does:
two tiles side by side at their true aspect, or a horizontal swipe strip for
three or four. Landscape or mixed sets fall back to X's standard grid (16:9
pair, tall-left triple, 2×2 quad). If the preview shows the tall-left grid for
a set you meant as a carousel, the export is wrong: one slice differs in size
or is landscape. Fix the export, re-upload, and update the post.

## Story telling with the strip

- Read left to right as one sentence: setup, turn, payoff.
- Put the hook in the left slice; it is the one shown in feeds and share cards.
- Keep any text inside a slice at least 96 px from the cut lines.
- One scene, one palette. Three unrelated images are a grid, not a carousel.
