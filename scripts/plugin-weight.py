#!/usr/bin/env python3
"""Report and compare plugin catalog/context weight without changing the plugin."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from plugin_inventory import collect_inventory


ROOT = Path(__file__).resolve().parents[1]


def numeric_delta(
    current: dict[str, Any], baseline: dict[str, Any]
) -> dict[str, int | float]:
    result: dict[str, int | float] = {}
    for key, value in current.items():
        previous = baseline.get(key)
        if isinstance(value, (int, float)) and isinstance(previous, (int, float)):
            result[key] = value - previous
    return result


def markdown(report: dict[str, Any]) -> str:
    totals = report["totals"]
    lines = [
        "# Plugin context weight",
        "",
        f"- Root: `{report['root']}`",
        (
            "- Version: Claude "
            f"`{report['manifests']['claude'].get('version', 'missing')}`, "
            f"Codex `{report['manifests']['codex'].get('version', 'missing')}`"
        ),
        (
            f"- Skills: {totals['skill_count']} "
            f"({totals['authored_skill_count']} authored, "
            f"{totals['third_party_skill_count']} third-party)"
        ),
        (
            "- Implicit skills: "
            f"Claude {totals['claude_implicit_skill_count']}, "
            f"Codex {totals['codex_implicit_skill_count']}"
        ),
        (
            "- Skill descriptions: "
            f"{totals['skill_description_bytes']:,} bytes / "
            f"~{totals['skill_description_estimated_tokens']:,} tokens"
        ),
        (
            "- Minimum skill identity/path estimate: "
            f"{totals['skill_identity_path_bytes']:,} bytes"
        ),
        (
            f"- Agents: {totals['agent_count']}; "
            f"commands: {totals['command_count']}"
        ),
        "",
        "## Largest skill descriptions",
        "",
        "| Skill | Source | Claude implicit | Codex implicit | Bytes |",
        "|---|---|---:|---:|---:|",
    ]
    for record in sorted(
        report["skills"],
        key=lambda item: item["description_metrics"]["bytes"],
        reverse=True,
    )[:20]:
        lines.append(
            f"| `{record['name']}` | {record['source']} | "
            f"{str(record['claude_implicit']).lower()} | "
            f"{str(record['codex_implicit']).lower()} | "
            f"{record['description_metrics']['bytes']:,} |"
        )

    lines.extend(
        [
            "",
            "## Largest on-demand skill bodies",
            "",
            "| Skill | Body bytes | Reference bytes | Script bytes |",
            "|---|---:|---:|---:|",
        ]
    )
    for record in sorted(
        report["skills"],
        key=lambda item: item["body_metrics"]["bytes"],
        reverse=True,
    )[:20]:
        lines.append(
            f"| `{record['name']}` | {record['body_metrics']['bytes']:,} | "
            f"{record['references']['bytes']:,} | {record['scripts']['bytes']:,} |"
        )

    if report["duplicate_skill_names"]:
        lines.extend(["", "## Duplicate skill names", ""])
        for name, count in report["duplicate_skill_names"].items():
            lines.append(f"- `{name}`: {count}")

    if "comparison" in report:
        lines.extend(
            [
                "",
                "## Baseline delta",
                "",
                "| Metric | Delta |",
                "|---|---:|",
            ]
        )
        for key, value in sorted(report["comparison"]["totals_delta"].items()):
            lines.append(f"| `{key}` | {value:+,} |")
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--baseline", type=Path)
    parser.add_argument("--format", choices=("json", "markdown"), default="json")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--max-implicit-skills", type=int)
    parser.add_argument("--max-description-chars", type=int)
    parser.add_argument("--fail-on-duplicates", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = collect_inventory(args.root)
    if args.baseline:
        baseline = json.loads(args.baseline.read_text(encoding="utf-8"))
        report["comparison"] = {
            "baseline": str(args.baseline),
            "totals_delta": numeric_delta(
                report["totals"], baseline.get("totals", {})
            ),
        }

    failures: list[str] = []
    totals = report["totals"]
    if (
        args.max_implicit_skills is not None
        and totals["codex_implicit_skill_count"] > args.max_implicit_skills
    ):
        failures.append(
            "Codex implicit skill count "
            f"{totals['codex_implicit_skill_count']} exceeds "
            f"{args.max_implicit_skills}"
        )
    if (
        args.max_description_chars is not None
        and totals["skill_description_chars"] > args.max_description_chars
    ):
        failures.append(
            "skill description characters "
            f"{totals['skill_description_chars']} exceed "
            f"{args.max_description_chars}"
        )
    if args.fail_on_duplicates and report["duplicate_skill_names"]:
        failures.append("duplicate skill names are present")
    report["gate"] = {"passed": not failures, "failures": failures}

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

    if failures:
        for failure in failures:
            print(f"plugin-weight: {failure}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
