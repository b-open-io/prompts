Picking this back up with two things settled since we last talked here — the backend capability and the docs.

**Backend (1sat-stack `pkg/ordfs`) supports the resolution model in code.** Confirmed against the code: `ord-fs/json` directory traversal, outpoint + relative-vout (`_N`) pointers, 0-sat bitcom-`B` leaf content served by outpoint, and `{outpoint}:-1` latest via spend-chain crawl for a 1-sat ordinal. Resolution loads the tx via `beef.Storage` and parses on the fly (it does **not** gate on the output index), so a leaf resolves if its tx is fetchable. Three deployment gates remain to verify before relying on this in production:

1. **Config, not code:** the `beef`/`spends` chains must include a remote (JungleBus) fallback, or un-ingested leaf txs / deep `:-1` won't resolve. Verify on the deployed stack.
2. **Leaves must be genuine bitcom-`B`** (not raw `OP_RETURN` pushdata) to serve content.
3. **`:-1` is 1-sat-only** — 0-sat B leaves and directory-traversed leaves resolve pinned.

(`go-ordfs-server` is the older JungleBus-proxy variant of the same algorithm; 1sat-stack's `pkg/ordfs` is the indexed re-implementation and is the one that matters for deployment.)

**Docs:** opened a PR on the spec repo documenting the shared-content pattern (reference one image, don't re-inscribe per item) — <DOCS_PR_URL>. (Draft placeholder: do not post this comment until the real URL replaces it.)

## The constraint I want to anchor on before finalizing the API

The `collection` / `collectionItem` MAP spec is already used by many on-chain collections and is exactly what indexers/DBs/UIs key off. We should **not** fork or reshape it. So I'd frame ord-fs/references as a **content-delivery layer at the item level**, orthogonal to the collection semantics:

- **Collection** stays exactly per spec — an `image/*` ordinal with MAP `subType: collection` (`description`, `quantity`, `rarityLabels`, `traits`), AIP-signed. No change.
- **Item** stays a MAP `subType: collectionItem` ordinal with every existing field (`collectionId`, `mintNumber`, `rank`, `rarityLabel`, `traits`, `attachments`), AIP-signed with the matching key. The **only** change is its inscription *content*: instead of re-inscribing image bytes, it's a reference (`text/uri-list` → `/content/<imageOutpoint>.png`, or an `ord-fs/json` item) resolving to a shared **or** per-item image.

That preserves the exact data shape indexers/UIs consume (membership + rarity + traits all from MAP, unchanged), while giving us both:

- **Dedup** — one image referenced by N items (the 30k-mint and mint-on-demand cases), and
- **Granular per-output images** — each item references its own image when they differ; sharing is opt-in, never forced.

The directory/reference machinery is *how content is delivered*; the collection definition is untouched.

## Open questions to settle the API around this

1. Indexers build membership from the item's MAP `collectionId`, not from inline image bytes — can you confirm an item whose content is a **reference** (rather than an image) is still admitted as a member with rarity/traits intact? If so, this is purely additive.
2. **Root:** I lean toward keeping the collection root a classic `image/*` MAP collection for max compat, and applying directories/references only at the item level. If we also want the root to *be* an ord-fs directory (one tradeable tree), it still needs to surface a referenced image preview + carry the `subType: collection` MAP — worth deciding whether that dual-role root is in scope now or later.
3. **Signing:** items stay AIP (collection authorship, matching key) even when content is a reference — the SIGMA/AIP-by-output-type rule you noted is the ordfs *content*-signing convention and is orthogonal to collection membership. Agree?
4. On the entry API itself: given signing protocol is implied by output type, Option A collapses to `content | ref` + `as?: 'ordinal' | 'B'` + `sign?: boolean` (drop the protocol enum). Unsigned B leaves to start, per your lean.

Net: I don't think we change the collection spec at all — we document it (docs PR above) and build the reference/directory path as the content layer, growing the SDK's `collectionItem` mint with a `ref` option so an item can point at shared-or-unique content. Compatible by construction.
