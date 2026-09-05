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
SOURCE_ESTIMATE_NOTE = (
    "Source token estimate uses UTF-8 source bytes divided by four and is "
    "path-dependent; it includes command descriptions and excludes host "
    "framing and hooks."
)


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
    all_plugins = bool(report.get("all_plugins"))
    if all_plugins:
        lines = [
            "# Plugin context weight",
            "",
            f"- Root: `{report['root']}`",
            f"- Plugins: {len(report['plugins'])}",
        ]
    else:
        lines = [
            "# Plugin context weight",
            "",
            f"- Root: `{report['root']}`",
            (
                "- Version: Claude "
                f"`{report['manifests']['claude'].get('version', 'missing')}`, "
                f"Codex `{report['manifests']['codex'].get('version', 'missing')}`"
            ),
        ]
    lines.extend(
        [
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
            (
                "- Agent descriptions: "
                f"{totals['agent_description_bytes']:,} bytes / "
                f"~{totals['agent_description_estimated_tokens']:,} tokens "
                f"across {totals['agent_example_count']} examples"
            ),
            (
                "- Agent tools lists: "
                f"{totals['agent_tools_bytes']:,} bytes / "
                f"~{totals['agent_tools_estimated_tokens']:,} tokens"
            ),
            (
                "- Command descriptions: "
                f"{totals['command_description_bytes']:,} bytes / "
                f"~{totals['command_description_estimated_tokens']:,} tokens"
            ),
            (
                "- **Model-visible startup total: "
                f"{totals['model_visible_startup_bytes']:,} bytes / "
                f"~{totals['model_visible_startup_estimated_tokens']:,} tokens**"
            ),
            f"- {SOURCE_ESTIMATE_NOTE}",
        ]
    )
    if all_plugins:
        lines.extend(
            [
                "",
                "## Plugin totals",
                "",
                "| Plugin | Skills | Agents | Commands | Startup tokens |",
                "|---|---:|---:|---:|---:|",
            ]
        )
        for plugin in report["plugins"]:
            plugin_totals = plugin["totals"]
            lines.append(
                f"| `{plugin['plugin']}` | {plugin_totals['skill_count']} | "
                f"{plugin_totals['agent_count']} | {plugin_totals['command_count']} | "
                f"{plugin_totals['model_visible_startup_estimated_tokens']} |"
            )
        return "\n".join(lines) + "\n"
    lines.extend(
        [
            "",
            "## Largest agent descriptions",
            "",
            "| Agent | Examples | Description bytes | Tools bytes |",
            "|---|---:|---:|---:|",
        ]
    )
    for record in sorted(
        report["agents"],
        key=lambda item: item["description_metrics"]["bytes"],
        reverse=True,
    )[:20]:
        lines.append(
            f"| `{record['name']}` | {record['example_count']} | "
            f"{record['description_metrics']['bytes']:,} | "
            f"{record['tools_metrics']['bytes']:,} |"
        )

    lines.extend(
        [
            "",
            "## Largest skill descriptions",
            "",
            "| Skill | Source | Claude implicit | Codex implicit | Bytes |",
            "|---|---|---:|---:|---:|",
        ]
    )
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
    parser.add_argument("--max-agent-description-chars", type=int)
    parser.add_argument("--max-agent-examples", type=int)
    parser.add_argument("--max-startup-tokens", type=int)
    parser.add_argument("--fail-on-duplicates", action="store_true")
    parser.add_argument(
        "--all-plugins",
        action="store_true",
        help="include the root and every shipped direct module",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = collect_inventory(args.root, all_plugins=args.all_plugins)
    report["source_token_estimate"] = SOURCE_ESTIMATE_NOTE
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
    plugin_reports = report.get("plugins", [report])
    scoped_failures = bool(report.get("all_plugins"))
    if args.max_agent_description_chars is not None:
        for plugin in plugin_reports:
            label = plugin.get("plugin", "root")
            prefix = f"plugin {label} " if scoped_failures else ""
            for record in plugin["agents"]:
                size = record["description_metrics"]["chars"]
                if size > args.max_agent_description_chars:
                    failures.append(
                        f"{prefix}agent {record['name']} description "
                        f"{size} chars exceeds {args.max_agent_description_chars}"
                    )
    if args.max_agent_examples is not None:
        for plugin in plugin_reports:
            label = plugin.get("plugin", "root")
            prefix = f"plugin {label} " if scoped_failures else ""
            for record in plugin["agents"]:
                if record["example_count"] > args.max_agent_examples:
                    failures.append(
                        f"{prefix}agent {record['name']} has "
                        f"{record['example_count']} examples, exceeding "
                        f"{args.max_agent_examples}"
                    )
    if (
        args.max_startup_tokens is not None
        and totals["model_visible_startup_estimated_tokens"]
        > args.max_startup_tokens
    ):
        failures.append(
            "model-visible startup tokens "
            f"{totals['model_visible_startup_estimated_tokens']} exceed "
            f"{args.max_startup_tokens}"
        )
    if args.fail_on_duplicates:
        for plugin in plugin_reports:
            if plugin["duplicate_skill_names"]:
                label = plugin.get("plugin", "root")
                failures.append(
                    f"plugin {label} has duplicate skill names"
                    if scoped_failures
                    else "duplicate skill names are present"
                )
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
