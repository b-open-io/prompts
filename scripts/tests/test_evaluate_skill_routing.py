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
                "expected_skills": ["review:visual-review"],
                "acceptable_alternatives": [],
                "forbidden_skills": ["review:free-roam-testing"],
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
                "invoked_skills": ["review:visual-review"],
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
                    "expected_skills": ["review:visual-review"],
                    "acceptable_alternatives": [],
                    "forbidden_skills": ["review:free-roam-testing"],
                }
            ],
            [
                {
                    "case_id": "boundary",
                    "host": "codex",
                    "invoked_skills": ["review:free-roam-testing"],
                }
            ],
        )
        self.assertFalse(report["passed"])
        self.assertEqual(report["forbidden_hit_count"], 1)
        self.assertEqual(report["omission_count"], 1)

    def test_unapproved_extra_and_missing_or_error_fail_each_case(self) -> None:
        cases = [
            {
                "id": "positive",
                "expected_skills": ["wanted"],
                "acceptable_alternatives": ["allowed"],
                "forbidden_skills": ["forbidden"],
            },
            {
                "id": "negative",
                "expected_skills": [],
                "acceptable_alternatives": [],
                "forbidden_skills": [],
            },
        ]
        report = EVALUATE.evaluate(
            cases,
            [
                {
                    "case_id": "positive",
                    "invoked_skills": ["wanted", "unapproved"],
                },
                {"case_id": "negative", "invoked_skills": [], "error": "timeout"},
            ],
        )
        self.assertFalse(report["passed"])
        self.assertEqual([case["passed"] for case in report["cases"]], [False, False])
        self.assertEqual(report["cases"][0]["unexpected"], ["unapproved"])
        self.assertEqual(report["error_count"], 1)

    def test_duplicate_results_are_rejected_regardless_of_host_order(self) -> None:
        cases = [{"id": "same", "expected_skills": ["wanted"]}]
        for hosts in (("claude", "codex"), ("codex", "claude")):
            with self.subTest(hosts=hosts):
                with self.assertRaisesRegex(
                    EVALUATE.EvaluationError, "score each host/run separately"
                ):
                    EVALUATE.evaluate(
                        cases,
                        [
                            {"case_id": "same", "host": host, "invoked_skills": ["wanted"]}
                            for host in hosts
                        ],
                    )

    def test_selection_result_is_scored_and_malformed_records_rejected(self) -> None:
        report = EVALUATE.evaluate(
            [{"id": "selected", "expected_skills": ["tester"]}],
            [{"case_id": "selected", "selected_agent": "tester"}],
        )
        self.assertTrue(report["passed"])
        with self.assertRaises(EVALUATE.EvaluationError):
            EVALUATE.evaluate(
                [{"id": "selected", "expected_skills": ["tester"]}],
                [{"case_id": "selected", "invoked_skills": ["tester"], "error": 1}],
            )

    def test_empty_cases_missing_negative_and_conflicting_selection_fail(self) -> None:
        with self.assertRaises(EVALUATE.EvaluationError):
            EVALUATE.evaluate([], [])

        missing = EVALUATE.evaluate(
            [{"id": "negative", "expected_skills": []}], []
        )
        self.assertFalse(missing["passed"])
        self.assertFalse(missing["cases"][0]["passed"])
        self.assertEqual(missing["cases"][0]["error"], "missing result")

        with self.assertRaisesRegex(
            EVALUATE.EvaluationError, "conflicts with invoked_skills"
        ):
            EVALUATE.evaluate(
                [{"id": "negative", "expected_skills": []}],
                [
                    {
                        "case_id": "negative",
                        "selected_agent": None,
                        "invoked_skills": ["unexpected"],
                    }
                ],
            )


if __name__ == "__main__":
    unittest.main()
