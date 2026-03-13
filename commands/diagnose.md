---
allowed-tools: Agent
description: Fan out 3-5 agents to investigate a bug from every angle simultaneously
argument-hint: <description of the problem>
---

## Your Task

If the arguments contain "--help", show this help and exit:

**diagnose** - Parallel multi-source debugging

**Usage:** `/diagnose <description of the problem>`

**Description:**
Fans out 3-5 investigation agents in parallel, each looking at the problem from a different angle. Then synthesizes findings into ranked probable causes with evidence.

**Arguments:**
- `<description>` : Describe the bug, error, or unexpected behavior

**Examples:**
- `/diagnose "API returns 500 on /users endpoint after deploying"`
- `/diagnose "Tests pass locally but fail in CI with timeout error"`
- `/diagnose "Login stopped working after updating dependencies"`

Then stop.

Otherwise, run the parallel investigation:

### Step 1: Parse the problem description

Extract from `$ARGUMENTS`:
- Error messages or symptoms
- Affected files, routes, or components (if mentioned)
- When it started (if mentioned)

### Step 2: Fan out 5 investigation agents IN PARALLEL

Launch all 5 agents in a SINGLE message (parallel execution is critical):

**Agent 1 — Code Search**
```
Agent(prompt: "PROBLEM: $ARGUMENTS

Search the codebase for anything related to this problem:
- Grep for error messages, function names, route patterns mentioned in the problem
- Find the files most likely involved
- Look for recent TODO/FIXME/HACK comments near relevant code
- Check for obvious bugs (typos, missing imports, wrong variable names)

Return: A short list of suspicious code locations with file:line references and what looks wrong.",
subagent_type: "Explore")
```

**Agent 2 — Git Archaeology**
```
Agent(prompt: "PROBLEM: $ARGUMENTS

Investigate recent git history for changes that could have caused this:
- git log --oneline -20 to see recent commits
- git diff HEAD~5 --stat to see what files changed recently
- If specific files are suspected, git blame those files
- Look for commits that touch error-related code paths

Return: A short list of suspicious commits with hash, message, and what they changed.",
subagent_type: "general-purpose")
```

**Agent 3 — Config & Environment Audit**
```
Agent(prompt: "PROBLEM: $ARGUMENTS

Check configuration and environment for misconfigurations:
- Read relevant config files (package.json, tsconfig, next.config, .env.example, etc.)
- Check for version mismatches between config and installed packages
- Look for environment variable references that might be missing
- Check build/deploy configs for issues

Return: A short list of configuration issues found, or 'No config issues found' if clean.",
subagent_type: "general-purpose")
```

**Agent 4 — Documentation & Known Issues**
```
Agent(prompt: "PROBLEM: $ARGUMENTS

Search for known issues related to this problem:
- Check CHANGELOG.md, BREAKING_CHANGES.md, or similar docs
- Look for GitHub issue templates or bug reports in the repo
- Search README.md and docs/ for mentions of the affected feature
- Check if there are migration guides relevant to the symptoms

Return: Any known issues, documented gotchas, or migration steps that relate to this problem.",
subagent_type: "Explore")
```

**Agent 5 — Dependency Analysis**
```
Agent(prompt: "PROBLEM: $ARGUMENTS

Analyze dependencies for potential causes:
- Check package.json for recently updated or suspicious dependencies
- Look for version conflicts or peer dependency warnings
- Check if any dependency has known bugs related to the symptoms
- Compare lock file age to recent changes

Return: A short list of dependency concerns, or 'Dependencies look clean' if no issues.",
subagent_type: "general-purpose")
```

### Step 3: Synthesize findings

After all agents return, combine their findings into a single diagnosis:

```
## Diagnosis: <one-line summary>

### Probable Causes (ranked by evidence)

1. **Most likely:** <cause> — <evidence from which agent(s)>
2. **Possible:** <cause> — <evidence>
3. **Unlikely but check:** <cause> — <evidence>

### Recommended Fix
<What to do first, second, third>

### Evidence Summary
- Code: <key findings from Agent 1>
- Git: <key findings from Agent 2>
- Config: <key findings from Agent 3>
- Docs: <key findings from Agent 4>
- Deps: <key findings from Agent 5>
```

Keep the diagnosis concise. Lead with the most likely cause and what to do about it.
