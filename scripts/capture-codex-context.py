#!/usr/bin/env python3
"""Capture or parse Codex's exact startup skill-catalog context."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


SKILLS_BLOCK_RE = re.compile(
    r"<skills_instructions>(.*?)</skills_instructions>", re.DOTALL
)
OMITTED_RE = re.compile(
    r"(\d+)\s+additional skills? (?:were|was) not included", re.IGNORECASE
)


class CaptureError(RuntimeError):
    """Raised when a host snapshot cannot be captured or parsed."""


def parse_models(text: str, requested_model: str | None = None) -> dict[str, Any]:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise CaptureError(f"codex debug models returned invalid JSON: {exc}") from exc
    models = payload.get("models")
    if not isinstance(models, list) or not models:
        raise CaptureError("codex debug models returned no models")
    selected = None
    if requested_model:
        selected = next(
            (model for model in models if model.get("slug") == requested_model),
            None,
        )
        if selected is None:
            raise CaptureError(f"model {requested_model!r} was not found")
    else:
        selected = models[0]
    context_window = selected.get("context_window")
    if not isinstance(context_window, int):
        raise CaptureError("selected model has no integer context_window")
    return {
        "slug": selected.get("slug"),
        "context_window": context_window,
        "skill_budget_percent": 2,
        "skill_budget_tokens": context_window * 2 // 100,
    }


def _skill_line(line: str) -> tuple[str, str] | None:
    stripped = line.strip()
    if not stripped.startswith("- ") or "(file:" not in stripped:
        return None
    head = stripped[2:].split(" (file:", 1)[0].strip()
    if head.endswith(":"):
        return head[:-1].strip(), ""
    if ": " in head:
        name, description = head.split(": ", 1)
        return name.strip(), description.strip()
    return head, ""


def _prompt_text(text: str) -> str:
    """Unwrap `codex debug prompt-input` JSON while accepting raw fixtures."""
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return text

    strings: list[str] = []

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            for key, child in value.items():
                if key == "text" and isinstance(child, str):
                    strings.append(child)
                else:
                    visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    visit(payload)
    return "\n".join(strings) if strings else text


def parse_prompt(text: str) -> dict[str, Any]:
    normalized = _prompt_text(text)
    match = SKILLS_BLOCK_RE.search(normalized)
    if not match:
        raise CaptureError("prompt contains no <skills_instructions> block")
    block = match.group(1)
    skills = [
        parsed
        for line in block.splitlines()
        if (parsed := _skill_line(line)) is not None
    ]
    omitted_match = OMITTED_RE.search(block)
    omitted = int(omitted_match.group(1)) if omitted_match else None
    names = [name for name, _ in skills]
    descriptions = [description for _, description in skills if description]
    warning_observed = omitted_match is not None
    return {
        "prompt_bytes": len(normalized.encode("utf-8")),
        "skills_block_bytes": len(block.encode("utf-8")),
        "visible_skill_count": len(skills),
        "omitted_skill_count": omitted,
        "implicit_skill_count": (
            len(skills) + omitted if omitted is not None else None
        ),
        "descriptions_retained": len(descriptions),
        "catalog_warning_observed": warning_observed,
        "all_descriptions_removed": (
            bool(
                re.search(
                    r"all skill descriptions were removed", block, re.IGNORECASE
                )
            )
            if warning_observed
            else None
        ),
        "bopen_tools_visible_count": sum(
            name.startswith("bopen-tools:") for name in names
        ),
        "visible_skills": names,
    }


def parse_runtime_events(text: str) -> dict[str, Any]:
    """Extract the authoritative budget warning from `codex exec --json` JSONL."""
    messages: list[str] = []
    for line in text.splitlines():
        if not line.strip().startswith("{"):
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue

        def visit(value: Any) -> None:
            if isinstance(value, dict):
                for key, child in value.items():
                    if key in {"message", "text"} and isinstance(child, str):
                        messages.append(child)
                    else:
                        visit(child)
            elif isinstance(value, list):
                for child in value:
                    visit(child)

        visit(payload)
    warning = next(
        (message for message in messages if OMITTED_RE.search(message)),
        None,
    )
    omitted_match = OMITTED_RE.search(warning or "")
    return {
        "catalog_warning_observed": warning is not None,
        "omitted_skill_count": (
            int(omitted_match.group(1)) if omitted_match else None
        ),
        "all_descriptions_removed": (
            bool(
                re.search(
                    r"all skill descriptions were removed",
                    warning or "",
                    re.IGNORECASE,
                )
            )
            if warning
            else None
        ),
        "warning": warning,
    }


def run(command: list[str], env: dict[str, str]) -> str:
    result = subprocess.run(
        command,
        text=True,
        capture_output=True,
        env=env,
        timeout=60,
        check=False,
    )
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip()
        raise CaptureError(
            f"{' '.join(command)} failed with {result.returncode}: {message}"
        )
    return result.stdout


def markdown(snapshot: dict[str, Any]) -> str:
    prompt = snapshot["prompt"]
    model = snapshot.get("model", {})
    lines = [
        "# Codex startup-context snapshot",
        "",
        f"- Model: `{model.get('slug', 'not captured')}`",
        f"- Context window: {model.get('context_window', 'not captured')}",
        f"- Skill budget: {model.get('skill_budget_tokens', 'not captured')}",
        f"- Visible skills: {prompt['visible_skill_count']}",
        (
            "- Omitted skills: "
            + (
                str(prompt["omitted_skill_count"])
                if prompt["omitted_skill_count"] is not None
                else "unknown (no runtime warning event supplied)"
            )
        ),
        f"- Descriptions retained: {prompt['descriptions_retained']}",
        f"- Skills block: {prompt['skills_block_bytes']:,} bytes",
        f"- bopen-tools visible: {prompt['bopen_tools_visible_count']}",
        "",
    ]
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prompt-file", type=Path)
    parser.add_argument("--models-file", type=Path)
    parser.add_argument(
        "--events-file",
        type=Path,
        help="recorded `codex exec --json` JSONL containing startup warnings",
    )
    parser.add_argument("--model")
    parser.add_argument("--probe", default="plugin context snapshot")
    parser.add_argument("--codex-home", type=Path)
    parser.add_argument("--format", choices=("json", "markdown"), default="json")
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    env = os.environ.copy()
    if args.codex_home:
        env["CODEX_HOME"] = str(args.codex_home.resolve())
    try:
        prompt_text = (
            args.prompt_file.read_text(encoding="utf-8")
            if args.prompt_file
            else run(["codex", "debug", "prompt-input", args.probe], env)
        )
        snapshot: dict[str, Any] = {
            "schema_version": 1,
            "prompt": parse_prompt(prompt_text),
        }
        if args.events_file:
            runtime = parse_runtime_events(
                args.events_file.read_text(encoding="utf-8")
            )
            snapshot["runtime_warning"] = runtime
            if runtime["catalog_warning_observed"]:
                snapshot["prompt"]["catalog_warning_observed"] = True
                snapshot["prompt"]["omitted_skill_count"] = runtime[
                    "omitted_skill_count"
                ]
                snapshot["prompt"]["implicit_skill_count"] = (
                    snapshot["prompt"]["visible_skill_count"]
                    + runtime["omitted_skill_count"]
                )
                snapshot["prompt"]["all_descriptions_removed"] = runtime[
                    "all_descriptions_removed"
                ]
        if args.models_file or not args.prompt_file:
            models_text = (
                args.models_file.read_text(encoding="utf-8")
                if args.models_file
                else run(["codex", "debug", "models"], env)
            )
            snapshot["model"] = parse_models(models_text, args.model)
    except (CaptureError, OSError) as exc:
        print(f"capture-codex-context: {exc}", file=sys.stderr)
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
