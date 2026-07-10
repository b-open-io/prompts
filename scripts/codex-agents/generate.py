#!/usr/bin/env python3
"""Generate deterministic Codex custom-agent adapters from agents/*.md.

Usage:
  python3 scripts/codex-agents/generate.py
  python3 scripts/codex-agents/generate.py --check
  python3 scripts/codex-agents/generate.py --out /tmp/codex-agents
"""

from __future__ import annotations

import argparse
import difflib
import sys
import tempfile
from pathlib import Path

from lib import (
    MANIFEST_FILENAME,
    codex_agents_dir,
    discover_plugin_root,
    generate_all,
    is_managed_filename,
    manifest_json,
    build_manifest,
    write_generated_tree,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Regenerate into a temp dir and fail if committed output is stale",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Output directory (default: <plugin-root>/codex/agents)",
    )
    parser.add_argument(
        "--plugin-root",
        type=Path,
        default=None,
        help="Plugin root override (default: auto-discover)",
    )
    args = parser.parse_args(argv)

    plugin_root = (
        args.plugin_root.expanduser().resolve()
        if args.plugin_root
        else discover_plugin_root(Path(__file__))
    )
    out_dir = (
        args.out.expanduser().resolve()
        if args.out
        else codex_agents_dir(plugin_root)
    )

    if args.check:
        return run_check(plugin_root, out_dir)

    manifest = write_generated_tree(plugin_root, out_dir)
    count = len(manifest.get("agents") or [])
    print(f"Generated {count} Codex agents into {out_dir}")
    print(f"Manifest: {out_dir / MANIFEST_FILENAME}")
    return 0


def run_check(plugin_root: Path, committed_dir: Path) -> int:
    generated = generate_all(plugin_root)
    expected_manifest = build_manifest(generated)
    expected_files: dict[str, str] = {
        item.source.generated_filename: item.toml_text for item in generated
    }
    expected_files[MANIFEST_FILENAME] = manifest_json(expected_manifest)

    with tempfile.TemporaryDirectory(prefix="codex-agents-check-") as tmp:
        tmp_dir = Path(tmp)
        for name, text in expected_files.items():
            (tmp_dir / name).write_text(text, encoding="utf-8")

        problems: list[str] = []

        if not committed_dir.is_dir():
            problems.append(f"missing committed directory: {committed_dir}")
            _print_problems(problems, expected_files)
            return 1

        committed_names = {
            p.name
            for p in committed_dir.iterdir()
            if p.is_file() and (is_managed_filename(p.name) or p.name == MANIFEST_FILENAME)
        }
        expected_names = set(expected_files)

        missing = sorted(expected_names - committed_names)
        extra = sorted(committed_names - expected_names)
        for name in missing:
            problems.append(f"missing: {name}")
        for name in extra:
            problems.append(f"extra: {name}")

        for name in sorted(expected_names & committed_names):
            committed_text = (committed_dir / name).read_text(encoding="utf-8")
            expected_text = expected_files[name]
            if committed_text != expected_text:
                problems.append(f"stale: {name}")
                diff = difflib.unified_diff(
                    committed_text.splitlines(keepends=True),
                    expected_text.splitlines(keepends=True),
                    fromfile=f"committed/{name}",
                    tofile=f"expected/{name}",
                    n=2,
                )
                # Cap diff noise but keep it useful.
                diff_lines = list(diff)
                if len(diff_lines) > 80:
                    diff_lines = diff_lines[:80] + ["... (diff truncated)\n"]
                problems.append("".join(diff_lines).rstrip() or "(binary/empty diff)")

        if problems:
            _print_problems(problems, expected_files)
            return 1

    print(
        f"OK: {len(generated)} Codex agents and {MANIFEST_FILENAME} match "
        f"{committed_dir}"
    )
    return 0


def _print_problems(problems: list[str], expected_files: dict[str, str]) -> None:
    print("Codex agent adapters are out of date.", file=sys.stderr)
    print("Run: python3 scripts/codex-agents/generate.py", file=sys.stderr)
    print("", file=sys.stderr)
    for problem in problems:
        print(problem, file=sys.stderr)
    print("", file=sys.stderr)
    print(
        f"Expected {len(expected_files)} files "
        f"({len(expected_files) - 1} agents + manifest).",
        file=sys.stderr,
    )


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BrokenPipeError:
        # Allow piping to head etc.
        raise SystemExit(0)
