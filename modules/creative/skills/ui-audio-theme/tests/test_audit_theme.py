import copy
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "audit_theme.py"
SPEC = importlib.util.spec_from_file_location("audit_theme", SCRIPT)
audit_theme = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = audit_theme
SPEC.loader.exec_module(audit_theme)


class AuditThemeTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        (self.root / "src").mkdir()
        (self.root / "src" / "ui.tsx").write_text("export const UI = true;\n", encoding="utf-8")
        self.theme_dir = self.root / "theme"
        (self.theme_dir / "buttons").mkdir(parents=True)
        (self.theme_dir / "buttons" / "button-click-primary.mp3").write_bytes(b"audio")
        (self.theme_dir / "feedback").mkdir()
        (self.theme_dir / "feedback" / "notification-info.mp3").write_bytes(b"audio")
        self.theme_path = self.theme_dir / "theme.json"
        self.write_json(
            self.theme_path,
            {
                "name": "test",
                "sounds": {
                    "button-click-primary": {"file": "buttons/button-click-primary.mp3"},
                    "notification-info": {"file": "feedback/notification-info.mp3"},
                },
            },
        )
        self.event_map_path = self.root / "event-map.json"
        self.valid_map = self.make_valid_map()

    def tearDown(self):
        self.tempdir.cleanup()

    @staticmethod
    def write_json(path, value):
        path.write_text(json.dumps(value), encoding="utf-8")

    def make_valid_map(self):
        coverage = {
            area: {
                "status": "not_applicable",
                "items": [],
                "reason": f"{area} is outside this fixture.",
            }
            for area in audit_theme.COVERAGE_AREAS
        }
        coverage["routes"] = {"status": "reviewed", "items": ["/ — primary action"]}
        return {
            "schema_version": 1,
            "app": {"name": "fixture", "root": "."},
            "coverage": coverage,
            "interactions": [
                {
                    "id": "route.primary-action",
                    "domains": ["routes"],
                    "decision": {"type": "sound", "sound": "button-click-primary"},
                    "source_evidence": [
                        {
                            "path": "src/ui.tsx",
                            "line": 1,
                            "observation": "The semantic activation calls the sound helper.",
                        }
                    ],
                    "browser_evidence": [
                        {
                            "url": "http://127.0.0.1:3000/",
                            "steps": ["Activate the primary action."],
                            "observation": "Visible pressed state and one audible cue occur.",
                            "result": "pass",
                        }
                    ],
                    "visual_alternative": {
                        "verified": True,
                        "description": "The button has visible pressed and completed states.",
                    },
                    "repetition": {
                        "policy": "once per activation",
                        "details": "One playback occurs for each semantic activation.",
                        "verified": True,
                    },
                }
            ],
        }

    def run_audit(self, event_map=None):
        self.write_json(self.event_map_path, event_map or self.valid_map)
        return audit_theme.Audit(self.event_map_path, self.theme_path).run()

    def test_valid_map_passes_and_unused_slot_is_informational(self):
        result = self.run_audit()
        self.assertTrue(result["valid"])
        self.assertEqual(result["summary"]["unused_theme_slots"], 1)
        self.assertEqual(result["summary"]["errors"], 0)
        self.assertIn("unused-theme-slot", {finding["code"] for finding in result["findings"]})

    def test_intentional_silence_with_reason_is_valid(self):
        event_map = copy.deepcopy(self.valid_map)
        event_map["interactions"][0]["decision"] = {
            "type": "silence",
            "reason": "Text entry should not make a sound.",
        }
        result = self.run_audit(event_map)
        self.assertTrue(result["valid"])
        self.assertEqual(result["summary"]["intentional_silence"], 1)
        self.assertEqual(result["summary"]["unused_theme_slots"], 2)

    def test_unknown_sound_is_an_error(self):
        event_map = copy.deepcopy(self.valid_map)
        event_map["interactions"][0]["decision"]["sound"] = "not-in-theme"
        result = self.run_audit(event_map)
        self.assertFalse(result["valid"])
        self.assertIn("unknown-sound", {finding["code"] for finding in result["findings"]})

    def test_missing_theme_asset_is_an_error_even_when_slot_is_unused(self):
        (self.theme_dir / "feedback" / "notification-info.mp3").unlink()
        result = self.run_audit()
        self.assertFalse(result["valid"])
        self.assertIn("missing-asset", {finding["code"] for finding in result["findings"]})

    def test_missing_evidence_visual_and_repetition_verification_are_errors(self):
        event_map = copy.deepcopy(self.valid_map)
        interaction = event_map["interactions"][0]
        interaction["source_evidence"] = []
        interaction["browser_evidence"][0]["result"] = "fail"
        interaction["visual_alternative"]["verified"] = False
        interaction["repetition"]["verified"] = False
        result = self.run_audit(event_map)
        codes = {finding["code"] for finding in result["findings"]}
        self.assertFalse(result["valid"])
        self.assertTrue(
            {
                "missing-source-evidence",
                "browser-verification-failed",
                "unverified-visual-alternative",
                "unverified-repetition-policy",
            }.issubset(codes)
        )

    def test_all_coverage_areas_must_be_considered(self):
        event_map = copy.deepcopy(self.valid_map)
        del event_map["coverage"]["blockchain"]
        result = self.run_audit(event_map)
        self.assertFalse(result["valid"])
        missing = [
            finding
            for finding in result["findings"]
            if finding["code"] == "missing-coverage-area"
        ]
        self.assertEqual(missing[0]["location"], "coverage.blockchain")

    def test_json_cli_returns_zero_with_machine_readable_result(self):
        self.write_json(self.event_map_path, self.valid_map)
        completed = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--event-map",
                str(self.event_map_path),
                "--theme",
                str(self.theme_path),
                "--json",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        payload = json.loads(completed.stdout)
        self.assertTrue(payload["valid"])
        self.assertEqual(payload["summary"]["unused_theme_slots"], 1)

    def test_cli_returns_nonzero_for_errors(self):
        event_map = copy.deepcopy(self.valid_map)
        event_map["interactions"][0]["decision"]["sound"] = "missing"
        self.write_json(self.event_map_path, event_map)
        completed = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                str(self.event_map_path),
                "--theme",
                str(self.theme_path),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(completed.returncode, 1)
        self.assertIn("unknown-sound", completed.stdout)
        self.assertIn("FAIL: fix audit errors", completed.stdout)


if __name__ == "__main__":
    unittest.main()
