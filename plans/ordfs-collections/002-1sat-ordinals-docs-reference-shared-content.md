# Plan 002: 1sat-ordinals docs — document the reference-shared-content collection pattern

> **Target repo**: `~/code/1sat-ordinals` (github `BitcoinSchema/1sat-ordinals`) — the GitBook source for docs.1satordinals.com.
> **Executor instructions**: This is a docs-only change. No build/test system; verification is a Markdown render check and link validity. Use the repo's own branch/commit convention (conventional commits like `docs: …`), NOT an internal `OPL-` scheme.
>
> **Drift check (run first)**: `git -C ~/code/1sat-ordinals fetch origin && git -C ~/code/1sat-ordinals diff --stat origin/master -- reference-inscriptions.md ordfs.md adding-metadata/collections.md`. If those changed, reconcile before editing.

## Status

- **Status**: TODO — implementation requires explicit plan approval
- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (can land independently; conceptually pairs with plan 001)
- **Category**: docs
- **Planned at**: 1sat-ordinals master `ea1ccac`, 2026-07-15

## Why this matters

The spec already documents ord-fs directories, pointer forms, `seq`/`:-1`, and `text/uri-list` references — but nowhere frames the **collection / large-mint pattern**: inscribe one image, reference it from every item instead of duplicating it. That pattern is what makes 10k-item drops and mint-on-demand affordable, and it needs a canonical write-up so SDK/tooling authors implement it consistently.

## Current state

- `reference-inscriptions.md` — documents `text/uri-list` references and `/content/<outpoint>` relative paths. Ends with a "Multiple Files" section.
- `ordfs.md` — has a "Directories" section (pointer forms `_N`, `txid_vout`, `txid`, `ord://`), a "Sequence (`seq`)" section (`-2` origin, `-1` tip), and "Scope of a deployment" (404 on out-of-store).
- `adding-metadata/collections.md` and `adding-metadata/collectionitem-subtype.md` — the MAP collection/collectionItem spec (unchanged by this work).
- A drafted section exists at `~/code/prompts/plans/ordfs-collections/_reference-shared-content-section.md`; treat that file as the canonical text to land after approval.

## Scope

**In scope:**
- `reference-inscriptions.md` — add the "Referencing shared content (collections & large mints)" section (text below).
- `ordfs.md` — add ONE cross-link line in the Directories section pointing to the new section.

**Out of scope:**
- Any change to `adding-metadata/collections.md` or `collectionitem-subtype.md` — the MAP spec does not change.
- `SUMMARY.md` restructuring beyond adding the new section if it is a new page (it is a section within an existing page, so SUMMARY likely needs no change — confirm).

## Steps

### Step 1: Add the section to `reference-inscriptions.md`

Append after the "Multiple Files" section the exact text in `_reference-shared-content-section.md` (in this plan folder). It covers: the reference-not-duplicate pattern; the two forms (`text/uri-list` item, `ord-fs/json` directory item); unchanged collection and collectionItem MAP envelopes; shared inscription or 0-sat bitcom-`B` content; existing AIP authorship on collections/items; signing by output type for additional directory outputs; and three resolution caveats (must be in the serving instance's store; leaves must be bitcom-`B` not raw OP_RETURN; `:-1` is 1-sat-only, directory leaves resolve pinned).

**Verify**: `grep -c "Referencing shared content" reference-inscriptions.md` → `1`. Render the Markdown (GitBook or any previewer) → no broken headings; internal links `ordfs.md#directories`, `ordfs.md#sequence-seq`, `ordfs.md#scope-of-a-deployment` resolve to real anchors (confirm those headings exist in `ordfs.md`).

### Step 2: Cross-link from `ordfs.md`

In the "Directories" section of `ordfs.md`, add one line: a pointer to the new section, e.g. under "Practical notes": "To share one image across many collection items instead of re-inscribing it, see [Referencing shared content](reference-inscriptions.md#referencing-shared-content-collections--large-mints)."

**Verify**: the anchor matches GitBook's slug for the new heading (lowercase, spaces→`-`, `&`→``, `()` dropped). Confirm by checking how existing intra-doc links in `ordfs.md` are slugged.

## Done criteria

- [ ] The new section is present in `reference-inscriptions.md` and renders without broken links
- [ ] `ordfs.md` cross-links to it with a working anchor
- [ ] No change to `adding-metadata/*`
- [ ] `git status` shows only the two docs files changed
- [ ] `/Users/satchmo/code/prompts/plans/ordfs-collections/README.md` status row updated

## STOP conditions

- The referenced anchors (`#directories`, `#sequence-seq`, `#scope-of-a-deployment`) do not exist in the current `ordfs.md` — STOP and report the actual heading slugs.
- The MAP spec docs appear to already cover this pattern (someone added it) — STOP; reconcile rather than duplicate.

## Maintenance notes

- If PR #13 (plan 001) changes the accepted `ref` string forms, update the examples here to match.
- Reviewer: verify the caveats match the deployed resolver behavior (plan 003 confirms them).
