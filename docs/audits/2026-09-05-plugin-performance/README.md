# Plugin audit remediation — 2026-09-05

Read the complete [plugin optimization article](https://bopen.ai/blog/plugin-context-reduction)
from the site's source (`src/data/posts.ts`, article slug `plugin-context-reduction`).
The linked baseline reports describe findings before these repairs; this file
records the resulting implementation and verification.

## Catalog and scope

The baseline catalog covers all ten shipped plugin roots: 84 skills, 30 agents,
14 commands, and 186 supporting resources. The wider marketplace snapshot has
27 plugins, 253 skills, and 41 agents. See [CATALOG.md](CATALOG.md),
[resource-catalog.csv](resource-catalog.csv), [support-catalog.csv](support-catalog.csv),
and [marketplace-catalog.csv](marketplace-catalog.csv). The baseline is prompts
`6ba4688`; remediation was reconciled with dev `b086781` before release checks.
Catalog coverage is not a claim of exhaustive semantic or live execution coverage.

## Repairs

| Baseline finding | Result |
| --- | --- |
| HARNESS H1 — OpenCode scope loss | Native ordered global/agent policy handling, independent source restrictions, scoped Bash/Skill translation, unsupported namespace wildcard rejection, regression coverage |
| HARNESS H2 — false-green routing | Duplicate run/case rejection, explicit selected-agent evidence, failures and forbidden routes retained |
| HARNESS H3 — unenforced budgets | Core 3,000 / suite 18,000 estimated-token gates, including command descriptions; CI and local checks |
| HARNESS H4 — host detection | Explicit host evidence, CLI availability separate from parent capabilities, unknown fallback |
| HARNESS H5 — benchmark validity | Qualified module discovery, bare tool-free arms, strict errors, validated eval contracts, nullable usage, pinned executable runtime, fake-provider CLI regression |
| HARNESS H6 — repeated context | One initial context snapshot per OpenCode session, coalesced loads, retry on failure, per-message routing and per-tool safeguards preserved |
| SKILL-QUALITY SQ-01/02 | Correct permission guidance and owning-repository release policy |
| SKILL-QUALITY SQ-03/04 | Baseline successes retained; quality, regression, uncertainty, cost and held-out cases guide adoption; agent selection distinguished from skill invocation |
| SKILL-QUALITY SQ-05/07 | Module-aware authoring paths and four on-demand prompt-engineer manuals with explicit installed-root resolution |

Prompt-engineer's invoked body shrank from 8,713 to 2,984 whitespace-delimited
words (65.8%). The material remains available in module references. This is a
source-size measurement, not a claim of equivalent live task quality or latency.
The isolated session-context hook measurement had a 236.9 ms median over seven
runs; it is not an end-to-end latency benchmark.

## Verification

[verification.json](verification.json) records 12 passing local gates. They include
60 Python script tests, 27 OpenCode tests, 27 benchmark tests, TypeScript and
entrypoint checks, generated adapters, extraction, documentation, budgets, and
the complete hook suite. All ten plugins also passed Claude's strict validator
in an extracted temporary mirror; no account-level installation occurred.
Final source estimates at the integration checkout are 2,366 tokens for core and
14,618 for the suite. Baseline estimates omitted command metadata and are not
comparable measurements of host consumption.

Core 1.1.163 and plugin-kit 0.1.8 are pending release versions on the review branch.
The related site repair adds agent-provider dependency closure, corrected paid
playbooks, validation evidence archives and a deterministic content gate.

## Remaining evidence and release path

No live model benchmark, four-host paired experiment, buyer workflow, customer
ZIP inspection, or production deployment was executed. Before claiming a
performance gain, run identical task/module sets on Claude Code, Codex, Grok
Build and OpenCode, recording actual invocation, artifact correctness, failures,
usage, cost and latency with repeated held-out samples. Unknown telemetry must
stay unknown. External plugin inventories absent from the paid-pack snapshot
remain explicitly unresolved in the site audit.

Review this branch into dev. Production promotion follows the standing dev to
master PR, 24-hour cooling period and `/approve` policy in CLAUDE.md. Neither a
version bump nor passing static checks certifies live buyer workflows.
