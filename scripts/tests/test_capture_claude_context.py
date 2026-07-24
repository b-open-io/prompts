from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))


def load_script():
    spec = importlib.util.spec_from_file_location(
        "capture_claude_context", SCRIPTS / "capture-claude-context.py"
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CAPTURE = load_script()


DETAILS = """bopen-tools 1.2.3
  Fixture plugin

Component inventory
  Skills (3)  alpha, beta, legacy
  Agents (1)  helper
  Hooks (2)  SessionStart, Stop  (harness-only — no model context cost)
  MCP servers (0)

Projected token cost
  Always-on:   ~1.2k tok   added to every session

Per-component (rounded)
  component                 always-on  on-invoke
  alpha                          ~100       ~400
  helper                         ~1.1k      ~2.5k
"""


class ClaudeContextTests(unittest.TestCase):
    def test_token_value_handles_commas_and_k_suffix(self) -> None:
        self.assertEqual(CAPTURE.token_value("~29,101"), 29101)
        self.assertEqual(CAPTURE.token_value("~1.1k"), 1100)

    def test_parse_details_distinguishes_source_skill_count(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for manifest in (".claude-plugin", ".codex-plugin"):
                path = root / manifest
                path.mkdir()
                (path / "plugin.json").write_text(
                    json.dumps({"name": "bopen-tools", "version": "1.2.3"}),
                    encoding="utf-8",
                )
            for name in ("alpha", "beta"):
                skill = root / "skills" / name
                skill.mkdir(parents=True)
                (skill / "SKILL.md").write_text(
                    f"---\nname: {name}\ndescription: {name} description.\n---\nBody.\n",
                    encoding="utf-8",
                )
            snapshot = CAPTURE.parse_details(DETAILS, root)

        self.assertEqual(snapshot["always_on_tokens"], 1200)
        self.assertEqual(snapshot["components"]["skills"]["count"], 3)
        self.assertEqual(len(snapshot["component_costs"]), 2)
        self.assertEqual(
            snapshot["source_inventory"][
                "reported_non_skill_entries_in_skills_group_estimate"
            ],
            1,
        )


if __name__ == "__main__":
    unittest.main()
