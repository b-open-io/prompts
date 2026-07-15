# Plan 001: 1sat-sdk — finalize OrdFS directory entry API + add a `ref` content path to `mintCollectionItem`

> **Target repo**: `~/code/1sat-sdk` (github `b-open-io/1sat-sdk`).
> **Base branch**: `feat/ordfs-directory-writing` (this is PR #13). Do NOT start from `master` — the ordfs builder primitives only exist on this branch.
> **Executor instructions**: Follow step by step. Run every verification command and confirm the expected result before the next step. Honor STOP conditions — do not improvise. The content-reference design is complete; the documented AIP `[-1]` mismatch is an explicit reconciliation gate before implementation.
>
> **Drift check (run first)**: `git -C ~/code/1sat-sdk fetch origin && git -C ~/code/1sat-sdk diff --stat origin/feat/ordfs-directory-writing -- packages/actions/src/ordfs packages/actions/src/collections packages/actions/src/tokens packages/actions/src/signing packages/types/src/index.ts`. If the files below changed since this plan was written, compare the "Current state" excerpts against live code before proceeding; on mismatch treat as a STOP condition.

## Status

- **Status**: TODO — implementation requires explicit plan approval
- **Priority**: P1
- **Effort**: M
- **Risk**: MED (public SDK API surface; existing on-chain collections must remain valid)
- **Depends on**: none (foundational — plans 002/004 depend on this)
- **Category**: direction / migration
- **Planned at**: 1sat-sdk PR branch `feat/ordfs-directory-writing`; master ref `0903afa`, 2026-07-15

## Why this matters

A large collection mint (e.g. 10,000 items) or a mint-on-purchase flow currently re-inscribes the same image bytes for every item. That is wasteful and, at scale, prohibitively expensive. PR #13 added ord-fs directory-writing primitives so content can be **referenced** by outpoint instead of duplicated. This plan finalizes that PR's entry API (per the maintainers' discussion) and extends the `collectionItem` mint so an item's content can be a **reference** to shared-or-unique content — inscribe one image, point every item at it. The hard constraint: the existing MAP `collection`/`collectionItem` data shape must not change, so existing indexers/DBs/UIs treat a referenced-content item identically to a classic one.

## Current state

- `packages/actions/src/ordfs/` (on branch `feat/ordfs-directory-writing`) — the PR #13 primitives:
  - `manifest.ts` — `buildOrdfsDirManifest(files)`: turns paths into the ord-fs tree (a manifest per directory level; parent references child dir by vout).
  - `outputs.ts` — `buildOrdFsDirOutputs(files, opts)`: builds the on-chain outputs for the tree.
  - `index.ts` — `inscribeOrdfsDir({ files, map, sign })` action.
  - Compiled `dist/ordfs/*.js` exists; treat `src/ordfs/*.ts` as source of truth.
- `packages/actions/src/collections/index.ts` — collection + collectionItem mint. Key facts (read the file to confirm line numbers before editing; they may have shifted):
  - `buildCollectionItemMap(...)` (~line 143): emits MAP `{ app, type:"ord", name, subType:"collectionItem", subTypeData: JSON.stringify({ collectionId, mintNumber?, rank?, traits?, attachments? }) }`. The shared type also supports `rarityLabel`, but the action currently omits it.
  - `mintCollectionItem` (~line 369): an `Action` whose input requires `base64Content: string` (~line 41/69/169/255) — the item image is embedded as bytes. There is **no** way to point at existing content.
  - `CollectionItemSubTypeData` type comes from `@1sat/types` (imported ~line 18). Its current `rarityLabel?: RarityLabels` disagrees with the published collection-item spec, which defines one string label; reconcile that type as part of this plan before exposing the field.
- **The API decision already reached on PR #13** (encode this — do not re-litigate): signing protocol is **implied by output type**, not a caller choice — a signed 1-sat ordinal uses SIGMA, a signed 0-sat B output uses AIP. So the entry API carries only `sign?: boolean`, never a protocol enum. Default: unsigned B leaves; root ordinal signed.
- **The item-form decision (re-run and settled 2026-07-15 — encode this, do not re-litigate):** two first-class citizens, on the principle that a self-describing "resolve me" content-type beats a lying one. For a distinct NFT item this SDK PRODUCES an **`ord-fs/json` directory** — for a single image use a `.` default-entry (`{ ".": "<imageOutpoint>" }`), for multi-leaf items add the named leaves. For a fungible/tradeable member it produces a **BSV-21 token member** (Step 5). It NEVER produces `text/uri-list` (the resolver accepts it read-only, plan 003) and **`ref=ordfs` is DROPPED** — the unanimous bench found it fails unsafe (declares `image/png` over a pointer body → naive/direct-tx readers render corruption) and is a second steering channel that can disagree with the content-type. Do not add a `ref=ordfs` producer.
- Repo conventions: TypeScript, `bun` monorepo (`packages/*`), Biome for lint/format, actions follow the `Action<Input, Output>` pattern (see any existing action in `packages/actions/src/` such as `inscriptions/index.ts` for the shape — match its input-schema + `execute` structure).

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Install | `bun install` (in repo root) | exit 0 |
| Build | `bun run --filter '*' build` | exit 0 |
| Test | `bun test` | all pass |
| Lint | `biome check .` | exit 0 |
| Typecheck | `bun run --filter '@1sat/actions' build` (tsc runs in build) | exit 0, no TS errors |

(Verified from `package.json` scripts at recon.)

## Scope

**In scope:**
- `packages/actions/src/ordfs/outputs.ts` — finalize the `OrdfsDirEntry` shape + `buildOrdFsDirOutputs` options.
- `packages/actions/src/ordfs/index.ts` — keep `inscribeOrdfsDir`'s simple `files` path; expose the richer entry shape.
- `packages/actions/src/collections/index.ts` — add an optional `ref` content path to `mintCollectionItem` (and the item builder), and expose the already-specified optional string `rarityLabel`; otherwise preserve the MAP shape. Keep `name` required and `app` defaulted exactly as today.
- `packages/types/src/index.ts` — correct `CollectionItemSubTypeData.rarityLabel` from the collection-level `RarityLabels` record to the spec's item-level `string`, with a type-level regression test or build fixture.
- `packages/actions/src/tokens/index.ts` — add an optional `collectionItem` path to `deployBsv21Mint` / `deployBsv21Auth` so a token deploy can carry standard `collectionItem` MAP + AIP after its inscription envelope (the BSV-21-token-as-collectionItem seam). Grounded: the template options expose `parent`/`scriptSuffix` (`templates/src/bsv21/bsv21.ts`), while `BSV21.lock(lockingScript)` uses its argument as the suffix, so the action must compose P2PKH + MAP before calling `lock`, then append AIP to that complete script. A shipped precedent combines P2PKH + non-image inscription + MAP + AIP in one output (`registry/package-tx.ts:53-243`). The deploy actions today build a single output with NO MAP/AIP path (`tokens/index.ts:1182-1187`, `1309-1311`) — wire it in; do not change the `bsv-20` JSON (membership lives in MAP only).
- **Fix the pre-existing signature gap — with SIGMA, not AIP:** `mintCollection`/`mintCollectionItem` apply no authorship signature at all, though the spec requires collection/item authorship signing (`collections.md`, `collectionitem-subtype.md`). Use **SIGMA** (the SIGMA protocol prefix commits to a specific transaction input, so the signature is replay-resistant — it cannot be lifted onto another item/tx, which is what makes membership forgery-resistant). This matches the 1-sat-ordinal convention (line 34). Apply SIGMA authorship to the collection root and all items — including token-deploy members — using the same resolved identity so the signer matches the root and membership is provable. Check what SIGMA signing primitive the SDK exposes (search `packages/actions/src` for SIGMA/sigma); if only an AIP helper exists, adding the SIGMA path is part of this plan. Legacy AIP remains accepted on read (the stack emits `signer:` for both), but new mints sign with SIGMA.
- Corresponding `*.test.ts` in `packages/actions/src/ordfs/`, `packages/actions/src/collections/`, and `packages/actions/src/tokens/` (create/extend).

**Out of scope (do NOT touch):**
- The MAP metadata shape in `buildCollectionItemMap` / `buildCollectionMap` apart from exposing the already-specified optional `rarityLabel`; existing inputs must retain byte-identical `subType`, `subTypeData`, and JSON encoding. Indexers depend on it.
- Changing the collection root's content or MAP shape — `mintCollection` stays a classic `image/*` MAP `subType:collection` ordinal; only its missing compliant AIP signature is added.
- Anything in `packages/client`; template/verifier changes are allowed only when required by the explicit AIP reconciliation gate.

## Steps

### Step 1: Finalize `OrdfsDirEntry` (Option A, per PR #13 decision)

In `packages/actions/src/ordfs/outputs.ts`, make the per-entry type:

```ts
export interface OrdfsDirEntry {
  path: string;
  // new inscription content:
  content?: Uint8Array;
  contentType?: string;
  // OR a pointer to existing content (produces NO new output):
  ref?: string;              // 'txid_0' | 'txid_0:-1' | '_2'
  // override default output type (default: root -> ordinal(1 sat), leaves -> B(0 sat)):
  as?: 'ordinal' | 'B';
}
```

`buildOrdFsDirOutputs(entries, opts)` options collapse to (drop any `rootSign`/`leafSign` protocol enums that exist):

```ts
interface BuildOrdFsDirOptions {
  locking: /* existing locking-template type already used in this file */;
  rootMap?: Record<string, string>;   // MAP on the root ordinal
  sign?: boolean;                       // sign outputs? protocol is implied by output type
}
```

Validation an entry must satisfy (throw on violation): exactly one of (`content`+`contentType`) or `ref` is set; `ref` matching `^(_\d+|[0-9a-fA-F]{64}(_\d+)?(:-?\d+)?)$`.

**Verify**: `bun test packages/actions/src/ordfs` → passes (after Step 4 adds the test). Interim: `bun run --filter '@1sat/actions' build` → exit 0.

### Step 2: Add a `ref` content path to `mintCollectionItem`

In `packages/actions/src/collections/index.ts`, extend the `mintCollectionItem` input so content is EITHER `base64Content` (existing) OR `ref` (new):

- Input: add optional `ref?: string` (same format as Step 1) and an optional `refContentType?: string` (the source's real MIME, e.g. `image/png`; required with `ref`). Require exactly one of `base64Content` | `ref`.
- When `ref` is set, the item's inscription is an **`ord-fs/json` directory** built via the Step-1 `OrdfsDirEntry[]` API. For a single shared/unique image, emit a one-entry directory using the `.` default-entry key (`{ ".": "<ref>" }`, where `<ref>` is a relative `_N` or an absolute `txid_0` / `txid_0:-1`), resolved in place by the OrdFS default-entry behavior (plan 003 Part F). For a multi-leaf item, add the named leaves alongside `.`. Do NOT embed image bytes, do NOT emit `text/uri-list`, and do NOT emit a `ref=ordfs` pointer (dropped — the unanimous bench found it fails unsafe).
- The MAP envelope is produced by `buildCollectionItemMap` — `subType:collectionItem` + `subTypeData` (collectionId, mintNumber, rank, rarityLabel, traits, attachments). Correct the shared type and add the currently omitted optional string `rarityLabel`, but otherwise keep its serialized shape unchanged. The item remains a 1-sat ordinal; add the missing spec-compliant AIP signature described in scope.

**The invariant to preserve:** an item minted with `ref` must produce the SAME MAP output (same `subType`/`subTypeData` bytes) as one minted with `base64Content` — only the inscription *content* differs (an `ord-fs/json` directory vs image bytes).

**Verify**: `bun run --filter '@1sat/actions' build` → exit 0.

### Step 3: Keep the simple path intact

`inscribeOrdfsDir({ files, map, sign })` in `packages/actions/src/ordfs/index.ts` must keep working for the common base64 case (do not break existing callers/tests). The richer `OrdfsDirEntry[]` shape lives in `buildOrdFsDirOutputs`; the action may grow `ref`/`as` later but this plan does not require the action to expose them.

**Verify**: `bun test packages/actions/src/ordfs` → existing tests still pass.

### Step 4: Tests

- `packages/actions/src/ordfs/outputs.test.ts` (create or extend): entry validation (content xor ref; bad ref rejected); an entry with `ref` produces no new content output; `as` override changes 1-sat vs 0-sat.
- `packages/actions/src/collections/collections.test.ts` (find the existing collection test; extend it): mint an item with `ref` and assert (a) the MAP `subType`/`subTypeData` bytes equal those of a `base64Content` item with identical metadata, (b) the inscription content-type is `ord-fs/json` and the body is a directory whose `.` entry is the pointer — NOT `text/uri-list`, NOT a `ref=ordfs` param, and (c) collection root and item AIP signatures use the agreed whole-output form, validate, and have the same signer. Model the assertions on the existing collection test in this file.

**Verify**: `bun test` → all pass including the new cases.

### Step 5: BSV-21-token-as-collectionItem deploy path

In `packages/actions/src/tokens/index.ts`, add an optional `collectionItem?: { collectionId: string; name: string; app?: string; traits?: ...; rarityLabel?: string }` input to `deployBsv21Mint` and `deployBsv21Auth`; default `app` to `1sat-wallet`, matching `mintCollectionItem`. Require `collectionId` here to be an absolute `<txid>_<vout>` outpoint (a token deploy cannot use a same-transaction `_N` collection reference). When set, compose P2PKH + a `collectionItem` MAP envelope (`subType:collectionItem`, `subTypeData` = the given fields; OMIT `mintNumber`/`rank` — they are meaningless for a fungible member), build the BSV-21 inscription with that suffix and the decoded collection outpoint as `parent`, then append the agreed whole-output AIP signature. Reuse one MAP builder so required fields/defaults cannot drift. Do NOT add any collection field to the `bsv-20` JSON. Support both supply models unchanged: `deploy+mint` (fixed) and `deploy+auth` (mint-over-time; the auth UTXO holder mints supply later).

**The invariant:** the deploy output's `collectionItem` MAP protocol bytes (excluding the separate AIP protocol) must equal those a `mintCollectionItem` would produce for the same `collectionId`/metadata — a token member and an NFT member are indistinguishable at the MAP layer. Test it: decode both outputs and assert byte-equality of their MAP protocol payloads for identical `subTypeData`; separately assert that each AIP validates.

**Verify**: `bun test packages/actions/src/tokens` passes; the token-deploy member carries `application/bsv-20` content AND a `collectionItem` MAP+AIP suffix; `bun run --filter '@1sat/actions' build` → exit 0.

## Done criteria

- [ ] `bun run --filter '*' build` exits 0
- [ ] `bun test` exits 0; new ordfs + collectionItem-ref tests exist and pass
- [ ] `biome check .` exits 0
- [ ] A `ref`-minted collectionItem's MAP output is byte-identical to the `base64Content` equivalent (asserted by a test)
- [ ] `git -C ~/code/1sat-sdk status` shows only in-scope files changed
- [ ] `/Users/satchmo/code/prompts/plans/ordfs-collections/README.md` status row updated

## STOP conditions

- `buildCollectionItemMap` or `CollectionItemSubTypeData` would need to change to support `ref` — STOP; the whole point is zero MAP-shape change.
- The maintainers have not resolved the mismatch between documented ordinal AIP `[-1]` whole-output signing and the current Bitcom-only helper/verifier semantics — STOP; do not ship a second, falsely "spec-compliant" signature form.
- The ordfs builder on the branch differs materially from the "Current state" description (different function names/signatures) — STOP and report the actual shape.
- Existing collection or ordfs tests fail and the fix requires touching an out-of-scope file — STOP.
- You cannot produce a `ref` item whose MAP bytes match a `base64Content` item — STOP; this is the acceptance invariant, not negotiable.

## Maintenance notes

- Reviewer scrutiny: confirm the MAP-shape invariance test compares decoded MAP protocol bytes, and that the newly added AIP signatures validate for classic, referenced, and token-deploy members.
- Follow-up deferred: exposing `ref`/`as` on the `inscribeOrdfsDir` action surface (kept minimal here); a `mintCollection` variant whose root is itself an ord-fs directory (see plan README "root dual-role" open question) — deliberately out of scope until the maintainers decide.
- The produced `ord-fs/json` directory (and its `.` default-entry pointer forms) must stay compatible with the OrdFS resolver (plan 003 Parts D/F); if the resolver's accepted pointer forms or the `.` behavior change, revisit. The resolver ACCEPTS `text/uri-list` (interop) but this SDK never emits it, and `ref=ordfs` is not produced at all — keep those asymmetries intact.
