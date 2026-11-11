#!/usr/bin/env python3
"""Focused unit tests for HammerTime per-project rule scoping."""

import importlib.util
import io
import os
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch


HOOK_PATH = Path(__file__).resolve().parents[1] / "hammertime.py"
SPEC = importlib.util.spec_from_file_location("hammertime", HOOK_PATH)
hammertime = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(hammertime)


class SessionProjectDirTests(unittest.TestCase):
    def test_prefers_claude_project_dir_when_set(self):
        with patch.dict(os.environ, {"CLAUDE_PROJECT_DIR": "/env/project"}, clear=True):
            with patch.object(hammertime.os, "getcwd", return_value="/fallback/project"):
                self.assertEqual("/env/project", hammertime.session_project_dir())

    def test_falls_back_to_os_getcwd_when_env_is_absent(self):
        with patch.dict(os.environ, {}, clear=True):
            with patch.object(hammertime.os, "getcwd", return_value="/fallback/project"):
                self.assertEqual("/fallback/project", hammertime.session_project_dir())


class RuleAppliesToProjectTests(unittest.TestCase):
    def test_absent_scope_is_global(self):
        self.assertTrue(hammertime.rule_applies_to_project({}, "/any/project"))

    def test_string_scope_matches_by_prefix(self):
        rule = {"cwd_prefix": "/work/repo"}
        self.assertTrue(hammertime.rule_applies_to_project(rule, "/work/repo/packages/app"))
        self.assertFalse(hammertime.rule_applies_to_project(rule, "/work/other"))

    def test_array_scope_matches_any_prefix(self):
        rule = {"cwd_prefix": ["/work/one", "/work/two"]}
        self.assertTrue(hammertime.rule_applies_to_project(rule, "/work/two/app"))
        self.assertFalse(hammertime.rule_applies_to_project(rule, "/work/three"))

    def test_tilde_is_expanded_on_each_prefix(self):
        project_dir = os.path.join(os.path.expanduser("~"), "code", "repo")
        rule = {"cwd_prefix": "~/code"}
        self.assertTrue(hammertime.rule_applies_to_project(rule, project_dir))

    def test_empty_array_matches_no_project(self):
        self.assertFalse(
            hammertime.rule_applies_to_project({"cwd_prefix": []}, "/work/repo")
        )

    def test_malformed_scope_is_skipped_with_warning(self):
        rules = [
            {"name": "number-scope", "cwd_prefix": 42},
            {"name": "mixed-array", "cwd_prefix": ["/work", 42]},
        ]
        stderr = io.StringIO()
        with redirect_stderr(stderr):
            scoped = hammertime.scope_rules_to_project(rules, "/work/repo")

        self.assertEqual([], scoped)
        warning = stderr.getvalue()
        self.assertIn("number-scope", warning)
        self.assertIn("mixed-array", warning)
        self.assertIn("expected a string or an array of strings", warning)


class VerifierRequestTests(unittest.TestCase):
    def test_defaults_to_haiku_5_5_without_sampling_or_thinking_params(self):
        with patch.dict(os.environ, {}, clear=True):
            body = hammertime.verifier_request_body("rule check")
        self.assertEqual("claude-haiku-5-5", body["model"])
        self.assertEqual({"effort": "low"}, body["output_config"])
        for key in ("temperature", "top_p", "top_k", "thinking", "tool_choice"):
            self.assertNotIn(key, body)

    def test_env_override_wins_and_empty_override_falls_back(self):
        with patch.dict(os.environ, {"HAMMERTIME_VERIFIER_MODEL": "claude-opus-5-5"}, clear=True):
            self.assertEqual("claude-opus-5-5", hammertime.verifier_request_body("x")["model"])
        with patch.dict(os.environ, {"HAMMERTIME_VERIFIER_MODEL": ""}, clear=True):
            self.assertEqual("claude-haiku-5-5", hammertime.verifier_request_body("x")["model"])


class VerifierAnswerTests(unittest.TestCase):
    def test_reads_the_first_text_block_after_a_thinking_block(self):
        result = {"content": [{"type": "thinking", "thinking": ""}, {"type": "text", "text": " Yes. "}]}
        self.assertEqual("yes.", hammertime.verifier_answer(result))

    def test_no_text_block_is_an_empty_answer(self):
        self.assertEqual("", hammertime.verifier_answer({"content": [{"type": "thinking", "thinking": ""}]}))
        self.assertEqual("", hammertime.verifier_answer({"content": []}))
        self.assertEqual("", hammertime.verifier_answer({}))


if __name__ == "__main__":
    unittest.main()
