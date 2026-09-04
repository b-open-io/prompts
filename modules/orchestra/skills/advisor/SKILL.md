---
name: advisor
version: 0.0.7
description: Get an independent read-only second opinion at a real commitment boundary. Use when the user asks for an advisor, second opinion, Fable, Codex advice, OpenCode advice, or a stronger/context-clean review before a consequential decision.
---

# Advisor

Borrow independent judgment without transferring execution ownership. The
advisor answers one decision question; the main retains the plan, evidence,
implementation, verification, and final choice.

Use [Coordinator](../coordinator/SKILL.md) when another model should implement.
Use [Orchestrator](../orchestrator/SKILL.md) when one plan combines advisors,
specialists, and implementation workers.

## Load only the selected channel

Read [the channel guide](references/channels.md), then load only the applicable
current-host or advisor section. For an external CLI consult, also apply the
provider, disclosure, context-minimization, log, and evidence rules in
[the dispatch contract](../coordinator/references/dispatch-contract.md).

Advice remains read-only. A prompt saying “do not edit” is not a permission
boundary; configure the selected agent or CLI so edits and shell execution are
denied where supported.

## Consult at a decision boundary

Useful boundaries include:

- architecture before expensive implementation;
- a change of approach after repeated failure;
- security, compatibility, or migration decisions with irreversible effects;
- a final adversarial review before shipping a high-risk change; and
- a disputed conclusion where a context-clean perspective adds information.

Skip the consult when the answer is mechanically verifiable, the change is
small and reversible, or the consult would merely restate existing evidence.

## Package one self-contained question

Provide:

1. the exact decision to make;
2. relevant evidence, code locations, and constraints;
3. options already considered and why they are uncertain;
4. the required verdict shape; and
5. explicit permission boundaries.

Require the response to contain:

```text
VERDICT: <one sentence>
CONFIDENCE: <high|medium|low> — <why>
RISKS: <ranked list>
EVIDENCE: <specific facts or file references>
RECOMMENDED NEXT STEP: <one bounded action>
UNKNOWN: <what could change the verdict>
```

For a pinned model or named advisor, require it to identify itself. Treat a
silent downgrade or missing child marker as no consult.

## Reconcile, do not obey

Compare the verdict with direct evidence and current constraints. Explain any
disagreement. Advice never becomes an edit instruction by itself, and the
advisor never commits, pushes, merges, or approves on the user's behalf.

## Final report

State which channel and actual provider/model ran, what context was shared,
whether disclosure/approval was satisfied, the verdict, and how the main used
or rejected it. Never imply an advisor ran when only a channel was configured.
