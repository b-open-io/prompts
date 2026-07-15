# Plan 005: Update the OrdFS / mintflow skills to reflect referenced-content collections (final step)

> **Target repos**: `~/code/bsv-skills` (the dedicated `ordfs` skill) and `~/code/1sat-sdk` (the `mintflow` skill). NOTE: the user referred to "ordfs skills in the prompts repo," but the actual OrdFS skill is `bsv-skills/skills/ordfs/SKILL.md`; the prompts repo (bopen-tools) has no dedicated ordfs skill. Confirm with a grep before editing.
> **Executor instructions**: This is the LAST step — run it only after plans 001–004 have landed, so the skills document what actually shipped, not the plan. Skills are Markdown (`SKILL.md`); "verification" is a currency/accuracy check, not a build.
>
> **Drift check (run first)**: `grep -rl "ordfs\|ord-fs\|reference" ~/code/bsv-skills/skills/ordfs ~/code/1sat-sdk/skills/mintflow`.

## Status

- **Status**: TODO — do not start until plans 001–004 have shipped
- **Priority**: P3 (final)
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans 001, 002, 003, 004 (skills must reflect shipped reality)
- **Category**: docs / dx
- **Planned at**: 2026-07-15

## Why this matters

Our skills are how agents learn to do this. Once referenced-content collections ship (plans 001–004), the OrdFS and mintflow skills must teach the correct, spec-clean pattern — reference one image, don't duplicate; collection MAP shape unchanged; the resolver caveats — so no future agent reintroduces the `x-ordfs=alias` trick or re-inscribes per item.

## Current state

- `~/code/bsv-skills/skills/ordfs/SKILL.md` — the OrdFS skill (has references under `references/` incl. `advanced-features.md`). Confirm it covers directories/references; extend for the collection pattern.
- `~/code/1sat-sdk/skills/mintflow/SKILL.md` — authored this session; already mentions the deep-link/proposal flow, the token-per-SKU model, image spec, and (lightly) reference inscriptions. Needs the finalized `mintCollectionItem({ ref })` + Mint-on-Buy once plan 001/004 land.
- Skill-authoring conventions: SKILL.md frontmatter (`name`, `description` with trigger phrases), lean body (~1.5–2k words), deep detail in `references/`. See `~/.claude/plugins/cache/b-open-io/*/skills/*/SKILL.md` for exemplars, or invoke `Skill(skill-creator:skill-creator)` / `Skill(plugin-dev:skill-development)`.

## Scope

**In scope:**
- `bsv-skills/skills/ordfs/SKILL.md` (+ `references/` if a detail file fits) — add a "Referencing shared content / collections" section mirroring the docs (plan 002): the two forms, unchanged collection/item MAP envelopes, shared content outputs, and the three resolver caveats (store scope; bitcom-`B` leaves; `:-1` is 1-sat-only). Cross-reference `docs.1satordinals.com` reference-inscriptions.
- `1sat-sdk/skills/mintflow/SKILL.md` — update the reference-inscription/collection section to point at the shipped `mintCollectionItem({ ref })` API and the Mint-on-Buy mode; remove any implication that the `x-ordfs=alias` trick is the way.

**Out of scope:**
- Any non-ordfs skill.
- Bumping plugin versions is required to publish (per each repo's shipping rules) — do that as part of landing, following the repo's own version/changelog convention; but do not conflate it with content edits.

## Steps

1. Confirm the skill set with `grep -rl "ordfs\|ord-fs" ~/code/bsv-skills/skills ~/code/1sat-sdk/skills`. **Verify**: the two files above are the targets (and no prompts-repo ordfs skill exists — if one does, add it to scope).
2. Update `bsv-skills/skills/ordfs/SKILL.md` with the collection/shared-content section. **Verify**: `grep -ci "shared content\|collection" SKILL.md` ≥ 1; description trigger phrases still accurate.
3. Update `1sat-sdk/skills/mintflow/SKILL.md` to reflect the shipped `ref` API + Mint-on-Buy; ensure no stale `x-ordfs=alias` guidance. **Verify**: `grep -c "x-ordfs=alias" SKILL.md` → 0.
4. Bump each plugin's version + changelog per that repo's convention and publish (per shipping rules). **Verify**: version bumped, pushed, and (for 1sat) `codex/claude plugin update` picks it up.

## Done criteria

- [ ] `bsv-skills` ordfs skill documents the referenced-content collection pattern + caveats
- [ ] mintflow skill points at the shipped `mintCollectionItem({ ref })` + Mint-on-Buy; no `x-ordfs=alias` guidance
- [ ] Each touched plugin version-bumped + published per its repo's rules
- [ ] `/Users/satchmo/code/prompts/plans/ordfs-collections/README.md` status row updated

## STOP conditions

- Plans 001/004 have NOT landed (the `ref` API / Mint-on-Buy don't exist yet) — STOP; documenting unshipped behavior is the exact failure this plan's ordering prevents.
- A prompts-repo ordfs skill is discovered that contradicts the bsv-skills one — STOP and reconcile which is canonical before editing.

## Maintenance notes

- Keep the skill's resolver caveats in sync with plan 003's verification finding (esp. if B-by-outpoint turned out unsupported in prod).
- Reviewer: confirm trigger phrases still match how agents will ask ("mint a collection", "reference an image on-chain", "don't duplicate the image").
