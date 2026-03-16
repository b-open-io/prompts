#!/usr/bin/env python3
"""Create a HammerTime timer rule with a correct deadline.

Usage:
    python3 create-timer.py <duration> [description...]

    duration: Number + unit. Examples: 30m, 1h, 45m, 2h, 90m
    description: Optional. Rule text shown in block messages.

Prints the computed deadline and writes the rule to ~/.claude/hammertime/rules.json.
"""

import json
import os
import sys
import time
from datetime import datetime, timedelta

RULES_PATH = os.path.expanduser("~/.claude/hammertime/rules.json")


def parse_duration(s):
    """Parse '30m', '1h', '90m', '2h' into a timedelta."""
    s = s.strip().lower()
    if s.endswith("m"):
        return timedelta(minutes=int(s[:-1]))
    if s.endswith("h"):
        return timedelta(hours=int(s[:-1]))
    raise ValueError(f"Invalid duration: {s}. Use Nm (minutes) or Nh (hours).")


def main():
    if len(sys.argv) < 2:
        print("Usage: create-timer.py <duration> [description...]", file=sys.stderr)
        sys.exit(1)

    duration_str = sys.argv[1]
    description = " ".join(sys.argv[2:]).strip() if len(sys.argv) > 2 else ""
    if not description:
        description = "Stay focused and keep iterating on the current task."

    try:
        delta = parse_duration(duration_str)
    except ValueError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

    now = datetime.now()
    deadline = now + delta
    deadline_iso = deadline.isoformat(timespec="seconds")
    rule_name = f"timer-{int(time.time())}"

    rule = {
        "name": rule_name,
        "rule": description,
        "enabled": True,
        "deadline": deadline_iso,
        "keywords": [],
        "max_iterations": 0,
    }

    # Load existing rules
    rules = []
    if os.path.exists(RULES_PATH):
        try:
            with open(RULES_PATH, "r") as f:
                rules = json.load(f)
        except (json.JSONDecodeError, OSError):
            rules = []

    rules.append(rule)

    # Write atomically
    os.makedirs(os.path.dirname(RULES_PATH), exist_ok=True)
    tmp_path = RULES_PATH + ".tmp"
    with open(tmp_path, "w") as f:
        json.dump(rules, f, indent=2)
    os.rename(tmp_path, RULES_PATH)

    # Output for the command to display
    print(json.dumps({
        "name": rule_name,
        "duration": duration_str,
        "deadline": deadline_iso,
        "rule": description,
    }))


if __name__ == "__main__":
    main()
