#!/usr/bin/env python3
"""Score recorded skill-routing results with precision, recall, and confusion."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


class EvaluationError(RuntimeError):
    """Raised when routing fixtures or results are invalid."""


def load_cases(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    cases = payload.get("cases") if isinstance(payload, dict) else payload
    if not isinstance(cases, list):
        raise EvaluationError("cases file must contain a list or {'cases': [...]}")
    seen: set[str] = set()
    for case in cases:
        if not isinstance(case, dict) or not isinstance(case.get("id"), str):
            raise EvaluationError("every case must have a string id")
        if case["id"] in seen:
            raise EvaluationError(f"duplicate case id: {case['id']}")
        seen.add(case["id"])
        for key in (
            "expected_skills",
            "acceptable_alternatives",
            "forbidden_skills",
        ):
            value = case.get(key, [])
            if not isinstance(value, list) or not all(
                isinstance(item, str) for item in value
            ):
                raise EvaluationError(f"{case['id']}.{key} must be a string list")
    return cases


def load_results(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    try:
        payload = json.loads(text)
        results = payload.get("results") if isinstance(payload, dict) else payload
    except json.JSONDecodeError:
        results = [json.loads(line) for line in text.splitlines() if line.strip()]
    if not isinstance(results, list):
        raise EvaluationError("results must be JSON/JSONL records")
    for result in results:
        if not isinstance(result, dict) or not isinstance(
            result.get("case_id"), str
        ):
            raise EvaluationError("every result must have a string case_id")
        invoked = result.get("invoked_skills", [])
        if not isinstance(invoked, list) or not all(
            isinstance(item, str) for item in invoked
        ):
            raise EvaluationError(
                f"{result['case_id']}.invoked_skills must be a string list"
            )
    return results


def evaluate(
    cases: list[dict[str, Any]], results: list[dict[str, Any]]
) -> dict[str, Any]:
    result_by_case = {result["case_id"]: result for result in results}
    unknown = sorted(set(result_by_case) - {case["id"] for case in cases})
    if unknown:
        raise EvaluationError("results reference unknown cases: " + ", ".join(unknown))

    true_invocations = 0
    total_invocations = 0
    positive_cases = 0
    recalled_cases = 0
    forbidden_hits = 0
    omissions = 0
    case_reports: list[dict[str, Any]] = []
    confusion: Counter[tuple[str, str]] = Counter()

    for case in cases:
        result = result_by_case.get(case["id"], {})
        invoked = list(dict.fromkeys(result.get("invoked_skills", [])))
        expected = set(case.get("expected_skills", []))
        alternatives = set(case.get("acceptable_alternatives", []))
        accepted = expected | alternatives
        forbidden = set(case.get("forbidden_skills", []))
        matched = sorted(set(invoked) & accepted)
        forbidden_for_case = sorted(set(invoked) & forbidden)
        unexpected = sorted(set(invoked) - accepted)
        total_invocations += len(invoked)
        true_invocations += sum(skill in accepted for skill in invoked)
        forbidden_hits += len(forbidden_for_case)
        if expected:
            positive_cases += 1
            if matched:
                recalled_cases += 1
            else:
                omissions += 1
        expected_label = sorted(expected)[0] if expected else "<none>"
        for skill in invoked or ["<none>"]:
            confusion[(expected_label, skill)] += 1
        case_reports.append(
            {
                "id": case["id"],
                "host": result.get("host", "unknown"),
                "invoked_skills": invoked,
                "matched": matched,
                "unexpected": unexpected,
                "forbidden_hits": forbidden_for_case,
                "passed": bool(matched) if expected else not invoked,
            }
        )

    missing_results = sorted(
        case["id"] for case in cases if case["id"] not in result_by_case
    )
    return {
        "schema_version": 1,
        "case_count": len(cases),
        "result_count": len(results),
        "precision": (
            true_invocations / total_invocations if total_invocations else 1.0
        ),
        "recall": recalled_cases / positive_cases if positive_cases else 1.0,
        "forbidden_hit_count": forbidden_hits,
        "omission_count": omissions,
        "missing_results": missing_results,
        "passed": not missing_results
        and forbidden_hits == 0
        and omissions == 0
        and all(report["passed"] for report in case_reports),
        "confusion": [
            {"expected": expected, "invoked": invoked, "count": count}
            for (expected, invoked), count in sorted(confusion.items())
        ],
        "cases": case_reports,
    }


def markdown(report: dict[str, Any]) -> str:
    lines = [
        "# Skill routing evaluation",
        "",
        f"- Cases: {report['case_count']}",
        f"- Results: {report['result_count']}",
        f"- Precision: {report['precision']:.1%}",
        f"- Recall: {report['recall']:.1%}",
        f"- Omissions: {report['omission_count']}",
        f"- Forbidden hits: {report['forbidden_hit_count']}",
        "",
        "| Case | Host | Invoked | Result |",
        "|---|---|---|---|",
    ]
    for case in report["cases"]:
        lines.append(
            f"| `{case['id']}` | {case['host']} | "
            f"{', '.join(case['invoked_skills']) or 'none'} | "
            f"{'pass' if case['passed'] else 'fail'} |"
        )
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", type=Path, required=True)
    parser.add_argument("--results", type=Path, required=True)
    parser.add_argument("--format", choices=("json", "markdown"), default="json")
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        report = evaluate(load_cases(args.cases), load_results(args.results))
    except (OSError, json.JSONDecodeError, EvaluationError) as exc:
        print(f"evaluate-skill-routing: {exc}", file=sys.stderr)
        return 2
    rendered = (
        json.dumps(report, indent=2, sort_keys=True) + "\n"
        if args.format == "json"
        else markdown(report)
    )
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
