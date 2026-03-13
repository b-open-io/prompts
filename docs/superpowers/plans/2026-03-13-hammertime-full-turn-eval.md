# HammerTime Full-Turn Evaluation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evaluate ALL assistant messages since the user's last message at Stop time, not just `last_assistant_message`.

**Architecture:** Read the current session's JSONL transcript file backwards at Stop time. Extract all assistant text blocks since the last `type: "user"` entry. Concatenate and score the full turn. Falls back to `last_assistant_message` if transcript is unavailable.

**Tech Stack:** Python 3 stdlib only (json, os, pathlib). No new dependencies.

---

## File Structure

| File | Role |
|------|------|
| `hooks/hammertime.py` | **Modify** — Add `collect_turn_messages()` function, update `main()` to use it |
| `skills/hammertime/SKILL.md` | **Modify** — Document the `evaluate_full_turn` rule option |
| `skills/hammertime/references/rule-design.md` | **Modify** — Add guidance on full-turn vs last-message evaluation |
| `.claude-plugin/plugin.json` | **Modify** — Bump 1.1.0 → 1.1.1 |

No new files. No new dependencies. No schema changes to `rules.json` (the new `evaluate_full_turn` field is optional and backward-compatible).

---

## Context: JSONL Transcript Format

Claude Code writes session transcripts to `~/.claude/projects/{mangled-cwd}/{session-id}.jsonl`. Each line is a JSON object with:

- `type`: `"assistant"`, `"user"`, `"progress"`, `"system"`, `"file-history-snapshot"`, `"queue-operation"`
- `sessionId`: UUID matching the filename
- `message.role`: `"assistant"` or `"user"` (only on type `"assistant"` and `"user"`)
- `message.content`: string or array of content blocks (`{type: "text", text: "..."}` or `{type: "tool_use", ...}`)
- `cwd`: working directory (e.g., `/Users/satchmo/code/prompts`)

**Key observations:**
- The CWD maps to the project dir: `/Users/satchmo/code/prompts` → `-Users-satchmo-code-prompts`
- Session files range from 500KB to 17MB — must read from the end, never slurp the whole file
- The filename IS the sessionId (e.g., `7d5d184f-...-.jsonl`)
- We only need entries since the last `type: "user"` entry — typically the last 5-50 lines

---

## Chunk 1: Core Implementation

### Task 1: Add `find_transcript()` function

**Files:**
- Modify: `hooks/hammertime.py` (after the `debug_log` function, before `main`)

This function locates the current session's JSONL transcript file. Strategy:
1. Derive the project dir from CWD: `~/.claude/projects/{cwd.replace('/', '-')}/`
2. Find the most recently modified `.jsonl` file in that directory
3. Return the path, or `None` if not found

- [ ] **Step 1: Write `find_transcript()` implementation**

Add after the `debug_log` function (line ~243):

```python
def find_transcript(cwd=None):
    """Find the most recently modified JSONL transcript for the current project.

    Returns the file path, or None if not found.
    """
    if cwd is None:
        cwd = os.getcwd()

    # CWD → project dir: /Users/satchmo/code/prompts → -Users-satchmo-code-prompts
    mangled = cwd.replace(os.sep, "-")
    if not mangled.startswith("-"):
        mangled = "-" + mangled

    projects_dir = os.path.expanduser(f"~/.claude/projects/{mangled}")
    if not os.path.isdir(projects_dir):
        debug_log(f"TRANSCRIPT: project dir not found: {projects_dir}")
        return None

    # Find most recently modified .jsonl file
    best_path = None
    best_mtime = 0
    try:
        for entry in os.scandir(projects_dir):
            if entry.name.endswith(".jsonl") and entry.is_file():
                mt = entry.stat().st_mtime
                if mt > best_mtime:
                    best_mtime = mt
                    best_path = entry.path
    except OSError:
        debug_log("TRANSCRIPT: failed to scan project dir")
        return None

    if best_path:
        debug_log(f"TRANSCRIPT: found {os.path.basename(best_path)}")
    else:
        debug_log("TRANSCRIPT: no .jsonl files found")

    return best_path
```

- [ ] **Step 2: Verify it doesn't break existing behavior**

No test to run — this is a pure addition. Move to next task.

---

### Task 2: Add `collect_turn_messages()` function

**Files:**
- Modify: `hooks/hammertime.py` (after `find_transcript`, before `main`)

This function reads the JSONL backwards, collecting all assistant text content since the last user message. It reads from the end of the file to avoid loading 17MB files into memory.

- [ ] **Step 1: Write `collect_turn_messages()` implementation**

Add after `find_transcript`:

```python
def collect_turn_messages(transcript_path):
    """Read transcript backwards, collect assistant text since last user message.

    Returns concatenated text from all assistant messages in the current turn,
    or None if reading fails.
    """
    try:
        file_size = os.path.getsize(transcript_path)
    except OSError:
        return None

    # Read from the end — we only need the last turn
    # Read in chunks to handle large files efficiently
    CHUNK_SIZE = 256 * 1024  # 256KB chunks — enough for most turns
    MAX_READ = 2 * 1024 * 1024  # 2MB max — safety cap

    try:
        with open(transcript_path, "rb") as f:
            # Seek to near end of file
            start_pos = max(0, file_size - MAX_READ)
            f.seek(start_pos)
            tail = f.read().decode("utf-8", errors="replace")
    except (OSError, UnicodeDecodeError):
        debug_log("TRANSCRIPT: failed to read file")
        return None

    # Parse lines in reverse to find last user message, collect assistant text
    lines = tail.strip().split("\n")
    assistant_texts = []

    for line in reversed(lines):
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue

        entry_type = obj.get("type", "")

        # Stop at the last user message — we have the full turn
        if entry_type == "user":
            break

        # Collect assistant text content
        if entry_type == "assistant":
            msg = obj.get("message", {})
            if msg.get("role") != "assistant":
                continue
            content = msg.get("content", "")
            if isinstance(content, str) and content:
                assistant_texts.append(content)
            elif isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        text = block.get("text", "")
                        if text:
                            assistant_texts.append(text)

    if not assistant_texts:
        debug_log("TRANSCRIPT: no assistant text found in current turn")
        return None

    # Reverse to chronological order, join with newlines
    assistant_texts.reverse()
    full_text = "\n\n".join(assistant_texts)
    debug_log(f"TRANSCRIPT: collected {len(assistant_texts)} assistant blocks, {len(full_text)} chars")
    return full_text
```

**Design decisions:**
- **256KB chunk / 2MB max read**: Most turns are well under 256KB. The 2MB cap prevents pathological reads on 17MB sessions where the user hasn't typed in ages.
- **Read from end**: `seek(max(0, file_size - MAX_READ))` skips the beginning of long sessions.
- **Reverse iteration**: We want to stop at the first `type: "user"` entry going backwards — that's the boundary of the current turn.
- **Returns `None` on failure**: Caller falls back to `last_assistant_message`.

- [ ] **Step 2: Verify it doesn't break existing behavior**

No test to run — this is a pure addition. Move to next task.

---

### Task 3: Update `main()` to use full-turn evaluation

**Files:**
- Modify: `hooks/hammertime.py:246-311` (the `main` function)

The change is minimal: after reading `last_assistant_message`, try to collect the full turn from the transcript. If successful, use it as the text to score. If not, fall back to `last_assistant_message` (existing behavior).

Rules opt into full-turn evaluation with `"evaluate_full_turn": true`. Rules without this field (or `false`) use `last_assistant_message` only — preserving backward compatibility.

- [ ] **Step 1: Update `main()` to attempt full-turn collection**

Replace the text extraction section in `main()`. The current code (lines 262-267):

```python
    text = hook_input.get("last_assistant_message", "")
    if not text:
        debug_log("EXIT: no last_assistant_message")
        sys.exit(0)

    debug_log(f"MESSAGE length: {len(text)} chars")
```

Replace with:

```python
    last_msg = hook_input.get("last_assistant_message", "")
    if not last_msg:
        debug_log("EXIT: no last_assistant_message")
        sys.exit(0)

    debug_log(f"LAST_MSG length: {len(last_msg)} chars")

    # Attempt to collect full turn from transcript
    full_turn_text = None
    transcript_path = find_transcript()
    if transcript_path:
        full_turn_text = collect_turn_messages(transcript_path)
```

- [ ] **Step 2: Update scoring loop to use appropriate text per rule**

Replace the scoring section. The current code (lines 274-278):

```python
    # Three-layer scoring
    scored = score_message(text, rules)
    debug_log(f"SCORED: {len(scored)} rules with score > 0")
    if not scored:
        sys.exit(0)
```

Replace with:

```python
    # Split rules by evaluation mode
    full_turn_rules = []
    last_msg_rules = []
    for rule in rules:
        if rule.get("evaluate_full_turn") and full_turn_text:
            full_turn_rules.append(rule)
        else:
            last_msg_rules.append(rule)

    # Score each group against appropriate text
    scored = []
    if last_msg_rules:
        scored.extend(score_message(last_msg, last_msg_rules))
    if full_turn_rules:
        debug_log(f"FULL_TURN: scoring {len(full_turn_rules)} rules against {len(full_turn_text)} chars")
        scored.extend(score_message(full_turn_text, full_turn_rules))

    debug_log(f"SCORED: {len(scored)} rules with score > 0")
    if not scored:
        sys.exit(0)
```

- [ ] **Step 3: Update phase2 Haiku call to pass appropriate text**

In the evaluation loop, the text passed to `phase2_haiku_evaluate` needs to match what was scored. Replace lines 280-307:

```python
    # Evaluate each scored rule
    for rule, score, breakdown in scored:
        threshold = rule.get("confidence_threshold", 5)
        # Use full turn text for full_turn rules, last_msg otherwise
        eval_text = full_turn_text if rule.get("evaluate_full_turn") and full_turn_text else last_msg
        debug_log(f"SCORE: rule '{rule['name']}' score={score} (kw={breakdown['kw']}, intent={breakdown['intent']}, cluster={breakdown['cluster']})")

        if score >= threshold:
            debug_log(f"BLOCK: score {score} >= {threshold}, skipping Phase 2")
            msg = build_block_message(rule)
            output = {
                "decision": "block",
                "reason": f"HammerTime rule '{rule['name']}' violated (score={score})",
                "systemMessage": msg,
            }
            print(json.dumps(output))
            sys.exit(0)
        else:
            debug_log(f"PHASE2: score {score} < {threshold}, verifying with Haiku")
            violated = phase2_haiku_evaluate(eval_text, rule)
            debug_log(f"PHASE2: rule '{rule['name']}' violated={violated}")
            if violated:
                msg = build_block_message(rule)
                output = {
                    "decision": "block",
                    "reason": f"HammerTime rule '{rule['name']}' violated (score={score}, haiku=yes)",
                    "systemMessage": msg,
                }
                print(json.dumps(output))
                sys.exit(0)
```

- [ ] **Step 4: Update the builtin project-owner rule to use full turn**

In the `BUILTIN_RULES` list (line 62-81), add `"evaluate_full_turn": True`:

```python
    {
        "name": "project-owner",
        ...
        "skill": None,
        "builtin": True,
        "evaluate_full_turn": True,
    }
```

This is the rule that benefits most — the model often dismisses errors in an early message, then the final message just says "Done."

- [ ] **Step 5: Update module docstring**

Update the docstring at the top (lines 1-24) to mention the full-turn capability:

```python
"""HammerTime — Stop hook that catches bad model behaviors via user-defined rules.

Three-layer scored detection:
  Layer 1 (keywords): +1 per keyword hit
  Layer 2 (intent patterns): +2 per regex match on dismissal structure
  Layer 3 (sentence co-occurrence): +3 if dismissal verb + qualifier in same sentence

Score → decision:
  0     → EXIT (no match)
  1-4   → Phase 2 Haiku verification (ambiguous signal)
  5+    → BLOCK directly (skip Haiku, save ~500ms)

Rules come from two sources:
  1. BUILTIN_RULES (hardcoded below)
  2. User rules in ~/.claude/hammertime/rules.json

Stop hook input (from Claude Code):
  - last_assistant_message: the model's final response text
  - stop_hook_active: true if already continuing from a prior Stop hook

Full-turn evaluation (opt-in per rule):
  When a rule has "evaluate_full_turn": true, the hook reads the session
  transcript (~/.claude/projects/{cwd}/*.jsonl) to collect ALL assistant
  messages since the user's last message. This catches violations that
  occur in intermediate responses (between tool calls), not just the
  final message. Falls back to last_assistant_message if transcript
  is unavailable.

Block output format:
  {"decision": "block", "reason": "...", "systemMessage": "..."}
"""
```

- [ ] **Step 6: Commit**

```bash
git add hooks/hammertime.py
git commit -m "OPL-989: Add full-turn evaluation to HammerTime

Reads session transcript JSONL backwards to collect all assistant
messages since the user's last message. Rules opt in with
evaluate_full_turn: true. Falls back to last_assistant_message
if transcript unavailable. Built-in project-owner rule enabled."
```

---

## Chunk 2: Documentation Updates

### Task 4: Update SKILL.md with `evaluate_full_turn` field

**Files:**
- Modify: `skills/hammertime/SKILL.md`

- [ ] **Step 1: Add `evaluate_full_turn` to the Rule Schema section**

In the "Optional fields" list after `skill`, add:

```markdown
- `evaluate_full_turn` — Boolean. When `true`, scores ALL assistant messages since the user's last message (reads session transcript). When `false` or omitted, scores only the final assistant message. Default: `false`.
```

Also add it to the JSON example in the schema section:

```json
  "skill": null,
  "evaluate_full_turn": true
```

- [ ] **Step 2: Add a "Full-Turn vs Last-Message Evaluation" section**

Add after the "Mode Inference" section:

```markdown
## Full-Turn vs Last-Message Evaluation

By default, HammerTime scores only the final assistant message — the last text block before stopping. This is fast and catches most violations.

But some violations happen in **intermediate messages** — the model dismisses an error in message 3, then the final message just says "Done. All changes committed." The final message alone wouldn't trigger the rule.

Set `"evaluate_full_turn": true` on a rule to score ALL assistant text since the user's last message. The hook reads the session transcript (JSONL) backwards to collect the full turn.

**When to use full-turn evaluation:**
- Rules about dismissing or skipping work (the dismissal often happens mid-turn)
- Rules about process violations (skipping tests, not running linter — happens during execution, not at the end)
- Rules where the final message is typically a summary that hides the violation

**When last-message is sufficient:**
- Rules about response format (trailing summaries, emoji usage)
- Rules about the final output (code style, naming)
- Simple rules with specific trigger phrases

**Performance:** Full-turn evaluation adds ~50-200ms of file I/O (reads last 2MB of transcript). Well within the 15-second hook timeout.
```

- [ ] **Step 3: Commit**

```bash
git add skills/hammertime/SKILL.md
git commit -m "OPL-989: Document evaluate_full_turn in HammerTime skill"
```

---

### Task 5: Update references/rule-design.md

**Files:**
- Modify: `skills/hammertime/references/rule-design.md`

- [ ] **Step 1: Add full-turn guidance to the case study**

In the `project-owner` case study section, add a note explaining why it uses `evaluate_full_turn: true`:

```markdown
### Full-Turn Evaluation

The project-owner rule sets `"evaluate_full_turn": true` because dismissal typically happens mid-turn. The model encounters an error during tool use, says "this appears to predate our changes" in message 3, then the final message just summarizes what was done. Scoring only the final message would miss the violation entirely.
```

- [ ] **Step 2: Commit**

```bash
git add skills/hammertime/references/rule-design.md
git commit -m "OPL-989: Add full-turn guidance to rule design reference"
```

---

### Task 6: Update examples/rules.json

**Files:**
- Modify: `skills/hammertime/examples/rules.json`

- [ ] **Step 1: Add `evaluate_full_turn` to the project-owner example**

In the project-owner rule object, add:

```json
  "evaluate_full_turn": true
```

- [ ] **Step 2: Add it to one other example to show the contrast**

The `fix-lint-errors` rule should also use `"evaluate_full_turn": true` (lint dismissal happens mid-turn).

The `use-tdd-for-testing` rule can keep the default (TDD violation is evident in the final message saying "I wrote the implementation first").

- [ ] **Step 3: Commit**

```bash
git add skills/hammertime/examples/rules.json
git commit -m "OPL-989: Add evaluate_full_turn to example rules"
```

---

### Task 7: Bump plugin version

**Files:**
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Bump 1.1.0 → 1.1.1**

```json
"version": "1.1.1"
```

- [ ] **Step 2: Final commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "OPL-989: Bump plugin to 1.1.1 (HammerTime full-turn evaluation)"
```

---

## Verification

After implementation, verify:

1. **Backward compatibility**: Rules without `evaluate_full_turn` still work exactly as before (score `last_assistant_message` only)
2. **Fallback**: If transcript file isn't found (new project, permissions issue), falls back to `last_assistant_message` gracefully
3. **Performance**: Full-turn read adds <200ms on a typical session. Check with `HAMMERTIME_DEBUG`.
4. **Debug logging**: Shows `TRANSCRIPT:` prefixed log lines with file found, blocks collected, char count
5. **No new dependencies**: Python stdlib only (json, os, pathlib)
6. **Large file safety**: The 2MB read cap prevents loading a 17MB transcript into memory
7. **Partial line handling**: If `seek()` lands mid-line, the first partial line is safely skipped by `json.loads()` failure
