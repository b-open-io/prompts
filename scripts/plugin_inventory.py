#!/usr/bin/env python3
"""Shared, dependency-free inventory helpers for plugin context tooling."""

from __future__ import annotations

import json
import math
import os
import re
from collections import Counter
from pathlib import Path
from typing import Any


BLOCK_SCALAR_MARKS = {"|", "|-", "|+", ">", ">-", ">+"}
KEY_RE = re.compile(r"^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*(.*)$")


def _dedent_block(lines: list[str]) -> str:
    non_empty = [line for line in lines if line.strip()]
    if not non_empty:
        return ""
    indent = min(len(line) - len(line.lstrip(" ")) for line in non_empty)
    return "\n".join(line[indent:] for line in lines).strip()


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    """Parse the top-level scalar subset used by plugin Markdown frontmatter."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, text

    end = next(
        (index for index, line in enumerate(lines[1:], 1) if line.strip() == "---"),
        None,
    )
    if end is None:
        return {}, text

    data: dict[str, Any] = {}
    frontmatter = lines[1:end]
    index = 0
    while index < len(frontmatter):
        line = frontmatter[index]
        if not line.strip() or line.lstrip().startswith("#") or line[:1].isspace():
            index += 1
            continue
        match = KEY_RE.match(line)
        if not match:
            index += 1
            continue

        key, raw = match.group(1), match.group(2).strip()
        if raw in BLOCK_SCALAR_MARKS or raw == "":
            block: list[str] = []
            cursor = index + 1
            while cursor < len(frontmatter) and (
                not frontmatter[cursor].strip()
                or frontmatter[cursor][:1].isspace()
            ):
                block.append(frontmatter[cursor])
                cursor += 1
            value = _dedent_block(block)
            if raw.startswith(">"):
                value = re.sub(r"\s*\n\s*", " ", value)
            data[key] = value
            index = cursor
            continue

        if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in {"'", '"'}:
            raw = raw[1:-1]
        lowered = raw.lower()
        if lowered in {"true", "false"}:
            data[key] = lowered == "true"
        elif lowered in {"null", "~"}:
            data[key] = None
        else:
            data[key] = raw
        index += 1

    return data, "\n".join(lines[end + 1 :]).lstrip("\n")


def _tree_metrics(path: Path) -> dict[str, int]:
    files = 0
    size = 0
    if not path.is_dir():
        return {"files": 0, "bytes": 0}
    for root, _, names in os.walk(path, followlinks=True):
        for name in names:
            candidate = Path(root) / name
            try:
                size += candidate.stat().st_size
                files += 1
            except OSError:
                continue
    return {"files": files, "bytes": size}


def _text_metrics(text: str) -> dict[str, int]:
    byte_count = len(text.encode("utf-8"))
    return {
        "chars": len(text),
        "bytes": byte_count,
        "words": len(text.split()),
        "lines": len(text.splitlines()),
        "estimated_tokens": math.ceil(byte_count / 4),
    }


def _codex_allows_implicit(skill_dir: Path) -> bool:
    policy = skill_dir / "agents" / "openai.yaml"
    if not policy.is_file():
        return True
    try:
        text = policy.read_text(encoding="utf-8")
    except OSError:
        return True
    return (
        re.search(
            r"(?m)^\s*allow_implicit_invocation\s*:\s*false\s*(?:#.*)?$",
            text,
        )
        is None
    )


def _resource_record(
    path: Path,
    root: Path,
    kind: str,
    fallback_name: str,
) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    metadata, body = parse_frontmatter(text)
    description = str(metadata.get("description") or "").strip()
    return {
        "kind": kind,
        "name": str(metadata.get("name") or fallback_name).strip(),
        "path": path.relative_to(root).as_posix(),
        "version": metadata.get("version"),
        "description": description,
        "description_metrics": _text_metrics(description),
        "body_metrics": _text_metrics(body),
    }


def _manifest(root: Path, relative: str) -> dict[str, Any]:
    path = root / relative
    if not path.is_file():
        return {"path": relative, "missing": True}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return {"path": relative, "error": str(exc)}
    return {
        "path": relative,
        "name": value.get("name"),
        "version": value.get("version"),
    }


def collect_inventory(root: Path) -> dict[str, Any]:
    """Collect the plugin's model-visible and on-demand resource weights."""
    root = root.resolve()
    skills: list[dict[str, Any]] = []
    skills_dir = root / "skills"
    if skills_dir.is_dir():
        for entry in sorted(skills_dir.iterdir(), key=lambda value: value.name):
            skill_md = entry / "SKILL.md"
            if not entry.is_dir() or not skill_md.is_file():
                continue
            record = _resource_record(skill_md, root, "skill", entry.name)
            record.update(
                {
                    "directory": entry.relative_to(root).as_posix(),
                    "source": "third-party" if entry.is_symlink() else "authored",
                    "symlink_target": (
                        os.readlink(entry) if entry.is_symlink() else None
                    ),
                    "claude_implicit": not bool(
                        parse_frontmatter(
                            skill_md.read_text(encoding="utf-8")
                        )[0].get("disable-model-invocation", False)
                    ),
                    "codex_implicit": _codex_allows_implicit(entry),
                    "references": _tree_metrics(entry / "references"),
                    "scripts": _tree_metrics(entry / "scripts"),
                }
            )
            identity = f"- {record['name']}: (file: {skill_md.resolve()})\n"
            record["identity_path_bytes"] = len(identity.encode("utf-8"))
            skills.append(record)

    agents: list[dict[str, Any]] = []
    agents_dir = root / "agents"
    if agents_dir.is_dir():
        for path in sorted(agents_dir.glob("*.md")):
            agents.append(_resource_record(path, root, "agent", path.stem))

    commands: list[dict[str, Any]] = []
    commands_dir = root / "commands"
    if commands_dir.is_dir():
        for path in sorted(commands_dir.rglob("*.md")):
            relative = path.relative_to(commands_dir).with_suffix("")
            name = "/" + (
                ":".join(relative.parts)
                if len(relative.parts) > 1
                else relative.parts[0]
            )
            commands.append(_resource_record(path, root, "command", name))

    name_counts = Counter(record["name"] for record in skills)
    duplicates = {
        name: count for name, count in sorted(name_counts.items()) if count > 1
    }

    def total(records: list[dict[str, Any]], section: str, field: str) -> int:
        return sum(record[section][field] for record in records)

    totals = {
        "skill_count": len(skills),
        "authored_skill_count": sum(
            record["source"] == "authored" for record in skills
        ),
        "third_party_skill_count": sum(
            record["source"] == "third-party" for record in skills
        ),
        "claude_implicit_skill_count": sum(
            record["claude_implicit"] for record in skills
        ),
        "codex_implicit_skill_count": sum(
            record["codex_implicit"] for record in skills
        ),
        "skill_description_chars": total(
            skills, "description_metrics", "chars"
        ),
        "skill_description_bytes": total(
            skills, "description_metrics", "bytes"
        ),
        "skill_description_estimated_tokens": total(
            skills, "description_metrics", "estimated_tokens"
        ),
        "skill_body_bytes": total(skills, "body_metrics", "bytes"),
        "skill_body_estimated_tokens": total(
            skills, "body_metrics", "estimated_tokens"
        ),
        "skill_identity_path_bytes": sum(
            record["identity_path_bytes"] for record in skills
        ),
        "agent_count": len(agents),
        "agent_description_bytes": total(
            agents, "description_metrics", "bytes"
        ),
        "agent_description_estimated_tokens": total(
            agents, "description_metrics", "estimated_tokens"
        ),
        "agent_body_bytes": total(agents, "body_metrics", "bytes"),
        "command_count": len(commands),
        "command_description_bytes": total(
            commands, "description_metrics", "bytes"
        ),
        "command_body_bytes": total(commands, "body_metrics", "bytes"),
        "duplicate_skill_name_count": len(duplicates),
    }

    return {
        "schema_version": 1,
        "root": str(root),
        "manifests": {
            "claude": _manifest(root, ".claude-plugin/plugin.json"),
            "codex": _manifest(root, ".codex-plugin/plugin.json"),
        },
        "totals": totals,
        "duplicate_skill_names": duplicates,
        "skills": skills,
        "agents": agents,
        "commands": commands,
    }


def inventory_names(inventory: dict[str, Any], kind: str) -> set[str]:
    key = {"skill": "skills", "agent": "agents", "command": "commands"}[kind]
    return {str(record["name"]) for record in inventory[key]}


def version_key(version: str) -> tuple[int, int, int, str]:
    match = re.match(r"^(\d+)\.(\d+)\.(\d+)(.*)$", version)
    if not match:
        return (-1, -1, -1, version)
    return (
        int(match.group(1)),
        int(match.group(2)),
        int(match.group(3)),
        match.group(4),
    )
