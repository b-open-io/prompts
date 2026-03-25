---
schema: agentcompanies/v1
name: bOpen
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
tags:
  - ai-agents
  - bsv
  - blockchain
  - claude-code
homepage: https://bopen.io
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
