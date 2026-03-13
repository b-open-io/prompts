# Project Owner Hook — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A prompt-based Stop hook in the bopen-tools plugin that catches when the model dismisses errors as "pre-existing" and forces it to take ownership — either fixing them or explicitly asking the user.

**Architecture:** Single prompt-based Stop hook added to the existing `hooks/hooks.json`. The Claude Code prompt evaluator reviews the assistant's response when it tries to stop. If it detects error dismissal patterns ("pre-existing", "unrelated to our changes", "existed before", etc.), it blocks the stop and injects a system message forcing the model to address the errors. No external scripts, no API calls, no config files — just a well-crafted prompt.

**Tech Stack:** Claude Code prompt-based Stop hook, JSON config

**Limitation:** Behavior mode (ask-user vs auto-fix) is hardcoded to "ask-user" in this version. The prompt is static — it can't read settings at runtime. The generic HammerTime version solves this.

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Modify | `hooks/hooks.json` | Add Stop event with prompt-based hook |
| Modify | `.claude-plugin/plugin.json` | Bump version to 1.0.97 |

That's it. Two file changes. The entire hook is a prompt string in hooks.json.

---

## Chunk 1: Implementation

### Task 1: Add Stop Hook to hooks.json

**Files:**
- Modify: `hooks/hooks.json`

- [ ] **Step 1: Read current hooks.json**

Current structure has `SessionStart` and `PreToolUse` events. We're adding `Stop`.

- [ ] **Step 2: Add the Stop event with project-owner prompt**

Add this to the `hooks` object in `hooks/hooks.json`, after the existing `PreToolUse` block:

```json
"Stop": [
  {
    "matcher": "*",
    "hooks": [
      {
        "type": "prompt",
        "prompt": "Review the assistant's final response. Check if the assistant: (1) Dismissed, minimized, or declined to fix errors by calling them 'pre-existing', 'unrelated to our changes', 'existed before our session', 'not introduced by us', or similar language. (2) Acknowledged errors exist but chose not to fix them without asking the user. (3) Claimed 'everything looks good' or 'all tests pass' while errors were visible in recent tool output. (4) Used phrases like 'these appear to predate', 'this seems unrelated to our work', 'outside the scope of our changes'. The assistant has NO session history. It CANNOT determine whether errors are pre-existing. Any such claim is confabulation. If ANY of these patterns are detected: return decision 'block' with reason 'Error dismissal detected' and systemMessage: 'STOP. You dismissed errors without justification. You have no session history and CANNOT know whether errors are pre-existing. These may be regressions YOU introduced. You MUST either: (1) Fix the errors now, or (2) Explicitly ask the user: I found errors that I initially assumed were pre-existing. Would you like me to fix them or skip them for now? Do NOT assume errors are pre-existing. Take ownership.' If none detected: return decision 'approve'.",
        "timeout": 30
      }
    ]
  }
]
```

- [ ] **Step 3: Validate JSON syntax**

```bash
cd /Users/satchmo/code/prompts && python3 -c "import json; json.load(open('hooks/hooks.json')); print('Valid JSON')"
```

Expected: `Valid JSON`

### Task 2: Bump Plugin Version

**Files:**
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Bump version**

Change `"version": "1.0.96"` to `"version": "1.0.97"`.

### Task 3: Test the Hook

- [ ] **Step 1: Restart Claude Code**

Exit and relaunch `claude` to reload hooks.

- [ ] **Step 2: Trigger the pattern**

In a test project with known lint/type errors, ask Claude to "check the project for issues." If it dismisses errors as pre-existing, the hook should block the stop and force it to address them.

- [ ] **Step 3: Verify no false positives**

Ask Claude a normal question that doesn't involve errors. The hook should approve the stop without interference.

### Task 4: Commit

- [ ] **Step 1: Commit the changes**

```bash
cd /Users/satchmo/code/prompts
git add hooks/hooks.json .claude-plugin/plugin.json
git commit -m "OPL-xxx: Add project-owner Stop hook — catch pre-existing error dismissal"
```

---

## Pros & Cons

**Pros:**
- Dead simple — 2 file changes, no scripts
- Context-aware — LLM evaluator understands nuance, catches fuzzy patterns
- No false positives on user saying "pre-existing"
- Ships immediately

**Cons:**
- ~30s token cost per stop (prompt evaluator runs each time)
- Behavior is hardcoded (always asks user, can't auto-fix)
- Not configurable — can't add new rules without editing hooks.json
- Prompt is a long string jammed into JSON (hard to maintain)
- Single-purpose — every new "follow-up" pattern needs another hook entry
