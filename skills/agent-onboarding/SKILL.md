---
name: agent-onboarding
version: 1.1.1
description: Complete end-to-end checklist for adding a new agent to the bOpen team. Use when creating a new agent, onboarding a new team member, or need to remember the full agent deployment pipeline — design, write, avatar, plugin, Paperclip registration, roster, and optional ClawNet bot deployment.
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
- [ ] **Color** — copy a known-valid color from a current agent and validate it with the installed Claude Code version; do not rely on a frozen color catalog.
- [ ] **Tools** — list every tool and skill the agent needs. Agents without a `tools:` field get full MCP access. Agents with `tools:` only see what's listed, so be complete.

---

## Phase 2: Write the Agent File

Authored Claude Code agent definitions live directly at the top level:

```
agents/
  {name}.md                    (authored source of truth)
bots/
  {name}.bot.json             (optional ClawNet deployment metadata)
```

Do not create a folder/symlink package for a normal plugin agent. Runtime bot
workspaces under `.agents/` and canonical bot templates belong to their runtime
systems, not to the authored agent definition.

### Creating the agent file

```bash
touch agents/{name}.md
```

### Frontmatter format

```yaml
---
name: agent-name
display_name: "Display Name"
version: 1.0.0
model: sonnet
description: One-sentence description of what this agent does and when to route to it.
tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, Skill(bopen-tools:relevant-skill)
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

Generate the avatar in the `bopen-ai` repository using the documented pixel-avatar
workflow. The filename is derived from `display_name`: lowercase it, replace each
non-alphanumeric run with `-`, then append `.png`.

**Prompt template:**
```
Stardew Valley retro 16-bit pixel art character portrait. Dark maroon background
(#2b120a), steel blue (#8cb4cb) and amber (#e38f1a) accent colors. Head and
shoulders portrait, expressive pixel face, no text. [Agent-specific traits.]
```

**Specs:**
- Size: 1024x1024
- Format: PNG
- Save to: `~/code/bopen-ai/public/images/agents/{display-name-slug}.png`
- Record the exact prompt in `~/code/bopen-ai/public/images/agents/prompts.json`

### ClawNet ICO (optional)

If the agent will run as a live ClawNet bot, follow the bot runtime's current icon
contract separately; do not add runtime icons to this plugin's `agents/` directory.

---

## Phase 4: Update the Plugin

- [ ] Open `~/code/prompts/.claude-plugin/plugin.json`
- [ ] Bump the version (patch for new agents: e.g., `1.0.86` → `1.0.87`)
- [ ] The agents array is not in `plugin.json` for bopen-tools — the plugin auto-discovers agent `.md` files from the `agents/` directory. No manual registration needed.
- [ ] Update `~/code/prompts/skills/deploy-agent-team/references/agent-roster.md` — add a row to the roster table with the new agent's `subagent_type`, model, and best-for summary.
- [ ] Stage plugin files in this repository: agent `.md`, `plugin.json`, `agent-roster.md`, and optional `bots/*.bot.json`
- [ ] Commit and push the avatar plus `prompts.json` in the separate `bopen-ai` repository
- [ ] Commit with a clear message: `Add {name} agent with avatar`
- [ ] Push to master — this publishes automatically

```bash
cd ~/code/prompts
git add agents/{name}.md .claude-plugin/plugin.json skills/deploy-agent-team/references/agent-roster.md
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

## Phase 6: Register in Paperclip (When Applicable)

If the agent will run inside bOpen's Paperclip instance (paperclip.bopen.io), register it there. Paperclip is the control plane — it manages heartbeats, budgets, task assignment, and org hierarchy.

### Paperclip agent model

Paperclip agents are NOT the same as Claude Code plugin agents. Key differences:

| Concern | Claude Code Plugin | Paperclip |
|---------|-------------------|-----------|
| Identity | `.md` file in plugin repo | DB record via API/UI |
| Personality/prompt | Body of `.md` file | Prompt template or instructionsFilePath |
| Hierarchy | Flat peers | Strict tree (reportsTo) |
| Budget | None | budgetMonthlyCents with auto-pause at 100% |
| Execution | On-demand subagent | Heartbeat protocol (scheduled wakes) |
| Roles | Freeform | 11 fixed: ceo, cto, cmo, cfo, engineer, designer, pm, qa, devops, researcher, general |

### Registration via Paperclip UI

1. Navigate to the Agents page, click "Create Agent"
2. **Agent name** — use the display_name from the `.md` file (e.g., "Martha", "Jerry")
3. **Adapter type** — `Claude Code` for all bOpen agents running Claude
4. **Working directory** — `/paperclip/.agents/{slug}` where `{slug}` is the `name` from the agent `.md` frontmatter (e.g., `code-auditor`). On Railway persistent volume.
5. **Model** — match the `model:` field from the `.md` frontmatter (`sonnet` → Claude Sonnet, `opus` → Claude Opus)
6. **Role** — map to the closest Paperclip enum. Use `title` field for the actual job description
7. **Reports to** — select the agent's manager in the org tree
8. **Budget** — set monthly spend limit in cents. Guidelines:
   - Opus agents: $50/month (5000 cents)
   - Sonnet agents: $20/month (2000 cents)
   - Haiku agents: $5/month (500 cents)
   - CEO/CTO: higher budgets as needed
9. **Capabilities** — paste the `description:` from the `.md` frontmatter
10. **Environment check** — click "Test now" to verify adapter, API key, and working directory

### Role mapping guide

| bOpen Agent Type | Paperclip Role | Title (freeform) |
|-----------------|---------------|------------------|
| CEO / strategist | `ceo` | Chief Executive Officer |
| Engineering lead | `cto` | Chief Technology Officer |
| Directory/routing | `cmo` | Front Desk / Directory Service |
| Financial oversight | `cfo` | Chief Financial Officer |
| Most specialists | `engineer` | [Actual specialty] Specialist |
| UI/UX agents | `designer` | UI/UX Designer |
| Project coordinators | `pm` | Project Manager |
| Testing/auditing | `qa` | [Code Auditor / Tester] |
| Infra/CI/CD | `devops` | Infrastructure Lead |
| Research agents | `researcher` | Lead Researcher |
| Everything else | `general` | [Actual role description] |

### Heartbeat protocol awareness

Agents running in Paperclip must follow the heartbeat protocol defined in the Paperclip skill (see Quick Reference table for path). Reference that skill in the agent's system prompt or install it in their working directory.

### Dual-ecosystem agents

Most bOpen agents exist in BOTH ecosystems:
- **Claude Code plugin**: personality, system prompt, tools, skills (source of truth)
- **Paperclip**: runtime config, hierarchy, budget, heartbeat scheduling

The `.md` file in the plugin repo is always the source of truth for who the agent IS. Paperclip owns HOW it runs (schedule, budget, reporting chain). Never duplicate the system prompt — reference it or paste it into Paperclip's prompt template field.

### Environment requirements

For Paperclip on Railway:
- `ANTHROPIC_API_KEY` must be set as Railway env var
- Working directories on `/paperclip/` volume persist across deploys
- First Claude Code invocation is slow (cold start) — environment check may timeout but still works
- Agents run as `node` user via gosu entrypoint (not root)

---

## Phase 7: Deploy as ClawNet Bot (Optional)

Only if the agent needs a live, always-on bot instance (e.g., a 24/7 support agent, a monitoring bot).

- [ ] Invoke `Skill(clawnet:clawnet-cli)` for the deployment workflow
- [ ] Initialize a BAP identity for the bot — this is its permanent on-chain identity
- [ ] Configure the bot's connection to the ClawNet network
- [ ] ClawNet repos: `~/code/clawnet` (core) and `~/code/clawnet-bot` (bot runner)
- [ ] After deployment, hand off to Johnny (`clawnet-bot:clawnet-mechanic`) for ongoing health and maintenance

Johnny handles: uptime monitoring, reconnects, key rotation, and ClawNet-specific debugging.

---

## Phase 8: Notify Martha

After any new agent is deployed:

- [ ] Tell Martha (`bopen-tools:front-desk`) about the new agent's name, trigger phrases, and delegation rules
- [ ] Martha handles routing for the team — she needs to know who's available and what they handle
- [ ] Update the `skills/front-desk/references/service-providers.md` file if Martha's routing reference needs updating

---

## Phase 9: Verify

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
| Avatars | `~/code/bopen-ai/public/images/agents/{display-name-slug}.png` |
| Plugin manifest | `~/code/prompts/.claude-plugin/plugin.json` |
| Agent roster | `~/code/prompts/skills/deploy-agent-team/references/agent-roster.md` |
| ClawNet core | `~/code/clawnet` |
| ClawNet bot runner | `~/code/clawnet-bot` |
| Bot maintenance | Johnny (`clawnet-bot:clawnet-mechanic`) |
| Routing updates | Martha (`bopen-tools:front-desk`) |
| Avatar prompts | `~/code/bopen-ai/public/images/agents/prompts.json` |
| Paperclip instance | https://paperclip.bopen.io |
| Paperclip repo | `~/code/paperclip` (b-open-io/paperclip) |
| Paperclip skill | `~/code/paperclip/skills/paperclip/SKILL.md` |
| Tortuga plugin | `~/code/tortuga-plugin` (@bopen-io/tortuga-plugin) |
| Agent working dirs | `/paperclip/.agents/{slug}` (Railway volume) |
