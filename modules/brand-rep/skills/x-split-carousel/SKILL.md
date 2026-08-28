---
name: x-split-carousel
version: 1.0.0
description: >-
  Slice one master scene into equal portrait frames and upload them left
  to right as an X split-carousel. Use when asked to "split carousel",
  "X carousel", "slice this for X", "panorama post", "swipe carousel",
  or when a continuous scene must post as two side-by-side tiles or
  three 1:2 slices. Do not use the old 3-image grid.
---

# X Split-Carousel

One master scene, sliced into equal portrait frames, uploaded left to
right. Alex (social-media-manager) owns count, aspect, cut lines, and
upload order. Lisa (`gemskills:content`) paints the master. This skill
does not render art and does not publish.

## When to use

- A post must read as one continuous scene across tiles, not a collage.
- The brief is "split carousel", "X carousel", "panorama", or "swipe
  through the scene".
- You are briefing Lisa, checking her export, or attaching the slices
  in Typefully.

Do not use this for a single image, a thread of unrelated shots, or
research/lookup of tweets (`research:x-*`).

## Formats that work

| Count | Each slice | What X does in the feed | Master |
|---|---|---|---|
| 2 | Equal portrait tiles, same height | Two tiles sit side by side as a panorama | One scene, one vertical cut |
| 3 | 1024×2048 (1:2) each | Swipe carousel | One scene, two vertical cuts |

Reference post (three-slice swipe):
https://x.com/DennisAdriaans/status/2093068486209597599

Verified from that post (Twitter Web App, 2026-08-27 20:09 UTC /
4:09 PM ET): three photos, each **1024×2048**, attached in left →
middle → right order. Caption was "Testing carousel for X".

## Mosaic and cut lines

- The three-slice mosaic with gutters is **~3092×2048**. That is three
  1024-wide frames plus the gutters between them, not a 3072-wide
  seamless stitch.
- Draw **equal-width vertical cuts**. Keep faces, type, and UI chrome
  off the cut. Continuity (a chart, a horizon, a dashboard) may cross
  a cut; the subject of a tile must not be bisected by accident.
- Name the files in upload order: `01-left`, `02-middle`, `03-right`
  (drop `02-middle` for a two-tile set).

## Do not use the old 3-image grid

The old three-image layout is **tall left + two stacked on the right**.
That crops and rearranges the scene. It is not a split-carousel. If a
compose preview or scheduler still shows that grid, stop and fix the
export — do not post it.

## Roles

1. **Alex** specifies slice count (2 or 3), per-slice aspect, cut-line
   placement, and upload order (always left → right).
2. **Lisa** (`gemskills:content`) renders the master at the mosaic size
   and exports the equal slices. Do not ask her to invent the count or
   the cut lines.
3. **Alex** attaches the slices in Typefully (or the X composer) in
   file-name order, left first. `brand-rep:typefully` drafts and
   schedules copy; it does **not** wrap media upload. Attach the files
   in the Typefully UI, then schedule only after an explicit go-ahead.

## Brief Lisa with

- Count: `2` (side-by-side panorama) or `3` (swipe carousel)
- Per-slice size: `1024×2048` (1:2) for the three-slice form
- Mosaic: `~3092×2048` including gutters (three-slice)
- Cut lines: equal vertical splits; list anything that must stay
  intact on one side of a cut
- Export: separate files, same pixel height, no extra padding, no
  stacked-grid layout
- Upload order: left → right

## Before you post

- Open the three (or two) files and confirm equal width and height.
- Confirm 1:2 on the three-slice set (1024×2048).
- Confirm the first file is the left edge of the scene.
- Confirm the compose surface is a left-to-right row or swipe, not
  tall-left + two-stacked.
- Humanize the caption (`Skill(humanize)`). Wait for an explicit
  go-ahead before anything reaches a live account.

## Unverified — do not invent

Official X help and media docs were not readable while this skill was
written. Do not add claims about max photo count, file-size caps,
premium-only carousel, or how X will render other aspect ratios. Stick
to the two formats above and the reference tweet.
