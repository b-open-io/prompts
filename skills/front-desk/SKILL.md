---
name: front-desk
version: 1.0.3
description: >-
  This skill should be used in Claude Code or Codex when the user asks "who
  handles X?", "what agents are available?", "how do I contact Y?", "team
  roster", "what services do we use?", "who should I talk to about Z?", "what
  skills are available?", "where do I find skill X?", or needs help routing to
  the right agent or service provider. Also use when checking agent-adapter
  availability, finding/installing skills, sending emails on behalf of the org,
  or drafting communications. Route SOC 2,
  audit readiness, policy drafting, and evidence-gathering questions to Anthony
  in product-skills, with Paul in bopen-tools for technical control validation.
user-invocable: false
---

# Front Desk

Organization directory and routing service. Find the right agent, service, or contact for any task.

## Quick Routing

Match the user's need to the right specialist:

| Need | Agent | Plugin |
|------|-------|--------|
| BSV transactions, wallets | **David** (bitcoin) | bsv-skills |
| Ordinals, NFTs, tokens | **Uno Satoj** (ordinals) | 1sat-skills |
| Agent architecture | **Satchmo** (agent-builder) | bopen-tools |
| UI/UX design | **Ridd** (designer) | bopen-tools |
| Performance | **Torque** (optimizer) | bopen-tools |
| Security audit | **Jerry** (code-auditor) | bopen-tools |
| Architecture review | **Kayle** (architecture-reviewer) | bopen-tools |
| Next.js / React | **Theo** (nextjs) | bopen-tools |
| Tests / QA | **Jason** (tester) | bopen-tools |
| Documentation | **Flow** (documentation-writer) | bopen-tools |
| Marketing / copy | **Caal** (marketer) | product-skills |
| Legal compliance, SOC 2, policy drafting | **Anthony** (legal) | product-skills |
| SEO | **Rook** (seo) | product-skills |
| Auth / identity | **Siggy** (sigma-auth-guide) | sigma-auth |
| Payments | **Mina** (payments) | bopen-tools |
| DevOps / deploy | **Root** (devops) | bopen-tools |
| Database | **Idris** (database) | bopen-tools |
| MCP servers | **Orbit** (mcp) | bopen-tools |
| Research | **Parker** (researcher) | bopen-tools |
| 3D / creative dev | **Kris** (creative-developer) | bopen-tools |
| Mobile | **Kira** (mobile) | bopen-tools |
| Audio / media | **Frames** (audio-specialist) | bopen-tools |
| Data pipelines | **Data Accumulator** (data) | bopen-tools |
| Project mgmt | **Wags** (project-manager) | bopen-tools |
| Skills / prompts | **Zack** (prompt-engineer) | bopen-tools |
| Cleanup / consolidation | **Steve** (consolidator) | bopen-tools |
| Google Workspace | **Tina** (executive-assistant) | bopen-tools |
| API integrations | **Maxim** (integration-expert) | bopen-tools |
| Send/draft emails | **Martha** (front-desk) | bopen-tools |
| Draft communications | **Martha** (front-desk) | bopen-tools |

## Dispatching Agents

Resolve the current host before dispatching. Claude and Codex use different
agent registries even when the persona and source prompt are shared.

### Claude Code

Use the plugin-qualified Claude agent ID:

```
Agent(subagent_type="bopen-tools:designer", prompt="Design a dashboard component")
Agent(subagent_type="bsv-skills:bitcoin", prompt="Build a BSV transaction")
Agent(subagent_type="1sat-skills:ordinals", prompt="Mint an ordinal inscription")
```

### Codex

Use an installed Codex custom agent named `bopen_<agent_name>`, for example:

| Persona | Claude agent ID | Codex custom agent |
|---------|-----------------|--------------------|
| Satchmo | `bopen-tools:agent-builder` | `bopen_agent_builder` |
| Ridd | `bopen-tools:designer` | `bopen_designer` |
| Jerry | `bopen-tools:code-auditor` | `bopen_code_auditor` |
| Kayle | `bopen-tools:architecture-reviewer` | `bopen_architecture_reviewer` |
| Jason | `bopen-tools:tester` | `bopen_tester` |
| Flow | `bopen-tools:documentation-writer` | `bopen_documentation_writer` |
| Parker | `bopen-tools:researcher` | `bopen_researcher` |
| Zack | `bopen-tools:prompt-engineer` | `bopen_prompt_engineer` |

Ask Codex to delegate to the installed custom agent by that exact name. Do not
invent Claude `Agent(...)` call syntax in Codex; Codex chooses and spawns the
custom type through its native subagent runtime.

### Missing Codex adapters

Codex plugin installation makes the skills available, but Codex custom agents
must also be installed into a project or user agent directory. If a requested
`bopen_*` agent is not visible:

1. Say plainly that the named adapter is not installed; do not claim that the
   persona was dispatched.
2. Offer the explicit `bopen-tools:codex-agent-setup` skill. It can install the
   curated roster or all generated adapters and requires a new Codex session
   before they appear.
3. Do not run setup unless the user authorizes it; it writes regular files into
   `.codex/agents/` or `${CODEX_HOME:-~/.codex}/agents/`.
4. If the user wants to continue without setup, use a built-in Codex subagent
   with a self-contained role brief or handle the task with the matching skill.
   Label this as a fallback, not as the missing bOpen persona.

After setup, use `/agent` or the host's agent activity view to verify the named
thread actually exists before reporting that dispatch succeeded.

## Skills Directory

When an agent needs a skill, Martha knows where to find it:

The install strings below are Claude Code commands. In Codex, use the configured
Codex marketplace and `codex plugin` commands; do not present a Claude slash
command as though Codex can execute it.

| Plugin | Repo | Install |
|--------|------|---------|
| bopen-tools | b-open-io/prompts | `/plugin install bopen-tools@b-open-io` |
| bsv-skills | b-open-io/bsv-skills | `/plugin install bsv-skills@b-open-io` |
| 1sat-skills | b-open-io/1sat-skills | `/plugin install 1sat-skills@b-open-io` |
| gemskills | b-open-io/gemskills | `/plugin install gemskills@b-open-io` |
| sigma-auth | b-open-io/better-auth-plugin | `/plugin install sigma-auth@b-open-io` |
| product-skills | b-open-io/product-skills | `/plugin install product-skills@b-open-io` |
| marketing-skills | coreyhaines31/marketingskills | `/plugin install marketing-skills@coreyhaines31` |

Third-party skills: `npx skills search <keyword>` then `npx skills add <owner/repo@skill> -g`

## Reference Files

For detailed information, consult:
- **`references/service-providers.md`** — Full list of service providers, accounts, and URLs

For SOC 2 work, default routing is:
- **Anthony** for compliance framing, policy drafts, vendor/security legal review, and audit documentation
- **Paul** for technical control review, evidence quality on security controls, and remediation validation
