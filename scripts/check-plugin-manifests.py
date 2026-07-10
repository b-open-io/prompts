#!/usr/bin/env python3
"""Check and synchronize the Claude and Codex plugin release metadata."""

from __future__ import annotations

import argparse
import copy
import json
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
CLAUDE_MANIFEST = ROOT / ".claude-plugin" / "plugin.json"
CODEX_MANIFEST = ROOT / ".codex-plugin" / "plugin.json"
MARKETPLACE = ROOT / ".agents" / "plugins" / "marketplace.json"

SHARED_FIELDS = (
    "name",
    "version",
    "description",
    "author",
    "repository",
    "keywords",
)
SEMVER_RE = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)
STABLE_VERSION_RE = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")


class ManifestError(Exception):
    """An actionable manifest validation or update error."""


def load_object(path: Path) -> dict[str, Any]:
    try:
        with path.open(encoding="utf-8") as handle:
            value = json.load(handle)
    except FileNotFoundError as exc:
        raise ManifestError(f"missing required file: {path.relative_to(ROOT)}") from exc
    except json.JSONDecodeError as exc:
        raise ManifestError(
            f"invalid JSON in {path.relative_to(ROOT)} at line {exc.lineno}, "
            f"column {exc.colno}: {exc.msg}"
        ) from exc
    if not isinstance(value, dict):
        raise ManifestError(f"{path.relative_to(ROOT)} must contain a JSON object")
    return value


def display(value: Any) -> str:
    return json.dumps(value, sort_keys=True, ensure_ascii=False)


def check_local_path(
    errors: list[str],
    manifest_name: str,
    manifest: dict[str, Any],
    field: str,
    expected: str,
    kind: str,
) -> None:
    value = manifest.get(field)
    if value != expected:
        errors.append(
            f"{manifest_name} field {field!r} must be {expected!r}; found {value!r}"
        )
        return

    target = (ROOT / expected).resolve()
    try:
        target.relative_to(ROOT.resolve())
    except ValueError:
        errors.append(f"{manifest_name} field {field!r} escapes the plugin root")
        return

    if kind == "file" and not target.is_file():
        errors.append(
            f"{manifest_name} field {field!r} references missing file "
            f"{target.relative_to(ROOT)}"
        )
    elif kind == "directory" and not target.is_dir():
        errors.append(
            f"{manifest_name} field {field!r} references missing directory "
            f"{target.relative_to(ROOT)}"
        )


def collect_errors(
    claude: dict[str, Any],
    codex: dict[str, Any],
    marketplace: dict[str, Any],
) -> list[str]:
    errors: list[str] = []

    for field in SHARED_FIELDS:
        if field not in claude:
            errors.append(f"Claude manifest is missing shared field {field!r}")
            continue
        if field not in codex:
            errors.append(f"Codex manifest is missing shared field {field!r}")
            continue
        if claude[field] != codex[field]:
            errors.append(
                f"shared field {field!r} differs: Claude={display(claude[field])}, "
                f"Codex={display(codex[field])}; run this script with --sync"
            )

    for label, manifest in (("Claude", claude), ("Codex", codex)):
        name = manifest.get("name")
        if not isinstance(name, str) or not name:
            errors.append(f"{label} manifest field 'name' must be a non-empty string")
        version = manifest.get("version")
        if not isinstance(version, str) or not SEMVER_RE.fullmatch(version):
            errors.append(
                f"{label} manifest version must be valid semantic versioning; found {version!r}"
            )
        description = manifest.get("description")
        if not isinstance(description, str) or not description:
            errors.append(f"{label} manifest field 'description' must be a non-empty string")
        author = manifest.get("author")
        if not isinstance(author, dict) or not isinstance(author.get("name"), str):
            errors.append(f"{label} manifest field 'author.name' must be a string")
        repository = manifest.get("repository")
        if not isinstance(repository, str) or not repository:
            errors.append(f"{label} manifest field 'repository' must be a non-empty string")
        keywords = manifest.get("keywords")
        if not isinstance(keywords, list) or not keywords or not all(
            isinstance(keyword, str) and keyword for keyword in keywords
        ):
            errors.append(f"{label} manifest field 'keywords' must be a non-empty string array")

    check_local_path(
        errors,
        "Claude manifest",
        claude,
        "hooks",
        "./hooks/claude-hooks.json",
        "file",
    )
    check_local_path(
        errors,
        "Codex manifest",
        codex,
        "hooks",
        "./hooks/codex-hooks.json",
        "file",
    )
    check_local_path(
        errors,
        "Codex manifest",
        codex,
        "skills",
        "./skills/",
        "directory",
    )

    if marketplace.get("name") != "b-open-io":
        errors.append(
            "marketplace name must be 'b-open-io'; found "
            f"{marketplace.get('name')!r}"
        )

    interface = marketplace.get("interface")
    if not isinstance(interface, dict) or interface.get("displayName") != "b-open.io":
        errors.append("marketplace interface.displayName must be 'b-open.io'")

    plugins = marketplace.get("plugins")
    plugin_name = claude.get("name")
    if not isinstance(plugins, list):
        errors.append("marketplace plugins must be an array")
    else:
        matches = [
            plugin
            for plugin in plugins
            if isinstance(plugin, dict) and plugin.get("name") == plugin_name
        ]
        if len(matches) != 1:
            errors.append(
                f"marketplace must contain exactly one entry for {plugin_name!r}; "
                f"found {len(matches)}"
            )
        else:
            entry = matches[0]
            expected_source = {"source": "local", "path": "./"}
            if entry.get("source") != expected_source:
                errors.append(
                    "marketplace bopen-tools source must be "
                    f"{display(expected_source)}; found {display(entry.get('source'))}"
                )
            expected_policy = {
                "installation": "AVAILABLE",
                "authentication": "ON_INSTALL",
            }
            if entry.get("policy") != expected_policy:
                errors.append(
                    "marketplace bopen-tools policy must be "
                    f"{display(expected_policy)}; found {display(entry.get('policy'))}"
                )
            if entry.get("category") != "Developer Tools":
                errors.append("marketplace bopen-tools category must be 'Developer Tools'")

    return errors


def encoded_json(value: dict[str, Any]) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def atomic_write_many(updates: dict[Path, dict[str, Any]]) -> None:
    """Prepare every file before replacing any, then replace as one guarded operation."""
    temporary: dict[Path, Path] = {}
    try:
        for path, value in updates.items():
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=path.parent,
                prefix=f".{path.name}.",
                suffix=".tmp",
                delete=False,
            ) as handle:
                handle.write(encoded_json(value))
                handle.flush()
                os.fsync(handle.fileno())
                os.fchmod(handle.fileno(), path.stat().st_mode & 0o777)
                temporary[path] = Path(handle.name)
        for path, temp_path in temporary.items():
            os.replace(temp_path, path)
    finally:
        for temp_path in temporary.values():
            try:
                temp_path.unlink()
            except FileNotFoundError:
                pass


def synchronize(claude: dict[str, Any], codex: dict[str, Any]) -> dict[str, Any]:
    updated = copy.deepcopy(codex)
    for field in SHARED_FIELDS:
        if field not in claude:
            raise ManifestError(
                f"cannot sync because Claude manifest is missing shared field {field!r}"
            )
        updated[field] = copy.deepcopy(claude[field])
    return updated


def bumped_manifests(
    claude: dict[str, Any], codex: dict[str, Any]
) -> tuple[dict[str, Any], dict[str, Any], str]:
    drift = [field for field in SHARED_FIELDS if claude.get(field) != codex.get(field)]
    if drift:
        raise ManifestError(
            "cannot bump manifests with shared-field drift in "
            + ", ".join(repr(field) for field in drift)
            + "; run --sync and check the diff first"
        )

    version = claude.get("version")
    if not isinstance(version, str) or not STABLE_VERSION_RE.fullmatch(version):
        raise ManifestError(
            "--bump-patch requires both manifests to start from the same stable x.y.z "
            f"version; found {version!r}"
        )
    match = STABLE_VERSION_RE.fullmatch(version)
    assert match is not None
    next_version = f"{match.group(1)}.{match.group(2)}.{int(match.group(3)) + 1}"

    updated_claude = copy.deepcopy(claude)
    updated_codex = copy.deepcopy(codex)
    updated_claude["version"] = next_version
    updated_codex["version"] = next_version
    return updated_claude, updated_codex, next_version


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check shared Claude/Codex plugin metadata and release wiring."
    )
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument(
        "--sync",
        action="store_true",
        help="copy shared metadata from Claude to Codex, preserving Codex-only fields",
    )
    actions.add_argument(
        "--bump-patch",
        action="store_true",
        help="patch-bump both manifests together from the same stable version",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        claude = load_object(CLAUDE_MANIFEST)
        codex = load_object(CODEX_MANIFEST)
        marketplace = load_object(MARKETPLACE)

        action_message = ""
        if args.sync:
            codex = synchronize(claude, codex)
            atomic_write_many({CODEX_MANIFEST: codex})
            action_message = "Synchronized shared metadata from Claude to Codex. "
        elif args.bump_patch:
            preflight_errors = collect_errors(claude, codex, marketplace)
            if preflight_errors:
                raise ManifestError(
                    "cannot bump until the default check passes:\n  - "
                    + "\n  - ".join(preflight_errors)
                )
            claude, codex, next_version = bumped_manifests(claude, codex)
            atomic_write_many({CLAUDE_MANIFEST: claude, CODEX_MANIFEST: codex})
            action_message = f"Bumped both plugin manifests to {next_version}. "

        errors = collect_errors(claude, codex, marketplace)
        if errors:
            print("Plugin manifest check failed:", file=sys.stderr)
            for error in errors:
                print(f"  - {error}", file=sys.stderr)
            return 1

        print(action_message + "Plugin manifests and marketplace are in sync.")
        return 0
    except ManifestError as exc:
        print(f"Plugin manifest operation failed: {exc}", file=sys.stderr)
        return 1
    except OSError as exc:
        print(f"Plugin manifest operation failed while writing files: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
