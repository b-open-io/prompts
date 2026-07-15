#!/usr/bin/env python3
"""Validate release documentation and public plugin inventory.

Static checks compare README/CHANGELOG content with the repository. When a git
base is supplied, release gates also require documentation changes alongside
plugin-surface changes.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def section(text: str, start: str, end: str) -> str:
    start_match = re.search(start, text, flags=re.MULTILINE)
    if not start_match:
        return ""
    tail = text[start_match.end() :]
    end_match = re.search(end, tail, flags=re.MULTILINE)
    return tail[: end_match.start()] if end_match else tail


def authored_skills() -> set[str]:
    skills_dir = ROOT / "skills"
    return {
        entry.name
        for entry in skills_dir.iterdir()
        if entry.is_dir()
        and not entry.is_symlink()
        and (entry / "SKILL.md").is_file()
    }


def authored_agents() -> set[str]:
    return {path.stem for path in (ROOT / "agents").glob("*.md")}


def authored_commands() -> set[str]:
    commands: set[str] = set()
    for path in (ROOT / "commands").rglob("*.md"):
        relative = path.relative_to(ROOT / "commands").with_suffix("")
        parts = relative.parts
        commands.add("/" + (":".join(parts) if len(parts) > 1 else parts[0]))
    return commands


def compare_inventory(
    label: str, expected: set[str], documented: set[str], problems: list[str]
) -> None:
    missing = sorted(expected - documented)
    extra = sorted(documented - expected)
    if missing:
        problems.append(f"README missing {label}: {', '.join(missing)}")
    if extra:
        problems.append(f"README lists unknown {label}: {', '.join(extra)}")


def validate_static(problems: list[str]) -> None:
    readme_path = ROOT / "README.md"
    changelog_path = ROOT / "CHANGELOG.md"
    if not readme_path.is_file():
        problems.append("missing README.md")
        return
    if not changelog_path.is_file():
        problems.append("missing CHANGELOG.md")
        return

    readme = readme_path.read_text(encoding="utf-8")
    changelog = changelog_path.read_text(encoding="utf-8")
    manifest = json.loads(
        (ROOT / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8")
    )
    version = manifest["version"]

    if not re.search(rf"^##\s+(?:\[)?{re.escape(version)}(?:\])?(?:\s|$)", changelog, re.M):
        problems.append(f"CHANGELOG.md has no release heading for manifest {version}")
    if not re.search(r"^##\s+(?:\[)?Unreleased(?:\])?", changelog, re.M | re.I):
        problems.append("CHANGELOG.md has no Unreleased section")

    skill_section = section(readme, r"^### Skills only\s*$", r"^## Specialized AI Agents\s*$")
    documented_skills = set(
        re.findall(r"bunx skills add b-open-io/bopen-tools --skill ([a-z0-9-]+)", skill_section)
    )
    compare_inventory("authored skills", authored_skills(), documented_skills, problems)

    agent_section = section(readme, r"^## Specialized AI Agents\s*$", r"^## Skills\s*$")
    documented_agents = set(re.findall(r"\(agents/([a-z0-9-]+)\.md\)", agent_section))
    compare_inventory("agents", authored_agents(), documented_agents, problems)

    command_section = section(readme, r"^## Slash Commands\s*$", r"^## Automation Hooks\s*$")
    documented_commands = set(re.findall(r"`(/[a-z0-9-]+(?::[a-z0-9-]+)?)`", command_section))
    compare_inventory("slash commands", authored_commands(), documented_commands, problems)

    hook_section = section(readme, r"^## Automation Hooks\s*$", r"^## Custom Statusline\s*$").lower()
    hook_terms = {
        "session-context": ("session-context",),
        "prompt-router": ("prompt-router",),
        "command safety": ("bouncer", "pretooluse-bash"),
        "damage-control": ("damage-control",),
        "publish-gate": ("publish-gate",),
        "browser guidance": ("browser guidance", "agent-browser-solo", "browser-intent"),
        "roster-guard": ("roster-guard",),
        "skill-activity": ("skill-activity",),
        "hammertime": ("hammertime",),
    }
    for label, alternatives in hook_terms.items():
        if not any(term in hook_section for term in alternatives):
            problems.append(f"README Automation Hooks section omits {label}")


def changed_paths(base: str) -> tuple[set[str], set[str]]:
    if not base or set(base) == {"0"}:
        return set(), set()
    result = subprocess.run(
        ["git", "diff", "--name-status", base, "HEAD"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"unable to diff base {base}")
    statuses: set[str] = set()
    paths: set[str] = set()
    for line in result.stdout.splitlines():
        fields = line.split("\t")
        if len(fields) < 2:
            continue
        statuses.add(fields[0][0])
        paths.update(fields[1:])
    return statuses, paths


def validate_release_gate(base: str, problems: list[str]) -> None:
    try:
        _, paths = changed_paths(base)
    except RuntimeError as exc:
        problems.append(str(exc))
        return
    if not paths:
        return

    plugin_roots = (
        "agents/",
        "commands/",
        "hooks/",
        "skills/",
        "codex/agents/",
        ".claude-plugin/",
        ".codex-plugin/",
    )
    plugin_files = {"CLAUDE.md", "README.md", "scripts/check-plugin-manifests.py"}
    changes_plugin = any(path.startswith(plugin_roots) or path in plugin_files for path in paths)
    if changes_plugin and "CHANGELOG.md" not in paths:
        problems.append("plugin content changed without a CHANGELOG.md update")

    public_surface = any(
        re.match(r"^(agents/[^/]+\.md|commands/.+\.md|skills/[^/]+/SKILL\.md)$", path)
        or path in {"hooks/claude-hooks.json", "hooks/codex-hooks.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json"}
        for path in paths
    )
    if public_surface and "README.md" not in paths:
        problems.append("public plugin surface changed without a README.md update")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="", help="Git base SHA for release-gate checks")
    args = parser.parse_args(argv)

    problems: list[str] = []
    validate_static(problems)
    validate_release_gate(args.base, problems)
    if problems:
        print("Documentation validation failed:", file=sys.stderr)
        for problem in problems:
            print(f"- {problem}", file=sys.stderr)
        return 1

    print(
        "Documentation is current: "
        f"{len(authored_skills())} skills, "
        f"{len(authored_agents())} agents, "
        f"{len(authored_commands())} commands."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
