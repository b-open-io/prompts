#!/usr/bin/env python3
"""HammerTime — Stop hook that catches bad model behaviors via user-defined rules.

Two-phase detection:
  Phase 1 (free, <1s): Keyword scan on last_assistant_message. No match = exit 0.
  Phase 2 (cheap, ~3-5s): Haiku call for each triggered rule. Catches fuzzy variants.

Rules come from two sources:
  1. BUILTIN_RULES (hardcoded below)
  2. User rules in ~/.claude/hammertime/rules.json

Stop hook input (from Claude Code):
  - last_assistant_message: the model's final response text
  - stop_hook_active: true if already continuing from a prior Stop hook

Block output format:
  {"decision": "block", "reason": "...", "systemMessage": "..."}
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

_start_time = time.monotonic()

BUILTIN_RULES = [
    {
        "name": "project-owner",
        "rule": "Fix all errors instead of dismissing them as pre-existing. The assistant has no session history and cannot know what is pre-existing.",
        "enabled": True,
        "keywords": [
            "pre-existing", "preexisting", "pre existing", "predate", "predates",
            "unrelated to our", "existed before", "not introduced by",
            "outside the scope", "nothing to do with our", "not caused by",
            "were already there", "were already present", "already there before",
            "these errors appear to",
        ],
        "skill": None,
        "builtin": True,
    }
]

USER_RULES_PATH = os.path.expanduser("~/.claude/hammertime/rules.json")


def load_rules():
    """Load builtin rules + user rules. User rules with same name override builtin."""
    rules = list(BUILTIN_RULES)
    if os.path.exists(USER_RULES_PATH):
        try:
            with open(USER_RULES_PATH, "r") as f:
                user_rules = json.load(f)
            if isinstance(user_rules, list):
                builtin_names = {r["name"] for r in rules}
                for ur in user_rules:
                    if ur.get("name") in builtin_names:
                        rules = [r for r in rules if r["name"] != ur["name"]]
                    rules.append(ur)
        except (json.JSONDecodeError, OSError):
            pass
    return [r for r in rules if r.get("enabled", True)]


def phase1_keyword_scan(text, rules):
    """Return rules whose keywords match in the text."""
    text_lower = text.lower()
    triggered = []
    for rule in rules:
        keywords = rule.get("keywords", [])
        if not keywords:
            triggered.append(rule)
            continue
        for kw in keywords:
            if kw.lower() in text_lower:
                triggered.append(rule)
                break
    return triggered


def phase2_haiku_evaluate(text, rule):
    """Call Haiku to determine if the rule was actually violated. Returns True if violated."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return True

    prompt = (
        "You are a compliance checker for an AI coding assistant.\n\n"
        f"RULE: {rule['rule']}\n\n"
        "ASSISTANT'S RESPONSE:\n"
        f"{text[-4000:]}\n\n"
        "Did the assistant REFUSE TO FIX or DISMISS issues/errors by calling them "
        "pre-existing, out of scope, or not its responsibility? "
        "Merely mentioning the word 'pre-existing' in a factual or explanatory "
        "context is NOT a violation. The violation is specifically REFUSING TO ACT "
        "on problems by attributing them to something else.\n\n"
        "Answer ONLY 'yes' or 'no'."
    )

    body = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 8,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read())
            answer = result.get("content", [{}])[0].get("text", "").strip().lower()
            return answer.startswith("yes")
    except (urllib.error.URLError, OSError, json.JSONDecodeError, KeyError, IndexError):
        return False


def infer_mode(rule_text):
    """Infer whether the rule wants auto-fix or ask-user mode."""
    lower = rule_text.lower()
    fix_signals = ["fix all", "always fix", "fix any", "fix every", "fix these", "fix the"]
    for signal in fix_signals:
        if signal in lower:
            return "fix"
    return "ask"


def build_block_message(rule):
    """Construct the systemMessage from rule text and inferred mode."""
    name = rule["name"]
    text = rule["rule"]
    mode = infer_mode(text)
    skill = rule.get("skill")

    if mode == "fix":
        msg = f"[HammerTime] Rule '{name}' triggered. {text} Fix these issues NOW before stopping."
    else:
        msg = f"[HammerTime] Rule '{name}' triggered. {text} Ask the user whether to fix these issues or skip them."

    if skill:
        msg += f" Invoke Skill({skill}) to address this."

    return msg


def debug_log(msg):
    """Write to debug log if HAMMERTIME_DEBUG is set. Includes elapsed ms."""
    debug_path = os.environ.get("HAMMERTIME_DEBUG", "")
    if debug_path:
        elapsed = int((time.monotonic() - _start_time) * 1000)
        try:
            with open(os.path.expanduser(debug_path), "a") as f:
                f.write(f"[{elapsed:>5}ms] {msg}\n")
        except OSError:
            pass


def main():
    debug_log("--- HammerTime run ---")
    try:
        raw = sys.stdin.read()
        hook_input = json.loads(raw)
    except (json.JSONDecodeError, OSError):
        debug_log("EXIT: failed to parse stdin")
        sys.exit(0)

    debug_log(f"INPUT keys: {list(hook_input.keys())}")

    # Don't re-trigger if already in a stop hook continuation
    if hook_input.get("stop_hook_active"):
        debug_log("EXIT: stop_hook_active=true, skipping to avoid loop")
        sys.exit(0)

    text = hook_input.get("last_assistant_message", "")
    if not text:
        debug_log("EXIT: no last_assistant_message")
        sys.exit(0)

    debug_log(f"MESSAGE length: {len(text)} chars")

    rules = load_rules()
    if not rules:
        debug_log("EXIT: no enabled rules")
        sys.exit(0)

    # Phase 1: keyword scan
    triggered = phase1_keyword_scan(text, rules)
    debug_log(f"PHASE1: {len(triggered)} rules triggered")
    if not triggered:
        sys.exit(0)

    # Phase 2: Haiku evaluation for each triggered rule
    for rule in triggered:
        debug_log(f"PHASE2: evaluating rule '{rule['name']}'")
        violated = phase2_haiku_evaluate(text, rule)
        debug_log(f"PHASE2: rule '{rule['name']}' violated={violated}")
        if violated:
            msg = build_block_message(rule)
            output = {
                "decision": "block",
                "reason": f"HammerTime rule '{rule['name']}' violated",
                "systemMessage": msg,
            }
            print(json.dumps(output))
            sys.exit(0)

    # No violations confirmed
    debug_log("PASS: no violations confirmed")
    sys.exit(0)


if __name__ == "__main__":
    main()
