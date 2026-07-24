#!/usr/bin/env python3
"""Compare source, packed, Claude, and Codex plugin versions/inventories."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from plugin_inventory import collect_inventory, inventory_names, version_key


ROOT = Path(__file__).resolve().parents[1]


def latest_version_root(base: Path) -> Path | None:
    if not base.is_dir():
        return None
    candidates = [
        path
        for path in base.iterdir()
        if path.is_dir() and (path / ".claude-plugin" / "plugin.json").is_file()
    ]
    return max(candidates, key=lambda path: version_key(path.name)) if candidates else None


def snapshot(label: str, root: Path) -> dict[str, Any]:
    inventory = collect_inventory(root)
    return {
        "label": label,
        "root": str(root.resolve()),
        "version": inventory["manifests"]["claude"].get("version"),
        "codex_version": inventory["manifests"]["codex"].get("version"),
        "skills": sorted(inventory_names(inventory, "skill")),
        "agents": sorted(inventory_names(inventory, "agent")),
        "commands": sorted(inventory_names(inventory, "command")),
        "third_party_skills": sorted(
            record["name"]
            for record in inventory["skills"]
            if record["source"] == "third-party"
        ),
    }


def compare(
    source: dict[str, Any],
    candidate: dict[str, Any],
    allow_codex_third_party_omissions: bool = False,
) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    if candidate["version"] != source["version"]:
        errors.append(
            f"{candidate['label']} Claude version {candidate['version']!r} "
            f"does not match source {source['version']!r}"
        )
    if candidate["codex_version"] != source["codex_version"]:
        errors.append(
            f"{candidate['label']} Codex version {candidate['codex_version']!r} "
            f"does not match source {source['codex_version']!r}"
        )
    for key in ("skills", "agents", "commands"):
        source_names = set(source[key])
        candidate_names = set(candidate[key])
        missing = sorted(source_names - candidate_names)
        if (
            key == "skills"
            and candidate["label"] == "codex"
            and allow_codex_third_party_omissions
        ):
            third_party = set(source["third_party_skills"])
            allowed = sorted(set(missing) & third_party)
            missing = sorted(set(missing) - third_party)
            if allowed:
                warnings.append(
                    "codex omits source third-party symlinks by declared packaging "
                    "policy: " + ", ".join(allowed)
                )
        extra = sorted(candidate_names - source_names)
        if missing:
            errors.append(f"{candidate['label']} missing {key}: {', '.join(missing)}")
        if extra:
            errors.append(f"{candidate['label']} extra {key}: {', '.join(extra)}")
    missing_third_party = sorted(set(source["third_party_skills"]) - set(candidate["skills"]))
    if missing_third_party and not (
        candidate["label"] == "codex" and allow_codex_third_party_omissions
    ):
        errors.append(
            f"{candidate['label']} omitted packaged third-party skills: "
            + ", ".join(missing_third_party)
        )
    return errors, warnings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, default=ROOT)
    parser.add_argument("--packed-root", type=Path)
    parser.add_argument("--claude-root", type=Path)
    parser.add_argument("--codex-root", type=Path)
    parser.add_argument("--auto-detect", action="store_true")
    parser.add_argument("--require-all", action="store_true")
    parser.add_argument(
        "--allow-codex-third-party-omissions",
        action="store_true",
        help=(
            "classify Codex omissions matching source third-party symlinks as "
            "warnings; use only while those skills remain an explicit optional-pack task"
        ),
    )
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    roots: list[tuple[str, Path]] = [("source", args.source_root)]
    if args.packed_root:
        roots.append(("packed", args.packed_root))
    if args.claude_root:
        roots.append(("claude", args.claude_root))
    if args.codex_root:
        roots.append(("codex", args.codex_root))
    if args.auto_detect:
        claude = latest_version_root(
            Path.home() / ".claude/plugins/cache/b-open-io/bopen-tools"
        )
        codex = latest_version_root(
            Path.home() / ".codex/plugins/cache/b-open-io/bopen-tools"
        )
        if claude and not args.claude_root:
            roots.append(("claude", claude))
        if codex and not args.codex_root:
            roots.append(("codex", codex))

    labels = {label for label, _ in roots}
    errors: list[str] = []
    warnings: list[str] = []
    if args.require_all:
        missing = sorted({"packed", "claude", "codex"} - labels)
        if missing:
            errors.append("missing required roots: " + ", ".join(missing))

    try:
        snapshots = [snapshot(label, root) for label, root in roots]
    except (OSError, json.JSONDecodeError) as exc:
        print(f"check-plugin-install-parity: {exc}", file=sys.stderr)
        return 1

    source = snapshots[0]
    for candidate in snapshots[1:]:
        candidate_errors, candidate_warnings = compare(
            source,
            candidate,
            allow_codex_third_party_omissions=args.allow_codex_third_party_omissions,
        )
        errors.extend(candidate_errors)
        warnings.extend(candidate_warnings)
    report = {
        "schema_version": 1,
        "passed": not errors,
        "errors": errors,
        "warnings": warnings,
        "snapshots": snapshots,
    }
    rendered = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    if errors:
        for error in errors:
            print(f"check-plugin-install-parity: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
