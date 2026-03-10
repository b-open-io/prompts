---
name: agent-onboarding
version: 1.0.0
description: Complete end-to-end checklist for adding a new agent to the bOpen team. Use when creating a new agent, onboarding a new team member, or need to remember the full agent deployment pipeline — design, write, avatar, plugin, roster, and optional ClawNet bot deployment.
---

# Agent Onboarding

End-to-end checklist for bringing a new agent onto the bOpen team. Work through each phase in order. Do not skip steps.

**Plugin repo:** `~/code/prompts` (bopen-tools on the marketplace)
**Pushing to master IS publishing** — the marketplace picks up the latest commit automatically.

---

## Phase 1: Design the Agent

Before writing a single file, define the agent's identity.

- [ ] **Name** — choose a lowercase-hyphenated identifier (e.g., `code-auditor`, `front-desk`). This becomes the filename and the `subagent_type` suffix.
- [ ] **Display name** — the character's name as it appears in chat (e.g., "Satchmo", "Martha", "Johnny").
- [ ] **Historical/cultural inspiration** — pick a real figure whose expertise mirrors the agent's domain. This grounds the avatar and the system prompt voice.
- [ ] **Expertise scope** — one clear sentence: what the agent does and what it explicitly does NOT handle.
- [ ] **Trigger phrases** — what kinds of tasks should route to this agent? List 5–10.
- [ ] **Delegation targets** — which other agents does this one hand off to?
- [ ] **Model** — use `sonnet` for most tasks; `opus` for complex reasoning, security, or architecture review.
- [ ] **Color** — pick one: `red`, `orange`, `yellow`, `green`, `teal`, `blue`, `purple`, `pink`, `gray`.
- [ ] **Tools** — list every tool and skill the agent needs. Agents without a `tools:` field get full MCP access. Agents with `tools:` only see what's listed, so be complete.

---

## Phase 2: Write the Agent File

Create `agents/{name}.md` in `~/code/prompts`.

### Frontmatter format

```yaml
---
name: agent-name
display_name: "Display Name"
version: 1.0.0
model: sonnet
description: One-sentence description of what this agent does and when to route to it.
tools: Read, Write, Edit, MultiEdit, Bash, Grep, Glob, WebFetch, Skill(bopen-tools:relevant-skill)
color: blue
---
```

### System prompt structure

Write the body in this order:

1. **Role statement** — "You are a [domain] specialist." One sentence.
2. **Mission** — What you ship/produce. One sentence.
3. **Self-announcement block** — Copy from an existing agent and update the version and specialization. Every agent announces itself at task start.
4. **Expertise section** — Bullet list of specific capabilities. Be concrete, not vague.
5. **Key documentation** — WebFetch URLs or file references the agent should consult. Embedding these prevents the agent from doing unnecessary research from scratch.
6. **Delegation rules** — Explicit list of what this agent does NOT handle and which agent to route to instead.
7. **Output standards** — File format, code style, testing expectations.

### Key documentation to include

Every agent should have at least one concrete documentation reference. Examples:
- nextjs: `https://nextjs.org/docs`, `https://sdk.vercel.ai/docs`
- database: `https://docs.convex.dev`, Bun SQL docs
- mcp: `~/code/prompts/agents/mcp.md` (read the existing Orbit agent for patterns)

Look at existing agents in `~/code/prompts/agents/` for reference. The `mcp.md`, `database.md`, and `agent-builder.md` agents are good structural examples.

---

## Phase 3: Generate an Avatar

Every agent needs a portrait avatar.

### Generate with gemskills

Invoke `Skill(gemskills:generate-image)` or delegate to the `gemskills:content` agent.

**Prompt template:**
```
Portrait of [historical figure name], [brief description of who they are].
Professional headshot style. Clean background. High detail.
Consistent with a team of AI agent avatars.
```

**Specs:**
- Size: 1024x1024
- Format: PNG
- Save to: `agents/avatars/{name}.png`

### ClawNet ICO (optional)

If the agent will run as a live ClawNet bot, also generate a 32x32 ICO version for the bot's profile icon. The ICO file goes in the same `agents/avatars/` directory as `{name}.ico`.

---

## Phase 4: Update the Plugin

- [ ] Open `~/code/prompts/.claude-plugin/plugin.json`
- [ ] Bump the version (patch for new agents: e.g., `1.0.86` → `1.0.87`)
- [ ] The agents array is not in `plugin.json` for bopen-tools — the plugin auto-discovers agent `.md` files from the `agents/` directory. No manual registration needed.
- [ ] Update `~/code/prompts/skills/deploy-agent-team/references/agent-roster.md` — add a row to the roster table with the new agent's `subagent_type`, model, and best-for summary.
- [ ] Stage all new/modified files: agent `.md`, avatar PNG, `plugin.json`, `agent-roster.md`
- [ ] Commit with a clear message: `Add {name} agent with avatar`
- [ ] Push to master — this publishes automatically

```bash
cd ~/code/prompts
git add agents/{name}.md agents/avatars/{name}.png .claude-plugin/plugin.json skills/deploy-agent-team/references/agent-roster.md
git commit -m "Add {name} agent with avatar"
git push
```

---

## Phase 5: Update bOpen.ai Roster

- [ ] Visit [bopen.ai](https://bopen.ai) to check the current team roster
- [ ] The roster may auto-update from the plugin manifest within a few minutes of the push
- [ ] If the agent does not appear after 5 minutes, check whether bopen.ai requires a manual trigger or cache clear
- [ ] Verify: correct display name, correct description, correct avatar

---

## Phase 6: Deploy as ClawNet Bot (Optional)

Only if the agent needs a live, always-on bot instance (e.g., a 24/7 support agent, a monitoring bot).

- [ ] Invoke `Skill(clawnet:clawnet-cli)` for the deployment workflow
- [ ] Initialize a BAP identity for the bot — this is its permanent on-chain identity
- [ ] Configure the bot's connection to the ClawNet network
- [ ] ClawNet repos: `~/code/clawnet` (core) and `~/code/clawnet-bot` (bot runner)
- [ ] After deployment, hand off to Johnny (`clawnet-bot:clawnet-mechanic`) for ongoing health and maintenance

Johnny handles: uptime monitoring, reconnects, key rotation, and ClawNet-specific debugging.

---

## Phase 7: Notify Martha

After any new agent is deployed:

- [ ] Tell Martha (`bopen-tools:front-desk`) about the new agent's name, trigger phrases, and delegation rules
- [ ] Martha handles routing for the team — she needs to know who's available and what they handle
- [ ] Update the `skills/front-desk/references/service-providers.md` file if Martha's routing reference needs updating

---

## Phase 8: Verify

- [ ] Spawn the new agent with a simple test task relevant to its domain
- [ ] Confirm it announces itself correctly (name, version, specialization, mission)
- [ ] Confirm it has access to the right tools and skills (check the `tools:` field)
- [ ] Confirm it knows its documentation references (ask it to fetch one)
- [ ] Confirm it delegates correctly (give it a task outside its scope and verify it routes properly)
- [ ] Confirm the avatar appears on bopen.ai

---

## Quick Reference

| Item | Location |
|------|----------|
| Agent files | `~/code/prompts/agents/{name}.md` |
| Avatars | `~/code/prompts/agents/avatars/{name}.png` |
| Plugin manifest | `~/code/prompts/.claude-plugin/plugin.json` |
| Agent roster | `~/code/prompts/skills/deploy-agent-team/references/agent-roster.md` |
| ClawNet core | `~/code/clawnet` |
| ClawNet bot runner | `~/code/clawnet-bot` |
| Bot maintenance | Johnny (`clawnet-bot:clawnet-mechanic`) |
| Routing updates | Martha (`bopen-tools:front-desk`) |
| Avatar generation | `Skill(gemskills:generate-image)` or `gemskills:content` agent |
