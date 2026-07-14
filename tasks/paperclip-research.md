# Paperclip Research: Current State vs. bopen-tools Integration

Researched 2026-07-14. Goal: determine what Paperclip is today, what official
skills it ships, and how far `agents/ceo.md` ("Chief") and related files have
drifted from current reality.

## 1. What Paperclip is today

**Paperclip is a real, actively developed, open-source project** —
`paperclipai/paperclip` on GitHub, MIT licensed, **73,621 stars**, last pushed
**today (2026-07-14)**. Tagline: "The open-source app everyone uses to manage
agents at work." Framing: *"If OpenClaw is an employee, Paperclip is the
company."*

- **Website:** paperclip.ing
- **Docs:** docs.paperclip.ing
- **Discord:** discord.gg/m4HZY7xNG3
- **X:** @papercliping
- **CLI package:** `paperclipai` (npm, currently `2026.707.0`, calver —
  `YYYY.MDD.patch`)
- **Server package:** `@paperclipai/server`
- **Plugin SDK:** `@paperclipai/plugin-sdk`
- **Official skills catalog package:** `@paperclipai/skills-catalog`

It's a Node.js server + React UI that orchestrates AI agents (Claude Code,
Codex, Cursor, bash agents, OpenClaw, HTTP/webhook bots — "if it can receive a
heartbeat, it's hired") via **heartbeats**, an **org chart** (roles, titles,
reporting lines), **budgets** (auto-pause at 100%), **governance** (approvals,
rollback), **goal alignment**, a **ticket/issue system**, **routines**
(scheduled jobs), **execution workspaces** with runtime controls, **work
products/artifacts**, typed **issue-thread interactions**, and first-class
**issue dependencies** (`blockedByIssueIds` with auto-wake on resolution).

Current agent role enum (`packages/shared/src/constants.ts`):
`ceo, cto, cmo, cfo, security, engineer, designer, pm, qa, devops, researcher, general`
— **12 roles**. `agent-builder.md` and `agent-onboarding/SKILL.md` in this
repo document only **11** (missing `security`).

### Two distinct "official skills" systems

This matters for the integration recommendation — Paperclip ships skills two
different ways:

**A. Repo-bundled skills** (ship inside `paperclipai/paperclip` at `skills/`,
installed onto an agent's environment via
`paperclipai agent local-cli <agent-id-or-shortname> --company-id <company-id>`,
which also prints/exports the required `PAPERCLIP_*` env vars for that
identity):

| Skill | Purpose |
|---|---|
| `paperclip` | The heartbeat protocol — authentication, the 9-step wake procedure, issue lifecycle, comment style, planning mechanics. This is what `ceo.md`'s `Skill(paperclip)` reference points at. |
| `paperclip-board` | **NEW.** Conversational board-member assistant — session startup, dashboard presentation, onboarding flow, decision-log document convention. Talks to a human, not API-first. |
| `paperclip-converting-plans-to-tasks` | **NEW.** Companion to `paperclip`'s Planning section — methodology for turning an accepted plan into a dependency-wired issue graph (specialty matching, `blockedByIssueIds`, parallelization, task-matrix verification). |
| `paperclip-create-agent` | Governance-aware hiring workflow — adapter discovery, comparing existing configs, a template index under `references/agents/` (e.g. `coder.md`, `qa.md`), permission preconditions (`can_create_agents`). |
| `para-memory-files` | (present in both old and new, not audited in depth here) |

**B. The `@paperclipai/skills-catalog` package** — a separate, versioned
catalog (`catalog.json`, schema v1, currently package version `0.3.1`,
generated 2026-07-07) of **12 first-party domain skills**, installed
*per-company* through the "Company Skills Workflow" (`desiredSkills` at hire
time, or `POST /api/agents/{agentId}/skills/sync`) — this is the mechanism
`skills/paperclip/references/company-skills.md` describes:

| Category | Skill | Recommended roles |
|---|---|---|
| paperclip-operations | `issue-triage` | **manager, ceo**, engineer |
| paperclip-operations | `task-planning` | manager, engineer, product |
| browser | `agent-browser` | qa, engineer, researcher |
| content | `release-announcement` | devrel, product, writer |
| docs | `doc-maintenance` | engineer, product, devrel |
| finance | `ramp` | finance, operations, founder, engineer |
| product | `paperclip-capsules`, `wireframe`, `design-critique` | designer, product, engineer |
| quality | `qa-acceptance` | qa, engineer, product |
| research | `last30days` | researcher, marketer, product-manager, analyst |
| software-development | `github-pr-workflow` | engineer |

`issue-triage` and `task-planning` are explicitly recommended for the `ceo`
role and map directly onto Chief's "Dashboard Review" and "Planning"
workflows.

## 2. `agents/ceo.md` fully mapped, then diffed against current reality

Read in full (`/Users/satchmo/code/prompts/agents/ceo.md`). Chief assumes:

- Runs "inside Paperclip -- bOpen's agent control plane at paperclip.bopen.io"
- Two modes: Paperclip heartbeat mode vs. Claude Code interactive mode,
  switched via `Skill(bopen-tools:runtime-context)`
- A 9-step heartbeat summary (Identity → Approvals → Inbox → Pick work →
  Checkout → Context → Work → Update → Delegate), explicitly deferring full
  detail to `Skill(paperclip)`
- Dashboard Review via `GET /api/companies/{companyId}/dashboard`
- Project Setup via `POST /api/companies/{companyId}/projects` +
  `POST /api/projects/{projectId}/workspaces`
- Agent Hiring: define role → `Skill(bopen-tools:agent-onboarding)` →
  "Register the agent in Paperclip with proper role, reportsTo, budget"
- OpenClaw Invites (CEO-only): `POST /api/companies/{companyId}/openclaw/invite-prompt`
- Approvals: `GET /api/approvals/{approvalId}` + issues, approve/reject via
  comment-patch
- Planning: `PUT /api/issues/{issueId}/documents/plan`

### The critical finding: `~/code/paperclip` is a stale fork

`b-open-io/paperclip` is a **fork** of `paperclipai/paperclip`
(`gh api repos/b-open-io/paperclip --jq .fork` → `true`, `.parent` →
`paperclipai/paperclip`). The fork's last push was **2026-03-25**. Upstream's
last push is **today, 2026-07-14** — roughly **3.5 months of drift**, and
four files in this repo (`agents/ceo.md`, `agents/agent-builder.md`,
`skills/agent-onboarding/SKILL.md`, `skills/paperclip-plugin-dev/SKILL.md`)
cite `~/code/paperclip` as a "Key Reference" source-of-truth path. The fork's
own README still uses an old tagline ("Open-source orchestration for
zero-human companies") that upstream has since replaced.

I diffed the local (stale) `skills/paperclip/SKILL.md` against the live
upstream version. Drift table:

| Assumed by Chief / bopen-tools | Current Paperclip reality | Fix |
|---|---|---|
| 9-step heartbeat, flat priority `in_progress` → `todo` | Step 4 now has 3 tiers: `in_progress` → `in_review` (if woken by a comment on it) → `todo`. New `PAPERCLIP_WAKE_REASON=issue_commented` case for in-review feedback. | Update the summarized flow or just point harder at `Skill(paperclip)` as living doc |
| No mention of a fast path | **Scoped-wake fast path**: if the wake message includes a "Paperclip Resume Delta"/"Paperclip Wake Payload" naming a specific issue, skip Steps 1–4 entirely and go straight to checkout | Add a line — this changes latency/cost characteristics of every heartbeat |
| `Skill(paperclip)` is source of truth, referenced as a static plugin skill | It's a **repo-bundled skill installed per-agent via `paperclipai agent local-cli <agent-id> --company-id <id>`** — not a Claude Code marketplace/plugin skill. It only resolves once Chief is registered and booted inside a live Paperclip company. | Add a clarifying note in `ceo.md` body; the `tools:` frontmatter entry is currently a dead reference outside a live Paperclip runtime |
| Checkout `expectedStatuses: ["todo","backlog","blocked"]` | Now includes `"in_review"` | Cosmetic, but matters if anyone hand-writes checkout calls |
| No execution-policy / typed review participants | New: `in_review` issues can carry `executionState` with `currentStageType`, `currentParticipant`, `returnAssignee` — multi-stage typed approval chains | Not currently referenced anywhere in `ceo.md`; Approvals section should mention it |
| Step 7 "execute the task: delegate, review, decide, plan" (generic) | New **execution contract**: start concrete work same heartbeat (don't stop at a plan unless asked), leave durable progress as comments/documents/work products, use child issues instead of busy-polling, leave an explicit waiting posture before exiting | Chief's delegation-heavy CEO role should explicitly inherit these rules |
| No artifact/work-product concept | New: **Generated Artifacts and Work Products** — `pull_request`, `preview_url`, `runtime_service`, `commit`, `branch` work products; uploads required for user-inspectable deliverables | Not mentioned anywhere in bopen-tools' Paperclip docs |
| Step 8 "PATCH with status and comment" | New **final-disposition checklist** for every heartbeat exit (`done` / `in_review` / `blocked` / delegated follow-up / explicit continuation) — assignment + "please review" comment is explicitly called out as *not* a valid review path | Chief's "Update" step should reflect this — it's a common failure mode the spec now guards against |
| No mention of multiline comment handling | New: `scripts/paperclip-issue-update.sh` (or `jq --arg`) required — hand-inlining markdown into one-line JSON "smooshes" comments | Minor but real footgun |
| No first-class dependency concept | New: **Issue Dependencies** — `blockedByIssueIds`, auto-wake via `issue_blockers_resolved` / `issue_children_completed`. Free-text "blocked by X" is now explicitly discouraged. | Chief's Delegation Rules section should require `blockedByIssueIds` over prose |
| No structured decision/interaction concept | New: **Issue-Thread Interactions** — 5 typed kinds (`request_confirmation`, `request_checkbox_confirmation`, `request_item_verdicts`, `ask_user_questions`, `suggest_tasks`) replace ad hoc "ask the board in a comment" | Chief's Approvals/Planning workflows still describe the old comment-only pattern |
| Ad hoc Project Setup / Planning steps written out in `ceo.md` | Official companion skill `paperclip-converting-plans-to-tasks` now owns this exact methodology (specialty matching, dependency wiring, task-matrix verification) | Replace inline steps with a pointer to the skill |
| Ad hoc Agent Hiring steps in `ceo.md` | Official `paperclip-create-agent` skill now owns this (permission preconditions, adapter discovery, template index) | Replace inline steps with a pointer to the skill |
| Chief's bespoke "Claude Code Mode (Interactive)" prose for org-level Q&A | Official `paperclip-board` skill is now the canonical pattern for exactly this (session startup, dashboard formatting, decision-log document) | Consider deferring to it instead of duplicating |
| 11-role enum in `agent-builder.md` / `agent-onboarding` | 12 roles — `security` added | Add `security` to both role tables |
| `Company Skills Workflow` mentioned generically, no catalog awareness | The `@paperclipai/skills-catalog` package is a separate, versioned, opt-in system with 12 named skills — `issue-triage` and `task-planning` are explicitly recommended for `ceo` | Document the catalog explicitly and recommend installing those two for Chief |
| OpenClaw Invites workflow | Unchanged — still CEO-gated, same endpoint | No fix needed |

### Other files referencing Paperclip in this repo (from grep)

- **`agents/ceo.md`** — primary subject, above.
- **`agents/agent-builder.md`** (lines ~1736–1802, "Paperclip — Agent Control
  Plane" section) — extensive parallel documentation: Paperclip-vs-Claude-Code
  comparison table, agent creation checklist, Plugin SDK overview, Tortuga
  plugin bridge. Same 11-role staleness; doesn't mention `paperclip-board` or
  `paperclip-converting-plans-to-tasks`; references the stale
  `~/code/paperclip` path throughout.
- **`skills/agent-onboarding/SKILL.md`** (Phase 6, "Register in Paperclip") —
  registration checklist, role-mapping table (11 roles, missing `security`),
  working-directory convention (`/paperclip/.agents/{slug}` on Railway
  volume — unverified whether this convention still holds upstream).
- **`skills/paperclip-plugin-dev/SKILL.md`** — a **different concern**: this
  is bopen-tools' own skill for building Paperclip *plugins* (the UI-slot /
  agent-tool / job / webhook extension system via `@paperclipai/plugin-sdk`),
  not the agent/heartbeat skill. Legitimately owned content, not something to
  replace with an official skill — but its source-code references
  (`~/code/paperclip/packages/plugins/sdk/`, etc.) point at the same stale
  fork, and `@paperclipai/plugin-sdk` published a new version on npm a week
  ago (`2026.707.0`), so its lesson list (10 numbered gotchas) should be
  spot-checked against current SDK source, not just left as-is.
- **`COMPANY.md`** — lists `paperclip-plugin-dev` as a skill and documents
  `paperclipai company import b-open-io/prompts` as the install command.
  That's a real, current `paperclipai` CLI subcommand — not verified stale.
- **`skills/clawnet-cli/SKILL.md`** — one incidental trigger phrase mention
  ("debug clawnet-paperclip-plugin"), not a deep integration point.

## 3. Recommended integration path

**Adopt the official skills directly; do not vendor a bopen-tools shim.**
This matches the repo's own stated principle (`CLAUDE.md`: "Never copy
external docs into skills folders — install the plugin that owns them so
updates flow") and the `skills-lock.json` provenance approach already used
for other third-party skills. A static copy of `skills/paperclip/SKILL.md`
would immediately start drifting exactly the way the `~/code/paperclip` fork
already has — the whole point of the `paperclipai agent local-cli` mechanism
is that this skill is installed fresh, per-agent, per-company, at
registration time, not vendored as a static file.

Concretely, for `agents/ceo.md`:

1. **Keep `Skill(paperclip)` in the frontmatter `tools:` list**, but add a
   body note explaining it is not a bopen-tools/marketplace skill — it
   resolves only once Chief is registered in a live Paperclip company and
   `paperclipai agent local-cli ceo --company-id <id>` has been run against
   that identity. Outside that runtime it's a dead reference, and that's
   expected/by design, not a bug to "fix" by vendoring content.
2. **Reference the two new repo-bundled skills by name** where their
   workflows overlap with Chief's hand-written prose:
   - `paperclip-converting-plans-to-tasks` for the Planning section
   - `paperclip-create-agent` for the Agent Hiring section
   - Consider `paperclip-board` for the Claude Code interactive mode instead
     of the current bespoke dashboard-review prose
3. **Recommend installing two catalog skills for the `ceo` role** via the
   Company Skills Workflow (`desiredSkills` at hire, or
   `POST /api/agents/{agentId}/skills/sync`):
   - `paperclipai/bundled/paperclip-operations/issue-triage`
   - `paperclipai/bundled/paperclip-operations/task-planning`
   These are first-party, explicitly `recommendedForRoles: ["ceo", ...]`, and
   map directly onto "Dashboard Review" and "Planning."
4. **Update the 9-step heartbeat summary** to at least mention the
   scoped-wake fast path and the `in_review` priority tier, since those
   change what "every heartbeat" actually looks like — or drop the summary
   entirely in favor of "see `Skill(paperclip)`, which is authoritative and
   changes over time; do not duplicate it here" (closer to what the file
   already claims to do, but the summary itself has drifted).
5. **Add `security` to the role enum** wherever documented (`agent-builder.md`,
   `agent-onboarding/SKILL.md`).
6. **Hygiene, separate from `ceo.md`:** sync `~/code/paperclip` with
   `upstream/master` (`git fetch upstream && git merge upstream/master`), or
   stop citing it as a reference path in favor of
   `github.com/paperclipai/paperclip` / `docs.paperclip.ing` directly, since
   four files in this repo currently point at a 3.5-month-stale local copy.

No new bopen-tools skill/plugin is warranted for the heartbeat/board/planning/
hiring workflows — they're now officially owned upstream. The one thing
bopen-tools legitimately continues to own is `paperclip-plugin-dev` (building
Paperclip *extensions*, a different axis entirely), which should get its
source references refreshed against the current SDK rather than replaced.
