#!/usr/bin/env python3
"""Record agent-selection routing results from fresh headless Claude sessions.

Each case runs with an isolated CLAUDE_CONFIG_DIR and an empty working directory
outside the source tree. The plugin under test is supplied with --plugin-dir,
which loads a source tree directly and needs no publish step. User, project,
and local settings are disabled explicitly, and hooks are disabled through the
per-process settings override.

The probe asks for a selection rather than letting the agent execute. A real
delegation would run the whole subagent, which costs minutes and dollars per
case and measures the subagent's work rather than the routing decision. The
output records a selected agent label; it does not claim that an agent or skill
was invoked. The legacy ``invoked_skills`` field is retained for the scorer, and
``measurement_kind=selection`` makes its observation semantics explicit. This
is a selection measurement, not an end-to-end delegation measurement.

Emits JSONL that scripts/evaluate-skill-routing.py scores.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
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


UNKNOWN = "unknown"
HOST = "claude"
HOOK_SETTINGS = json.dumps({"disableAllHooks": True}, separators=(",", ":"))


def _is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True


def _clean_text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _payload_string(payload: dict[str, Any], keys: tuple[str, ...]) -> str:
    for key in keys:
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return UNKNOWN


def _validate_case(case: Any) -> dict[str, Any]:
    if not isinstance(case, dict):
        raise ProbeError("every routing case must be an object")
    case_id = case.get("id")
    if not isinstance(case_id, str) or not case_id.strip():
        raise ProbeError("every routing case must have a non-empty string id")
    if not isinstance(case.get("prompt"), str) or not case["prompt"].strip():
        raise ProbeError(f"{case_id}.prompt must be a non-empty string")
    return case


def _load_cases(path: Path) -> list[dict[str, Any]]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except OSError as exc:
        raise ProbeError(f"could not read cases: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise ProbeError(f"invalid cases JSON: {exc.msg}") from exc
    cases = payload.get("cases") if isinstance(payload, dict) else payload
    if not isinstance(cases, list):
        raise ProbeError("cases file must contain a list or {'cases': [...]}")
    validated = [_validate_case(case) for case in cases]
    seen: set[str] = set()
    for case in validated:
        case_id = case["id"]
        if case_id in seen:
            raise ProbeError(f"duplicate case id: {case_id}")
        seen.add(case_id)
    return validated


def _isolated_working_directory(plugin_dir: Path) -> tempfile.TemporaryDirectory[str]:
    try:
        temporary = tempfile.TemporaryDirectory(prefix="agent-routing-cwd-")
    except OSError as exc:
        raise ProbeError(f"could not create isolated working directory: {exc}") from exc
    cwd = Path(temporary.name).resolve()
    if _is_within(cwd, plugin_dir):
        temporary.cleanup()
        raise ProbeError(
            "temporary directory is inside the plugin source tree; "
            "cannot isolate probe working cwd"
        )
    try:
        empty = not any(cwd.iterdir())
    except OSError as exc:
        temporary.cleanup()
        raise ProbeError(
            f"could not inspect isolated probe working directory: {exc}"
        ) from exc
    if not empty:
        temporary.cleanup()
        raise ProbeError("isolated probe working directory is not empty")
    return temporary


def _base_result(case_id: str, model: str | None) -> dict[str, Any]:
    return {
        "case_id": case_id,
        "host": HOST,
        "requested_model": model or UNKNOWN,
        "actual_version": UNKNOWN,
        "measurement_kind": "selection",
        "selected_agent": None,
        "invoked_skills": [],
    }


def run_case(
    case: dict[str, Any],
    plugin_dir: Path,
    config_dir: Path,
    model: str | None,
    timeout: int,
) -> dict[str, Any]:
    case = _validate_case(case)
    plugin_dir = plugin_dir.resolve()
    config_dir = config_dir.resolve()
    if not plugin_dir.is_dir():
        raise ProbeError(f"plugin dir not found: {plugin_dir}")
    if _is_within(config_dir, plugin_dir):
        raise ProbeError(
            f"config dir must be outside the plugin source tree: {config_dir}"
        )
    try:
        config_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise ProbeError(f"could not create isolated config dir: {exc}") from exc

    env = os.environ.copy()
    env.pop("CLAUDECODE", None)
    env["CLAUDE_CONFIG_DIR"] = str(config_dir)

    command = [
        "claude",
        "-p",
        case["prompt"],
        "--plugin-dir",
        str(plugin_dir),
        "--setting-sources",
        "",
        "--settings",
        HOOK_SETTINGS,
        "--no-session-persistence",
        "--tools",
        "Agent",
        "--append-system-prompt",
        PROBE,
        "--output-format",
        "json",
    ]
    if model:
        command += ["--model", model]

    base = _base_result(case["id"], model)
    try:
        with _isolated_working_directory(plugin_dir) as cwd:
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=timeout,
                env=env,
                cwd=cwd,
            )
    except subprocess.TimeoutExpired:
        base["error"] = "timeout"
        return base
    except OSError as exc:
        base["error"] = f"could not run claude: {exc}"
        return base

    if completed.returncode != 0:
        base["error"] = _clean_text(completed.stderr)[:400] or "nonzero exit"
        return base

    try:
        payload = json.loads(completed.stdout)
    except (json.JSONDecodeError, TypeError):
        base["error"] = "unparseable stdout"
        return base
    if not isinstance(payload, dict):
        base["error"] = "JSON response must be an object"
        return base
    if payload.get("is_error") is True:
        reported = payload.get("error")
        base["error"] = (
            _clean_text(reported)[:400]
            if isinstance(reported, str) and reported.strip()
            else "response reported an error"
        )
        return base

    raw_value = payload.get("result")
    if not isinstance(raw_value, str) or not raw_value.strip():
        base["error"] = "missing or empty result"
        return base

    raw = raw_value.strip()
    # Model may answer "review:code-auditor" or wrap the name in quotes.
    name = raw.strip().strip("`\"'")
    name = name.split("\n")[0].strip()
    name = re.sub(r"^[a-z0-9-]+:", "", name)
    if not name:
        base["error"] = "empty selection"
        return base

    base["selected_agent"] = None if name.upper() == "NONE" else name
    # Keep the public scorer's legacy field while marking this as selection-only.
    base["invoked_skills"] = [] if base["selected_agent"] is None else [name]
    base["raw"] = raw[:200]
    if payload.get("total_cost_usd") is not None:
        base["cost_usd"] = payload["total_cost_usd"]
    usage = payload.get("usage")
    if isinstance(usage, dict):
        if usage.get("cache_read_input_tokens") is not None:
            base["cache_read_tokens"] = usage["cache_read_input_tokens"]
        if usage.get("cache_creation_input_tokens") is not None:
            base["cache_creation_tokens"] = usage["cache_creation_input_tokens"]
    base["actual_version"] = _payload_string(
        payload, ("claude_code_version", "claude_version", "cli_version")
    )
    return base


def _consistent_value(samples: list[dict[str, Any]], key: str) -> Any:
    values = [sample.get(key, UNKNOWN) for sample in samples]
    if not values:
        return UNKNOWN
    first = values[0]
    return first if all(value == first for value in values) else UNKNOWN


def _sample_selection(sample: dict[str, Any]) -> str:
    selected = sample.get("selected_agent")
    if selected is not None:
        return selected
    invoked = sample.get("invoked_skills", [])
    return invoked[0] if invoked else "NONE"


def run_case_repeated(
    case: dict[str, Any],
    plugin_dir: Path,
    config_dir: Path,
    model: str | None,
    timeout: int,
    runs: int,
) -> dict[str, Any]:
    """Run a case `runs` times and report the majority selection.

    All sample records are retained. A failed sample remains an error for the
    case, even if the successful samples agree on a majority selection.
    """
    if isinstance(runs, bool) or not isinstance(runs, int) or runs < 1:
        raise ProbeError("runs must be a positive integer")
    samples = [
        run_case(case, plugin_dir, config_dir, model, timeout) for _ in range(runs)
    ]
    selections = [
        _sample_selection(sample)
        for sample in samples
        if not sample.get("error")
    ]
    errors = [sample["error"] for sample in samples if sample.get("error")]
    winner, votes = Counter(selections).most_common(1)[0] if selections else ("NONE", 0)
    result: dict[str, Any] = {
        "case_id": case["id"],
        "host": HOST,
        "requested_model": model or UNKNOWN,
        "actual_version": _consistent_value(samples, "actual_version"),
        "measurement_kind": "selection",
        "selected_agent": None if winner == "NONE" else winner,
        "invoked_skills": [] if winner == "NONE" else [winner],
        "runs": runs,
        "agreement": round(votes / runs, 3),
        "selections": [
            "ERROR"
            if sample.get("error")
            else _sample_selection(sample)
            for sample in samples
        ],
        "samples": samples,
        "cost_usd": sum(sample.get("cost_usd") or 0 for sample in samples),
    }
    if errors:
        result["errors"] = errors
        result["error"] = f"{len(errors)} of {runs} runs failed: " + "; ".join(errors)
    cache_values = [sample.get("cache_creation_tokens") for sample in samples]
    if cache_values and all(value is not None for value in cache_values):
        result["cache_creation_tokens"] = cache_values[0]
    return result


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
    if isinstance(args.concurrency, bool) or args.concurrency < 1:
        raise ProbeError("concurrency must be a positive integer")
    if isinstance(args.timeout, bool) or args.timeout < 1:
        raise ProbeError("timeout must be a positive integer")
    cases = _load_cases(args.cases)
    if args.case:
        cases = [case for case in cases if args.case in case["id"]]
    if not cases:
        raise ProbeError("no cases selected")

    plugin_dir = args.plugin_dir.resolve()
    config_dir = args.config_dir.resolve()
    if not plugin_dir.is_dir():
        raise ProbeError(f"plugin dir not found: {plugin_dir}")
    if _is_within(config_dir, plugin_dir):
        raise ProbeError(
            f"config dir must be outside the plugin source tree: {config_dir}"
        )
    try:
        config_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise ProbeError(f"could not create isolated config dir: {exc}") from exc

    results: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = [
            pool.submit(
                run_case_repeated,
                case,
                plugin_dir,
                config_dir,
                args.model,
                args.timeout,
                args.runs,
            )
            for case in cases
        ]
        for index, future in enumerate(futures, 1):
            result = future.result()
            results.append(result)
            marker = result.get("error") or result.get("selected_agent") or "NONE"
            print(f"[{index}/{len(cases)}] {result['case_id']}: {marker}", flush=True)

    try:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            "\n".join(json.dumps(record, sort_keys=True) for record in results) + "\n",
            encoding="utf-8",
        )
    except OSError as exc:
        raise ProbeError(f"could not write results: {exc}") from exc

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
