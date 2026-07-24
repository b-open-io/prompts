#!/usr/bin/env python3
"""Capture or parse Claude Code's projected plugin startup cost."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

from plugin_inventory import collect_inventory


class CaptureError(RuntimeError):
    """Raised when Claude plugin details cannot be captured or parsed."""


def token_value(raw: str) -> int:
    value = raw.strip().lstrip("~").replace(",", "")
    multiplier = 1000 if value.lower().endswith("k") else 1
    if multiplier == 1000:
        value = value[:-1]
    return round(float(value) * multiplier)


def parse_details(text: str, source_root: Path | None = None) -> dict[str, Any]:
    lines = text.splitlines()
    if not lines:
        raise CaptureError("Claude plugin details output is empty")
    header = re.match(r"^(\S+)\s+(\S+)\s*$", lines[0].strip())
    if not header:
        raise CaptureError("unable to parse plugin name/version header")

    components: dict[str, dict[str, Any]] = {}
    component_re = re.compile(r"^\s{2}([A-Za-z ]+)\s+\((\d+)\)\s*(.*)$")
    for line in lines:
        match = component_re.match(line)
        if not match:
            continue
        label = match.group(1).strip().lower().replace(" ", "_")
        names_text = match.group(3).strip()
        names_text = re.sub(
            r"\s+\(harness-only.*$", "", names_text, flags=re.IGNORECASE
        )
        components[label] = {
            "count": int(match.group(2)),
            "names": [
                name.strip()
                for name in names_text.split(",")
                if name.strip()
            ],
        }

    always_on_match = re.search(
        r"^\s*Always-on:\s+(~?[\d,.]+[kK]?)\s+tok",
        text,
        re.MULTILINE,
    )
    if not always_on_match:
        raise CaptureError("unable to parse projected Always-on token cost")

    component_costs: list[dict[str, Any]] = []
    row_re = re.compile(
        r"^\s{2}(.+?)\s+(~?[\d,.]+[kK]?)\s+(~?[\d,.]+[kK]?)\s*$"
    )
    for line in lines:
        match = row_re.match(line)
        if not match or match.group(1).strip() == "component":
            continue
        component_costs.append(
            {
                "name": match.group(1).strip(),
                "always_on_tokens": token_value(match.group(2)),
                "on_invoke_tokens": token_value(match.group(3)),
            }
        )

    result: dict[str, Any] = {
        "plugin": header.group(1),
        "version": header.group(2),
        "always_on_tokens": token_value(always_on_match.group(1)),
        "components": components,
        "component_costs": component_costs,
        "hooks_context_note": (
            "Hooks have no model-context cost unless they return additional context."
        ),
    }
    if source_root:
        inventory = collect_inventory(source_root)
        reported_skills = components.get("skills", {}).get("count", 0)
        source_skills = inventory["totals"]["skill_count"]
        result["source_inventory"] = {
            "skill_count": source_skills,
            "agent_count": inventory["totals"]["agent_count"],
            "command_count": inventory["totals"]["command_count"],
            "reported_non_skill_entries_in_skills_group_estimate": max(
                0, reported_skills - source_skills
            ),
            "note": (
                "Claude groups legacy commands under Skills; colliding names "
                "make the count delta more reliable than name subtraction."
            ),
        }
    return result


def run_details(plugin: str) -> str:
    env = os.environ.copy()
    env.pop("CLAUDECODE", None)
    result = subprocess.run(
        ["claude", "plugin", "details", plugin],
        text=True,
        capture_output=True,
        env=env,
        timeout=60,
        check=False,
    )
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip()
        raise CaptureError(
            f"claude plugin details failed with {result.returncode}: {message}"
        )
    return result.stdout


def markdown(snapshot: dict[str, Any]) -> str:
    lines = [
        "# Claude plugin context snapshot",
        "",
        f"- Plugin: `{snapshot['plugin']}` `{snapshot['version']}`",
        f"- Projected always-on: ~{snapshot['always_on_tokens']:,} tokens",
    ]
    for label, component in snapshot["components"].items():
        lines.append(f"- {label.replace('_', ' ').title()}: {component['count']}")
    source = snapshot.get("source_inventory")
    if source:
        lines.append(
            "- Legacy command entries reported under Skills (estimate): "
            f"{source['reported_non_skill_entries_in_skills_group_estimate']}"
        )
    lines.extend(["", snapshot["hooks_context_note"], ""])
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plugin", default="bopen-tools@b-open-io")
    parser.add_argument("--details-file", type=Path)
    parser.add_argument("--source-root", type=Path)
    parser.add_argument("--format", choices=("json", "markdown"), default="json")
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        text = (
            args.details_file.read_text(encoding="utf-8")
            if args.details_file
            else run_details(args.plugin)
        )
        snapshot = {
            "schema_version": 1,
            **parse_details(text, args.source_root),
        }
    except (CaptureError, OSError, ValueError) as exc:
        print(f"capture-claude-context: {exc}", file=sys.stderr)
        return 1
    rendered = (
        json.dumps(snapshot, indent=2, sort_keys=True) + "\n"
        if args.format == "json"
        else markdown(snapshot)
    )
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
