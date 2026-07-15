# Plan 003: 1sat-stack — verify B-leaf/`:-1` resolution on the deployed stack, and decide the collection-member listing API

> **Target repo**: `~/code/1sat-stack` (github `b-open-io/1sat-stack`), Go (`module github.com/b-open-io/1sat-stack`).
> **Executor instructions**: Part A is a **verification/investigation** task (read + a live round-trip), producing a written finding. Part B is a conditional design spec, only built if Part C decides it's needed. Do NOT change resolver parsing unless a STOP-condition finding forces it.
>
> **Drift check (run first)**: `git -C ~/code/1sat-stack fetch origin && git -C ~/code/1sat-stack diff --stat origin/master -- pkg/ordfs`. Reconcile if `pkg/ordfs` changed.

## Status

- **Status**: TODO — investigation and implementation require explicit plan approval
- **Priority**: P2
- **Effort**: S (Part A) / M (Part B if built)
- **Risk**: LOW (verification) / MED (if a parser change is needed)
- **Depends on**: none for Part A; Part B pairs with plan 001
- **Category**: migration / dx / direction
- **Planned at**: 1sat-stack master `3cd41c1`, 2026-07-15

## Why this matters

The reference-shared-content model (plans 001/002) depends on the OrdFS resolver actually serving referenced content in production. Code review confirmed `pkg/ordfs` *supports* the model (directory traversal, outpoint + relative-vout pointers, 0-sat bitcom-`B` leaf content, `{outpoint}:-1` latest for 1-sat roots), loading txs via `beef.Storage` and parsing on the fly. But two things are unverified on the deployed stack, one capability (listing a collection's members) may be missing for UIs/marketplaces, and the settled encoding decision (2026-07-15) adds two resolver behaviors the current code lacks.

**Settled encoding decision to encode here (do not re-litigate):** the SDK PRODUCES `ref=ordfs` (pointer primitive, real MIME + media-type parameter) and `ord-fs/json` (multi-leaf container); the resolver must (a) RESOLVE `ref=ordfs` — a media-type-parameter parser + the headers in `content-ref.md` (today: zero hits, `grep "ref=ordfs"` → none), and (b) ACCEPT `text/uri-list` on read for interop — one exact-match branch reusing the existing pointer resolver (today `text/uri-list` is raw-served at `routes.go:141`). The resolver accepts three encodings; the SDK produces two. Membership is orthogonal to all of them: it keys on MAP, never on the inscription body.

## Current state (confirmed by code read)

- `pkg/ordfs/ordfs.go` — `loadOutput` loads the whole tx via `beef.Storage` (`beef.LoadTx`) and returns `tx.Outputs[index]`; `parseOutput` handles inscription envelopes AND bitcom `B` (`bitcom.BPrefix`, `bitcom.DecodeB`). Fast path at ~`ordfs.go:71-82`: `if output.Satoshis != 1 || req.Seq == nil` returns parsed content without ordinal tracking (so 0-sat B leaves resolve directly). `Resolve`/`forwardCrawl` follow the spend chain for `:-1`.
- `pkg/ordfs/routes.go` — directory (`ord-fs/json`) traversal (`handleDirectory` → `resolveDirectoryPath` → `loadDirectoryEntry`); pointer forms `_N`, `txid_vout`, `txid`, `ord://` (`resolvePointerToOutpoint`, `parseRelativeVout`).
- Backends: `beef.Storage` and `spends.Storage` are multi-backend chains that CAN include a JungleBus remote fallback (`pkg/beef/junglebus.go`, `pkg/spends/junglebus.go`, config in `pkg/*/config.go`). If a deployment's chain is local-only, un-ingested leaf txs and deep `:-1` will 404.
- `bitcom.BPrefix` is the ONLY B form recognized; a raw pushdata `OP_RETURN` that is not bitcom-`B` yields empty content.
- There is no "list all members of a collection" query in `pkg/ordfs`; membership is a MAP-index concern (`pkg/txo` / lookup layer), not ordfs.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Build | `go build ./...` | exit 0 |
| Vet | `go vet ./...` | exit 0 |
| Test | `go test ./...` | pass |
| Config inspect | `grep -rn "junglebus\|JungleBus\|Fallback\|backend" pkg/beef pkg/spends cmd/server/config.go` | shows the configured chain |

## Scope

**Part A — verification (in scope; produces a written finding, minimal/no code change):**
- Read `cmd/server/config.go` + `pkg/beef/config.go` + `pkg/spends/config.go` to determine whether the **production** deployment's `beef` and `spends` chains include a JungleBus/remote fallback. Record the finding.
- Do ONE live round-trip against the deployed OrdFS host: publish (or use an existing) 0-sat bitcom-`B` output, then `GET {host}/content/{txid_vout}` and confirm the B content is served (correct `Content-Type` + bytes). Record the host and result. (If no test output is available, document the exact curl to run and mark UNVERIFIED.)

**Part B — collection-member indexing + listing API (conditional; build ONLY if Part C says yes):**
- **First, the index gap (audited, grounded):** the stack does NOT index `collectionId` today. `ParseMAP` emits exactly one event — `map:type:<type>` (`pkg/parse/bitcom.go:74-76`) — and `collectionId` is nested inside the `subTypeData` JSON string (`pkg/ordfs/ordfs.go:246-249`), never a flat MAP key. Search is event-key-only (`ev:`/`tp:`/`own:` sorted sets, `pkg/txo/routes.go:272-319`, writes `pkg/txo/output_store.go:128-138`). So "list members of collection X" currently has nothing to query for ANY collection, referenced or classic. **This index gap, not the item encoding, is the actual membership blocker.**
- **The fix:** after all parsers have run, require `subType=collectionItem`, parse `subTypeData` strictly, and normalize `collectionId` to an absolute outpoint (`_N` resolves against the current txid). Treat `map:subType:collectionItem` + `map:collectionId:<absolute-id>` as candidate discovery keys. The authoritative listing then loads the referenced root, requires `subType=collection`, requires valid AIP under the signing semantics reconciled in plan 001, and requires signer-set intersection between root and member. (`ParseMAP` runs before `ParseAIP`, and root lookup is external, so `ParseMAP` alone cannot enforce these invariants.) Raw MAP remains queryable as parsed data, but an unsigned, invalidly signed, foreign-signed, malformed, or non-collection-root record is never returned as authoritative membership.
- **Membership invariant (settled — Q2):** membership keys ONLY on MAP (`collectionId` + `subType:collectionItem` + valid AIP matching the collection root), NEVER on the inscription body or content-type. A `ref=ordfs`, `ord-fs/json`, `text/uri-list`, `base64Content`, OR `bsv-21 deploy` item are all the same at the MAP layer, so the listing admits them identically and must not inspect the leaf. Membership is anchored to the item's origin/outpoint — do NOT filter `unspent=true` (a deploy output is spent on distribution; `Search` defaults `unspent=false` at `pkg/txo/routes.go:279`, keep it).

**Part C — decision (do this before Part B):**
- Determine whether the marketplace/UI needs a server-side collection-member list, or whether the client already enumerates members another way (e.g. via an existing 1sat API / overlay). If a suitable listing already exists, mark Part B REJECTED with the reference — but the MAP-only keying rule stands wherever membership is computed.

**Part D — resolver reference branches (settled encoding decision; pairs with plan 001):**
- Add a `ref=ordfs` resolve path: parse the media-type parameter on the item's content-type (e.g. `image/png; ref=ordfs`), read the pointer from the body, resolve it through the EXISTING pointer resolver, and serve the resolved bytes under the declared real MIME plus the response headers `content-ref.md` specifies (`X-Content-Outpoint`, `?raw` passthrough, one-hop / cycle caps). Today `grep "ref=ordfs"` → zero hits.
- Add a `text/uri-list` ACCEPT branch (read-only interop): one exact-match branch at the raw-serve site (`routes.go:141`) reusing the pointer resolver (`routes.go:227-279`) so a `text/uri-list` item follows its first URI instead of being served as text. The resolver never emits uri-list; it only accepts it.

**Part E — BSV-21-token-as-collectionItem seam (audited; pairs with the plan-001 builder and plan-002 spec text):**
- **What's already fine (do not "fix"):** dual classification works today. The parser is additive — `parse.Parse` runs every tag and stores each result independently (`pkg/parse/parse.go:78-100`), and the indexer persists all of them on the same output (`pkg/indexer/indexer.go:138-153`). A single 1-sat `application/bsv-20` deploy output with a MAP+AIP suffix parses cleanly into BOTH `bsv21` and `map` results (bsv21 reads the inscription envelope, `pkg/template/bsv21/bsv21.go:34-45`; MAP reads the OP_RETURN suffix, `pkg/template/bitcom/bitcom.go:25-59`). No mutually-exclusive typing exists in the general indexer.
- **BLOCKER — the token overlay discards MAP, and the two stores don't join.** The BSV-21 overlay lookup persists only token fields (`id/sym/dec/icon/amt`) — no MAP (`pkg/lookup/bsv21.go:635-650`). Possession lives in the token store; membership can only live in the general txo store, and only if the general `"ingest"` subscription (`pkg/indexer/config.go:47-59`) actually receives deploy txs — a DIFFERENT queue from the bsv21 pipeline's `"bsv21"` (`pkg/bsv21/sync.go:45-54`). **Verify operationally** that the production general indexer ingests the same txs the bsv21 pipeline sees; if only the overlay runs, the collection MAP is indexed nowhere.
- **MAJOR — no balance×membership join.** Membership is anchored to the deploy outpoint (`tokenId = deploy outpoint`, `pkg/parse/bsv21.go:42-47`); holder UTXOs carry `tokenId` but no collection MAP. "Show my collection items" needs: holder balance (bsv21 lookup) → `tokenId` → direct `OutputStore.LoadOutput(tokenId)` in the general store → deploy MAP → normalized `subTypeData.collectionId` → authoritative root/member signature check. Add a `tokenId → collection` resolver around that direct outpoint load (cache optional). The SDK's `Bsv21TokenData`/`TokenDetailResponse` (1sat-sdk `packages/types/src/services.ts:287-304`) also carries no MAP field, so this resolver closes that gap server-side without depending on Part B's optional listing endpoint.

**Part F — generic default-entry (`.`) for `ord-fs/json` directories (settled; makes `ord-fs/json` a first-class item form):**
- **Current behavior (grounded):** on an empty file path, `handleDirectory` **302-redirects to `{path}/index.html`** (`routes.go:158-164`), and `resolveDirectoryPath` SPA-falls-back to `directory["index.html"]` for the final segment (`routes.go:194-197`). This is web-artifact-specific: a collection-item directory whose primary content is an image (not a web entry point) redirects to a nonexistent `index.html` and 404s. That is the old, real knock against `ord-fs/json` items.
- **The change:** add a generic default-entry key `.`. When the file path is empty (`handleDirectory`, `routes.go:158-165`), if `directory["."]` exists, **resolve and serve it in place via `loadDirectoryEntry`** (NOT a raw `sendContentResponse` of the directory JSON — routing through `loadDirectoryEntry` means a `.`-points-to-subdirectory case serves resolved content, not a raw pointer/JSON blob). Do NOT redirect (a redirect loses the canonical outpoint URL and breaks an image response). **Explicit precedence:** `?raw` → `.` (served in place) → `index.html` (redirect, web-artifact fallback) → informative 404. Mirror the `.` fallback in `resolveDirectoryPath`'s not-found branch (`routes.go:194-197`) alongside the existing `index.html` fallback. Also **gate the `index.html` redirect on the key existing** — today `routes.go:163-164` redirects unconditionally, so a directory without `index.html` 302s then dead-ends in a 404 (a wasted round trip); gating it turns that into a direct informative 404.
- **Ambiguity check — RESOLVED (verified against the code, no hazard):** `.` is resolved in the empty-`FilePath` branch at `routes.go:159`, BEFORE `strings.Split(pp.FilePath, "/")` (`routes.go:168`), so it never becomes a path segment and never reaches `resolvePointerToOutpoint`/`parseRelativeVout`. The `_N` relative-pointer form is a map *value* matched by `^_(\d+)$`, which `.` cannot match; `.` lives purely in the map-*key* namespace. The only overload — a leaf literally named `.` — is a pathological/illegal filename that resolves to the same served entry (a spec note, not a bug). Because it's verified safe, `.` is the chosen sentinel (weighed and beaten: `""` invisible/accident-prone, `index` collides with the `index.html` SPA fallback, `@default`/`$entry`-manifest-field breaks the flat `map[string]string` contract at `routes.go:151/178/212`).
- **Out of scope for this part:** changing pointer syntax or the `ord-fs/json` content-type; only the empty-path/not-found default-entry lookup changes.

**Out of scope:**
- Changing `parseOutput` to accept raw (non-bitcom-`B`) OP_RETURN — only if a STOP finding shows the SDK (plan 001) emits raw OP_RETURN leaves, which it should not.
- The spend-chain / `:-1` algorithm.
- PRODUCING `text/uri-list` anywhere — accept-only.

## Steps

1. **Config finding (Part A):** read the three config files; write a 5–10 line finding under "Execution findings" in `/Users/satchmo/code/prompts/plans/ordfs-collections/README.md`: does prod `beef`/`spends` include a remote fallback? If NO, the recommendation is a config/deploy change (add the JungleBus backend), not code. **Verify**: finding recorded; `go build ./...` still exit 0 (no code touched).
2. **Live B-leaf round-trip (Part A):** run the documented curl against the deployed host; record served vs 404. **Verify**: result recorded (VERIFIED or UNVERIFIED with the exact repro command).
3. **Listing decision (Part C):** document whether a member-listing endpoint is needed and where members are otherwise enumerated. **Verify**: decision recorded with a one-line rationale.
4. **(Conditional) Membership indexing + listing (Part B):** only if Step 3 says yes. After `parse.Parse`, require `subType=collectionItem`, strictly parse `subTypeData`, normalize absolute and same-tx `_N` collection IDs, and emit candidate discovery events. The authoritative handler loads and validates the collection root and signer intersection. Add a `go test` covering one collection with THREE correctly signed members — a `base64Content` NFT, a `ref=ordfs` NFT, and a `bsv-20` token deploy — plus unsigned, foreign-signed, malformed-ID, and non-collection-root candidates; include a same-tx `_N` member and assert it is discoverable under the normalized absolute key. Assert only the three legitimate members are returned. **Verify**: `go test ./...` passes; candidate search normalizes IDs and the listing returns the three matching members only.
5. **Resolver reference branches (Part D):** add the `ref=ordfs` resolve path and the `text/uri-list` accept branch per scope. Add `go test` covering: a `ref=ordfs` item served under its real MIME with the correct headers; a `text/uri-list` item that follows its URI. **Verify**: `go build ./... && go vet ./... && go test ./...` all pass; `grep -rn "ref=ordfs" pkg/ordfs` now shows the parser.
6. **Token-member join (Part E, independent of Part B):** verify operationally that the general indexer ingests deploy txs; add the direct `tokenId → OutputStore.LoadOutput(tokenId) → deploy MAP → collection` resolver so a holder's balance resolves to authoritative collection membership even if Part B is rejected. Add a `go test` proving resolution from `tokenId`; only assert enumeration through Part B when Step 3 approved and built it. **Verify**: `go test ./...` passes; the resolver returns the normalized `collectionId` for a token deploy's `tokenId`.
7. **Default-entry `.` (Part F):** run the ambiguity check, then add the `.` default-entry lookup to `handleDirectory` (serve-in-place, `.` before the `index.html` redirect) and `resolveDirectoryPath` (fallback alongside `index.html`). Add `go test`: a directory `{ ".": "<imgOutpoint>", "meta.json": "_1" }` requested at the bare outpoint serves the image bytes directly (no redirect, no 404); an existing `index.html`-only directory still redirects as before (backwards compat). **Verify**: `go build ./... && go vet ./... && go test ./...` all pass; both the existing `ordfs_test.go` index.html case and the new `.` case pass.

## Done criteria

- [ ] Part A finding recorded (beef/spends fallback status + B-leaf round-trip result)
- [ ] Part C decision recorded (listing needed? where members are enumerated) with the MAP-only keying rule stated
- [ ] If Part B built: candidate indexing normalizes strict absolute/relative IDs; the authoritative endpoint validates root type + signer intersection, returns a `base64Content`, a `ref=ordfs`, AND a `bsv-20` token-deploy member, and excludes unsigned, foreign-signed, malformed, and non-collection-root candidates
- [ ] Part D: `ref=ordfs` resolves under real MIME + `content-ref.md` headers; `text/uri-list` items follow their URI; `go test ./...` passes
- [ ] Part E: general indexer ingests deploy txs (verified); direct-load `tokenId → collection` resolver returns the normalized `collectionId` independently of Part B
- [ ] `/Users/satchmo/code/prompts/plans/ordfs-collections/README.md` status row updated

## STOP conditions

- The live round-trip shows 0-sat bitcom-`B` outputs are NOT served by outpoint on the deployed host despite the code path existing — STOP and report (this changes plan 001/004's leaf strategy toward inscription-envelope leaves or the by-txid path).
- Part C reveals the SDK plan (001) intends raw OP_RETURN (non-bitcom-`B`) leaves — STOP; either the SDK changes to bitcom-`B` or a `parseOutput` branch is a NEW plan.

## Maintenance notes

- Reviewer: the config finding is the real deploy risk — make sure it lands as an ops action item even if no code changes.
- If Part B is built, keep it read-only and MAP-index-backed; do not introduce a second source of truth for collection membership.
