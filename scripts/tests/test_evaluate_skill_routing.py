from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]


def load_script():
    spec = importlib.util.spec_from_file_location(
        "evaluate_skill_routing", SCRIPTS / "evaluate-skill-routing.py"
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


EVALUATE = load_script()


class SkillRoutingEvaluationTests(unittest.TestCase):
    def test_precision_recall_for_positive_and_negative_cases(self) -> None:
        cases = [
            {
                "id": "direct",
                "expected_skills": ["bopen-tools:visual-review"],
                "acceptable_alternatives": [],
                "forbidden_skills": ["bopen-tools:free-roam-testing"],
            },
            {
                "id": "negative",
                "expected_skills": [],
                "acceptable_alternatives": [],
                "forbidden_skills": [],
            },
        ]
        results = [
            {
                "case_id": "direct",
                "host": "claude",
                "invoked_skills": ["bopen-tools:visual-review"],
            },
            {
                "case_id": "negative",
                "host": "claude",
                "invoked_skills": [],
            },
        ]
        report = EVALUATE.evaluate(cases, results)
        self.assertTrue(report["passed"])
        self.assertEqual(report["precision"], 1.0)
        self.assertEqual(report["recall"], 1.0)

    def test_forbidden_hit_and_omission_fail(self) -> None:
        report = EVALUATE.evaluate(
            [
                {
                    "id": "boundary",
                    "expected_skills": ["bopen-tools:visual-review"],
                    "acceptable_alternatives": [],
                    "forbidden_skills": ["bopen-tools:free-roam-testing"],
                }
            ],
            [
                {
                    "case_id": "boundary",
                    "host": "codex",
                    "invoked_skills": ["bopen-tools:free-roam-testing"],
                }
            ],
        )
        self.assertFalse(report["passed"])
        self.assertEqual(report["forbidden_hit_count"], 1)
        self.assertEqual(report["omission_count"], 1)


if __name__ == "__main__":
    unittest.main()
