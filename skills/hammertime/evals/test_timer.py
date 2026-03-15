#!/usr/bin/env python3
"""HammerTime timer rule tests.

Tests the timer rule functionality: deadline checking, auto-cleanup,
block message formatting, and integration with the iteration limiter.

Usage:
    python3 skills/hammertime/evals/test_timer.py
    python3 skills/hammertime/evals/test_timer.py -v
"""

import json
import os
import sys
import tempfile
import shutil

# Import from the hook
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "hooks"))
from hammertime import (
    build_block_message,
    cleanup_expired_timers,
    load_rules,
    load_state,
    save_state,
    compile_user_rule,
    USER_RULES_PATH,
    STATE_PATH,
)
from datetime import datetime, timedelta


def _setup_temp_rules(rules_data):
    """Write temporary rules to the user rules path. Returns original content for restore."""
    original = None
    if os.path.exists(USER_RULES_PATH):
        with open(USER_RULES_PATH, "r") as f:
            original = f.read()

    os.makedirs(os.path.dirname(USER_RULES_PATH), exist_ok=True)
    with open(USER_RULES_PATH, "w") as f:
        json.dump(rules_data, f, indent=2)

    return original


def _restore_rules(original):
    """Restore original rules content, or delete if there was none."""
    if original is None:
        if os.path.exists(USER_RULES_PATH):
            os.remove(USER_RULES_PATH)
    else:
        with open(USER_RULES_PATH, "w") as f:
            f.write(original)


class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []

    def ok(self, name):
        self.passed += 1
        print(f"  PASS  {name}")

    def fail(self, name, detail=""):
        self.failed += 1
        self.errors.append((name, detail))
        print(f"  FAIL  {name}: {detail}")

    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"  Timer Tests: {self.passed}/{total} passed")
        if self.errors:
            print(f"\n  Failures:")
            for name, detail in self.errors:
                print(f"    - {name}: {detail}")
        print(f"{'='*60}\n")
        return self.failed == 0


def test_build_block_message_timer(results):
    """Timer rules produce time-aware block messages."""
    future = (datetime.now() + timedelta(minutes=25)).isoformat()
    rule = {
        "name": "deep-focus",
        "rule": "Stay focused on the refactoring task.",
        "deadline": future,
    }
    msg = build_block_message(rule)

    if "[HammerTime] Timer 'deep-focus'" not in msg:
        results.fail("timer_block_msg_header", f"Missing timer header in: {msg[:80]}")
        return
    if "remaining" not in msg:
        results.fail("timer_block_msg_remaining", f"Missing 'remaining' in: {msg[:80]}")
        return
    if "Stay focused" not in msg:
        results.fail("timer_block_msg_rule_text", f"Missing rule text in: {msg[:80]}")
        return
    if "NOT done yet" not in msg:
        results.fail("timer_block_msg_motivational", f"Missing motivational text in: {msg[:80]}")
        return
    results.ok("timer_block_message_format")


def test_build_block_message_content(results):
    """Content rules still produce the original format."""
    rule = {
        "name": "fix-lint",
        "rule": "Fix all lint errors before stopping.",
    }
    msg = build_block_message(rule)

    if "[HammerTime] Rule 'fix-lint'" not in msg:
        results.fail("content_block_msg", f"Wrong format: {msg[:80]}")
        return
    if "Fix these issues NOW" not in msg:
        results.fail("content_block_msg_mode", f"Missing fix mode in: {msg[:80]}")
        return
    results.ok("content_block_message_unchanged")


def test_build_block_message_expired_timer(results):
    """Expired timer still produces a message (edge case — shouldn't normally happen)."""
    past = (datetime.now() - timedelta(minutes=5)).isoformat()
    rule = {
        "name": "expired-timer",
        "rule": "This timer has expired.",
        "deadline": past,
    }
    msg = build_block_message(rule)
    # With a negative remaining time, the message should still be constructed
    # (the main loop prevents this from firing, but the function should be safe)
    if "Timer 'expired-timer'" not in msg:
        results.fail("expired_timer_msg", f"Bad message: {msg[:80]}")
        return
    results.ok("expired_timer_block_message_safe")


def test_build_block_message_invalid_deadline(results):
    """Invalid deadline falls back to simple message."""
    rule = {
        "name": "bad-deadline",
        "rule": "Keep working.",
        "deadline": "not-a-date",
    }
    msg = build_block_message(rule)
    if "Timer 'bad-deadline' active" not in msg:
        results.fail("invalid_deadline_msg", f"Bad fallback: {msg[:80]}")
        return
    results.ok("invalid_deadline_fallback")


def test_cleanup_expired_timers(results):
    """Expired timer rules get auto-deleted from rules.json."""
    past = (datetime.now() - timedelta(minutes=10)).isoformat()
    future = (datetime.now() + timedelta(minutes=30)).isoformat()

    test_rules = [
        {
            "name": "expired-one",
            "rule": "Should be deleted",
            "enabled": True,
            "deadline": past,
            "keywords": [],
        },
        {
            "name": "still-active",
            "rule": "Should be kept",
            "enabled": True,
            "deadline": future,
            "keywords": [],
        },
        {
            "name": "content-rule",
            "rule": "No deadline, should be kept",
            "enabled": True,
            "keywords": ["test"],
        },
    ]

    original = _setup_temp_rules(test_rules)
    try:
        removed = cleanup_expired_timers()

        if "expired-one" not in removed:
            results.fail("cleanup_removes_expired", f"Expected 'expired-one' in removed, got: {removed}")
            return

        # Verify file was rewritten correctly
        with open(USER_RULES_PATH, "r") as f:
            remaining = json.load(f)

        names = [r["name"] for r in remaining]
        if "expired-one" in names:
            results.fail("cleanup_file_write", f"Expired rule still in file: {names}")
            return
        if "still-active" not in names or "content-rule" not in names:
            results.fail("cleanup_preserves_others", f"Missing rules in file: {names}")
            return

        results.ok("cleanup_expired_timers")
    finally:
        _restore_rules(original)


def test_cleanup_no_expired(results):
    """Cleanup is a no-op when no timers have expired."""
    future = (datetime.now() + timedelta(minutes=30)).isoformat()

    test_rules = [
        {
            "name": "active-timer",
            "rule": "Still going",
            "enabled": True,
            "deadline": future,
            "keywords": [],
        },
    ]

    original = _setup_temp_rules(test_rules)
    try:
        removed = cleanup_expired_timers()
        if removed:
            results.fail("cleanup_no_expired", f"Unexpected removals: {removed}")
            return

        # File should be unchanged (no write happened)
        with open(USER_RULES_PATH, "r") as f:
            remaining = json.load(f)
        if len(remaining) != 1 or remaining[0]["name"] != "active-timer":
            results.fail("cleanup_no_expired_preserves", f"File changed unexpectedly")
            return

        results.ok("cleanup_no_expired_noop")
    finally:
        _restore_rules(original)


def test_cleanup_no_file(results):
    """Cleanup handles missing rules file gracefully."""
    original = None
    if os.path.exists(USER_RULES_PATH):
        with open(USER_RULES_PATH, "r") as f:
            original = f.read()
        os.remove(USER_RULES_PATH)

    try:
        removed = cleanup_expired_timers()
        if removed:
            results.fail("cleanup_no_file", f"Unexpected removals: {removed}")
            return
        results.ok("cleanup_no_file_graceful")
    finally:
        _restore_rules(original)


def test_timer_rule_loads(results):
    """Timer rules load correctly through load_rules()."""
    future = (datetime.now() + timedelta(minutes=30)).isoformat()

    test_rules = [
        {
            "name": "focus-timer",
            "rule": "Stay focused",
            "enabled": True,
            "deadline": future,
            "keywords": [],
        },
    ]

    original = _setup_temp_rules(test_rules)
    try:
        rules = load_rules()
        timer_rules = [r for r in rules if r.get("deadline")]
        if not timer_rules:
            results.fail("timer_loads", "No timer rules found in loaded rules")
            return
        if timer_rules[0]["name"] != "focus-timer":
            results.fail("timer_loads_name", f"Wrong name: {timer_rules[0]['name']}")
            return
        results.ok("timer_rule_loads_correctly")
    finally:
        _restore_rules(original)


def test_timer_minutes_display(results):
    """Block message shows correct time remaining."""
    # Test 90 minutes remaining
    future_90m = (datetime.now() + timedelta(minutes=90)).isoformat()
    rule_90m = {"name": "long-timer", "rule": "Keep going.", "deadline": future_90m}
    msg_90m = build_block_message(rule_90m)
    if "90 minutes" not in msg_90m and "89 minutes" not in msg_90m:
        results.fail("time_display_90m", f"Expected ~90 minutes in: {msg_90m[:80]}")
        return

    # Test 1 minute remaining
    future_1m = (datetime.now() + timedelta(seconds=90)).isoformat()
    rule_1m = {"name": "short-timer", "rule": "Almost done.", "deadline": future_1m}
    msg_1m = build_block_message(rule_1m)
    if "1 minute" not in msg_1m:
        results.fail("time_display_1m", f"Expected '1 minute' in: {msg_1m[:80]}")
        return

    # Test 30 seconds remaining
    future_30s = (datetime.now() + timedelta(seconds=30)).isoformat()
    rule_30s = {"name": "ending-timer", "rule": "Wrapping up.", "deadline": future_30s}
    msg_30s = build_block_message(rule_30s)
    if "seconds" not in msg_30s:
        results.fail("time_display_30s", f"Expected 'seconds' in: {msg_30s[:80]}")
        return

    results.ok("time_remaining_display")


def test_timer_coexists_with_content_rules(results):
    """Timer rules and content rules can coexist in rules.json."""
    future = (datetime.now() + timedelta(minutes=30)).isoformat()

    test_rules = [
        {
            "name": "focus-timer",
            "rule": "Stay focused",
            "enabled": True,
            "deadline": future,
            "keywords": [],
        },
        {
            "name": "fix-lint-errors",
            "rule": "Fix all lint errors",
            "enabled": True,
            "keywords": ["lint warning", "lint error"],
            "intent_patterns": [],
        },
    ]

    original = _setup_temp_rules(test_rules)
    try:
        rules = load_rules()
        timer_rules = [r for r in rules if r.get("deadline")]
        content_rules = [r for r in rules if not r.get("deadline")]

        # Should have timer rule + content rule + builtin project-owner
        if len(timer_rules) != 1:
            results.fail("coexist_timer_count", f"Expected 1 timer, got {len(timer_rules)}")
            return
        # content_rules includes the builtin project-owner + our user content rule
        content_names = [r["name"] for r in content_rules]
        if "fix-lint-errors" not in content_names:
            results.fail("coexist_content_present", f"Missing content rule in: {content_names}")
            return
        if "project-owner" not in content_names:
            results.fail("coexist_builtin_present", f"Missing builtin rule in: {content_names}")
            return

        results.ok("timer_coexists_with_content")
    finally:
        _restore_rules(original)


def test_disabled_timer_skipped(results):
    """Disabled timer rules are not loaded."""
    future = (datetime.now() + timedelta(minutes=30)).isoformat()

    test_rules = [
        {
            "name": "disabled-timer",
            "rule": "Should not load",
            "enabled": False,
            "deadline": future,
            "keywords": [],
        },
    ]

    original = _setup_temp_rules(test_rules)
    try:
        rules = load_rules()
        timer_rules = [r for r in rules if r.get("deadline")]
        if timer_rules:
            results.fail("disabled_timer_skipped", f"Disabled timer loaded: {timer_rules[0]['name']}")
            return
        results.ok("disabled_timer_not_loaded")
    finally:
        _restore_rules(original)


def run_tests(verbose=False):
    """Run all timer tests."""
    results = TestResults()

    print(f"\n{'='*60}")
    print(f"  HammerTime Timer Rule Tests")
    print(f"{'='*60}\n")

    # Block message tests
    test_build_block_message_timer(results)
    test_build_block_message_content(results)
    test_build_block_message_expired_timer(results)
    test_build_block_message_invalid_deadline(results)
    test_timer_minutes_display(results)

    # Cleanup tests
    test_cleanup_expired_timers(results)
    test_cleanup_no_expired(results)
    test_cleanup_no_file(results)

    # Loading tests
    test_timer_rule_loads(results)
    test_timer_coexists_with_content_rules(results)
    test_disabled_timer_skipped(results)

    return results.summary()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="HammerTime timer rule tests")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()

    success = run_tests(verbose=args.verbose)
    sys.exit(0 if success else 1)
