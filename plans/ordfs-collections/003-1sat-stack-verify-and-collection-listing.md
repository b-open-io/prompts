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

The reference-shared-content model (plans 001/002) depends on the OrdFS resolver actually serving referenced content in production. Code review confirmed `pkg/ordfs` *supports* the model (directory traversal, outpoint + relative-vout pointers, 0-sat bitcom-`B` leaf content, `{outpoint}:-1` latest for 1-sat roots), loading txs via `beef.Storage` and parsing on the fly. But two things are unverified on the deployed stack, and one capability (listing a collection's members) may be missing for UIs/marketplaces.

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

**Part B — collection-member listing API (conditional; build ONLY if Part C says yes):**
- Add a read endpoint that lists collectionItem outpoints for a given `collectionId` by querying the existing MAP/txo index — NOT a new index shape. Likely in the `pkg/txo`/lookup layer with a route alongside the existing ordfs routes. Return outpoints + minimal MAP (mintNumber, rarityLabel) for UI listing.

**Part C — decision (do this before Part B):**
- Determine whether the marketplace/UI needs a server-side collection-member list, or whether the client already enumerates members another way (e.g. via an existing 1sat API / overlay). If a suitable listing already exists, mark Part B REJECTED with the reference.

**Out of scope:**
- Changing `parseOutput` to accept raw (non-bitcom-`B`) OP_RETURN — only if a STOP finding shows the SDK (plan 001) emits raw OP_RETURN leaves, which it should not.
- The spend-chain / `:-1` algorithm.

## Steps

1. **Config finding (Part A):** read the three config files; write a 5–10 line finding under "Execution findings" in `/Users/satchmo/code/prompts/plans/ordfs-collections/README.md`: does prod `beef`/`spends` include a remote fallback? If NO, the recommendation is a config/deploy change (add the JungleBus backend), not code. **Verify**: finding recorded; `go build ./...` still exit 0 (no code touched).
2. **Live B-leaf round-trip (Part A):** run the documented curl against the deployed host; record served vs 404. **Verify**: result recorded (VERIFIED or UNVERIFIED with the exact repro command).
3. **Listing decision (Part C):** document whether a member-listing endpoint is needed and where members are otherwise enumerated. **Verify**: decision recorded with a one-line rationale.
4. **(Conditional) Build listing endpoint (Part B):** only if Step 3 says yes. Add the route + handler + a `go test` covering one collection with two members. **Verify**: `go test ./...` passes; new endpoint returns the two members.

## Done criteria

- [ ] Part A finding recorded (beef/spends fallback status + B-leaf round-trip result)
- [ ] Part C decision recorded (listing needed? where members are enumerated)
- [ ] If Part B built: `go build ./...` + `go test ./...` pass; endpoint returns members for a `collectionId`
- [ ] `/Users/satchmo/code/prompts/plans/ordfs-collections/README.md` status row updated

## STOP conditions

- The live round-trip shows 0-sat bitcom-`B` outputs are NOT served by outpoint on the deployed host despite the code path existing — STOP and report (this changes plan 001/004's leaf strategy toward inscription-envelope leaves or the by-txid path).
- Part C reveals the SDK plan (001) intends raw OP_RETURN (non-bitcom-`B`) leaves — STOP; either the SDK changes to bitcom-`B` or a `parseOutput` branch is a NEW plan.

## Maintenance notes

- Reviewer: the config finding is the real deploy risk — make sure it lands as an ops action item even if no code changes.
- If Part B is built, keep it read-only and MAP-index-backed; do not introduce a second source of truth for collection membership.
