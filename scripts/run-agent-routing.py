#!/usr/bin/env python3
"""Record agent-selection routing results from fresh headless Claude sessions.

Each case runs in an isolated CLAUDE_CONFIG_DIR so no installed plugin, project
settings, or user memory leaks into the measurement. The plugin under test is
supplied with --plugin-dir, which loads a source tree directly and needs no
publish step.

The probe asks for a selection rather than letting the agent execute: a real
delegation would run the whole subagent, which costs minutes and dollars per
case and measures the subagent's work rather than the routing decision. What is
measured here is which agent the model picks when it can see the catalog and
nothing else. That is the property description compression puts at risk.

Emits JSONL that scripts/evaluate-skill-routing.py scores.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]

PROBE = (
    "You are routing a request to one specialist agent. Consider only the agents "
    "available to you via the Agent tool. Reply with the single subagent_type you "
    "would delegate to, exactly as it appears in the agent list, and nothing else. "
    "If no available agent is a good fit and you would simply handle the request "
    "yourself, reply with exactly NONE. Do not call any tool. Do not explain."
)


class ProbeError(RuntimeError):
    """Raised when a probe cannot be run or parsed."""


def run_case(
    case: dict[str, Any],
    plugin_dir: Path,
    config_dir: Path,
    model: str | None,
    timeout: int,
) -> dict[str, Any]:
    env = os.environ.copy()
    env.pop("CLAUDECODE", None)
    env["CLAUDE_CONFIG_DIR"] = str(config_dir)

    command = [
        "claude",
        "-p",
        case["prompt"],
        "--plugin-dir",
        str(plugin_dir),
        "--append-system-prompt",
        PROBE,
        "--output-format",
        "json",
    ]
    if model:
        command += ["--model", model]

    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
            cwd=str(plugin_dir),
        )
    except subprocess.TimeoutExpired:
        return {"case_id": case["id"], "invoked_skills": [], "error": "timeout"}

    if completed.returncode != 0:
        return {
            "case_id": case["id"],
            "invoked_skills": [],
            "error": (completed.stderr or "").strip()[:400] or "nonzero exit",
        }

    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError:
        return {
            "case_id": case["id"],
            "invoked_skills": [],
            "error": "unparseable stdout",
        }

    raw = str(payload.get("result", "")).strip()
    # Model may answer "bopen-review:code-auditor" or wrap the name in quotes.
    name = raw.strip().strip("`\"'")
    name = name.split("\n")[0].strip()
    name = re.sub(r"^[a-z0-9-]+:", "", name)
    invoked: list[str] = [] if name.upper() == "NONE" or not name else [name]

    return {
        "case_id": case["id"],
        "invoked_skills": invoked,
        "raw": raw[:200],
        "cost_usd": payload.get("total_cost_usd"),
        "cache_read_tokens": payload.get("usage", {}).get("cache_read_input_tokens"),
        "cache_creation_tokens": payload.get("usage", {}).get(
            "cache_creation_input_tokens"
        ),
    }


def run_case_repeated(
    case: dict[str, Any],
    plugin_dir: Path,
    config_dir: Path,
    model: str | None,
    timeout: int,
    runs: int,
) -> dict[str, Any]:
    """Run a case `runs` times and report the majority selection.

    Single samples are not stable: on a 30-case suite, one or two cases flip
    between otherwise identical runs, which is enough to invent a difference
    between two arms that does not exist.
    """
    samples = [
        run_case(case, plugin_dir, config_dir, model, timeout) for _ in range(runs)
    ]
    selections = [
        (sample["invoked_skills"][0] if sample["invoked_skills"] else "NONE")
        for sample in samples
        if not sample.get("error")
    ]
    if not selections:
        return {
            "case_id": case["id"],
            "invoked_skills": [],
            "error": samples[0].get("error", "all runs failed"),
            "runs": runs,
        }

    winner, votes = Counter(selections).most_common(1)[0]
    return {
        "case_id": case["id"],
        "invoked_skills": [] if winner == "NONE" else [winner],
        "runs": runs,
        "agreement": round(votes / len(selections), 3),
        "samples": selections,
        "cost_usd": sum(sample.get("cost_usd") or 0 for sample in samples),
        "cache_creation_tokens": samples[0].get("cache_creation_tokens"),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", type=Path, required=True)
    parser.add_argument(
        "--runs",
        type=int,
        default=1,
        help="samples per case; the majority selection is reported (default 1)",
    )
    parser.add_argument("--plugin-dir", type=Path, required=True)
    parser.add_argument("--config-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model")
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--case", help="substring filter on case id")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = json.loads(args.cases.read_text(encoding="utf-8"))
    cases = payload["cases"] if isinstance(payload, dict) else payload
    if args.case:
        cases = [case for case in cases if args.case in case["id"]]
    if not cases:
        raise ProbeError("no cases selected")

    if not args.plugin_dir.is_dir():
        raise ProbeError(f"plugin dir not found: {args.plugin_dir}")
    args.config_dir.mkdir(parents=True, exist_ok=True)

    results: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = [
            pool.submit(
                run_case_repeated,
                case,
                args.plugin_dir,
                args.config_dir,
                args.model,
                args.timeout,
                args.runs,
            )
            for case in cases
        ]
        for index, future in enumerate(futures, 1):
            result = future.result()
            results.append(result)
            marker = result.get("error") or ",".join(result["invoked_skills"]) or "NONE"
            print(f"[{index}/{len(cases)}] {result['case_id']}: {marker}", flush=True)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        "\n".join(json.dumps(record, sort_keys=True) for record in results) + "\n",
        encoding="utf-8",
    )

    errors = [record for record in results if record.get("error")]
    cost = sum(record.get("cost_usd") or 0 for record in results)
    print(f"\nwrote {len(results)} results to {args.output}")
    print(f"errors: {len(errors)}; total cost: ${cost:.2f}")
    return 1 if errors else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ProbeError as exc:
        print(f"run-agent-routing: {exc}", file=sys.stderr)
        raise SystemExit(2) from exc
