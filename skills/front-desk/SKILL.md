---
name: front-desk
description: "This skill should be used when the user asks 'who handles X?', 'what agents are available?', 'how do I contact Y?', 'team roster', 'what services do we use?', 'who should I talk to about Z?', or needs help routing to the right agent or service provider. Also use when connecting to live agent instances, checking availability, sending emails on behalf of the org, or drafting communications."
---

# Front Desk

Organization directory and routing service. Find the right agent, service, or contact for any task.

## Quick Routing

Match the user's need to the right specialist:

| Need | Agent | Plugin |
|------|-------|--------|
| BSV transactions, wallets | **Sato** (bitcoin) | bsv-skills |
| Ordinals, NFTs, tokens | **Glyph** (ordinals) | 1sat-skills |
| Agent architecture | **Satchmo** (agent-builder) | bopen-tools |
| UI/UX design | **Mira** (designer) | bopen-tools |
| Performance | **Torque** (optimizer) | bopen-tools |
| Security audit | **Nyx** (code-auditor) | bopen-tools |
| Architecture review | **Kayle** (architecture-reviewer) | bopen-tools |
| Next.js / React | **Nori** (nextjs) | bopen-tools |
| Tests / QA | **Iris** (tester) | bopen-tools |
| Documentation | **Flow** (documentation-writer) | bopen-tools |
| Marketing / copy | **Caal** (marketer) | bopen-tools |
| Legal compliance | **Anthony** (legal) | product-skills |
| SEO | **Rook** (seo) | product-skills |
| Auth / identity | **Siggy** (sigma-auth-guide) | sigma-auth |
| Payments | **Mina** (payments) | bopen-tools |
| DevOps / deploy | **Zoro** (devops) | bopen-tools |
| Database | **Idris** (database) | bopen-tools |
| MCP servers | **Orbit** (mcp) | bopen-tools |
| Research | **Parker** (researcher) | bopen-tools |
| Mobile | **Kira** (mobile) | bopen-tools |
| Audio / media | **Juniper** (audio-specialist) | bopen-tools |
| Data pipelines | **Mr. Data Accumulator** (data) | bopen-tools |
| Project mgmt | **Relay** (project-manager) | bopen-tools |
| Skills / prompts | **Zack** (prompt-engineer) | bopen-tools |
| Cleanup / consolidation | **Steve** (consolidator) | bopen-tools |
| Google Workspace | **Tina** (executive-assistant) | bopen-tools |
| API integrations | **Maxim** (integration-expert) | bopen-tools |
| Send/draft emails | **Martha** (front-desk) | bopen-tools |
| Draft communications | **Martha** (front-desk) | bopen-tools |

## Live Agent Instances

Agents with cloud-hosted instances available for direct interaction:

| Agent | URL | Notes |
|-------|-----|-------|
| Satchmo (Agent Builder) | satchmo.dev | Active — agent architecture, multi-agent systems |

## Dispatching Agents

To dispatch an agent from a conversation, use the Agent tool:

```
Agent(subagent_type="bopen-tools:designer", prompt="Design a dashboard component")
Agent(subagent_type="bsv-skills:bitcoin", prompt="Build a BSV transaction")
Agent(subagent_type="1sat-skills:ordinals", prompt="Mint an ordinal inscription")
```

## Reference Files

For detailed information, consult:
- **`references/service-providers.md`** — Full list of service providers, accounts, and URLs
