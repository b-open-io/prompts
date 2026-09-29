from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DETECTOR = ROOT / "modules/orchestra/skills/visual-coordinator/scripts/detect-harness.sh"
DENY = {"edit": "deny", "bash": "deny", "task": "deny"}
MD = "---\ndescription: read-only review\nmode: subagent\npermission:\n  edit: deny\n  bash:\n    \"*\": deny\n  task: deny\n---\nReview only.\n"


class OpenCodeReadOnlyAgentTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = Path(tempfile.mkdtemp())
        self.home = self.temp / "home"
        self.repo = self.temp / "repo"
        (self.home / ".config/opencode").mkdir(parents=True)
        (self.repo / ".git").mkdir(parents=True)
        self.addCleanup(lambda: subprocess.run(["rm", "-rf", str(self.temp)], check=False))

    def detect(self, agent: str = "review", **extra: str) -> tuple[str | None, str | None]:
        env = {key: value for key, value in os.environ.items() if not key.startswith(("OPENCODE_", "XDG_", "BOPEN_"))}
        env.update({"HOME": str(self.home), "PATH": f"{os.path.dirname(sys.executable)}:/usr/bin:/bin", "BOPEN_OPENCODE_READONLY_AGENT": agent, **extra})
        out = json.loads(subprocess.run(["bash", str(DETECTOR)], cwd=self.repo, env=env, capture_output=True, text=True, check=True).stdout)
        return out["opencode_read_only_agent"], out["opencode_read_only_problem"]

    def config(self, agent: dict, where: Path | None = None) -> None:
        (where or self.repo).joinpath("opencode.json").write_text(json.dumps({"agent": {"review": agent}}), encoding="utf-8")

    def markdown(self, body: str, where: Path | None = None) -> None:
        folder = where or self.repo / ".opencode/agent"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "review.md").write_text(body, encoding="utf-8")

    def test_accepts_a_json_agent_that_denies_edit_bash_and_task(self) -> None:
        self.config({"permission": DENY})
        self.assertEqual(self.detect(), ("review", None))

    def test_accepts_legacy_tool_booleans(self) -> None:
        self.config({"tools": {"edit": False, "write": False, "bash": False, "task": False}})
        self.assertEqual(self.detect(), ("review", None))

    def test_accepts_a_markdown_agent(self) -> None:
        self.markdown(MD)
        self.assertEqual(self.detect(), ("review", None))

    def test_accepts_a_global_markdown_agent(self) -> None:
        self.markdown(MD, self.home / ".config/opencode/agents")
        self.assertEqual(self.detect(), ("review", None))

    def test_rejects_a_missing_deny(self) -> None:
        self.config({"permission": {"edit": "deny", "bash": "deny"}})
        agent, problem = self.detect()
        self.assertIsNone(agent)
        self.assertIn("does not deny task for agent review", problem)

    def test_rejects_bash_ask(self) -> None:
        self.config({"permission": {**DENY, "bash": "ask"}})
        agent, problem = self.detect()
        self.assertIsNone(agent)
        self.assertIn("does not deny bash", problem)

    def test_rejects_a_bash_pattern_that_allows_anything(self) -> None:
        self.config({"permission": {**DENY, "bash": {"*": "deny", "git diff*": "allow"}}})
        self.assertIsNone(self.detect()[0])

    def test_rejects_a_write_capable_tool(self) -> None:
        self.config({"permission": DENY, "tools": {"write": True}})
        agent, problem = self.detect()
        self.assertIsNone(agent)
        self.assertIn("lets agent review use write", problem)

    def test_rejects_a_wildcard_allow(self) -> None:
        self.config({"permission": {**DENY, "*": "allow"}})
        self.assertIn("allows every tool", self.detect()[1])

    def test_rejects_an_unknown_agent(self) -> None:
        self.config({"permission": DENY})
        self.assertEqual(self.detect("other"), (None, "no OpenCode config defines agent other"))

    def test_rejects_an_unverifiable_jsonc(self) -> None:
        self.config({"permission": DENY})
        (self.repo / "opencode.jsonc").write_text("{}", encoding="utf-8")
        self.assertIn("opencode.jsonc cannot be verified", self.detect()[1])

    def test_rejects_a_config_override(self) -> None:
        self.config({"permission": DENY})
        self.assertIn("OPENCODE_CONFIG overrides", self.detect(OPENCODE_CONFIG="/tmp/x.json")[1])

    def test_every_definition_must_deny(self) -> None:
        self.config({"permission": DENY})
        self.config({"permission": {**DENY, "edit": "allow"}}, self.home / ".config/opencode")
        agent, problem = self.detect()
        self.assertIsNone(agent)
        self.assertIn("does not deny edit", problem)

    def test_a_markdown_override_can_reopen_bash(self) -> None:
        self.config({"permission": DENY})
        self.markdown(MD.replace('    "*": deny', '    "*": allow'))
        self.assertIsNone(self.detect()[0])

    def test_reads_a_parent_config_up_to_the_git_root(self) -> None:
        self.config({"permission": {**DENY, "bash": "allow"}})
        (self.repo / "sub").mkdir()
        self.markdown(MD)
        env = {key: value for key, value in os.environ.items() if not key.startswith(("OPENCODE_", "XDG_", "BOPEN_"))}
        env.update({"HOME": str(self.home), "PATH": f"{os.path.dirname(sys.executable)}:/usr/bin:/bin", "BOPEN_OPENCODE_READONLY_AGENT": "review"})
        out = json.loads(subprocess.run(["bash", str(DETECTOR)], cwd=self.repo / "sub", env=env, capture_output=True, text=True, check=True).stdout)
        self.assertIsNone(out["opencode_read_only_agent"])

    def test_rejects_an_invalid_name(self) -> None:
        self.assertIn("not a valid agent name", self.detect("../x")[1])


if __name__ == "__main__":
    unittest.main()
