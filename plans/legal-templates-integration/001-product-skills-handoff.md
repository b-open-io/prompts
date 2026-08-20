# Plan 001: legal-templates vendoring — executor handoff (product-skills)

> **Target repo**: `b-open-io/product-skills` (Anthony's home: `agents/legal.md`, `skills/legal-compliance/`).
> **Tracking ticket**: https://github.com/b-open-io/product-skills/issues/2 — the ticket body is the
> full self-contained work spec; this doc records routing and constraints for whoever picks it up.
> **Executor instructions**: do Phase 1 (repair pass + vendoring) as one PR against product-skills;
> Phase 2 derivatives are separate PRs, one document each, in the priority order below. Read plan
> `000-anthony-review-and-integration-options.md` (same directory) before touching template text —
> every repair item traces to a specific finding in Anthony's review.

## Status

- **Status**: TICKETED — awaiting decision confirmation + executor pickup
- **Priority**: P2 (Phase 1 effort S/M; Phase 2 per-document)
- **Depends on**: decision on plan 000's A/B/C/D mix (recommendation: A + D now, C incrementally)
- **Owner**: Anthony (legal content) + Zack/prompt-engineer (skill wiring)

## Work summary

1. **Phase 1** — vendor repaired templates from General-Legal/legal-templates@`c7c947f` into
   `skills/legal-compliance/references/templates/` with provenance headers and a lock entry;
   update SKILL.md drafting flow to start-from-template + `<mark>`-resolution check; +0.0.1.
   Exclusions: MSA (repurposed on-prem deal doc — donor material only), HIPAA BAA (irrelevant).
2. **Phase 2** — derivative queue: (1) Sigma Identity DPA, (2) 1Sat marketplace ToU + privacy
   policy with on-chain-data disclosures, (3) hosted-API MSA, (4) AI-product terms.

Full checklists live in the ticket; keep the ticket as the single source of progress truth.

## Constraints and routing notes

- **pm-skills is unreachable** from remote sessions on this account (`list_repos` doesn't return
  it). `pm-toolkit:draft-nda` and `pm-toolkit:privacy-policy` therefore can't be wired from here.
  Recommended resolution: consolidate template custody in `product-skills:legal-compliance` and
  have pm-toolkit skills point at it; do that wiring from a local session or grant the repo.
- **Linear**: the Linear connector is installed at org level but its MCP tools do not load in
  remote (cloud) sessions, so ticketing landed on GitHub instead. If a Linear ticket is wanted,
  mirror issue product-skills#2 from a local session (Wags/project-manager handles Linear) and
  cross-link it on the issue.
- **product-skills IS attachable with push access** via `add_repo` from remote sessions — future
  sessions doing this work should attach it directly rather than leaving handoffs.
- CC0-1.0 upstream: no attribution obligations; provenance headers are self-imposed discipline.
- Every generated document keeps the first-draft-for-counsel framing (upstream ships no
  disclaimer at all — we add our own).
