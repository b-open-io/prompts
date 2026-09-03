#!/usr/bin/env python3
"""Extract every locally sourced plugin the way git-subdir marketplace sourcing does and verify it is self-contained."""

from __future__ import annotations

import argparse
import io
import json
import os
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MARKETPLACE = Path(".agents/plugins/marketplace.json")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Extract every locally sourced plugin the way git-subdir marketplace "
            "sourcing does and verify it is self-contained."
        )
    )
    parser.add_argument(
        "--ref",
        metavar="REF",
        help="git revision to extract with `git archive` instead of the working tree",
    )
    parser.add_argument(
        "--marketplace",
        metavar="PATH",
        type=Path,
        default=DEFAULT_MARKETPLACE,
        help="marketplace manifest to read (default: .agents/plugins/marketplace.json)",
    )
    parser.add_argument(
        "--plugin",
        nargs="+",
        metavar="NAME",
        help="restrict to these plugin names (default: every local-source plugin)",
    )
    parser.add_argument(
        "--output",
        metavar="PATH",
        type=Path,
        help="write the JSON report here instead of stdout",
    )
    return parser.parse_args(argv)


def normalize_source_path(raw: str) -> str:
    text = raw.replace("\\", "/").strip()
    if text.startswith("./"):
        text = text[2:]
    text = text.rstrip("/")
    if text in ("", "."):
        return ""
    return text


def marketplace_path(root: Path, given: Path) -> Path:
    if given.is_absolute():
        return given
    return root / given


def load_local_plugins(
    marketplace: Path, names: list[str] | None
) -> list[dict[str, str]]:
    payload = json.loads(marketplace.read_text(encoding="utf-8"))
    selected: list[dict[str, str]] = []
    wanted = set(names) if names else None
    for entry in payload.get("plugins", []):
        if not isinstance(entry, dict):
            continue
        source = entry.get("source", {})
        if not isinstance(source, dict) or source.get("source") != "local":
            continue
        name = str(entry.get("name", ""))
        path = str(source.get("path", ""))
        if wanted is not None and name not in wanted:
            continue
        selected.append({"name": name, "path": path})
    return selected


def run_git(root: Path, args: list[str], binary: bool = False) -> subprocess.CompletedProcess[Any]:
    result = subprocess.run(
        ["git", "-C", str(root), *args],
        capture_output=True,
        check=False,
        text=not binary,
    )
    if result.returncode != 0:
        stderr = result.stderr
        if isinstance(stderr, bytes):
            stderr = stderr.decode("utf-8", "replace")
        raise RuntimeError(f"git {' '.join(args)} failed: {stderr.strip()}")
    return result


def git_ls_files(root: Path, source: str) -> list[str]:
    pathspec = source if source else "."
    result = run_git(
        root,
        ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", pathspec],
    )
    stdout = result.stdout
    if isinstance(stdout, bytes):
        stdout = stdout.decode("utf-8")
    return [entry for entry in stdout.split("\0") if entry]


def strip_source_prefix(entry: str, source: str) -> str:
    text = entry.replace("\\", "/")
    if text.startswith("./"):
        text = text[2:]
    if not source:
        return text
    if text == source:
        return ""
    prefix = source + "/"
    if text.startswith(prefix):
        return text[len(prefix) :]
    return text


def contained_dest(base: Path, rel: str) -> Path | None:
    text = rel.replace("\\", "/")
    if not text or text.startswith("/") or ".." in Path(text).parts:
        return None
    return base / Path(text)


def extract_working_tree(root: Path, source: str, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    for entry in git_ls_files(root, source):
        rel = strip_source_prefix(entry, source)
        dest_path = contained_dest(dest, rel)
        if dest_path is None:
            continue
        src = root / Path(entry)
        try:
            info = os.lstat(src)
        except FileNotFoundError:
            continue
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        if stat.S_ISLNK(info.st_mode):
            os.symlink(os.readlink(src), dest_path)
        elif stat.S_ISREG(info.st_mode):
            shutil.copy2(src, dest_path)
        elif stat.S_ISDIR(info.st_mode):
            dest_path.mkdir(parents=True, exist_ok=True)


def extract_ref(root: Path, ref: str, source: str, dest: Path) -> None:
    treeish = f"{ref}:{source}" if source else ref
    result = run_git(root, ["archive", "--format=tar", treeish], binary=True)
    dest.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(result.stdout), mode="r:") as tar:
        # filter=tar keeps symlink members so the walk below can report
        # dangling or escaping links instead of dropping them.
        tar.extractall(dest, filter="tar")


def is_inside(path: str, root: str) -> bool:
    real_path = os.path.realpath(path)
    real_root = os.path.realpath(root)
    if real_path == real_root:
        return True
    prefix = real_root if real_root.endswith(os.sep) else real_root + os.sep
    return real_path.startswith(prefix)


def rel_posix(path: str, root: str) -> str:
    return Path(os.path.relpath(path, root)).as_posix()


def readable_nonempty(path: str) -> bool:
    if not os.path.isfile(path):
        return False
    try:
        with open(path, encoding="utf-8") as handle:
            return handle.read() != ""
    except (OSError, UnicodeDecodeError):
        return False


def inspect_extracted(root: Path) -> tuple[int, int, list[dict[str, str]]]:
    root_str = str(root)
    real_root = os.path.realpath(root_str)
    problems: list[dict[str, str]] = []
    symlink_count = 0
    for dirpath, dirnames, filenames in os.walk(root_str, followlinks=False):
        for name in (*dirnames, *filenames):
            entry = os.path.join(dirpath, name)
            if not os.path.islink(entry):
                continue
            symlink_count += 1
            target = os.readlink(entry)
            rel = rel_posix(entry, root_str)
            if not os.path.exists(entry):
                problems.append(
                    {"kind": "dangling-symlink", "path": rel, "target": target}
                )
            elif not is_inside(entry, real_root):
                problems.append(
                    {"kind": "escaping-symlink", "path": rel, "target": target}
                )
    skill_count = 0
    skills_root = os.path.join(root_str, "skills")
    if os.path.isdir(skills_root):
        for name in sorted(os.listdir(skills_root)):
            entry = os.path.join(skills_root, name)
            if not os.path.isdir(entry):
                continue
            skill_count += 1
            skill_md = os.path.join(entry, "SKILL.md")
            if not readable_nonempty(skill_md):
                problems.append(
                    {
                        "kind": "unreadable-skill",
                        "path": rel_posix(entry, root_str),
                    }
                )
    codex = root / ".codex-plugin" / "plugin.json"
    if codex.is_file():
        try:
            payload = json.loads(codex.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            payload = {}
        if isinstance(payload, dict) and "skills" in payload:
            value = payload["skills"]
            referenced = root / str(value)
            if not referenced.is_dir():
                problems.append(
                    {"kind": "missing-codex-skills-dir", "path": str(value)}
                )
    problems.sort(key=lambda item: (item.get("kind", ""), item.get("path", "")))
    return symlink_count, skill_count, problems


def unregistered_modules(
    root: Path, plugins: list[dict[str, str]]
) -> list[dict[str, Any]]:
    listed = {normalize_source_path(plugin["path"]) for plugin in plugins}
    modules_root = root / "modules"
    records: list[dict[str, Any]] = []
    if not modules_root.is_dir():
        return records
    for entry in sorted(modules_root.iterdir(), key=lambda path: path.name):
        if not entry.is_dir():
            continue
        manifest = entry / ".claude-plugin" / "plugin.json"
        if not manifest.is_file():
            continue
        expected = f"modules/{entry.name}"
        if expected in listed:
            continue
        records.append(
            {
                "name": entry.name,
                "path": f"modules/{entry.name}",
                "symlink_count": 0,
                "skill_count": 0,
                "problems": [
                    {
                        "kind": "unregistered-module",
                        "path": f"modules/{entry.name}",
                    }
                ],
            }
        )
    return records


def format_problem(problem: dict[str, str]) -> str:
    target = problem.get("target")
    if target:
        return f"  - {problem['kind']}: {problem['path']} -> {target}"
    return f"  - {problem['kind']}: {problem['path']}"


def run_check(
    root: Path,
    marketplace: Path,
    plugin_names: list[str] | None,
    ref: str | None,
) -> dict[str, Any]:
    plugins = load_local_plugins(marketplace, plugin_names)
    records: list[dict[str, Any]] = []
    tmp = tempfile.TemporaryDirectory(prefix="plugin-extraction-")
    try:
        for plugin in plugins:
            source = normalize_source_path(plugin["path"])
            extract_root = Path(tmp.name) / plugin["name"]
            if ref:
                extract_ref(root, ref, source, extract_root)
            else:
                extract_working_tree(root, source, extract_root)
            symlink_count, skill_count, problems = inspect_extracted(extract_root)
            records.append(
                {
                    "name": plugin["name"],
                    "path": plugin["path"],
                    "symlink_count": symlink_count,
                    "skill_count": skill_count,
                    "problems": problems,
                }
            )
        if plugin_names is None:
            records.extend(unregistered_modules(root, plugins))
    finally:
        tmp.cleanup()
    return {
        "schema_version": 1,
        "passed": all(not record["problems"] for record in records),
        "ref": ref,
        "plugins": records,
    }


def emit(report: dict[str, Any]) -> None:
    for plugin in report["plugins"]:
        problems = plugin["problems"]
        print(
            f"check-plugin-extraction: {plugin['name']} ({plugin['path']}): "
            f"{plugin['symlink_count']} symlinks, {plugin['skill_count']} skills, "
            f"{len(problems)} problems"
        )
        for problem in problems:
            print(format_problem(problem))


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    marketplace = marketplace_path(ROOT, args.marketplace)
    try:
        report = run_check(
            root=ROOT,
            marketplace=marketplace,
            plugin_names=args.plugin,
            ref=args.ref,
        )
    except (OSError, json.JSONDecodeError, RuntimeError, tarfile.TarError) as exc:
        print(f"check-plugin-extraction: {exc}", file=sys.stderr)
        return 1
    emit(report)
    rendered = json.dumps(report, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    else:
        sys.stdout.write(rendered)
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
