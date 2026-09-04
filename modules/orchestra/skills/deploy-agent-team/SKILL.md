---
name: deploy-agent-team
version: 1.0.7
description: Coordinate a Claude Code agent team of named specialists through a shared task list and message bus. Use when the user asks to deploy a team, coordinate specialists, or run a large Claude-native parallel effort.
disable-model-invocation: true
---

# Deploy Agent Team

Use Claude Code's experimental team system for a coordinated group of named
specialists. This skill owns team creation, shared tasks, communication, and
shutdown. It does not redefine worker economics or implementation safety.

## Load the shared contract

Before any implementation dispatch, read [Coordinator](../coordinator/SKILL.md),
the [dispatch contract](../coordinator/references/dispatch-contract.md), and the
[Claude host guide](../coordinator/references/hosts/claude.md). If a teammate
controls an external cheaper worker, also load only that worker guide.

The shared contract governs specs, exclusive ownership, provider disclosure,
visible native controllers, complete reports, review, verification, and git.
This team skill adds Claude-specific coordination around it.

## Prerequisites

Agent teams require `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Inspect the live
Agent tool schema and permission settings before spawning. Prefer a narrow,
non-interactive per-child mode when supported. Never enable unrestricted
permissions just to suppress prompts.

Read:

- [permissions and isolation](references/permissions-and-isolation.md) before
  assigning write access;
- [agent roster](references/agent-roster.md) before choosing a specialist; and
- [spawn prompt guide](references/spawn-prompt-guide.md) before creating a
  teammate.

## Lifecycle

1. Decompose the job into independent units and dependency edges.
2. Write the required specs in the lead session. Pin shared interfaces and
   exclusive file ownership.
3. Create one team and all known tasks up front. Express ordering with task
   dependencies rather than prose.
4. Match each unit to a named roster specialist. Use a generic teammate only
   when no specialist fits, and record why.
5. Spawn self-contained teammates. They receive no conversation history.
6. When bounded implementation belongs on an external cheap lane, make the
   teammate a controller: it launches and monitors that lane, reports the
   actual provider/model and full worker output, and does not implement.
7. Monitor through the task list and direct messages. Idle between assignments
   is normal; wake a teammate with a direct message.
8. Stop at a barrier before reconciliation, final verification, or git.
9. Request shutdown from every teammate, wait for acknowledgements, then
   delete the team.

## Team-specific rules

- Only the lead creates the team; teammates do not create nested teams.
- A teammate claims and completes one task at a time.
- Every prompt contains the absolute repository path, objective, owned paths,
  forbidden paths, relevant skills, acceptance checks, and final-report shape.
- Use task state for status and plain text for messages.
- Broadcast sparingly; it multiplies into one message per teammate.
- The lead remains responsible for the combined diff and all git operations.

## Failure behavior

- Permission prompts: narrow or pre-approve the specific required operation.
- Off-script teammate: correct directly; shut down and replace if necessary.
- Missing report: request the complete report before accepting the task.
- External controller silently implements or changes provider: reject the
  result and re-dispatch under the shared contract.
- Team deletion failure: a teammate is still active; finish shutdown first.

## Final report

Name the specialists and controllers that actually ran, each external
provider/model and disclosure state, accepted and rejected work, verification
results, and unresolved dependencies. Never claim a teammate or provider ran
from configuration alone.
