from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]


def load_script():
    spec = importlib.util.spec_from_file_location(
        "capture_codex_context", SCRIPTS / "capture-codex-context.py"
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CAPTURE = load_script()


class CodexContextTests(unittest.TestCase):
    def test_parse_models_uses_requested_context_window(self) -> None:
        snapshot = CAPTURE.parse_models(
            '{"models":[{"slug":"small","context_window":100000},'
            '{"slug":"large","context_window":272000}]}',
            "large",
        )
        self.assertEqual(snapshot["context_window"], 272000)
        self.assertEqual(snapshot["skill_budget_tokens"], 5440)

    def test_parse_prompt_counts_minimal_and_described_lines(self) -> None:
        prompt = (
            "prefix\n<skills_instructions>\n"
            "## Skills\n"
            "- imagegen: Generate images. (file: /tmp/imagegen/SKILL.md)\n"
            "- bopen-tools:advisor: (file: /tmp/advisor/SKILL.md)\n"
            "⚠ Exceeded skills context budget of 2%. "
            "All skill descriptions were removed and 71 additional skills "
            "were not included in the model-visible skills list.\n"
            "</skills_instructions>\nsuffix\n"
        )
        snapshot = CAPTURE.parse_prompt(prompt)
        self.assertEqual(snapshot["visible_skill_count"], 2)
        self.assertEqual(snapshot["omitted_skill_count"], 71)
        self.assertEqual(snapshot["implicit_skill_count"], 73)
        self.assertEqual(snapshot["descriptions_retained"], 1)
        self.assertEqual(snapshot["bopen_tools_visible_count"], 1)
        self.assertTrue(snapshot["all_descriptions_removed"])

    def test_missing_skills_block_is_actionable(self) -> None:
        with self.assertRaisesRegex(CAPTURE.CaptureError, "skills_instructions"):
            CAPTURE.parse_prompt("no skills here")

    def test_parse_prompt_unwraps_debug_json(self) -> None:
        wrapped = json.dumps(
            [
                {
                    "type": "message",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                "<skills_instructions>\n"
                                "- bopen-tools:humanize: (file: r4/humanize/SKILL.md)\n"
                                "</skills_instructions>"
                            ),
                        }
                    ],
                }
            ]
        )
        snapshot = CAPTURE.parse_prompt(wrapped)
        self.assertEqual(snapshot["visible_skills"], ["bopen-tools:humanize"])
        self.assertIsNone(snapshot["omitted_skill_count"])
        self.assertFalse(snapshot["catalog_warning_observed"])

    def test_runtime_event_supplies_authoritative_omission_count(self) -> None:
        events = (
            '{"type":"item.completed","item":{"type":"error","message":'
            '"Exceeded skills context budget of 2%. All skill descriptions '
            'were removed and 76 additional skills were not included in the '
            'model-visible skills list."}}\n'
        )
        snapshot = CAPTURE.parse_runtime_events(events)
        self.assertTrue(snapshot["catalog_warning_observed"])
        self.assertEqual(snapshot["omitted_skill_count"], 76)
        self.assertTrue(snapshot["all_descriptions_removed"])


if __name__ == "__main__":
    unittest.main()
