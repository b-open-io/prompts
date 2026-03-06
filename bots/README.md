## Bot Manifests

This directory defines the canonical bot deployment metadata for agents in this
repo.

It is support metadata only. It is not a Claude plugin auto-discovery
component like `agents/`, `commands/`, `skills/`, or `hooks/`.

Use these manifests to answer:

- which agent file is the authored source of truth
- which bot slug is used for deployment
- which display name is user-facing
- which template the bot should start from
- which workspace path currently hosts the generated bot

### Naming Contract

- `agent_id`: stable agent identifier from `agents/*.md`
- `bot_slug`: stable deployment/runtime identifier
- `display_name`: human-facing persona name
- `role`: capability class, not a filename or persona
- `avatar_slug`: expected `bopen-ai` image slug derived from the display name

### Source-of-Truth Rule

- `agents/*.md` is the authored persona and routing layer
- `bots/*.bot.json` is the deployment metadata layer
- `clawnet-bot/templates/*` is the runtime template layer
- `.agents/*` is generated/runtime workspace material, not the canonical source

### Current State

This repo still tracks `.agents/*` workspaces for Martha and the public account
manager. Treat those as transitional until generation from manifests is formalized.
