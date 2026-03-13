---
allowed-tools: Agent
description: Print a concise repository context snapshot for agents (git, pkg, dirs)
argument-hint: [--full] - Include dependency tree and env
---

## Your Task

If the arguments contain "--help", show this help and exit.

Otherwise, delegate ALL context gathering to a subagent. Do not read files or run commands in the main context.

Use the Agent tool with this prompt:

```
Agent(prompt: "Gather repository context and return a compact snapshot.

Run these and format the output:

1. Git: git rev-parse --show-toplevel, git remote -v (strip '(fetch)'), git describe --tags --abbrev=0 (or 'no-tags'), git branch --show-current
2. Package: If package.json exists, extract name, version, packageManager, and first 8 script names using jq
3. Dirs: ls -la (first 50 entries, strip blanks)
4. If the arguments include '--full': Also run 'bun pm ls --depth=0' for top-level deps and show NODE_ENV and XAI_API_KEY status (set/unset, never show values)

ARGUMENTS: $ARGUMENTS

Return ONLY this format:

# Repo Context

## Git
<toplevel path>
<remote url>
<latest tag or 'no-tags'>
<current branch>

## Package
<name, version, packageManager, scripts>

## Dirs
<directory listing>

[Only if --full:]
## Deps (top)
<dependency list>

## Env (selected)
NODE_ENV=[set|unset]
XAI_API_KEY=[set|unset]",
subagent_type: "general-purpose")
```

Print the subagent's response directly to the user.
