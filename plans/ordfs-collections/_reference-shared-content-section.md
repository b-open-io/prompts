### Referencing shared content (collections & large mints)

A reference points at content that already exists on-chain, so many inscriptions
can share one payload instead of each re-inscribing it. For a collection — or any
large mint — inscribe the artwork **once** and have every item reference that
outpoint. A 10,000-item drop then costs one image plus a tiny reference per item,
not 10,000 copies, and the same holds when items are minted on demand.

Two forms work, both resolved by [OrdFS](ordfs.md):

- **`text/uri-list` item** — the item's content is a reference to the shared image:

  ```
  /content/<imageOutpoint>.png
  ```

- **Directory item** — the item is an `ord-fs/json` [directory](ordfs.md#directories)
  whose entries point at the shared image (and any per-item files):

  ```json
  { "image.png": "<imageOutpoint>", "meta.json": "_1" }
  ```

#### Tradeable items, shared content

Keep the collection and item MAP envelopes unchanged:

- **Collection** — remains the classic `image/*` MAP `collection` ordinal.
- **Item** — remains a tradeable 1-sat MAP `collectionItem` ordinal with the
  same `collectionId`, mint, rarity, trait, and attachment fields. Only its
  inscription content changes from image bytes to a reference.
- **Referenced content** — can be an existing inscription or a 0-sat bitcom
  `B` output. Directory manifests may point to shared or item-specific content
  without changing collection membership.

The collection and item keep their existing AIP authorship signatures. For
additional OrdFS directory outputs, signing follows output type: a signed
1-sat ordinal uses SIGMA and a signed 0-sat `B` output uses AIP; immutable
leaves may also be unsigned.

#### Resolution notes

- A referenced or leaf output resolves only if its transaction is in the serving
  OrdFS instance's store (same [scope rules](ordfs.md#scope-of-a-deployment)).
- Leaf content must be an inscription envelope or a **bitcom `B`** output; a raw
  `OP_RETURN` pushdata that is not `B` carries no servable content type.
- `{outpoint}:-1` "latest" applies to a **1-sat** ordinal — it follows the
  transfer chain. 0-sat B leaves are immutable and resolve at their exact
  outpoint, and directory traversal resolves leaves pinned; request a nested
  manifest directly with `:-1` to resolve its tip.
