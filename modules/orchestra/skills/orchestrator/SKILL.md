---
name: orchestrator
version: 0.0.9
description: Coordinate implementation workers, native specialists, and an optional independent advisor while the current session keeps planning, review, verification, and git ownership. Use for cross-model orchestration, worker-plus-advisor workflows, or staged multi-agent delivery.
---

# Orchestrator

Keep one current main session in control while other agents perform bounded
work. The main model is whatever the user selected; never infer, rename, or pin
it.

```text
current main session
├── native specialists: evidence, review, testing, domain expertise
├── implementation workers: bounded code volume
└── optional advisor: read-only opinion at a commitment boundary
```

## Compose, do not duplicate

- Load [Coordinator](../coordinator/SKILL.md) before implementation dispatch.
  Follow its progressive-loading section: read the shared dispatch contract,
  one current-host guide, and only the worker guides actually selected.
- Load [Advisor](../advisor/SKILL.md) only when an independent opinion reaches a
  real decision boundary.
- Load [Wave Coordinator](../wave-coordinator/SKILL.md) only when the fan-out
  exceeds available host slots or needs staged diversity.
- Match specialist tasks against
  `../deploy-agent-team/references/agent-roster.md`; use a generic agent only
  when no specialist fits.

Coordinator governs execution. Advisor governs consults. This entrypoint owns
their composition and does not repeat their host or CLI manuals.

## Main-seat responsibilities

The main owns task interpretation, decomposition, shared interfaces, acceptance
criteria, external-provider disclosure, reconciliation, adversarial diff
review, final verification, and every git operation. Workers and advisors may
return evidence; they do not inherit those decisions.

## Sequence

1. Orient in the main: inspect instructions, repository state, and the premise
   behind the task.
2. Select the smallest useful topology. Avoid an advisor or a fan-out when one
   bounded worker is enough.
3. Load only the selected Coordinator host and worker references. Preflight each
   lane and disclose external data sharing before use.
4. Gather specialist evidence with bounded, self-contained prompts. Require a
   complete report; an idle notification is not a deliverable.
5. At a genuine commitment boundary, package one narrow question for Advisor.
   Advice returns to the main and never becomes an edit instruction by itself.
6. Write worker specs in the main. Partition ownership or isolate worktrees,
   pin shared interfaces, name exact acceptance commands, and forbid unrelated
   files.
7. Dispatch independent work in parallel, then stop at a barrier before
   synthesis or git operations.
8. Review every diff, reconcile disagreements with direct evidence, re-run
   acceptance in the main environment, and ship from the main.

## Failure behavior

- A missing or unauthenticated lane is unavailable, not permission to silently
  implement or reroute.
- Infrastructure failures retain the same spec for retry or explicit reroute.
- Advisor disagreement must be explained and reconciled, not ignored.
- Two corrected worker-quality misses trigger Coordinator's escape hatch.
- Do not install CLIs, change global configuration, or increase agent depth
  without user authorization.

## Final report

Report the topology actually used, external providers consulted, work returned
by each lane, files changed, verification results, unresolved disagreements,
and unavailable lanes. Never imply an agent or advisor ran when it did not.
