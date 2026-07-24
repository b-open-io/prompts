#!/usr/bin/env python3
"""Run deterministic and optional live bopen-tools plugin release checks."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


def run(name: str, command: list[str]) -> dict[str, Any]:
    result = subprocess.run(
        command,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return {
        "name": name,
        "command": command,
        "passed": result.returncode == 0,
        "exit_code": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--hooks", action="store_true", help="include the full hook regression suite"
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="include installed Claude/Codex context and parity probes",
    )
    parser.add_argument(
        "--codex-events-file",
        type=Path,
        help="optional recorded `codex exec --json` JSONL for exact omission count",
    )
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    checks = [
        (
            "plugin context unit tests",
            [
                sys.executable,
                "-m",
                "unittest",
                "discover",
                "-s",
                "scripts/tests",
                "-p",
                "test_*.py",
                "-v",
            ],
        ),
        (
            "plugin manifests",
            [sys.executable, "scripts/check-plugin-manifests.py"],
        ),
        ("release documentation", [sys.executable, "scripts/check-docs.py"]),
        (
            "Codex generated agents",
            [sys.executable, "scripts/codex-agents/generate.py", "--check"],
        ),
        (
            "static plugin weight",
            [sys.executable, "scripts/plugin-weight.py"],
        ),
    ]
    if args.hooks:
        checks.append(("hook regressions", ["bash", "hooks/tests/run-tests.sh"]))
    if args.live:
        codex_context = [sys.executable, "scripts/capture-codex-context.py"]
        if args.codex_events_file:
            codex_context.extend(
                ["--events-file", str(args.codex_events_file.resolve())]
            )
        checks.extend(
            [
                (
                    "Codex startup context",
                    codex_context,
                ),
                (
                    "Claude startup cost",
                    [
                        sys.executable,
                        "scripts/capture-claude-context.py",
                        "--source-root",
                        ".",
                    ],
                ),
                (
                    "installed plugin parity",
                    [
                        sys.executable,
                        "scripts/check-plugin-install-parity.py",
                        "--auto-detect",
                        "--allow-codex-third-party-omissions",
                    ],
                ),
            ]
        )

    results = [run(name, command) for name, command in checks]
    report = {
        "schema_version": 1,
        "passed": all(result["passed"] for result in results),
        "results": results,
    }
    rendered = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    if not report["passed"]:
        for result in results:
            if not result["passed"]:
                print(
                    f"run-plugin-harness: {result['name']} failed "
                    f"(exit {result['exit_code']})",
                    file=sys.stderr,
                )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
