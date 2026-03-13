# HammerTime — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

> *"Stop. HammerTime."* — A Stop hook system to hammer out bugs and mistakes automatically.

**Goal:** A generic follow-up hook framework for the bopen-tools plugin. Users describe what behaviors to catch at stop time, and HammerTime evaluates the assistant's response against those rules. Ships with "project-owner" as the first built-in rule. New rules can be added via slash command.

**Architecture:** Two-phase detection inspired by linear-sync. A command-based Stop hook script reads a rules file, scans the transcript for keyword triggers (fast phase), and only invokes LLM evaluation (via the Anthropic API with Haiku) when a keyword match is found (expensive phase). Rules are stored in `~/.claude/hammertime/rules.json` — a single file the slash command manages. Each rule has: a name, trigger keywords, an LLM evaluation prompt, an action mode (ask-user / auto-fix), and an enabled toggle.

**Tech Stack:** Bash + Python command hook, Anthropic API (Haiku), JSON rules file, Claude Code slash command

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Create | `hooks/hammertime.sh` | Command-based Stop hook — two-phase detection |
| Create | `hooks/hammertime-rules-builtin.json` | Built-in rules that ship with the plugin (project-owner, etc.) |
| Create | `commands/hammertime.md` | Slash command to manage rules (add, remove, list, toggle) |
| Modify | `hooks/hooks.json` | Add Stop event pointing to hammertime.sh |
| Modify | `.claude-plugin/plugin.json` | Bump version |

User rules file (created on first use, not shipped):
- `~/.claude/hammertime/rules.json`

---

## Rules File Format

```json
{
  "version": 1,
  "defaultMode": "ask-user",
  "rules": [
    {
      "name": "project-owner",
      "description": "Catches when the model dismisses errors as pre-existing",
      "enabled": true,
      "mode": "ask-user",
      "keywords": ["pre-existing", "preexisting", "pre existing", "predate", "predates", "unrelated to our", "existed before", "not introduced by", "outside the scope"],
      "prompt": "Did the assistant dismiss, minimize, or decline to fix errors/warnings/failures by claiming they are pre-existing, unrelated, or outside scope? The assistant has NO session history and CANNOT know what is pre-existing.",
      "blockMessage": "You dismissed errors without justification. You have no session history and CANNOT know whether errors are pre-existing. You MUST either: (1) Fix the errors now, or (2) Ask the user: 'I found errors I initially assumed were pre-existing. Want me to fix them or skip for now?'",
      "builtin": true
    }
  ]
}
```

**Rule fields:**
- `name` — unique identifier, kebab-case
- `description` — human-readable explanation (shown in /hammertime list)
- `enabled` — toggle on/off without deleting
- `mode` — `"ask-user"` (default: ask before fixing) or `"auto-fix"` (block and tell model to fix immediately)
- `keywords` — fast-pass trigger words. If NONE match the transcript, skip LLM evaluation entirely. Empty array = always evaluate (expensive).
- `prompt` — the question asked to Haiku when keywords match. Should be answerable with yes/no.
- `blockMessage` — system message injected when the rule triggers. Supports `{mode}` placeholder for ask-user vs auto-fix behavior.
- `builtin` — true for rules shipped with plugin (managed in `hammertime-rules-builtin.json`)

---

## Chunk 1: Core Hook Script

### Task 1: Create the hammertime.sh Stop hook

**Files:**
- Create: `hooks/hammertime.sh`

- [ ] **Step 1: Write the hook script skeleton**

```bash
#!/usr/bin/env bash
# hammertime.sh — "Stop. HammerTime."
# Command-based Stop hook: two-phase detection of assistant misbehavior.
# Phase 1: Fast keyword scan on transcript (free, <1s)
# Phase 2: LLM evaluation via Haiku (only if keywords matched, ~3-5s)
set -euo pipefail

INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')

if [[ -z "$TRANSCRIPT_PATH" || ! -f "$TRANSCRIPT_PATH" ]]; then
  exit 0  # No transcript, nothing to check
fi

PLUGIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILTIN_RULES="$PLUGIN_ROOT/hooks/hammertime-rules-builtin.json"
USER_RULES="$HOME/.claude/hammertime/rules.json"

# Merge rules: builtin + user
exec python3 "$PLUGIN_ROOT/hooks/hammertime-eval.py" \
  "$TRANSCRIPT_PATH" "$BUILTIN_RULES" "$USER_RULES"
```

- [ ] **Step 2: Write the hammertime-eval.py evaluator**

```python
#!/usr/bin/env python3
"""HammerTime evaluator — two-phase Stop hook detection."""
import json
import os
import re
import sys
import urllib.request

def load_rules(builtin_path, user_path):
    """Merge builtin and user rules. User rules override builtin by name."""
    rules = {}
    for path in [builtin_path, user_path]:
        if not os.path.isfile(path):
            continue
        with open(path) as f:
            data = json.load(f)
        for rule in data.get("rules", []):
            rules[rule["name"]] = rule
    return [r for r in rules.values() if r.get("enabled", True)]


def get_recent_transcript(transcript_path, tail_chars=8000):
    """Read the tail of the transcript for keyword scanning."""
    with open(transcript_path) as f:
        f.seek(0, 2)
        size = f.tell()
        start = max(0, size - tail_chars)
        f.seek(start)
        return f.read()


def phase1_keyword_scan(text, rules):
    """Fast keyword match. Returns rules whose keywords matched."""
    text_lower = text.lower()
    triggered = []
    for rule in rules:
        keywords = rule.get("keywords", [])
        if not keywords:
            triggered.append(rule)  # No keywords = always evaluate
            continue
        for kw in keywords:
            if kw.lower() in text_lower:
                triggered.append(rule)
                break
    return triggered


def phase2_llm_evaluate(transcript_tail, rule):
    """Call Haiku to evaluate whether the rule actually triggered."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return False  # No API key, can't evaluate — fail open

    prompt = f"""You are a quality gate evaluating an AI assistant's response.

Question: {rule['prompt']}

Here is the end of the conversation transcript:
<transcript>
{transcript_tail[-4000:]}
</transcript>

Answer with ONLY "yes" or "no". Nothing else."""

    body = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 8,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            answer = result["content"][0]["text"].strip().lower()
            return answer.startswith("yes")
    except Exception:
        return False  # Fail open — don't block on API errors


def main():
    transcript_path, builtin_path, user_path = sys.argv[1], sys.argv[2], sys.argv[3]

    rules = load_rules(builtin_path, user_path)
    if not rules:
        sys.exit(0)

    transcript_tail = get_recent_transcript(transcript_path)

    # Phase 1: Fast keyword scan
    triggered = phase1_keyword_scan(transcript_tail, rules)
    if not triggered:
        sys.exit(0)

    # Phase 2: LLM evaluation for each triggered rule
    violations = []
    for rule in triggered:
        if phase2_llm_evaluate(transcript_tail, rule):
            violations.append(rule)

    if not violations:
        sys.exit(0)

    # Build combined block message
    messages = []
    for v in violations:
        mode = v.get("mode", "ask-user")
        msg = v.get("blockMessage", f"Rule '{v['name']}' triggered.")
        if mode == "auto-fix":
            msg += " Fix these issues NOW before stopping."
        messages.append(f"[HammerTime/{v['name']}] {msg}")

    combined = "\n\n".join(messages)
    output = json.dumps({
        "decision": "block",
        "reason": f"HammerTime: {len(violations)} rule(s) triggered",
        "systemMessage": combined
    })
    print(output)
    sys.exit(0)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Make hammertime.sh executable**

```bash
chmod +x /Users/satchmo/code/prompts/hooks/hammertime.sh
```

- [ ] **Step 4: Validate the Python script syntax**

```bash
python3 -c "import py_compile; py_compile.compile('/Users/satchmo/code/prompts/hooks/hammertime-eval.py', doraise=True); print('OK')"
```

Expected: `OK`

---

## Chunk 2: Built-in Rules & Hook Registration

### Task 2: Create built-in rules file

**Files:**
- Create: `hooks/hammertime-rules-builtin.json`

- [ ] **Step 1: Write the built-in rules**

```json
{
  "version": 1,
  "rules": [
    {
      "name": "project-owner",
      "description": "Catches when the model dismisses errors as pre-existing instead of fixing them",
      "enabled": true,
      "mode": "ask-user",
      "keywords": [
        "pre-existing",
        "preexisting",
        "pre existing",
        "predate",
        "predates",
        "unrelated to our",
        "existed before",
        "not introduced by",
        "outside the scope",
        "nothing to do with our",
        "not caused by",
        "was already"
      ],
      "prompt": "Did the assistant dismiss, minimize, or decline to fix errors, warnings, test failures, or issues by claiming they are pre-existing, unrelated to the current work, or outside scope? Did the assistant claim things look good while errors are visible in tool output? The assistant has NO session history and CANNOT know what is truly pre-existing.",
      "blockMessage": "You dismissed errors without justification. You have no session history and CANNOT know whether errors are pre-existing — these may be regressions YOU introduced. You MUST either: (1) Fix the errors now, or (2) Ask the user: 'I found errors I initially assumed were pre-existing. Want me to fix them or skip for now?' Do NOT assume errors are pre-existing. Take ownership.",
      "builtin": true
    }
  ]
}
```

### Task 3: Register Stop hook in hooks.json

**Files:**
- Modify: `hooks/hooks.json`

- [ ] **Step 1: Add Stop event**

Add after the `PreToolUse` block:

```json
"Stop": [
  {
    "matcher": "*",
    "hooks": [
      {
        "type": "command",
        "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/hammertime.sh",
        "timeout": 15
      }
    ]
  }
]
```

- [ ] **Step 2: Validate hooks.json syntax**

```bash
python3 -c "import json; json.load(open('/Users/satchmo/code/prompts/hooks/hooks.json')); print('Valid')"
```

---

## Chunk 3: Slash Command

### Task 4: Create /hammertime command

**Files:**
- Create: `commands/hammertime.md`

- [ ] **Step 1: Write the slash command**

The `/hammertime` command manages rules. It supports these subcommands:
- `/hammertime` or `/hammertime list` — show all rules with status
- `/hammertime add` — interactively create a new rule
- `/hammertime toggle <name>` — enable/disable a rule
- `/hammertime remove <name>` — delete a user rule (can't delete builtins)
- `/hammertime mode <name> <ask-user|auto-fix>` — change a rule's action mode

The command file is a prompt that instructs Claude to read and modify `~/.claude/hammertime/rules.json`. It initializes the file from builtins on first use.

```markdown
---
name: hammertime
description: "Manage HammerTime follow-up rules — Stop hook system that catches assistant misbehavior"
allowed-tools: Read, Write, Edit, Bash, Glob
---

# HammerTime Rule Manager

*"Stop. HammerTime."*

You are managing HammerTime follow-up rules. These are Stop hook rules that evaluate the assistant's
response before it finishes, catching patterns like dismissing errors as "pre-existing."

## Rules File

- **Built-in rules:** `${CLAUDE_PLUGIN_ROOT}/hooks/hammertime-rules-builtin.json` (read-only)
- **User rules:** `~/.claude/hammertime/rules.json` (read-write, create if missing)

User rules override built-in rules by name. To disable a built-in rule, create a user rule with
the same name and `"enabled": false`.

## What the User Asked

Parse the user's input after `/hammertime` to determine the subcommand:

- **No args or "list"**: Read both files. Display a table of all rules showing: name, enabled, mode, description. Mark builtins with [builtin].
- **"add"**: Ask the user to describe the behavior they want to catch. Then create a rule with: name (kebab-case), description, keywords (for fast-pass), prompt (yes/no question for Haiku), blockMessage (what to tell the model), mode (ask-user or auto-fix). Write to user rules file.
- **"toggle <name>"**: Toggle the enabled field. If it's a builtin, create a user override.
- **"remove <name>"**: Remove from user rules. Cannot remove builtins (suggest toggle instead).
- **"mode <name> <mode>"**: Set mode to ask-user or auto-fix. If builtin, create user override.

## Rule Schema

Each rule in the `rules` array:

```json
{
  "name": "kebab-case-name",
  "description": "Human-readable description",
  "enabled": true,
  "mode": "ask-user",
  "keywords": ["fast", "trigger", "words"],
  "prompt": "Yes/no question for Haiku evaluator",
  "blockMessage": "System message injected when rule triggers",
  "builtin": false
}
```

## Important
- Always initialize `~/.claude/hammertime/rules.json` if it doesn't exist (with `{"version": 1, "rules": []}`)
- Preserve existing rules when adding/modifying
- After changes, remind the user: "Restart Claude Code for hook changes to take effect."
```

---

## Chunk 4: Version Bump & Testing

### Task 5: Bump version

**Files:**
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Bump to 1.0.97**

### Task 6: Manual testing

- [ ] **Step 1: Restart Claude Code to load new hooks**

- [ ] **Step 2: Test keyword detection (Phase 1)**

In a project with lint errors, ask Claude to check for issues. If it says "pre-existing", the keyword scan should trigger.

- [ ] **Step 3: Test LLM evaluation (Phase 2)**

Verify Haiku is called and returns yes/no correctly. Check that the block message appears.

- [ ] **Step 4: Test /hammertime list**

Run `/hammertime` — should show the project-owner rule as [builtin] enabled.

- [ ] **Step 5: Test /hammertime add**

Create a test rule, verify it appears in `~/.claude/hammertime/rules.json`.

- [ ] **Step 6: Test /hammertime toggle**

Disable project-owner, verify it stops triggering.

### Task 7: Commit

- [ ] **Step 1: Stage and commit**

```bash
cd /Users/satchmo/code/prompts
git add hooks/hammertime.sh hooks/hammertime-eval.py hooks/hammertime-rules-builtin.json hooks/hooks.json commands/hammertime.md .claude-plugin/plugin.json
git commit -m "OPL-xxx: Add HammerTime — Stop hook system to catch assistant misbehavior"
```

---

## Comparison: Project-Owner vs HammerTime

| Aspect | Project-Owner (specific) | HammerTime (generic) |
|--------|-------------------------|---------------------|
| **Files changed** | 2 | 6 (3 new, 3 modified) |
| **Complexity** | Trivial — one prompt string | Medium — script + evaluator + rules + command |
| **Catches "pre-existing"** | Yes | Yes (as built-in rule) |
| **Catches fuzzy patterns** | Yes (prompt evaluator) | Yes (Haiku evaluation) |
| **Configurable mode** | No (always ask-user) | Yes (ask-user / auto-fix per rule) |
| **Add new rules** | Edit hooks.json manually | `/hammertime add` |
| **Toggle rules** | Remove from hooks.json | `/hammertime toggle` |
| **Token cost** | ~prompt eval per stop | Only when keywords match (Phase 1 gate) |
| **API dependency** | None (uses built-in prompt eval) | ANTHROPIC_API_KEY for Haiku calls |
| **Time to ship** | 10 minutes | 1-2 hours |
| **Future extensibility** | None — single-purpose | Unlimited — any behavior pattern |

**Recommendation:** Build HammerTime. The project-owner rule ships as a built-in, so you get both. The generic framework pays for itself the second time you think "I wish the model would stop doing X." The two-phase detection (fast keyword scan + conditional Haiku eval) keeps costs low, and the slash command makes it self-service.
