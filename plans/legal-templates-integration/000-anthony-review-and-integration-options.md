# Plan 000: General-Legal/legal-templates — Anthony's review and integration options

> **Trigger**: https://x.com/rwalk_xyz/status/2090166976056299990 (Ryan Walker, 2026-08-19) announcing
> https://github.com/General-Legal/legal-templates — a free, CC0-1.0-licensed library of
> attorney-drafted legal templates for startups (MSA, NDAs, privacy policies, DPAs, HIPAA BAA,
> advisor agreement, CA offer letter, cookie notice, terms of use), published by General Legal
> (general.legal).
>
> **Ask**: have Anthony (product-skills:legal) review the library and decide how we incorporate it
> into our legal-document pipeline; enumerate integration options for discussion.

## Status

- **Status**: REVIEW COMPLETE — integration options drafted, awaiting decision
- **Priority**: P2
- **Effort**: S (Option A) → M (Options B/C)
- **Risk**: LOW (CC0 removes licensing risk; residual risk is content staleness and unreviewed upstream drift)
- **Category**: skills / content sourcing / legal ops
- **Owner**: Anthony (legal) for content; prompt-engineer (Zack) for skill wiring
- **Target repos**: `product-skills` (legal-compliance skill, Anthony's roster), `pm-skills` (pm-toolkit:draft-nda, pm-toolkit:privacy-policy). This repo (`prompts`) only hosts the plan and, if chosen, skills-lock provenance conventions.

## What the library is

Twelve templates, each shipped as:

- a per-template `README.md` (overview + key provisions),
- the full template in **LLM-optimized markdown** with `<mark>` tags marking every field that must be customized,
- the original `.docx` source, plus Python scripts for download/format conversion.

License is **CC0 1.0 Universal** — free to use, modify, and redistribute for any purpose, no
attribution required. That makes vendoring, adaptation, and even on-chain publication legally
clean; the only obligations are the ones we impose on ourselves (provenance, review discipline).

Coverage: Advisor Agreement · HIPAA BAA · Cookie Notice · DPA (US + Global) · Employee Offer
Letter (California exempt) · MSA · NDA (mutual + one-way) · Privacy Policy (US-only +
GDPR-enhanced) · Terms of Use.

## Anthony's review

<!-- ANTHONY_REVIEW -->

## Why this matters to us

Anthony's existing pipeline (`bo-legal-doc-pipeline` in the setup playground catalog:
`pm-toolkit:draft-nda`, `pm-toolkit:privacy-policy`, `product-skills:legal-compliance`) currently
drafts documents **from model memory**. A vetted, attorney-drafted, CC0 base text upgrades every
one of those drafts from "plausible" to "grounded in a reviewed template", at zero licensing cost.
The library also overlaps SOC 2/compliance work (DPA, BAA, cookie notice feed
`product-skills:soc2-*` evidence and vendor-paperwork flows).

## Integration options

### Option A — Pin + vendor as skill references (recommended)

Vendor the reviewed markdown templates (not the .docx) into the owning skills as `references/`,
pinned to a specific upstream commit SHA:

- `pm-toolkit:draft-nda` → mutual + one-way NDA templates as canonical base text
- `pm-toolkit:privacy-policy` → US + GDPR privacy policies, cookie notice
- `product-skills:legal-compliance` → MSA, DPA (US/Global), BAA, ToU, advisor agreement, offer letter

Record provenance per vendored template in a lock entry (same shape as this repo's
`skills-lock.json`: `source`, `ref` (commit SHA), `computedHash`). SKILL.md instructions change
from "draft a privacy policy" to "start from `references/privacy-policy-gdpr.md`, resolve every
`<mark>` field, then apply the b-open adaptation checklist".

- **Pros**: works offline/deterministically; upstream edits can never silently change our
  indemnification or liability language (a real supply-chain concern for legal text); hash makes
  drift auditable; CC0 means no attribution burden.
- **Cons**: staleness is now ours to manage — needs a re-review cadence (see below).

### Option B — Live-reference the upstream repo at a pinned SHA

Skills fetch templates from `raw.githubusercontent.com/General-Legal/legal-templates/<SHA>/...`
at use time; nothing vendored.

- **Pros**: no copies to maintain; smallest diff.
- **Cons**: breaks offline/sandboxed sessions; adds a network dependency to legal drafting; the
  CLAUDE.md rule "never copy external docs into skills folders — install the plugin that owns
  them" does not really apply here (this is not fast-moving platform API documentation, and no
  plugin owns it — it is CC0 source *content*, closer to the json-render/ext-apps vendoring we
  already do via skills-lock). Pin to a SHA regardless; never fetch `main`.

### Option C — Adapt-and-own: b-open derivative template set

Use the library as raw material and publish our own derivative set with crypto/AI riders
(on-chain-data privacy disclosures, token/airdrop terms, AI-product disclaimers, marketplace ToU
for 1Sat, DPA posture for Sigma Identity as an identity provider). Optionally publish the
reviewed derivatives via ClawNet attestation so Anthony's review is cryptographically vouched
on-chain — a natural showcase of our own trust layer applied to legal content.

- **Pros**: closes the gaps the upstream library will never cover (it is generic-startup,
  US-centric); attestation gives every derivative a review provenance story.
- **Cons**: the real drafting work lands on us; do this per-document as need arises, on top of
  Option A, not instead of it.

### Option D — Adopt their packaging conventions ("lessons learned")

Independent of the content, the repo's *format* is worth copying into our own
document-producing skills:

1. **LLM-optimized markdown as the canonical format**, with `<mark>` tags on every
   must-customize field — machine-checkable: a skill can grep for unresolved `<mark>` before
   declaring a draft done.
2. **Per-template README** (overview + key provisions + which side it favors) separate from the
   template body — progressive disclosure, exactly our SKILL.md → references/ pattern.
3. **.docx derived from markdown by script**, not hand-maintained in parallel — one source of
   truth; pairs with our existing `docx` skill for final output.

These apply to SOC 2 policy drafting, internal-comms templates, and any future contract skill,
whatever we decide on A–C.

## Recommendation

**A + D now, C incrementally.** Pin to the current upstream SHA, vendor the markdown into the
three owning skills with lock-entry provenance, add the `<mark>`-resolution check to their
SKILL.md flows, and adopt the packaging conventions for our own document skills. Build
b-open-specific derivatives (Option C) one document at a time as products need them, starting
with the 1Sat marketplace ToU and a Sigma Identity DPA. Skip Option B except as a stopgap.

**Re-review cadence**: upstream has ~4 commits — treat it as a one-shot drop, not a living
project. Anthony re-reviews vendored templates every 6 months or on any major privacy-law change
(new state acts, SCC/DPF developments), whichever comes first; bump the skill versions (+0.0.1)
on each re-review.

**Standard caveat**: every generated document remains a first draft for licensed counsel to
review before signing — the library's own positioning, and already how Anthony's pipeline is
framed in the catalog.

## Next steps (pending discussion)

- [ ] Decide A/B/C/D mix (recommendation above)
- [ ] Zack (prompt-engineer): wire chosen templates into `pm-toolkit:draft-nda`,
      `pm-toolkit:privacy-policy`, `product-skills:legal-compliance` in their owning repos
- [ ] Anthony: produce the b-open adaptation checklist (per-template deltas for crypto/AI context)
- [ ] Anthony: first derivative — 1Sat marketplace ToU; second — Sigma Identity DPA
- [ ] Optional: ClawNet-publish reviewed derivatives with Anthony's attestation
