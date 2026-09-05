from __future__ import annotations

import importlib.util
import json
import subprocess
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


def write_manifest(root: Path, name: str) -> None:
    for directory in (".claude-plugin", ".codex-plugin"):
        path = root / directory
        path.mkdir(parents=True, exist_ok=True)
        (path / "plugin.json").write_text(
            json.dumps({"name": name, "version": "1.0.0"}), encoding="utf-8"
        )


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

    def test_agent_tools_examples_and_startup_total_are_measured(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "skills").mkdir()
            alpha = root / "skills" / "alpha"
            alpha.mkdir()
            (alpha / "SKILL.md").write_text(
                "---\nname: alpha\ndescription: Routing text.\n---\nBody.\n",
                encoding="utf-8",
            )
            (root / "agents").mkdir()
            (root / "agents" / "verbose.md").write_text(
                "---\n"
                "name: verbose\n"
                "description: >-\n"
                "  Use when routing. <example>one</example>\n"
                "  <example>two</example>\n"
                "tools: Read, Write, Skill(alpha)\n"
                "---\n"
                "Agent body.\n",
                encoding="utf-8",
            )

            report = collect_inventory(root)

        totals = report["totals"]
        agent = report["agents"][0]
        self.assertEqual(agent["example_count"], 2)
        self.assertEqual(agent["tools_metrics"]["chars"], len("Read, Write, Skill(alpha)"))
        self.assertEqual(totals["agent_example_count"], 2)
        self.assertEqual(totals["agent_tools_bytes"], agent["tools_metrics"]["bytes"])
        self.assertEqual(
            totals["model_visible_startup_bytes"],
            totals["skill_description_bytes"]
            + totals["skill_identity_path_bytes"]
            + totals["agent_description_bytes"]
            + totals["agent_tools_bytes"],
        )

    def test_agents_without_tools_report_zero_rather_than_missing(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "agents").mkdir()
            (root / "agents" / "bare.md").write_text(
                "---\nname: bare\ndescription: No tools key.\n---\nBody.\n",
                encoding="utf-8",
            )

            report = collect_inventory(root)

        self.assertEqual(report["agents"][0]["tools_metrics"]["bytes"], 0)
        self.assertEqual(report["agents"][0]["example_count"], 0)
        self.assertEqual(report["totals"]["agent_tools_bytes"], 0)

    def test_baseline_delta_only_compares_numeric_totals(self) -> None:
        delta = PLUGIN_WEIGHT.numeric_delta(
            {"skills": 10, "bytes": 100, "label": "new"},
            {"skills": 8, "bytes": 120, "label": "old"},
        )
        self.assertEqual(delta, {"skills": 2, "bytes": -20})

    def test_root_output_stays_single_plugin_and_command_descriptions_count(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            before = collect_inventory(root)
            (root / "commands").mkdir()
            (root / "commands" / "describe.md").write_text(
                "---\ndescription: command bytes\n---\nBody.\n", encoding="utf-8"
            )
            report = collect_inventory(root)

        self.assertNotIn("all_plugins", report)
        self.assertEqual(report["totals"]["command_description_bytes"], len("command bytes"))
        self.assertEqual(
            report["totals"]["model_visible_startup_bytes"],
            before["totals"]["model_visible_startup_bytes"] + len("command bytes"),
        )

    def test_all_plugins_preserves_records_and_aggregate_gate_catches_module(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_manifest(root, "core")
            module = root / "modules" / "addon"
            write_manifest(module, "addon")
            (module / "agents").mkdir(parents=True)
            (module / "agents" / "large.md").write_text(
                "---\nname: large\ndescription: " + "x" * 601 + "\n---\nBody.\n",
                encoding="utf-8",
            )
            report = collect_inventory(root, all_plugins=True)
            command = [
                sys.executable,
                str(SCRIPTS / "plugin-weight.py"),
                "--root",
                str(root),
                "--all-plugins",
                "--max-startup-tokens",
                "18000",
                "--max-agent-description-chars",
                "600",
                "--max-agent-examples",
                "0",
                "--fail-on-duplicates",
            ]
            result = subprocess.run(command, capture_output=True, text=True, check=False)

        self.assertEqual([plugin["plugin"] for plugin in report["plugins"]], ["core", "addon"])
        self.assertGreater(report["totals"]["model_visible_startup_estimated_tokens"], 0)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("plugin addon agent large", result.stderr)

    def test_all_plugins_duplicate_gate_is_scoped_to_plugin(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_manifest(root, "core")
            module = root / "modules" / "addon"
            write_manifest(module, "addon")
            skills = module / "skills"
            for folder in ("one", "two"):
                skill = skills / folder
                skill.mkdir(parents=True)
                (skill / "SKILL.md").write_text(
                    "---\nname: same\ndescription: route\n---\nBody.\n",
                    encoding="utf-8",
                )
            command = [
                sys.executable,
                str(SCRIPTS / "plugin-weight.py"),
                "--root",
                str(root),
                "--all-plugins",
                "--fail-on-duplicates",
            ]
            result = subprocess.run(command, capture_output=True, text=True, check=False)

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("plugin addon has duplicate skill names", result.stderr)


if __name__ == "__main__":
    unittest.main()
