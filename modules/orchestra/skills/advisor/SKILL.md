---
name: advisor
version: 0.0.8
description: >-
  Get an independent read-only second opinion at a commitment boundary, before substantive work
  on a hard task, when stuck or changing approach, or at a final review gate. Use for "consult
  the advisor", "get a second opinion", "ask codex", "ask Astra", "ask gpt-6-astra", "ask Fable", "ask opencode", or "ask a bigger model". The
  advisor returns guidance; the main session keeps execution and decision ownership.
---

# Advisor

Use an advisor for independent judgment. The advisor never edits, merges,
commits, ships, or makes the final decision. Use Coordinator for implementation
workers and Orchestrator when one task combines workers, specialists, and an
advisor.

For a strong general-purpose advisor, recommend `gpt-6-astra` through the
Codex CLI from any host with shell access, including Claude Code, Codex,
Grok Build, and OpenCode. Honor an explicit model or channel preference. See
[codex-cli.md](references/channels/codex-cli.md) for preflight and dispatch.

## When to consult

Consult at a decision that could waste substantial work if it is wrong:

- after orientation but before the first substantive edit on a hard or
  ambiguous task
- when two distinct attempts have failed, or before changing approach
- after the deliverable is durable, as an independent final review gate

Skip the advisor for mechanical work and facts a deterministic check can
answer faster. One clear consult is the default. Use a panel only for a
high-stakes decision that benefits from deliberately different viewpoints.

## Run the consult

1. Detect the current host and available channels. Read
   [channels/README.md](references/channels/README.md), then load exactly one
   selected channel guide. Load one Coordinator host guide only when native
   host behavior matters.
2. Verify the intended provider, model, and authentication lane before sharing
   task context. Never infer subscription use from an installed CLI or ambient
   credential.
3. If the channel crosses a provider boundary, tell the user what task and
   repository context will be sent before the first run. Never send secrets,
   credentials, unrelated files, private plan links, or fragment keys.
4. Package a standalone consult using
   [advice-contract.md](references/advice-contract.md). Give repo-aware
   advisors the exact checkout or worktree to inspect and forbid edits.
5. Run the advisor with enforced read-only permissions. Preserve the complete
   output and verify that the intended advisor genuinely ran; a primary-agent
   response or silent model fallback is not a consult.
6. The main weighs the verdict against direct evidence. Act on it or explain
   the disagreement. If new evidence conflicts with the answer, use one narrow
   reconciliation consult.

## Required report

Record:

- advisor channel, actual provider/model, and authentication path
- disclosure state and exact context shared
- read-only permission evidence and process result
- session identifier when available, complete log path, and full verdict
- whether the intended advisor ran without fallback

The current main remains responsible for acceptance criteria, reconciliation,
tests, and every git operation.

## Stop conditions

- Authentication, model availability, or the read-only boundary cannot be
  verified: stop and offer setup.
- The external advisor returns no verdict: retry once with the advice contract,
  then report a transport failure.
- The advisor asks to implement: route that work through Coordinator with a
  bounded spec.
