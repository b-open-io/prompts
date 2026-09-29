"""Provider and target binding in the orchestra Grok worker wrapper."""

from __future__ import annotations

import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WRAPPER = ROOT / "modules/orchestra/skills/coordinator/scripts/run-grok-worker.sh"

CONFIG = """
[model."gpt-6-sol"]
model = "gpt-6-sol"
base_url = "https://api.openai.com/v1"

[model."xai/grok-4.7"]
model = "grok-4.7"
base_url = "https://api.x.ai/v1"
"""


class GrokWrapperBindingTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.home = root / "grok"
        self.home.mkdir()
        (self.home / "config.toml").write_text(CONFIG)
        self.prompt = root / "prompt.md"
        self.prompt.write_text("task\n")
        self.cwd = root / "work"
        self.cwd.mkdir()
        self.log = root / "run.log"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def run_wrapper(self, model: str, *extra: str, config: bool = True) -> subprocess.CompletedProcess[str]:
        if not config:
            (self.home / "config.toml").unlink()
        env = {k: v for k, v in os.environ.items() if k != "BOPEN_USAGE_CREDIT_PRESSURE"}
        # With no grok on PATH, a binding that passes stops at "grok is not installed".
        env.update(GROK_HOME=str(self.home), PATH="/usr/bin:/bin")
        return subprocess.run(
            ["bash", str(WRAPPER), "--auth", "api", "--model", model, "--mode", "read", "--cwd", str(self.cwd),
             "--prompt-file", str(self.prompt), "--log", str(self.log), *extra],
            env=env, capture_output=True, text=True,
        )

    def test_matching_provider_and_target_pass_the_binding(self) -> None:
        result = self.run_wrapper("gpt-6-sol", "--provider", "openai", "--target", "gpt-6-sol")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn("grok is not installed", result.stderr)

    def test_changed_provider_is_refused(self) -> None:
        result = self.run_wrapper("gpt-6-sol", "--provider", "openrouter")
        self.assertEqual(result.returncode, 2)
        self.assertIn("routes to openai, not the approved openrouter", result.stderr)

    def test_changed_target_is_refused(self) -> None:
        result = self.run_wrapper("gpt-6-sol", "--provider", "openai", "--target", "gpt-6-astra")
        self.assertEqual(result.returncode, 2)
        self.assertIn("points at gpt-6-sol, not the approved gpt-6-astra", result.stderr)

    def test_bare_grok_binds_to_xai(self) -> None:
        result = self.run_wrapper("grok-4.7", "--credit-pressure", "--provider", "xai")
        self.assertEqual(result.returncode, 1, result.stderr)
        result = self.run_wrapper("grok-4.7", "--credit-pressure", "--provider", "openai")
        self.assertEqual(result.returncode, 2)

    def test_qualified_grok_id_needs_a_config_entry(self) -> None:
        result = self.run_wrapper("xai/grok-4.7", "--credit-pressure", "--provider", "xai")
        self.assertEqual(result.returncode, 1, result.stderr)
        result = self.run_wrapper("xai/grok-4.7", "--credit-pressure", config=False)
        self.assertEqual(result.returncode, 2)
        self.assertIn("no resolvable [model] entry", result.stderr)


if __name__ == "__main__":
    unittest.main()
