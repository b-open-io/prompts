#!/usr/bin/env python3
"""Shared HammerTime home resolver used by hooks and skill scripts."""

from __future__ import annotations

import os
from pathlib import Path


def resolve_hammertime_home() -> Path:
    override = os.environ.get("BOPEN_HAMMERTIME_HOME", "").strip()
    if override:
        return Path(override).expanduser()

    legacy = Path("~/.claude/hammertime").expanduser()
    if legacy.is_dir():
        return legacy

    return Path("~/.bopen-tools/hammertime").expanduser()


def hammertime_paths() -> dict[str, Path]:
    home = resolve_hammertime_home()
    return {
        "home": home,
        "rules": home / "rules.json",
        "state": home / "state.json",
        "disabled": home / "disabled",
        "debug": home / "debug.log",
    }


if __name__ == "__main__":
    print(resolve_hammertime_home())
