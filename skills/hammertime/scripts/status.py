#!/usr/bin/env python3
"""HammerTime status dashboard. Reads rules and state, prints formatted output."""

import json
import os
import sys
from datetime import datetime

RULES_PATH = os.path.expanduser("~/.claude/hammertime/rules.json")
DEBUG_LOG = os.path.expanduser("~/.claude/hammertime/debug.log")
STATE_PATH = os.path.expanduser("~/.claude/hammertime/state.json")
DISABLED_PATH = os.path.expanduser("~/.claude/hammertime/disabled")

BUILTIN_RULES = [
    {
        "name": "project-owner",
        "rule": "Fix all errors instead of dismissing them as pre-existing.",
        "builtin": True,
        "enabled": True,
        "keywords": 15,
        "intent_patterns": 8,
        "co_occurrence": True,
        "confidence_threshold": 5,
        "evaluate_full_turn": True,
    }
]


def main():
    now = datetime.now()

    # --- Global status ---
    disabled = os.path.exists(DISABLED_PATH)
    if disabled:
        print("## Status: PAUSED\n")
        print("HammerTime is currently **paused**. The stop hook will not fire.")
        print("Run `/hammertime:start` to resume.\n")
    else:
        print("## Status: ACTIVE\n")

    # --- Timer rules ---
    timer_rules = []
    content_rules = []

    if os.path.exists(RULES_PATH):
        try:
            with open(RULES_PATH, "r") as f:
                user_rules = json.load(f)
        except (json.JSONDecodeError, OSError):
            user_rules = []
    else:
        user_rules = []

    for r in user_rules:
        if r.get("deadline"):
            timer_rules.append(r)
        else:
            content_rules.append(r)

    # --- Print timer rules ---
    if timer_rules:
        print("## Active Timers\n")
        print("| # | Name | Deadline | Remaining | Rule |")
        print("|---|------|----------|-----------|------|")
        for i, r in enumerate(timer_rules):
            deadline_str = r["deadline"]
            try:
                dl = datetime.fromisoformat(deadline_str)
                remaining_secs = int((dl - now).total_seconds())
                if remaining_secs <= 0:
                    remaining = "EXPIRED"
                elif remaining_secs >= 3600:
                    remaining = f"{remaining_secs // 3600}h {(remaining_secs % 3600) // 60}m"
                else:
                    remaining = f"{remaining_secs // 60}m {remaining_secs % 60}s"
            except (ValueError, TypeError):
                remaining = "INVALID"
            enabled = "on" if r.get("enabled", True) else "off"
            print(f"| {i + 1} | `{r['name']}` | {deadline_str} | {remaining} | {r.get('rule', '')[:60]} |")
        print()

    # --- Print content rules ---
    print("## Content Rules\n")
    print("| # | Rule | Status | Keywords | Patterns | Co-occur | Threshold | Full Turn | Skill |")
    print("|---|------|--------|----------|----------|----------|-----------|-----------|-------|")

    # Builtin
    b = BUILTIN_RULES[0]
    print(f"| 0 | `project-owner` (builtin) | enabled | {b['keywords']} | {b['intent_patterns']} | yes | {b['confidence_threshold']} | yes | — |")

    # User content rules
    for i, r in enumerate(content_rules):
        name = r.get("name", "?")
        enabled = "enabled" if r.get("enabled", True) else "disabled"
        kw = len(r.get("keywords", []))
        patterns = len(r.get("intent_patterns", []))
        co = "yes" if r.get("dismissal_verbs") and r.get("qualifiers") else "no"
        threshold = r.get("confidence_threshold", 5)
        ft = "yes" if r.get("evaluate_full_turn") else "no"
        skill = r.get("skill") or "—"
        git = " (git)" if r.get("check_git_state") else ""
        print(f"| {i + 1} | `{name}` | {enabled} | {kw} | {patterns} | {co} | {threshold} | {ft} | {skill}{git} |")

    print()

    # --- State ---
    if os.path.exists(STATE_PATH):
        try:
            with open(STATE_PATH, "r") as f:
                state = json.load(f)
            iters = state.get("rule_iterations", {})
            if iters:
                print("## Session Iterations\n")
                for name, count in iters.items():
                    print(f"- `{name}`: {count} block(s)")
                print()
        except (json.JSONDecodeError, OSError):
            pass

    # --- Debug log ---
    print("## Debug Log\n")
    if os.path.exists(DEBUG_LOG):
        try:
            with open(DEBUG_LOG, "r") as f:
                lines = f.readlines()
            last_20 = lines[-20:] if len(lines) > 20 else lines
            print("```")
            for line in last_20:
                print(line.rstrip())
            print("```")
        except OSError:
            print("Error reading debug log.")
    else:
        print("Debug logging not enabled. Set `HAMMERTIME_DEBUG=~/.claude/hammertime/debug.log` to enable.")
    print()

    # --- Quick actions ---
    print("## Quick Actions\n")
    if disabled:
        print("- `/hammertime:start` — Resume HammerTime")
    else:
        print("- `/hammertime:stop` — Pause HammerTime")
    print("- `/hammertime 30m <desc>` — Start a focus timer")
    print("- `/hammertime <desc>` — Create a content rule")
    print("- `/hammertime:manage` — Interactive rule management")


if __name__ == "__main__":
    main()
