#!/usr/bin/env python3
"""Idempotent installer for generated bopen-tools Codex custom agents.

Default target: <cwd>/.codex/agents/
  --user        ${CODEX_HOME:-~/.codex}/agents/
  --all         install full generated roster (default: curated)
  --check       report actions without writing
  --uninstall   remove managed agents (hash-aware quarantine)
  --force       overwrite unmanaged name collisions
  --target DIR  override install directory (tests / advanced use)
"""

from __future__ import annotations

import argparse
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from lib import (
    MANIFEST_FILENAME,
    OWNERSHIP_FILENAME,
    atomic_copy_file,
    codex_agents_dir,
    default_project_agents_dir,
    default_user_agents_dir,
    discover_plugin_root,
    is_managed_filename,
    load_committed_manifest,
    load_ownership,
    select_manifest_agents,
    sha256_file,
    target_trash_dir,
    write_ownership,
)


class Summary:
    def __init__(self) -> None:
        self.installed: list[str] = []
        self.updated: list[str] = []
        self.unchanged: list[str] = []
        self.quarantined: list[str] = []
        self.skipped: list[str] = []
        self.warnings: list[str] = []
        self.errors: list[str] = []

    def print_report(self, *, target: Path, check: bool, uninstall: bool) -> None:
        mode = "check" if check else ("uninstall" if uninstall else "install")
        print(f"bopen-tools Codex agents ({mode})")
        print(f"target: {target}")
        print(
            "installed={i} updated={u} unchanged={n} quarantined={q} skipped={s}".format(
                i=len(self.installed),
                u=len(self.updated),
                n=len(self.unchanged),
                q=len(self.quarantined),
                s=len(self.skipped),
            )
        )
        for label, items in (
            ("installed", self.installed),
            ("updated", self.updated),
            ("unchanged", self.unchanged),
            ("quarantined", self.quarantined),
            ("skipped", self.skipped),
        ):
            if items:
                print(f"  {label}: {', '.join(items)}")
        for warning in self.warnings:
            print(f"warning: {warning}", file=sys.stderr)
        for error in self.errors:
            print(f"error: {error}", file=sys.stderr)
        if not check:
            print("Start a new Codex session for the agents to become available.")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--user",
        action="store_true",
        help="Install into ${CODEX_HOME:-~/.codex}/agents/ instead of project .codex/agents/",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Install full generated roster (default: curated subset)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Report what would change without writing",
    )
    parser.add_argument(
        "--uninstall",
        action="store_true",
        help="Remove managed agents from the target (hash-aware quarantine)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite unmanaged colliding files",
    )
    parser.add_argument(
        "--target",
        type=Path,
        default=None,
        help="Override install directory (for tests)",
    )
    parser.add_argument(
        "--plugin-root",
        type=Path,
        default=None,
        help="Plugin root override",
    )
    parser.add_argument(
        "--cwd",
        type=Path,
        default=None,
        help="Project cwd for default project target (default: process cwd)",
    )
    args = parser.parse_args(argv)

    if args.uninstall and args.all is False:
        # Uninstall uses ownership manifest; --all is ignored for selection of
        # what is currently managed. Allowed either way.
        pass

    plugin_root = (
        args.plugin_root.expanduser().resolve()
        if args.plugin_root
        else discover_plugin_root(Path(__file__))
    )
    source_dir = codex_agents_dir(plugin_root)
    if not source_dir.is_dir():
        print(f"error: generated adapters missing at {source_dir}", file=sys.stderr)
        print("Run: python3 scripts/codex-agents/generate.py", file=sys.stderr)
        return 1

    try:
        manifest = load_committed_manifest(source_dir)
    except Exception as exc:  # noqa: BLE001 - surface parse errors cleanly
        print(f"error: cannot load manifest: {exc}", file=sys.stderr)
        return 1

    if args.target is not None:
        target_dir = args.target.expanduser().resolve()
        scope = "custom"
    elif args.user:
        target_dir = default_user_agents_dir()
        scope = "user"
    else:
        cwd = args.cwd.expanduser().resolve() if args.cwd else Path.cwd().resolve()
        target_dir = default_project_agents_dir(cwd)
        scope = "project"

    summary = Summary()

    if args.uninstall:
        code = uninstall_agents(
            target_dir=target_dir,
            summary=summary,
            check=args.check,
        )
        summary.print_report(target=target_dir, check=args.check, uninstall=True)
        return code

    desired = select_manifest_agents(manifest, all_agents=args.all)
    full_roster = select_manifest_agents(manifest, all_agents=True)
    code = install_agents(
        source_dir=source_dir,
        target_dir=target_dir,
        desired=desired,
        full_roster=full_roster,
        plugin_root=plugin_root,
        scope=scope,
        summary=summary,
        check=args.check,
        force=args.force,
        all_agents=args.all,
    )
    summary.print_report(target=target_dir, check=args.check, uninstall=False)
    return code


def install_agents(
    *,
    source_dir: Path,
    target_dir: Path,
    desired: list[dict[str, Any]],
    full_roster: list[dict[str, Any]],
    plugin_root: Path,
    scope: str,
    summary: Summary,
    check: bool,
    force: bool,
    all_agents: bool,
) -> int:
    if not check:
        target_dir.mkdir(parents=True, exist_ok=True)

    ownership = load_ownership(target_dir) if target_dir.is_dir() else {
        "schema_version": "1",
        "manager": "bopen-tools",
        "agents": {},
    }
    owned: dict[str, Any] = dict(ownership.get("agents") or {})

    desired_by_file = {str(a["generated_file"]): a for a in desired}
    desired_files = set(desired_by_file)
    # Full current plugin roster — used for staleness, not selection.
    # A managed file is stale only when its source adapter is gone from the
    # full manifest, not merely outside the requested (e.g. curated) set.
    valid_manifest_files = {
        str(a["generated_file"]) for a in full_roster if a.get("generated_file")
    }

    # Refuse / handle collisions for files we want to install.
    for filename, meta in sorted(desired_by_file.items()):
        src = source_dir / filename
        if not src.is_file():
            summary.errors.append(f"missing generated file: {src}")
            continue
        dest = target_dir / filename
        src_hash = str(meta.get("generated_hash") or sha256_file(src))

        if dest.exists() or dest.is_symlink():
            if dest.is_symlink():
                summary.errors.append(
                    f"{filename}: refusing to replace symlink (copy regular files only)"
                )
                continue
            current_hash = sha256_file(dest)
            prior = owned.get(filename)
            if prior and prior.get("hash") == current_hash:
                # Managed and unmodified relative to last install record.
                if current_hash == src_hash:
                    summary.unchanged.append(filename)
                    # Refresh metadata without rewrite when hash matches.
                    owned[filename] = _ownership_entry(meta, src_hash)
                    continue
                # Managed content outdated → update
                if check:
                    summary.updated.append(filename)
                else:
                    atomic_copy_file(src, dest)
                    owned[filename] = _ownership_entry(meta, src_hash)
                    summary.updated.append(filename)
                continue

            if prior and prior.get("hash") != current_hash:
                # Managed but user-modified — do not overwrite.
                summary.skipped.append(filename)
                summary.warnings.append(
                    f"{filename}: managed file was modified locally; "
                    "leaving in place (re-run with manual restore or delete to update)"
                )
                # Keep prior ownership entry so uninstall still treats carefully.
                continue

            # Exists but not in ownership.
            # If content already matches the desired adapter, claim it (idempotent).
            if current_hash == src_hash:
                summary.unchanged.append(filename)
                owned[filename] = _ownership_entry(meta, src_hash)
                continue

            # Unmanaged collision with different content.
            if not force:
                summary.skipped.append(filename)
                summary.errors.append(
                    f"{filename}: unmanaged file exists; pass --force to overwrite"
                )
                continue
            if check:
                summary.updated.append(filename)
                owned[filename] = _ownership_entry(meta, src_hash)
            else:
                try:
                    _quarantine_file(
                        dest, target_dir=target_dir, reason="force-collision"
                    )
                except OSError as exc:
                    summary.skipped.append(filename)
                    summary.errors.append(
                        f"{filename}: quarantine failed before force install; "
                        f"not overwriting: {exc}"
                    )
                    continue
                atomic_copy_file(src, dest)
                owned[filename] = _ownership_entry(meta, src_hash)
                summary.updated.append(filename)
            continue

        # Fresh install
        if check:
            summary.installed.append(filename)
            owned[filename] = _ownership_entry(meta, src_hash)
        else:
            atomic_copy_file(src, dest)
            owned[filename] = _ownership_entry(meta, src_hash)
            summary.installed.append(filename)

    # Quarantine only managed files whose source adapter no longer exists in
    # the full current plugin manifest. Curated selection must not drop still-
    # valid agents installed earlier via --all.
    for filename, prior in list(owned.items()):
        if filename in desired_files:
            continue
        if filename in valid_manifest_files:
            # Still a valid generated adapter — leave file and ownership alone.
            continue
        dest = target_dir / filename
        if not dest.is_file():
            # Drop ownership entry for missing file.
            owned.pop(filename, None)
            continue
        current_hash = sha256_file(dest)
        prior_hash = prior.get("hash")
        if prior_hash and current_hash == prior_hash:
            if check:
                summary.quarantined.append(filename)
                owned.pop(filename, None)
            else:
                try:
                    _quarantine_file(
                        dest, target_dir=target_dir, reason="stale-managed"
                    )
                except OSError as exc:
                    summary.skipped.append(filename)
                    summary.errors.append(
                        f"{filename}: quarantine failed for stale managed file: {exc}"
                    )
                    continue
                owned.pop(filename, None)
                summary.quarantined.append(filename)
        else:
            summary.skipped.append(filename)
            summary.warnings.append(
                f"{filename}: stale managed file was modified; leaving in place"
            )
            # Keep ownership so future uninstall remains hash-aware.

    ownership["schema_version"] = "1"
    ownership["manager"] = "bopen-tools"
    ownership["scope"] = scope
    ownership["plugin_root"] = str(plugin_root)
    ownership["selection"] = "all" if all_agents else "curated"
    ownership["source_manifest"] = str(source_dir / MANIFEST_FILENAME)
    ownership["agents"] = owned

    if summary.errors:
        # Still write ownership for successful partial installs unless check.
        if not check and target_dir.is_dir():
            write_ownership(target_dir, ownership)
        return 1

    if not check:
        write_ownership(target_dir, ownership)
    return 0


def uninstall_agents(*, target_dir: Path, summary: Summary, check: bool) -> int:
    if not target_dir.is_dir():
        print(f"target does not exist: {target_dir}")
        return 0

    ownership = load_ownership(target_dir)
    owned: dict[str, Any] = dict(ownership.get("agents") or {})
    if not owned:
        # Also pick up managed filenames with no ownership (orphan cleanup skipped)
        print("No managed agents recorded in ownership manifest.")
        return 0

    for filename, prior in list(owned.items()):
        dest = target_dir / filename
        if not dest.exists():
            owned.pop(filename, None)
            summary.unchanged.append(filename)
            continue
        if dest.is_symlink():
            summary.skipped.append(filename)
            summary.warnings.append(f"{filename}: symlink; not removing")
            continue
        if not dest.is_file():
            summary.skipped.append(filename)
            summary.warnings.append(f"{filename}: not a regular file; not removing")
            continue
        current_hash = sha256_file(dest)
        prior_hash = prior.get("hash")
        if prior_hash and current_hash == prior_hash:
            if check:
                summary.quarantined.append(filename)
                owned.pop(filename, None)
            else:
                try:
                    _quarantine_file(dest, target_dir=target_dir, reason="uninstall")
                except OSError as exc:
                    summary.skipped.append(filename)
                    summary.errors.append(
                        f"{filename}: quarantine failed during uninstall: {exc}"
                    )
                    continue
                owned.pop(filename, None)
                summary.quarantined.append(filename)
        else:
            summary.skipped.append(filename)
            summary.warnings.append(
                f"{filename}: modified since install; leaving in place"
            )

    ownership["agents"] = owned
    if not check:
        if owned:
            write_ownership(target_dir, ownership)
        else:
            # Remove empty ownership file when fully uninstalled.
            ownership_path = target_dir / OWNERSHIP_FILENAME
            if ownership_path.is_file():
                try:
                    _quarantine_file(
                        ownership_path,
                        target_dir=target_dir,
                        reason="uninstall-ownership",
                    )
                except OSError as exc:
                    summary.warnings.append(
                        f"{OWNERSHIP_FILENAME}: could not quarantine empty "
                        f"ownership file: {exc}"
                    )
    return 1 if summary.errors else 0


def _ownership_entry(meta: dict[str, Any], file_hash: str) -> dict[str, Any]:
    return {
        "hash": file_hash,
        "source_name": meta.get("source_name"),
        "source_version": meta.get("source_version"),
        "source_hash": meta.get("source_hash"),
        "generated_hash": meta.get("generated_hash"),
        "agent_name": meta.get("agent_name"),
    }


def _quarantine_file(path: Path, *, target_dir: Path, reason: str) -> Path:
    """Move path into target-local quarantine. Raises OSError on failure."""
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    trash = target_trash_dir(target_dir) / stamp / reason
    trash.mkdir(parents=True, exist_ok=True)
    dest = trash / path.name
    # Avoid overwrite collisions within same second.
    if dest.exists():
        dest = trash / f"{path.name}.{os_getpid()}"
    shutil.move(str(path), str(dest))
    return dest


def os_getpid() -> int:
    import os

    return os.getpid()


if __name__ == "__main__":
    raise SystemExit(main())
