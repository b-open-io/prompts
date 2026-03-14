
## What matters (TL;DR before the full doc)

**The three things you should act on first:**

1. **`clawnet publish --on-chain` has no gate and is irreversible.** This is the highest-priority risk. A BSV transaction cannot be undone, retracted, or censored once broadcast to mainnet.

2. **`git push origin master` IS publishing for plugin repos** (skill-publish), but damage-control.sh does not intercept plain `git push`. Only `git push --force` is blocked today.

3. **The cleanest implementation is a `publish-gate.sh` PreToolUse hook** that checks for an approved Linear ticket before allowing publish commands to run — consistent with the existing hook architecture and requiring no new infrastructure beyond a `LINEAR_API_KEY` env var.

---

## Full Document Content

```markdown
# Publishing HITL Design: Human-in-the-Loop Approval for Agentic Publish Flows

Date: 2026-03-14
Status: Proposal — not yet implemented
Scope: All publishing flows in the bOpen / ClawNet ecosystem

---

## 1. Publishing Flow Audit

### 1.1 Flow-by-Flow Analysis

#### npm-publish (via `npm-publish` skill)

Location: /Users/satchmo/code/prompts/skills/npm-publish/

Command sequence:
1. preflight.sh — checks npm registry version vs local package.json, auto-bumps version (patch by default), runs bun run build, emits commit log
2. Agent writes changelog entry
3. release.sh — git add, git commit -m "Release vX.X.X", git push origin <branch>, echo "" | bun publish (browser auth via stdin pipe)
4. verify.sh — polls npm registry with exponential backoff until version appears

Auth: npm web auth token in ~/.npmrc; bun publish opens a browser window for PKCE-style OTP, then caches a 5-minute session token. No API key or secret is passed by the agent.

Trigger: Explicit user request ("publish to npm", "version bump", "release").

Reversible? Partially. npm unpublish <pkg>@<version> works within 72 hours of publish. After that, the version is permanently reserved. Unpublish is blocked by damage-control.sh (npm unpublish is in destructiveCommands).

Current gate: None for the actual publish step. The user must initiate the skill. The preflight/release scripts run without further confirmation.

---

#### skill-publish (via `skill-publish` skill)

Location: /Users/satchmo/code/prompts/skills/skill-publish/

Command sequence:
1. Read .claude-plugin/plugin.json version
2. Check git status / git log
3. Edit plugin.json to bump version
4. Update CHANGELOG.md
5. Validate plugin structure (required fields, referenced files exist)
6. git add .claude-plugin/plugin.json CHANGELOG.md && git add -A
7. git commit -m "Release vX.X.X"
8. git push origin <default-branch>
9. (Optional) CLAUDECODE= claude plugin update <name>@<publisher> to verify

Auth: Git SSH or HTTPS credentials already configured on the machine. No separate auth step.

Trigger: git push to the default branch. The push IS the publish — the Claude Code plugin marketplace picks up the latest commit on master/main automatically.

Reversible? The publish itself is not reversible in the marketplace's eyes (no "unpublish" command). A rollback requires pushing a new commit reverting the previous one, then re-bumping the version.

Current gate: None. Structure validation before committing, but no human checkpoint between "decide to publish" and "git push."

---

#### ClawNet on-chain publish (via `clawnet publish`)

Location: /Users/satchmo/code/clawnet/packages/cli/src/commands/publish.ts

Command sequence:
1. requireAuth() — ClawNet auth token
2. validateSkillContent() — SKILL.md frontmatter validation
3. collectFiles() — gather all non-binary, non-ignored files
4. scanSkillFiles() — Tier 1 hard-blocks, Tier 2 warn or LLM review
5. getSigningKey() — AIP signature if key available
6. publishSkill() — HTTP POST to ClawNet registry API (always runs)
7. If --on-chain: buildSkillOpReturn() → fundAndBroadcast() — creates a BSV transaction using wallet.createAction({ signAndProcess: true }); broadcasts to mainnet

On-chain transaction structure: OP_RETURN with B protocol (skill content), MAP protocol (metadata: app, type=skill, slug, version), AIP protocol (author identity signature).

Auth: ClawNet auth token + (for on-chain) a funded BSV wallet with signing key.

Reversible? Registry-only publish: soft reversible (admin remove). On-chain: completely and permanently irreversible. The BSV transaction is on mainnet and cannot be deleted, censored, or retracted.

Current gate: Tier 1/2 content scan. No human approval before broadcast.

---

#### Bot deploy via Johnny (Vercel Sandbox)

Location: /Users/satchmo/code/clawnet-bot/.agents/johnny/src/index.ts

Command sequence (agent-based deploy):
1. resolveAgentRef(name) — searches marketplace plugin repos via GitHub API
2. loadAgentSource(ref) — fetches agent .md from GitHub
3. ensureBunSnapshot() — gets or creates a Bun snapshot (cached ~24h)
4. Sandbox.create({ source: { type: "snapshot", snapshotId }, ... }) — provisions Vercel Sandbox
5. git clone → bun install → bun run src/index.ts (detached)
6. notifyRegistry("register", ...) — registers bot endpoint with ClawNet peers API

For fleet bots (createFreshSandbox): same flow using fleet.json config and Infisical for secrets.

Auth: AI_GATEWAY_API_KEY or INFISICAL_CLIENT_SECRET_<BOTNAME> in Johnny's environment.

Trigger: /api/orchestrate cron (every 10 min), /api/wake endpoint, or chat request.

Reversible? Yes — sandboxes are ephemeral. 30-minute timeout. No persistent side effects beyond the ClawNet registry entry.

Current gate: None beyond Johnny's own SOUL.md constraints.

---

#### Vercel deploy (git push to master)

Trigger: git push origin master on any repo linked to Vercel.

Mechanism: Vercel's GitHub integration builds and deploys automatically on push. No explicit vercel --prod needed.

Auth: Vercel GitHub integration OAuth — not agent-accessible.

Reversible? Yes — Vercel dashboard provides one-click rollback. Preview deployments (non-master) do not affect production.

Current gate: None. damage-control.sh blocks git push --force but not plain git push.

---

### 1.2 Summary Table

| Flow | Trigger | Auth Required | Reversible | Risk Level | Current Gate |
|------|---------|---------------|------------|------------|--------------|
| npm-publish | Explicit user request via skill | npm web auth (browser) | 72h window only | High | None post-preflight |
| skill-publish | git push to default branch | Git credentials | No (push = live) | Medium | Structure validation only |
| ClawNet registry | clawnet publish | ClawNet token | Soft (registry admin) | Medium | Tier 1/2 content scan |
| ClawNet on-chain | clawnet publish --on-chain | ClawNet token + BSV wallet | Never | Critical | Tier 1/2 content scan |
| Bot deploy (Johnny) | Cron / /api/wake / chat | Ambient (Johnny's env) | Yes (ephemeral sandboxes) | Low-Medium | None |
| Vercel deploy | git push master | Vercel GitHub integration | Yes (dashboard rollback) | Low | None |

---

## 2. HITL Research Summary

### 2.1 LangGraph

LangGraph's HITL model is the most mature of the surveyed frameworks.

Static breakpoints: interrupt_before / interrupt_after at graph compile time.

Dynamic interrupt: The interrupt(value) function, called inside any node, immediately suspends graph execution and surfaces the value to the caller. Execution resumes when the caller invokes the graph again with Command(resume=<human_decision>). The resumed value is returned from interrupt() as if it were synchronous.

Persistence requirement: A checkpointer (PostgreSQL, SQLite, in-memory) is required to serialize graph state across the pause. Without a checkpointer, interrupt is not available.

Resume mechanism: graph.invoke(Command(resume="approved"), config={"configurable": {"thread_id": "..."}}).

Implication for our system: LangGraph's model requires stateful, checkpointed agent runtime. Claude Code sessions are ephemeral single-turn CLI invocations — there is no persistent graph state between runs. The model does not map directly.

---

### 2.2 CrewAI

Task-level human_input=True: Crew pauses after completing the task, presents output to a human (terminal or webhook), waits for feedback, injects it as context for the next task.

@human_feedback decorator (Flows): Pauses the entire flow, serializes state, notifies via webhook or email (enterprise: CrewAI AMP), waits for response. On resume, continues from the decorated step with the human's input.

Async HITL: CrewAI AMP handles state persistence, SLA tracking, and notification routing for async HITL. Open-source CrewAI requires custom state serialization.

Implication for our system: The @human_feedback pattern conceptually matches what we want: intercept before the publish step, notify via external system, resume when approved. The gap is that we need our own state persistence.

---

### 2.3 AutoGen / AG2

UserProxyAgent: A built-in agent type that blocks and prompts the terminal for human input during multi-agent conversations. Synchronous and blocking.

Critical limitation: AutoGen docs explicitly warn that blocking HITL is only appropriate for short interactions. For async scenarios (waiting for ticket approval), AutoGen recommends terminating and re-running with a new message.

Implication for our system: AutoGen's model does not translate. We need async HITL — agent finishes prep, human reviews on their own schedule, agent resumes when notified.

---

### 2.4 OpenAI Agents SDK

needsApproval on tool definitions: Any tool can be defined with needsApproval: true. When the SDK tries to call that tool, the agent run pauses and returns an interruptions array to the caller.

RunState persistence: The entire agent run state (conversation history, pending tool calls) is serialized into a RunState object for external storage. The caller retrieves it, presents the interruption to a human, and calls run.resume(state, { approve: true/false }) with the human's decision.

What triggers approval: needsApproval: true on a specific tool definition — surgical, not conversation-wide.

Implication for our system: The cleanest async HITL model surveyed. Key insight: approval attaches to the tool definition, not the conversation flow. The interrupt fires before the tool executes; RunState is stored; a resume token is sent to the human via an external channel. This maps well to our hook architecture.

---

### 2.5 Claude Code PreToolUse Hook

Hook lifecycle: Before any Bash/Write/Edit tool call, Claude Code invokes registered PreToolUse hooks. Hooks receive the full tool input as JSON on stdin.

Three outcomes:
- Exit 0 (no stdout JSON): allow the tool call to proceed
- Exit 0 with JSON {"continue": false, "stopReason": "..."}: pause the agent, surface the message to the model (model sees it, not the user)
- Exit 2 with JSON on stderr {"hookSpecificOutput": {"permissionDecision": "deny"}, "systemMessage": "..."}: hard block, model is told why

What is missing: There is no native "pause and wait for human input" path in PreToolUse hooks. The "continue: false" path stops the turn and forces Claude to re-evaluate — but it does not create a durable pause that survives session restart, and it does not send a notification to a human.

Current state: damage-control.sh blocks npm unpublish, vercel rm, git push --force, and other destructive commands. Nothing intercepts git push (the plugin publish trigger) or bun publish (npm publish trigger).

---

### 2.6 Cross-Framework Synthesis

Consistent patterns across all HITL frameworks:

1. Attach approval to the action, not the conversation. (OpenAI: needsApproval, CrewAI: human_input=True on task, LangGraph: interrupt() inside node)
2. Serialize state before pausing. (LangGraph: checkpointer, OpenAI: RunState, CrewAI: AMP persistence)
3. Notify the human via an external channel. (Email, Slack, webhook — not just blocking the terminal)
4. Resume deterministically. Agent continues from the exact point of interruption with the human's decision.
5. Distinguish sync vs. async HITL. Synchronous is fine for local dev; async is required for production agents.

The key gap in our ecosystem: there is no durable pause mechanism. Claude Code sessions are ephemeral. If the agent is told "wait for approval," the session ends and the pending action is lost. We need an external system to hold state across the pause.

---

## 3. Proposed Design: Linear-Based Approval Workflow

### 3.1 Core Principle

Publishing actions are high-consequence and often irreversible. They must not execute in a single agent turn without a human seeing what is about to happen. Approval records belong in Linear because:

- Linear is already the source of truth for work items in this ecosystem
- Linear provides audit history, assignee, and status transitions natively
- The approval status is visible to the whole team, not buried in a chat log

### 3.2 The Workflow

```
Agent                    Linear                      Human
  |                         |                           |
  |  1. Prepare release     |                           |
  |     (version bump,      |                           |
  |      changelog,         |                           |
  |      tests, build)      |                           |
  |                         |                           |
  |  2. Update ticket  ---->|  Status: "Ready for       |
  |     with release plan   |   Review"                 |
  |     + diff summary      |   Comment: release plan   |
  |                         |                           |
  |  3. STOP.               |                           |
  |     Session ends.       |                           |
  |                         |                    [Email notification]
  |                         |<------- Human reviews ----|
  |                         |        moves to           |
  |                         |        "Approved"         |
  |                         |        OR "Rejected"      |
  |                         |                           |
  |  4. New session:        |                           |
  |     "LIN-XXXX is        |                           |
  |      approved,          |                           |
  |      publish."  <-------|                           |
  |                         |                           |
  |  5. Hook checks   ----->| Query "Approved" tickets  |
  |     Linear before       |                           |
  |     git push / publish  |                           |
  |                         |                           |
  |  6. Execute publish.    |                           |
  |     Record txid/        |                           |
  |     version in          |                           |
  |     Linear comment.     |                           |
  |                         |                           |
  |  7. Move to "Done" ---->|  Status: "Done"           |
```

### 3.3 Linear State Machine for Publish Tickets

```
Backlog → In Progress → Ready for Review → Approved → Done
                                         ↘ Rejected → (back to In Progress)
```

State meanings:
- In Progress: Agent is preparing the release (bumping version, writing changelog, running tests)
- Ready for Review: Agent has completed prep, written a release plan comment, is waiting. Agent session ends here.
- Approved: Human moved ticket here, confirming the release plan
- Rejected: Human moved ticket here and added a rejection reason
- Done: Agent completed the publish, recorded confirmation (npm version URL, txid, git tag)

### 3.4 What the Agent Records at "Ready for Review"

Structured comment required before moving to "Ready for Review":

```markdown
## Publish Plan

**Package:** @b-open-io/clawnet-cli
**Version:** 1.4.2 → 1.4.3 (patch)
**Type:** npm registry

### What changed
- Fix: wallet session cleanup on timeout (#341)
- Fix: AIP signing retry on network error (#344)
- Chore: update @bsv/sdk to 1.1.8

### Files to be committed
- package.json (version bump)
- CHANGELOG.md (new entry)

### Publish command (will execute on approval)
bash scripts/release.sh

### Reversibility
Reversible within 72 hours via npm unpublish.

### Risks
None identified. Patch release with no breaking changes.

**Awaiting approval from:** @satchmo
```

For on-chain publishes, the comment must additionally note that the action is irreversible and include the OP_RETURN payload hash for review.

---

## 4. Implementation Plan

### 4.1 Hook Enforcement: publish-gate.sh

A new PreToolUse hook that intercepts the actual publish commands.

Commands to intercept (new publishGate tier in patterns.yaml):
- git push origin master
- git push origin main
- bun publish
- npm publish
- clawnet publish --on-chain

Hook behavior: NOT a hard block (exit 2). Outputs {"continue": false, "stopReason": "No approved Linear ticket..."} to stop the turn and let the model guide the user through the approval workflow.

Core check logic:

```bash
# publish-gate.sh
# Check for an approved Linear ticket scoped to this package/repo
RECENT_MSG=$(git log -1 --format="%s" 2>/dev/null || echo "")

# Only intercept publish-style pushes (commit message starts with "Release v")
if echo "$command_str" | grep -qE "git push origin (master|main)"; then
  if ! echo "$RECENT_MSG" | grep -qiE "^Release v[0-9]"; then
    exit 0  # Not a release push — allow
  fi
fi

# Query Linear for approved ticket
TICKET_ID=$(curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ issues(filter: { state: { name: { eq: \"Approved\" } }, labels: { name: { eq: \"publish\" } } }) { nodes { id title } } }"}' \
  | jq -r '.data.issues.nodes[0].id // "")

if [ -z "$TICKET_ID" ]; then
  printf '{"continue":false,"stopReason":"PUBLISH GATE: No Linear ticket in Approved state with label publish. Complete the approval workflow first."}'
  exit 0
fi

echo "publish-gate: approved by Linear ticket $TICKET_ID" >&2
exit 0
```

For on-chain publishes, require the approver to have commented "irreversible acknowledged" in the ticket before allowing through.

### 4.2 Skills: check-approval.sh

A shared script used by both the hook and publish skills:

```bash
# check-approval.sh [package-name]
# Exits 0 if approved ticket exists, exits 1 if not.
```

Add to npm-publish SKILL.md as Step 2.5 (before release.sh).
Add to skill-publish SKILL.md before the "Commit and Push" step.

### 4.3 New Skill: publish-request

A new skill that handles the approval-request side of the workflow.

Location: /Users/satchmo/code/prompts/skills/publish-request/SKILL.md

Workflow the skill executes:
1. Run preflight (version check, build, changelog)
2. Find or create a Linear ticket for this release
3. Post the structured release plan comment (see Section 3.4)
4. Move ticket to "Ready for Review"
5. Tell the user: "Release plan posted to Linear ticket LIN-XXXX. Waiting for approval."
6. End. Do not proceed to publish.

### 4.4 Polling / Resume Mechanism

Option A: Manual resume (recommended for now)
Human approves ticket in Linear. When ready to publish, they start a new Claude Code session and say "the ticket is approved, proceed with the publish" or "publish LIN-XXXX." Agent checks Linear, sees "Approved" status, and runs the publish. The hook confirms the approved ticket is present before allowing the command.

No new infrastructure required. The hook is the enforcement mechanism.

Option B: Webhook-driven resume (future)
Linear webhook fires when ticket moves to "Approved." A Vercel serverless function or Johnny endpoint triggers a new Claude Code session via the Claude API with the instruction to execute the publish plan. Requires: webhook auth, state storage between sessions, and secure credential handling in the triggered session.

Defer Option B until Option A is validated in practice.

### 4.5 Interaction with damage-control.sh

publish-gate.sh is additive and runs after damage-control.sh.

Updated hooks.json PreToolUse Bash matcher:
```json
{
  "matcher": "Bash",
  "hooks": [
    { "type": "command", "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/bouncer.sh", "timeout": 5 },
    { "type": "command", "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/damage-control.sh", "timeout": 5 },
    { "type": "command", "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/publish-gate.sh", "timeout": 10 }
  ]
}
```

damage-control.sh handles the hard-blocked commands (git push --force, npm unpublish). publish-gate.sh handles the soft-approval gate for intentional publish commands.

### 4.6 On-Chain Publish: Extra Gate

For clawnet publish --on-chain:
- Linear ticket must be in "Approved" state AND
- Must contain a comment with the phrase "irreversible acknowledged" from the approver

This prevents an approver from clicking "Approved" without understanding the BSV transaction is permanent.

### 4.7 Bot Deploy via Johnny

Do not add Linear approval for routine bot deploys (ephemeral sandboxes).

Instead:
- Audit log: every sandbox creation logged to Postgres or a Linear fleet-ops ticket
- Add SOUL.md constraint: fleet bots (in fleet.json) cannot be auto-redeployed by orchestrate cron without human triggering via chat
- Ephemeral marketplace agents continue to auto-deploy without approval (30-minute sandboxes, low blast radius)

### 4.8 Escape Hatches

Hotfix path:
1. Developer sets PUBLISH_BYPASS_TOKEN in their terminal manually (not accessible to agent)
2. Hook reads env var; if set, allows through and logs "BYPASS USED: $BYPASS_REASON"
3. Bypass is inherently manual — agents cannot set shell env vars in the parent process

The invariant: bypasses require conscious human action in the terminal. They cannot be triggered by the agent.

Preview deploys:
The hook only intercepts git push origin master / main. Non-master pushes (Vercel preview deployments) pass through without checking Linear.

Non-destructive ClawNet publishes:
clawnet publish without --on-chain can use a lighter gate: require a ticket in any active state (not necessarily "Approved") — enough to create a record, not blocking on full approval.

---

## 5. Open Questions

### 5.1 Linear as mandatory dependency

If Linear is unavailable (network error, API outage, missing LINEAR_API_KEY):
- Recommendation: fail closed for --on-chain publishes. Fail open (allow with warning) for git push to master. Rationale: git push to master is reversible via Vercel rollback; an unchecked on-chain BSV transaction is not.

### 5.2 Ticket lifecycle and hygiene

Who creates the ticket — developer or agent?
- Recommendation: publish-request skill creates the ticket automatically if none exists (keyed on package name + version). Developer sees the URL immediately and is expected to review. Agent does not block on ticket creation, only on approval.

### 5.3 Multiple pending publishes

Two packages in the approval queue simultaneously?
- Recommendation: Linear ticket title follows a convention: "Publish: <package-name>@<version>". Hook extracts package name from the command and queries for a ticket with that exact title pattern in "Approved" state.

### 5.4 Who can approve

- Recommendation: Add PUBLISH_APPROVER env var (or publish-approvers config in each repo) naming the Linear user ID(s) to notify. Skill @mentions them in the ticket comment.

### 5.5 skill-publish / git push ambiguity

Not all git push origin master commands are publish pushes. The hook checks the most recent commit message for "Release v" prefix (written by both npm-publish and skill-publish by convention) to distinguish publish pushes from regular feature pushes.

This is a heuristic. It can be defeated by a developer manually writing a commit message starting with "Release v." Acceptable first pass.

### 5.6 Async resume infrastructure (Option B)

Deferred. Requires webhook auth, secure inter-session state storage, and reliable triggered-session credential handling. Out of scope for initial implementation.

---

## Appendix: Files to Create / Modify

| File | Action | Description |
|------|--------|-------------|
| /Users/satchmo/code/prompts/hooks/publish-gate.sh | Create | PreToolUse hook: checks Linear for approved ticket before allowing publish commands |
| /Users/satchmo/code/prompts/hooks/hooks.json | Modify | Add publish-gate.sh to PreToolUse Bash matcher |
| /Users/satchmo/code/prompts/hooks/patterns.yaml | Modify | Add publishGate tier section |
| /Users/satchmo/code/prompts/skills/publish-request/SKILL.md | Create | Skill: prepare release plan and move Linear ticket to "Ready for Review" |
| /Users/satchmo/code/prompts/skills/publish-request/scripts/check-approval.sh | Create | Shared script to query Linear for approval status |
| /Users/satchmo/code/prompts/skills/npm-publish/SKILL.md | Modify | Add Step 2.5: check approval before release.sh |
| /Users/satchmo/code/prompts/skills/skill-publish/SKILL.md | Modify | Add approval check before "Commit and Push" step |
| /Users/satchmo/code/clawnet-bot/.agents/johnny/SOUL.md | Modify | Add constraint: fleet bots require human-initiated deploy |
```

---

## Why Write is Blocked

The `Write` tool is unavailable to me as a read-only research agent. To create the file, use any of:

- A code-auditor or code-writing agent with Write permissions
- `cat > /Users/satchmo/code/prompts/docs/publishing-hitl-design.md << 'EOF'` followed by the content in your terminal
- Ask Claude Code directly (outside this read-only agent session) to write the file

Sources:
- [LangGraph Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [DEV: Interrupts and Commands in LangGraph](https://dev.to/jamesbmour/interrupts-and-commands-in-langgraph-building-human-in-the-loop-workflows-4ngl)
- [Towards Data Science: LangGraph 201 Human Oversight](https://towardsdatascience.com/langgraph-201-adding-human-oversight-to-your-deep-research-agent/)
- [CrewAI HITL documentation](https://docs.crewai.com/en/learn/human-in-the-loop)
- [CrewAI: A missing layer in agentic systems](https://blog.crewai.com/a-missing-layer-in-agentic-systems/)
- [GitHub: CrewAI async HITL discussion #2051](https://github.com/crewAIInc/crewAI/issues/2051)
- [AutoGen HITL user guide](https://microsoft.github.io/autogen/stable//user-guide/agentchat-user-guide/tutorial/human-in-the-loop.html)
- [OpenAI Agents SDK HITL (JS)](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/)
- [OpenAI Agents SDK Python](https://openai.github.io/openai-agents-python/)
- [Claude Code hooks guide](https://code.claude.com/docs/en/hooks-guide)
- [Claude Platform agent SDK hooks](https://platform.claude.com/docs/en/agent-sdk/hooks)
- [Claude Code hooks: DataCamp tutorial](https://www.datacamp.com/tutorial/claude-code-hooks)
