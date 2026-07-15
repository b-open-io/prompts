# Plan 004: MintFlow — reference-based item minting + a "Mint on Buy" deployment mode

> **Target repo**: `~/code/mintflow` (github `b-open-io/mintflow`), Next.js + Bun + Biome.
> **Base branch**: decide with the operator — mint work is currently on `feat/custodial-mint-foundation`; the reference-item change may belong on `master` or that branch. Ask once, then stay on the chosen branch.
> **Executor instructions**: This plan has two independent parts (A: reference items; B: Mint-on-Buy). Part A depends on plan 001 (the SDK `ref` path) being published. Part B is a larger feature — build only after Part A lands and the operator confirms.
>
> **Drift check (run first)**: `git -C ~/code/mintflow fetch origin && git -C ~/code/mintflow diff --stat origin/master -- components/mint hooks/use-wallet-actions.ts`.

## Status

- **Status**: TODO — Part A and Part B each require explicit approval
- **Priority**: P2 (Part A) / P3 (Part B)
- **Effort**: M (A) / L (B)
- **Risk**: MED (real minting / real funds)
- **Depends on**: plan 001 (SDK `ref` content path) for Part A
- **Category**: tech-debt (A) / direction (B)
- **Planned at**: mintflow `597f36f`, 2026-07-15

## Why this matters

MintFlow's item minting currently dedups the image via a **non-standard `x-ordfs=alias`** trick that no OrdFS server in these repos resolves (`components/mint/steps/step-tier-items.tsx` builds 2-byte `_0` aliases with content-type `…; x-ordfs=alias`). It works only if the production resolver happens to support that convention — unproven. Part A replaces it with the spec-clean `text/uri-list` reference path (plan 001 / plan 002). Part B adds a **Mint on Buy** deployment mode so items are minted one-per-purchase (dynamic supply, no pre-minted inventory) instead of pre-minting the whole declared quantity.

## Current state

- `hooks/use-wallet-actions.ts`:
  - `createBatchInscription(wallet, items)` (~line 103) — builds N outputs, each `{ lockingScript, satoshis:1, basket: ORDINALS_BASKET, tags, customInstructions }` and calls `createTrackedAction`. This is the batch item path.
  - `inscribe(...)` (~line 222) — single inscription via `@1sat/actions inscribeAction.execute` (used for the collection). Baskets correctly.
- `components/mint/steps/step-tier-items.tsx` (~lines 186–217) — the current alias trick: `aliasMimeType = \`${mimeType}; x-ordfs=alias\``; `aliasBase64Data = btoa("_0")`; output 0 gets the real image, outputs 1+ get the alias. **This is what Part A replaces.**
- `components/mint/steps/step-review.tsx` — the mint wizard's final step; deployment strategy is `hostingOption: "self" | "hosted"` ("Mint to Wallet" vs "$10 Hosted Page"). Part B adds a third option.
- Conventions: Bun, Biome (`biome check`), Next 16 (Turbopack — dev server binds a port; sandboxed builds can't). Typecheck via `bunx tsc --noEmit`.

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bunx tsc --noEmit` | exit 0 |
| Lint | `biome check` | exit 0 |
| Build | `bun run build` (`next build`) | exit 0 (run OUTSIDE a sandbox — Turbopack binds a port) |

## Scope

**Part A — reference items (in scope):**
- `components/mint/steps/step-tier-items.tsx` — remove the `x-ordfs=alias` construction; instead, inscribe the tier image ONCE (as today, output 0), then mint each item as a `text/uri-list` inscription whose content references the image outpoint. Prefer the SDK's new `mintCollectionItem({ ref })` (plan 001) if wired; otherwise build the `text/uri-list` output inline (`content-type: text/uri-list`, body `/content/<imageOutpoint>` — use the relative `_0` form only within the same tx, else the absolute `txid_0`).
- `hooks/use-wallet-actions.ts` — if a new helper is needed, add a reference-item builder beside `createBatchInscription`; keep the `basket: ORDINALS_BASKET` tagging (so Yours wallet tracks the items).
- Keep the collectionItem MAP metadata unchanged.

**Part B — Mint on Buy (in scope, separate change):**
- `components/mint/steps/step-review.tsx` + supporting lib — add `hostingOption: "mint-on-buy"`. Persist the collection config; on a purchase event, mint ONE item (`text/uri-list` reference to the shared image) to the buyer. Requires a server route + a persistence store for the config and per-sale mint. Treat the declared `totalQuantity` as a CAP, not a pre-mint count.

**Out of scope:**
- The collection root mint (unchanged; classic image/* MAP collection).
- Stripe/custodial hosted path internals beyond adding the third option.
- Any change to the collectionItem MAP shape.

## Steps (Part A)

1. Replace the alias construction in `step-tier-items.tsx` with a reference build: image inscribed once at output 0; items reference it. **Verify**: `bunx tsc --noEmit` exit 0; inspect the built outputs in a unit/manual check — item outputs carry `text/uri-list` content and the shared image is inscribed once.
2. Confirm items still tag `basket: ORDINALS_BASKET` + `customInstructions` so the wallet internalizes them. **Verify**: `grep -n "ORDINALS_BASKET" hooks/use-wallet-actions.ts` present on the item path.
3. Remove the now-dead `x-ordfs=alias` code. **Verify**: `grep -rn "x-ordfs=alias" .` → no matches.

## Steps (Part B) — only after Part A + operator confirmation

1. Add `"mint-on-buy"` to the `hostingOption` union + the Review UI card.
2. Persist collection config (DB row) keyed by collectionId; add a mint-on-purchase server route that mints one referenced item to the buyer, respecting the `totalQuantity` cap.
3. Idempotency: one purchase → exactly one item (guard against double-mint).

## Test plan

- Part A: a unit test (or a scripted dry-run) asserting the batch produces one image inscription + N `text/uri-list` reference outputs, all basketed; and no `x-ordfs=alias` string remains.
- Part B: a test that a purchase mints exactly one item and a second identical purchase event does not double-mint; cap enforcement at `totalQuantity`.

## Done criteria

- [ ] `bunx tsc --noEmit` exit 0, `biome check` exit 0, `bun run build` exit 0 (outside sandbox)
- [ ] Part A: `grep -rn "x-ordfs=alias" .` → no matches; items mint as `text/uri-list` references; image inscribed once
- [ ] Items remain tagged `basket: ORDINALS_BASKET`
- [ ] (Part B, if built) mint-on-buy option present; one-purchase-one-item + cap enforced, with an idempotency test
- [ ] `/Users/satchmo/code/prompts/plans/ordfs-collections/README.md` status row updated

## STOP conditions

- Plan 003's live check found the resolver does NOT serve referenced/`text/uri-list` content on the production host — STOP Part A; the reference approach is blocked until the backend is fixed.
- The SDK `mintCollectionItem({ ref })` (plan 001) is not yet published AND building the `text/uri-list` output inline would require changing the MAP shape — STOP.
- Part B: minting-on-purchase would require holding the user's key server-side in a way the existing custodial path doesn't already cover — STOP and escalate (key custody is a security decision, not an implementation detail).

## Maintenance notes

- Reviewer: verify the wallet-basket tagging survives the refactor (this is what makes minted items visible in Yours) and that the shared image is inscribed exactly once per batch.
- Part B key custody: reuse the existing hosted/custodial signer (`SIGMA_MEMBER_PRIVATE_KEY` / Droplit path) rather than introducing a new key-handling path.
- If the collection root later becomes an ord-fs directory itself (root dual-role, see plan README), the item references may shift from absolute image outpoint to a path within the root tree — revisit then.
