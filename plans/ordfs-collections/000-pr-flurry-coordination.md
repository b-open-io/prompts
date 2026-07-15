# Plan 000: PR flurry — cross-repo coordination (codex workers, coordinator pattern)

> **Role**: This is the ORCHESTRATION plan for landing the full ordfs-collections
> solution as a coordinated set of PRs across repos. It is not itself an executor
> plan — it sequences plans 001–005 into real PRs and defines how they are
> dispatched. Run it from a main (Claude Code or Codex) seat using
> `Skill(bopen-tools:coordinator)`.
>
> **Economics**: the main seat owns specs, review, and git. Implementation volume
> goes to **codex workers** (disjoint file ownership or worktree isolation), NOT
> to a premium advisor. Reserve the Fable/advisor lane for at most one commitment
> boundary (the signing-semantics reconciliation) — do not spend advisor tokens
> on routine implementation.

## Pull latest FIRST — the upstream already moved

Before writing any PR, `git fetch` + reconcile each target repo. The maintainer
(shruggr / David Case) has already landed part of our round-2 conclusion, so
some of this is verify-not-build. Confirmed on `1sat-stack` origin/master
(2026-07-15):

- `6870501 ordfs: resolve content refs (ref=ordfs) on /content/` — ref=ordfs was
  implemented, then…
- `3e89a97 ordfs: remove content-ref (ref=ordfs); keep directory defaults` —
  **ref=ordfs removed** (deleted `pkg/ordfs/ref.go`, −90 lines) and the **`.`
  default-entry** added: `dirDefaultDot="."` takes precedence over
  `index.html` (`pickDefaultDirectoryKey`, `routes.go:146-153`), served in place,
  with an informative "directory has no default entry" error. This is exactly
  plan 003 Part F — **already done upstream.**

So the item form (drop ref=ordfs, adopt `.`) matches the maintainer's own call.
Re-verify each repo's HEAD at dispatch time; the deltas below are as of
2026-07-15 and will drift.

## PR set (target repos, current-state delta, dispatch)

| # | Repo | PR content | Current-state delta (verify at dispatch) | Plan |
|---|------|------------|-------------------------------------------|------|
| A | `b-open-io/1sat-sdk` | `mintCollectionItem` produces `ord-fs/json` (`.` entry) + `deployBsv21{Mint,Auth}` `collectionItem` path + **SIGMA** authorship on collection/items | ref=ordfs producer NOT wanted (dropped); no SIGMA authorship on collection actions today | 001 |
| B | `b-open-io/1sat-stack` | Emit `map:collectionId` + `map:subType:collectionItem` events; `tokenId → collection` resolver (close the bsv21 MAP-drop); authoritative member listing (SIGMA/AIP signer-match) | `.` default-entry + ref=ordfs removal ALREADY MERGED (`3e89a97`) — skip. Parse still emits only `map:type:` (`bitcom.go:75`); `signer:` events already exist (`bitcom.go:104,150`); bsv21 lookup still token-only (`lookup/bsv21.go:635-650`) | 003 (Parts B/E; D/F mostly done upstream) |
| C | `BitcoinSchema/1sat-ordinals` | Docs: reference-shared-content section (lead with `ord-fs/json` + `.`), fungible BSV-21 members subsection, and **SIGMA** authorship in `signing.md`/`collections.md`/`collectionitem-subtype.md` | docs don't mention `.` default-entry, token members, or SIGMA-preferred authorship | 002 |
| D | `b-open-io/mintflow` | Replace `x-ordfs=alias` with `ord-fs/json` `.` items; Mint-on-Buy mode | still uses the alias trick | 004 |
| E | `b-open-io/bsv-skills` + `1sat-sdk` skills | Update OrdFS + mintflow skills to the shipped pattern | after A–D land | 005 |

## Dependency & sequencing

1. **C (docs) and B (indexer) can start immediately** — independent of the SDK.
   The `map:collectionId` emission (B) is the real gate: no collection is
   enumerable until it lands, token or NFT.
2. **A (SDK) gates D (mintflow)** — mintflow prefers the SDK's
   `mintCollectionItem({ ref })`. A also carries the SIGMA authorship work.
3. **The signing reconciliation is the one commitment boundary.** Before A ships
   SIGMA authorship, confirm the SDK exposes a SIGMA primitive (search
   `packages/actions/src` for sigma/SIGMA) and that the stack's signer-match
   validation accepts it. This is the ONE place an advisor consult is justified;
   everything else is codex-worker implementation reviewed by the main seat.
4. **E (skills) is last** — document what shipped, not the plan.

## Coordinator dispatch protocol (per PR)

For each PR, the main seat:

1. Writes a `SPEC-<repo>-<slug>.md` at the target repo root (untracked): objective,
   files in/out of scope, interfaces pinned verbatim, the exact acceptance command
   (`bun test` / `go test ./...` / markdown render), and "what NOT to touch". The
   relevant plan (001–004) IS most of the spec — reference it.
2. Dispatches a **codex worker** with `--sandbox workspace-write`, the environment
   clause, and the structured-final-report demand (see `Skill(bopen-tools:coordinator)`).
   Disjoint repos → no collision; within a repo, partition by file or use a worktree.
3. Reviews the diff adversarially (build/tool config, no shims, scope), re-runs
   acceptance OUTSIDE the sandbox, then commits/pushes/opens the PR from the main
   seat. Workers never commit.

**External-data boundary:** a codex/grok dispatch sends repo content to the
vendor — disclose and get approval before the first dispatch per the coordinator
skill. Do not send secrets or unrelated proprietary content.

## Done criteria

- [ ] Each target repo fetched + drift-reconciled before its PR is written
- [ ] PR A: SDK produces `ord-fs/json` items + token-member deploys + SIGMA authorship; `bun test` green
- [ ] PR B: `map:collectionId` emitted; member listing returns NFT + token members; `tokenId→collection` resolves; `go test ./...` green — and does NOT duplicate the already-merged `.`/ref=ordfs-removal
- [ ] PR C: docs PR opened (BitcoinSchema/1sat-ordinals, `docs:` convention) with the reference section, BSV-21 members subsection, and SIGMA authorship
- [ ] PR D: mintflow drops `x-ordfs=alias` for `ord-fs/json` `.` items; adds Mint-on-Buy
- [ ] PR E: skills updated to the shipped pattern
- [ ] `_pr13-comment-draft.md` posted on PR #13 once C is open (fill in the docs PR URL)

## STOP conditions

- The signing reconciliation reveals the SDK has no SIGMA primitive AND adding one
  is larger than a bounded change — STOP; scope a dedicated SIGMA-signing PR before A.
- A repo's upstream has diverged so far that a plan's "current state" no longer
  matches — STOP, re-read, and update the plan before dispatching its worker.
