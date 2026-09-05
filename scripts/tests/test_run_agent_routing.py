from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPTS = Path(__file__).resolve().parents[1]


def load_script():
    spec = importlib.util.spec_from_file_location(
        "run_agent_routing", SCRIPTS / "run-agent-routing.py"
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PROBE = load_script()


def load_evaluator():
    spec = importlib.util.spec_from_file_location(
        "evaluate_skill_routing", SCRIPTS / "evaluate-skill-routing.py"
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


EVALUATE = load_evaluator()


class AgentRoutingProbeTests(unittest.TestCase):
    def test_run_case_uses_empty_external_cwd_and_records_selection_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as root:
            root_path = Path(root)
            plugin_dir = root_path / "plugin"
            config_dir = root_path / "config"
            plugin_dir.mkdir()
            observed: dict[str, object] = {}

            def fake_run(command, **kwargs):
                observed["command"] = command
                observed.update(kwargs)
                cwd = Path(kwargs["cwd"])
                self.assertTrue(cwd.is_dir())
                self.assertEqual(list(cwd.iterdir()), [])
                self.assertNotEqual(cwd, plugin_dir)
                self.assertEqual(kwargs["env"]["CLAUDE_CONFIG_DIR"], str(config_dir.resolve()))
                self.assertEqual(kwargs["env"].get("HOME"), os.environ.get("HOME"))
                self.assertNotIn("CLAUDECODE", kwargs["env"])
                return subprocess.CompletedProcess(
                    command,
                    0,
                    stdout=json.dumps(
                        {
                            "result": "core:tester",
                            "claude_code_version": "2.1.4",
                            "usage": {"cache_creation_input_tokens": None},
                        }
                    ),
                    stderr="",
                )

            with patch.object(PROBE.subprocess, "run", side_effect=fake_run):
                result = PROBE.run_case(
                    {"id": "case", "prompt": "write tests"},
                    plugin_dir,
                    config_dir,
                    "sonnet",
                    10,
                )

        command = observed["command"]
        self.assertIn("--setting-sources", command)
        self.assertIn("--settings", command)
        self.assertIn("disableAllHooks", command[command.index("--settings") + 1])
        self.assertEqual(result["measurement_kind"], "selection")
        self.assertEqual(result["selected_agent"], "tester")
        self.assertEqual(result["invoked_skills"], ["tester"])
        self.assertEqual(result["requested_model"], "sonnet")
        self.assertEqual(result["actual_version"], "2.1.4")
        self.assertNotIn("cache_creation_tokens", result)

        report = EVALUATE.evaluate(
            [{"id": "case", "expected_skills": ["tester"]}], [result]
        )
        self.assertTrue(report["passed"])

    def test_failed_repeat_is_retained_and_lowers_agreement(self) -> None:
        with tempfile.TemporaryDirectory() as root:
            root_path = Path(root)
            plugin_dir = root_path / "plugin"
            config_dir = root_path / "config"
            plugin_dir.mkdir()
            command = ["claude"]
            responses = [
                subprocess.CompletedProcess(
                    command, 0, stdout='{"result":"tester"}', stderr=""
                ),
                subprocess.TimeoutExpired(command, 10),
                subprocess.CompletedProcess(
                    command, 0, stdout='{"result":"tester"}', stderr=""
                ),
            ]
            with patch.object(PROBE.subprocess, "run", side_effect=responses):
                result = PROBE.run_case_repeated(
                    {"id": "case", "prompt": "write tests"},
                    plugin_dir,
                    config_dir,
                    None,
                    10,
                    3,
                )

        self.assertEqual(result["selected_agent"], "tester")
        self.assertEqual(result["invoked_skills"], ["tester"])
        self.assertEqual(result["agreement"], 0.667)
        self.assertEqual(result["selections"], ["tester", "ERROR", "tester"])
        self.assertEqual(len(result["samples"]), 3)
        self.assertEqual(result["errors"], ["timeout"])
        self.assertTrue(result["error"])

    def test_success_payload_marked_error_does_not_pass_as_selection(self) -> None:
        with tempfile.TemporaryDirectory() as root:
            plugin_dir = Path(root) / "plugin"
            config_dir = Path(root) / "config"
            plugin_dir.mkdir()
            response = subprocess.CompletedProcess(
                ["claude"],
                0,
                stdout=json.dumps({"is_error": True, "error": "blocked"}),
                stderr="",
            )
            with patch.object(PROBE.subprocess, "run", return_value=response):
                result = PROBE.run_case(
                    {"id": "case", "prompt": "write tests"},
                    plugin_dir,
                    config_dir,
                    None,
                    10,
                )
        self.assertEqual(result["error"], "blocked")
        self.assertIsNone(result["selected_agent"])

    def test_response_schema_version_is_not_reported_as_cli_version(self) -> None:
        with tempfile.TemporaryDirectory() as root:
            plugin_dir = Path(root) / "plugin"
            config_dir = Path(root) / "config"
            plugin_dir.mkdir()
            response = subprocess.CompletedProcess(
                ["claude"], 0, stdout='{"result":"tester","version":"schema-v1"}', stderr=""
            )
            with patch.object(PROBE.subprocess, "run", return_value=response):
                result = PROBE.run_case(
                    {"id": "case", "prompt": "write tests"},
                    plugin_dir,
                    config_dir,
                    None,
                    10,
                )
        self.assertEqual(result["actual_version"], PROBE.UNKNOWN)


if __name__ == "__main__":
    unittest.main()
