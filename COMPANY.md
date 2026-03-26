---
schema: agentcompanies/v1
name: bopen
display_name: "bOpen"
slug: bopen
description: Autonomous agent organization building on-chain tools, AI infrastructure, and BSV blockchain services
version: 1.0.0
license: MIT
authors:
  - name: satchmo
    url: https://github.com/rohenaz
goals:
  - Build and ship AI agent infrastructure
  - On-chain skill and agent publishing via ClawNet
  - BSV blockchain tooling and identity
  - Paperclip plugin development
color: blue
homepage: https://bopen.io
tags:
  - ai-agents
  - bsv
  - blockchain
  - claude-code
agents:
  - slug: ceo
    role: CEO
  - slug: front-desk
    role: Front Desk
    reportsTo: ceo
  - slug: project-manager
    role: Project Manager
    reportsTo: ceo
  - slug: cfo
    role: CFO
    reportsTo: ceo
  - slug: agent-builder
    role: Agent Architect
    reportsTo: ceo
  - slug: designer
    role: UI Designer
    reportsTo: project-manager
  - slug: nextjs
    role: Frontend Developer
    reportsTo: project-manager
  - slug: creative-developer
    role: 3D Developer
    reportsTo: project-manager
  - slug: mobile
    role: Mobile Developer
    reportsTo: project-manager
  - slug: cartographer
    role: Map Specialist
    reportsTo: project-manager
  - slug: database
    role: Database Engineer
    reportsTo: project-manager
  - slug: data
    role: Data Engineer
    reportsTo: project-manager
  - slug: integration-expert
    role: Integration Specialist
    reportsTo: project-manager
  - slug: payments
    role: Payments Specialist
    reportsTo: project-manager
  - slug: optimizer
    role: Performance Engineer
    reportsTo: project-manager
  - slug: consolidator
    role: Code Organizer
    reportsTo: project-manager
  - slug: tester
    role: QA Engineer
    reportsTo: project-manager
  - slug: documentation-writer
    role: Technical Writer
    reportsTo: project-manager
  - slug: prompt-engineer
    role: Prompt Engineer
    reportsTo: agent-builder
  - slug: trainer
    role: Skill Trainer
    reportsTo: agent-builder
  - slug: code-auditor
    role: Security Auditor
    reportsTo: ceo
  - slug: security-ops
    role: Security Operations
    reportsTo: code-auditor
  - slug: architecture-reviewer
    role: Architecture Reviewer
    reportsTo: ceo
  - slug: devops
    role: DevOps Engineer
    reportsTo: ceo
  - slug: researcher
    role: Research Analyst
    reportsTo: ceo
  - slug: account-manager
    role: Account Manager
    reportsTo: front-desk
  - slug: executive-assistant
    role: Executive Assistant
    reportsTo: ceo
  - slug: audio-specialist
    role: Audio Producer
    reportsTo: designer
  - slug: community-manager
    role: Community Manager
    reportsTo: front-desk
  - slug: satchmo-live
    role: Live Agent
    reportsTo: ceo
skills:
  - charting
  - linear-planning
  - npm-publish
  - confess
  - humanize
  - critique
  - runtime-context
  - remind
  - generative-ui
  - create-next-project
  - deploy-agent-team
  - hunter-skeptic-referee
  - frontend-performance
  - code-audit-scripts
  - process-cleanup
  - devops-scripts
  - check-version
  - geo-optimizer
  - reinforce-skills
  - wave-coordinator
  - mcp-apps
  - agent-onboarding
  - agent-decommissioning
  - cost-tracking
  - paperclip-plugin-dev
  - persona
---

bOpen is an autonomous AI agent organization with 31 specialized agents and 64 skills. The team is structured with a CEO at the top, reporting chains through department leads, and specialized agents for every function from frontend development to security auditing.

Agents are published to the [ClawNet on-chain registry](https://clawnet.sh) with cryptographic identity via BAP (Bitcoin Attestation Protocol). Skills follow the open [SKILL.md](https://agentskills.io) format and work across Claude Code, OpenCode, Cursor, Gemini CLI, and 20+ other tools.

Install this company into Paperclip:
```bash
paperclipai company import b-open-io/prompts
```

Or install individual agents and skills via ClawNet:
```bash
clawnet add bopen        # Install the full organization
clawnet add optimizer    # Install a single agent
```
