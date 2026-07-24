from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))

from plugin_inventory import collect_inventory, parse_frontmatter  # noqa: E402


def load_script(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / filename)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PLUGIN_WEIGHT = load_script("plugin_weight", "plugin-weight.py")


class PluginWeightTests(unittest.TestCase):
    def test_frontmatter_supports_folded_blocks_and_booleans(self) -> None:
        metadata, body = parse_frontmatter(
            "---\n"
            "name: demo\n"
            "description: >-\n"
            "  First line\n"
            "  second line.\n"
            "disable-model-invocation: true\n"
            "---\n"
            "# Body\n"
        )
        self.assertEqual(metadata["description"], "First line second line.")
        self.assertIs(metadata["disable-model-invocation"], True)
        self.assertEqual(body, "# Body")

    def test_inventory_counts_symlinks_policies_and_duplicates(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for manifest in (".claude-plugin", ".codex-plugin"):
                path = root / manifest
                path.mkdir()
                (path / "plugin.json").write_text(
                    json.dumps({"name": "fixture", "version": "1.2.3"}),
                    encoding="utf-8",
                )
            (root / "skills").mkdir()
            alpha = root / "skills" / "alpha"
            alpha.mkdir()
            (alpha / "SKILL.md").write_text(
                "---\n"
                "name: duplicate\n"
                "description: Alpha routing description.\n"
                "---\n"
                "Alpha body.\n",
                encoding="utf-8",
            )
            third_party = root / "vendor" / "beta"
            (third_party / "agents").mkdir(parents=True)
            (third_party / "SKILL.md").write_text(
                "---\n"
                "name: duplicate\n"
                "description: >-\n"
                "  Third-party routing\n"
                "  description.\n"
                "disable-model-invocation: true\n"
                "---\n"
                "Beta body.\n",
                encoding="utf-8",
            )
            (third_party / "agents" / "openai.yaml").write_text(
                "policy:\n  allow_implicit_invocation: false\n",
                encoding="utf-8",
            )
            (root / "skills" / "beta").symlink_to(third_party)
            (root / "agents").mkdir()
            (root / "agents" / "helper.md").write_text(
                "---\nname: helper\ndescription: Helper agent.\n---\nAgent body.\n",
                encoding="utf-8",
            )
            (root / "commands").mkdir()
            (root / "commands" / "probe.md").write_text(
                "---\ndescription: Probe command.\n---\nCommand body.\n",
                encoding="utf-8",
            )

            report = collect_inventory(root)

        self.assertEqual(report["totals"]["skill_count"], 2)
        self.assertEqual(report["totals"]["authored_skill_count"], 1)
        self.assertEqual(report["totals"]["third_party_skill_count"], 1)
        self.assertEqual(report["totals"]["claude_implicit_skill_count"], 1)
        self.assertEqual(report["totals"]["codex_implicit_skill_count"], 1)
        self.assertEqual(report["duplicate_skill_names"], {"duplicate": 2})
        self.assertEqual(report["totals"]["agent_count"], 1)
        self.assertEqual(report["totals"]["command_count"], 1)

    def test_baseline_delta_only_compares_numeric_totals(self) -> None:
        delta = PLUGIN_WEIGHT.numeric_delta(
            {"skills": 10, "bytes": 100, "label": "new"},
            {"skills": 8, "bytes": 120, "label": "old"},
        )
        self.assertEqual(delta, {"skills": 2, "bytes": -20})


if __name__ == "__main__":
    unittest.main()
