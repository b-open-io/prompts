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
  collection member; holding any nonzero balance of that type is "owning" it.
- `mintNumber` and `rank` do not apply to a fungible member and should be
  omitted.
- `traits` / `rarityLabel`, if present, describe the token type as a whole
  rather than an edition or serial position.
- The token's own `icon` field (an ordinal or B:// outpoint reference) may serve
  as the item's preview image in place of a separate `previewUrl` / attachment.
- As with any collection member, set the ordinal `parent` field (field 3) to the
  collection's outpoint in addition to `subTypeData.collectionId`, and sign with
  AIP per [Signing](signing.md).

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
