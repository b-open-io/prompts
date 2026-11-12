from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("check_model_drift", SCRIPTS / "check-model-drift.py")
assert spec and spec.loader
DRIFT = importlib.util.module_from_spec(spec)
spec.loader.exec_module(DRIFT)


def tokens(text: str) -> list[str]:
    return [token for _, _, token, _ in DRIFT.find_hits(text)]


class FindHitsTests(unittest.TestCase):
    def test_current_and_unrelated_ids_pass(self):
        for text in (
            "claude-fable-5-2", "claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5",
            "gateway(\"anthropic/claude-haiku-5.5\")", "use `claude-opus-5-5`.", "Haiku 5.5 and Fable 5.2",
            "gpt-6.1-sol", "GPT-6.1 Sol", "gpt-6-astra", "grok-4.7", "grok-4.20-reasoning", "Grok 1.0.13",
            "grok-worker.sh", "grok-imagine-image-2.0", "Pin grok-4.7.", "Use gpt-image-2.6.", "gpt-image-2.6-flare", "gpt-image-2.6-sunburst",
            "gemini-3-pro-image", "claude-code@2.1.251", "model: haiku",
        ):
            with self.subTest(text=text):
                self.assertEqual(tokens(text), [])

    def test_retired_ids_are_flagged(self):
        for text in (
            "claude-haiku-4-5-20251001", "anthropic/claude-haiku-4.5", "claude-haiku-4-6",
            "claude-3-5-haiku-latest", "claude-sonnet-4-6", "claude-opus-5", "claude-opus-4.8",
            "claude-fable-5-1", "claude-fable-5-2-preview", "claude-instant-1", "Haiku 4.6", "Sonnet 4.6",
            "gpt-5.5", "GPT-5.6 Sol", "gpt-4o", "gpt-6-sol", "GPT-6 Sol", "grok-4.6", "Grok 4.6",
            "grok-4-latest", "grok-3", "gpt-image-2.5-flare", "gpt-image-1.5", "gpt-image-2",
            "gemini-2.5-pro", "Gemini 1.5",
            "Use grok-4.6.", "Run grok-4.", "Use gpt-image-2.", "Use gemini-2.5.",
        ):
            with self.subTest(text=text):
                self.assertEqual(len(tokens(text)), 1, tokens(text))

    def test_reports_label_and_line(self):
        self.assertEqual(
            DRIFT.find_hits("ok\nrun claude-haiku-4-5."), [("claude-id", 2, "claude-haiku-4-5", "run claude-haiku-4-5.")]
        )


class RepositoryTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root)
        (self.root / "scripts").mkdir()
        subprocess.run(["git", "init", "-q"], cwd=self.root, check=True)

    def write(self, relative: str, body: str) -> None:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body, encoding="utf-8")

    def run_main(self, *argv: str) -> tuple[int, str]:
        subprocess.run(["git", "add", "-A"], cwd=self.root, check=True)
        stderr = io.StringIO()
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(stderr):
            code = DRIFT.main(list(argv), root=self.root)
        return code, stderr.getvalue()

    def test_history_paths_and_symlinks_are_skipped(self):
        self.write("CHANGELOG.md", "moved off claude-haiku-4-5\n")
        self.write("pkg/tests/fixture.json", "\"gpt-5.5\"\n")
        self.write("agent.md", "uses claude-opus-5-5\n")
        os.symlink("CHANGELOG.md", self.root / "AGENTS.md")
        subprocess.run(["git", "add", "-A"], cwd=self.root, check=True)
        self.assertEqual(DRIFT.scan(self.root), {})

    def test_missing_baseline_fails(self):
        self.write("agent.md", "uses claude-opus-5-5\n")
        code, stderr = self.run_main()
        self.assertEqual(code, 2)
        self.assertIn("missing", stderr)

    def pin(self, relative: str, body: str) -> None:
        self.write(relative, body)
        self.assertEqual(self.run_main("--update-baseline")[0], 0)
        self.assertEqual(self.run_main()[0], 0)

    def test_added_and_removed_mentions_fail(self):
        self.pin("policy.md", "Grok 4.6 is out of policy.\n")
        baseline = json.loads((self.root / DRIFT.BASELINE).read_text())
        self.assertEqual(list(baseline), ["policy.md"])
        self.assertRegex(baseline["policy.md"][0], r"^grok: Grok 4\.6 @ [0-9a-f]{12}$")

        self.write("policy.md", "Grok 4.6 is out of policy.\nDispatch claude-sonnet-4-6.\n")
        code, stderr = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn("policy.md:2: unreviewed claude-id claude-sonnet-4-6: Dispatch claude-sonnet-4-6.", stderr)

        self.write("policy.md", "Nothing retired here.\n")
        code, stderr = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn("baseline entry no longer present: grok: Grok 4.6 @", stderr)

    def test_count_preserving_replacement_fails(self):
        # The review regression: a ban rewritten into a command kept the per-family count.
        self.pin("README.md", "Grok workers use grok-4.7; Grok 4.6 is never used.\n")
        for rewrite in (
            "Grok workers use grok-4.6.\n",  # different token, same family count
            "Grok workers use grok-4.7; Grok 4.6 is the default.\n",  # same token, rewritten line
        ):
            with self.subTest(rewrite=rewrite):
                self.write("README.md", rewrite)
                code, stderr = self.run_main()
                self.assertEqual(code, 1)
                self.assertIn("README.md:1: unreviewed grok", stderr)
                self.assertIn("baseline entry no longer present: grok: Grok 4.6 @", stderr)

    def test_moved_line_passes_and_duplicate_line_fails(self):
        self.pin("policy.md", "Grok 4.6 is out of policy.\n")
        self.write("policy.md", "# Policy\n\n  Grok 4.6 is out of policy.\n")
        self.assertEqual(self.run_main()[0], 0)
        self.write("policy.md", "Grok 4.6 is out of policy.\nGrok 4.6 is out of policy.\n")
        code, stderr = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn("unreviewed grok Grok 4.6: Grok 4.6 is out of policy.", stderr)

    def test_count_baseline_format_is_rejected(self):
        self.write("policy.md", "Grok 4.6 is out of policy.\n")
        self.write(DRIFT.BASELINE, json.dumps({"policy.md": {"grok": 1}}))
        code, stderr = self.run_main()
        self.assertEqual(code, 2)
        self.assertIn("old format", stderr)


class CommittedTreeTests(unittest.TestCase):
    def test_repository_matches_its_baseline(self):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as stderr:
            code = DRIFT.main([])
        self.assertEqual(code, 0, stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
