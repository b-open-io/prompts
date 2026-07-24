---
name: agent-decommissioning
version: 1.0.0
description: This skill should be used when the user asks to "retire an agent", "decommission an agent", "remove an agent from the team", "shut down a bot", "remove a bot", "sunset an agent", or "take an agent offline permanently". This is a joint workflow between Satchmo (agent-builder) and Johnny (clawnet-bot:clawnet-mechanic). Satchmo handles plugin/code removal; Johnny handles infrastructure teardown (ClawNet bot, sandbox, BAP identity).
---

# Agent Decommissioning

Safely retire a bOpen team agent — removing it from the plugin, ClawNet, routing, and all references. This is a coordinated two-specialist workflow.

**Satchmo** (agent-builder) owns the plugin/code side.
**Johnny** (clawnet-mechanic) owns ClawNet infrastructure teardown.

Neither should proceed without the other completing their side.

---

## Phase 1: Assessment

Before touching anything, confirm the intent and scope.

1. **Confirm retirement vs. update** — Is this agent being permanently retired, or does it need an update/rename? If unsure, ask before proceeding.

2. **Check for dependents** — Search for references to the agent across the plugin repo:
   ```bash
   cd ~/code/prompts
   grep -r "<agent-name>" agents/ skills/ .claude-plugin/ --include="*.md" --include="*.json" -l
   ```

3. **Check Martha's routing rules** — Read the front-desk agent to find any routing logic that dispatches to this agent:
   ```bash
   grep -i "<agent-name>" ~/code/prompts/agents/front-desk.md
   ```

4. **Check skills-lock.json**:
   ```bash
   grep "<agent-name>" ~/code/prompts/skills-lock.json 2>/dev/null
   ```

5. **Determine if the agent has a live ClawNet bot** — Run `clawnet bot list` (or ask Johnny) to check. If a bot exists, Johnny must handle teardown before Satchmo removes the plugin file.

Document findings before proceeding. If other agents or skills reference the retiring agent, plan those updates as part of this workflow.

---

## Phase 2: ClawNet Bot Teardown (Johnny's Domain)

If the agent has a live ClawNet bot deployment, delegate to Johnny (clawnet-bot:clawnet-mechanic) for full infrastructure teardown. Do not skip this phase if a bot exists — orphaned sandboxes waste resources.

**Invoke**: `Skill(clawnet:clawnet-cli)` before issuing any ClawNet commands.

Johnny's teardown steps:

1. **Identify the bot**:
   ```bash
   clawnet bot list
   ```
   Locate the bot by name or associated agent identity.

2. **Stop the sandbox**:
   ```bash
   clawnet bot stop <bot-name>
   ```

3. **Archive or remove the BAP identity** — The bot has a Bitcoin Attestation Protocol identity. Archive it if the identity history matters; remove it if a clean break is preferred. Johnny knows the right call here based on the bot's history.

4. **Remove from ClawNet bot registry**:
   ```bash
   clawnet bot delete <bot-name>
   ```
   Confirm deletion with `clawnet bot list` — the bot should no longer appear.

5. **Signal completion to Satchmo** — Once the sandbox is stopped and bot removed, Johnny confirms so Satchmo can proceed with plugin removal.

**Key repos for Johnny**: `~/code/clawnet` and `~/code/clawnet-bot`.

---

## Phase 3: Plugin Removal (Satchmo's Domain)

Proceed only after Phase 2 is complete (or confirmed that no bot exists).

Working directory: `~/code/prompts` (bopen-tools plugin source).

1. **Remove the agent file**:
   ```bash
   rm ~/code/prompts/agents/<agent-name>.md
   ```

2. **Remove the agent's avatar** (if one exists):
   ```bash
   ls ~/code/prompts/agents/avatars/
   rm ~/code/prompts/agents/avatars/<agent-name>.*
   ```

3. **Update `.claude-plugin/plugin.json`** — If the agent was explicitly listed in the plugin manifest, remove its entry. Read the file first:
   ```bash
   cat ~/code/prompts/.claude-plugin/plugin.json
   ```
   Edit to remove the agent reference, then bump the plugin version (patch bump for removal).

4. **Check skills-lock.json** for any references to the agent and remove them.

5. **Search for residual references** across the plugin repo:
   ```bash
   grep -r "<agent-name>" ~/code/prompts --include="*.md" --include="*.json" -l
   ```
   Fix or remove any remaining references.

---

## Phase 4: Update Roster and Routing

1. **Update Martha (front-desk)** — Remove the routing rule that dispatches to the retired agent. Read `~/code/prompts/agents/front-desk.md`, find the routing entry, and delete it. Martha must not route to an agent that no longer exists.

2. **Update bOpen.ai roster** — If there is a roster file or UI that lists team members, remove the retired agent's entry.

3. **Update any agents whose prompts reference the retired agent** — From the Phase 1 grep results, edit each file that mentions the retiring agent and remove or update the reference. Common locations:
   - Other agents' `## Skills` sections
   - Dispatch instructions like "use `<agent-name>` for X"
   - README or documentation files

---

## Phase 5: Publish

1. **Stage all changes**:
   ```bash
   cd ~/code/prompts
   git status
   git add -A
   ```

2. **Review the diff** — Confirm only the expected files are changed. No unintended modifications.

3. **Commit**:
   ```bash
   git commit -m "Remove <agent-name> agent (decommissioned)"
   ```

4. **Push to master** — Pushing to master IS publishing. The marketplace picks up the latest commit automatically:
   ```bash
   git push origin master
   ```

---

## Phase 6: Verify

After publishing, confirm the decommissioning is clean.

1. **Confirm the agent no longer appears in the plugin** — After users run `claude plugin update bopen-tools@b-open-io`, the agent should not appear in `claude agent list`.

2. **Verify Martha no longer routes to the retired agent** — Test with a query that would previously have been routed to the retired agent. Martha should either return "not available" or route elsewhere.

3. **Check for broken references** — Search the updated repo one more time:
   ```bash
   grep -r "<agent-name>" ~/code/prompts --include="*.md" --include="*.json"
   ```
   This should return no results.

4. **Confirm no orphaned sandbox** — Johnny verifies `clawnet bot list` no longer shows the removed bot.

---

## Responsibility Summary

| Task | Owner |
|------|-------|
| Confirm retirement intent | Satchmo |
| Dependency audit | Satchmo |
| ClawNet bot stop | Johnny |
| BAP identity teardown | Johnny |
| Bot registry removal | Johnny |
| Agent `.md` file removal | Satchmo |
| Avatar removal | Satchmo |
| Plugin manifest update | Satchmo |
| Martha routing update | Satchmo |
| Roster update | Satchmo |
| Cross-agent reference cleanup | Satchmo |
| Publish (git push) | Satchmo |
| Post-publish verification | Both |

---

## Key Paths

- Plugin repo: `~/code/prompts`
- Agent files: `~/code/prompts/agents/`
- Agent avatars: `~/code/prompts/agents/avatars/`
- Plugin manifest: `~/code/prompts/.claude-plugin/plugin.json`
- Front-desk (Martha): `~/code/prompts/agents/front-desk.md`
- ClawNet repos: `~/code/clawnet` and `~/code/clawnet-bot`
