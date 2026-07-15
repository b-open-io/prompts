## Fungible (BSV-21) collection members

A `collectionItem` is not required to be an image inscription. A BSV-21
`deploy+mint` or `deploy+auth` output (content type `application/bsv-20`, see
[BSV-21](../fungible-tokens/bsv-21.md)) may itself carry `collectionItem`
metadata as a MAP suffix appended after its `bsv-20` JSON payload, exactly as
any other ordinal does. The collection membership lives entirely in MAP — the
`bsv-20` JSON is unchanged and carries no collection fields.

In this case:

- The **member is the token's deploy/genesis outpoint** (`tokenId`, i.e.
  `<txid>_0`), not any individual held or transferred unit. Metadata inherits to
  holders by resolving `tokenId` back to its deploy outpoint — the same way
  `sym`/`dec`/`icon` already inherit per the BSV-21 spec. One token type is one
  collection member. An application may treat a nonzero balance as ownership
  or access; BSV-21 itself proves the balance but does not enforce product rights.
- `mintNumber` and `rank` do not apply to a fungible member and should be
  omitted.
- `traits` / `rarityLabel`, if present, describe the token type as a whole
  rather than an edition or serial position.
- The token's own `icon` field (an inscription-origin or B-protocol-file
  outpoint) may serve as the item's preview image in place of a separate
  `previewUrl` / attachment.
- Canonical membership is `subTypeData.collectionId` plus an authorship
  signature whose signer matches the collection root. Use **SIGMA** — its prefix
  commits to a transaction input, so the signature cannot be replayed onto
  another item (legacy AIP-signed members remain valid). When `collectionId` is
  an absolute outpoint, the ordinal `parent` field (field 3) may duplicate it as
  a navigation hint; it is not required, and a same-transaction `_N` reference
  cannot use it.

### Supply model

The BSV-21 supply model the member uses is a product decision, not a collection
concern:

- **Fixed supply** (`deploy+mint`) — the entire, immutable supply is created at
  deploy. Fits capped editions: e.g. an album collection where each track is a
  member token with a set number of tradeable units, one unit granting the right
  to play that track.
- **Auth tokens** (`deploy+auth` then `mint`) — no initial supply; an auth UTXO
  grants ongoing minting. Fits access passes and any mint-over-time model. Only
  the holder of the auth UTXO can mint more, so a distributor keeps that key on
  the server and mints one unit per sale (mint-on-buy). The collection creator
  and the auth holder are typically the same key.
