#!/usr/bin/env python3
"""HammerTime — Stop hook that catches bad model behaviors via user-defined rules.

Two-phase detection:
  Phase 1 (free, <1s): Keyword scan on last ~8KB of transcript. No match = exit 0.
  Phase 2 (cheap, ~3-5s): Haiku call for each triggered rule. Catches fuzzy variants.

Rules come from two sources:
  1. BUILTIN_RULES (hardcoded below)
  2. User rules in ~/.claude/hammertime/rules.json

Block message format:
  {"decision": "block", "reason": "...", "systemMessage": "..."}
"""

import json
import os
import sys
import urllib.request
import urllib.error

BUILTIN_RULES = [
    {
        "name": "project-owner",
        "rule": "Fix all errors instead of dismissing them as pre-existing. The assistant has no session history and cannot know what is pre-existing.",
        "enabled": True,
        "keywords": [
            "pre-existing", "preexisting", "pre existing", "predate", "predates",
            "unrelated to our", "existed before", "not introduced by",
            "outside the scope", "nothing to do with our", "not caused by",
            "was already", "these errors appear to", "not related to",
        ],
        "skill": None,
        "builtin": True,
    }
]

USER_RULES_PATH = os.path.expanduser("~/.claude/hammertime/rules.json")
TRANSCRIPT_TAIL_BYTES = 8192


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
                        # User override of builtin — replace it
                        rules = [r for r in rules if r["name"] != ur["name"]]
                    rules.append(ur)
        except (json.JSONDecodeError, OSError):
            pass
    return [r for r in rules if r.get("enabled", True)]


def read_transcript_tail(path):
    """Read the last TRANSCRIPT_TAIL_BYTES of the transcript file."""
    try:
        size = os.path.getsize(path)
        with open(path, "r", errors="replace") as f:
            if size > TRANSCRIPT_TAIL_BYTES:
                f.seek(size - TRANSCRIPT_TAIL_BYTES)
                f.readline()  # skip partial line
            return f.read()
    except OSError:
        return ""


def phase1_keyword_scan(text, rules):
    """Return rules whose keywords match in the transcript tail."""
    text_lower = text.lower()
    triggered = []
    for rule in rules:
        keywords = rule.get("keywords", [])
        if not keywords:
            # No keywords = always evaluate (expensive, but that's user's choice)
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
        # No API key — fall back to keyword-only (Phase 1 match = block)
        return True

    prompt = (
        "You are a compliance checker. Analyze the following conversation transcript tail "
        "and determine if the assistant violated this rule:\n\n"
        f"RULE: {rule['rule']}\n\n"
        "TRANSCRIPT TAIL:\n"
        f"{text[-4000:]}\n\n"
        "Did the assistant violate this rule in its most recent response? "
        "Answer ONLY 'yes' or 'no'. Nothing else."
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
        # Fail-open on API errors
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


def main():
    try:
        hook_input = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, OSError):
        sys.exit(0)

    transcript_path = hook_input.get("transcript_path", "")
    if not transcript_path:
        sys.exit(0)

    rules = load_rules()
    if not rules:
        sys.exit(0)

    text = read_transcript_tail(transcript_path)
    if not text:
        sys.exit(0)

    # Phase 1: keyword scan
    triggered = phase1_keyword_scan(text, rules)
    if not triggered:
        sys.exit(0)

    # Phase 2: Haiku evaluation for each triggered rule
    for rule in triggered:
        if phase2_haiku_evaluate(text, rule):
            msg = build_block_message(rule)
            output = {
                "decision": "block",
                "reason": f"HammerTime rule '{rule['name']}' violated",
                "systemMessage": msg,
            }
            print(json.dumps(output))
            sys.exit(0)

    # No violations confirmed
    sys.exit(0)


if __name__ == "__main__":
    main()
