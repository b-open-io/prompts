"""model-policy.sh: the shared out-of-policy check every orchestra dispatch wrapper sources."""

from __future__ import annotations

import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POLICY = ROOT / "modules/orchestra/skills/coordinator/scripts/model-policy.sh"


def off_policy(model: str) -> str | None:
    result = subprocess.run(
        ["bash", "-c", 'source "$1"; bopen_off_policy "$2"', "policy", str(POLICY), model],
        capture_output=True, text=True, check=False,
    )
    if result.returncode == 1:
        return None
    assert result.returncode == 0, result.stderr
    return result.stdout.strip()


class ModelPolicyTests(unittest.TestCase):
    def test_fable_exception_is_per_segment(self) -> None:
        # Every segment that names Fable must be exactly claude-fable-5-2; one approved segment
        # does not cover an older Fable id elsewhere in the path.
        for model in ("claude-fable-5-1/claude-fable-5-2", "claude-fable-5-2/claude-fable-5-1",
                      "fable/claude-fable-5-2", "openrouter/fable-5-1/anthropic/claude-fable-5-2",
                      "claude-fable-5-2:free", "anthropic/claude-fable-5-2@20261101", "fable:free",
                      "claude-fable-5-2-preview", "Claude-Fable-5-1"):
            with self.subTest(model=model):
                self.assertEqual(off_policy(model), "Fable models other than claude-fable-5-2 are out of policy")

    def test_fable_5_2_is_in_policy(self) -> None:
        for model in ("claude-fable-5-2", "anthropic/claude-fable-5-2", "openrouter/anthropic/claude-fable-5-2",
                      "CLAUDE-FABLE-5-2", "fablehouse/claude-opus-5-5"):
            with self.subTest(model=model):
                self.assertIsNone(off_policy(model))

    def test_delimiters_after_the_version_do_not_escape_the_policy(self) -> None:
        cases = {
            "gpt-5.5:free": "GPT-5.5",
            "openrouter/openai/gpt-5.6:free": "GPT-5.6",
            "openai/gpt-5.5@2026-01-01": "GPT-5.5",
            "gpt-5.6.1": "GPT-5.6",
            "openai/gpt-5.5-mini": "GPT-5.5",
            "x-ai/grok-4.6:beta": "Grok 4.6",
            "grok-4.6_fast": "Grok 4.6",
        }
        for model, family in cases.items():
            with self.subTest(model=model):
                self.assertIn(family, off_policy(model) or "")

    def test_neighbouring_versions_stay_in_policy(self) -> None:
        for model in ("gpt-5.55", "gpt-6.1-sol", "openai/gpt-6-sol", "grok-4.7", "grok-4.65", "claude-opus-5-5"):
            with self.subTest(model=model):
                self.assertIsNone(off_policy(model))

    def test_policy_needs_no_temporary_file(self) -> None:
        # Bash 3.2 backs a here-string with a temporary file; the split must not depend on one.
        self.assertNotIn("<<<", POLICY.read_text())
        result = subprocess.run(
            ["bash", "-c", 'source "$1"; bopen_off_policy "$2"', "policy", str(POLICY), "anthropic/claude-fable-5-1"],
            capture_output=True, text=True, check=False, env={"PATH": "/usr/bin:/bin", "TMPDIR": "/nonexistent"},
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Fable models other than claude-fable-5-2", result.stdout)

    def test_normalization_failure_fails_closed(self) -> None:
        result = subprocess.run(
            ["bash", "-c", 'source "$1"; tr() { return 1; }; bopen_off_policy "$2"', "policy", str(POLICY), "claude-opus-5-5"],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("out of policy", result.stdout)


if __name__ == "__main__":
    unittest.main()
