#!/usr/bin/env python3
"""Fail when a tracked file gains, loses, or rewrites a mention of a retired model id.

Claude ids must be one of CURRENT_CLAUDE, so a tier change flags every stale line. The other
families use a retired-version floor. A file that names a retired id on purpose (a ban
statement, legacy acceptance, an upstream default) has each mention pinned in
model-drift-baseline.json as "label: token @ digest", where digest is a hash of the whole
line. Editing a pinned line, even one that keeps the same id, fails until a person reviews
it and runs --update-baseline. Moving a line does not, because line numbers are not pinned.
"""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASELINE = "scripts/model-drift-baseline.json"

# The Coordinator tier map (modules/orchestra/skills/coordinator/SKILL.md). Change it here first.
CURRENT_CLAUDE = ("claude-fable-5-2", "claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5")


def family_version(model_id: str) -> tuple[str, str]:
    _, family, major, minor = model_id.split("-")
    return family, f"{major}.{minor}"


# The AI Gateway writes the version with a dot: anthropic/claude-haiku-5.5.
CLAUDE_IDS = {*CURRENT_CLAUDE, *(f"claude-{family}-{version}" for family, version in map(family_version, CURRENT_CLAUDE))}
CLAUDE_PROSE = set(map(family_version, CURRENT_CLAUDE))

CLAUDE_ID = re.compile(r"claude-(?:(?:opus|sonnet|haiku|fable)-\d|\d|instant)[\w.-]*", re.I)
CLAUDE_NAME = re.compile(r"\b(opus|sonnet|haiku|fable)\s(\d+(?:\.\d+)?)\b", re.I)
RETIRED = {
    # Below GPT 6, plus gpt-6-sol: accepted only where a lane lacks the current gpt-6.1-sol.
    "gpt": re.compile(r"gpt-[0-5](?!\d)[\w.-]*|gpt-6[- ]sol", re.I),
    # Below grok-4.7, the pinned Grok worker. (?!\.?\d) still matches an id that ends a sentence.
    "grok": re.compile(r"grok-(?:[0-3](?:\.\d+)?|4(?:\.[0-6])?)(?!\.?\d)[\w-]*|grok 4\.[0-6](?!\d)", re.I),
    # Below GPT Image 2.6, the gemskills 0.0.72 Sunburst and Flare models.
    "image": re.compile(r"gpt-image-(?:1(?:\.\d+)?|2(?:\.[0-5])?)(?!\.?\d)[\w-]*", re.I),
    # Below Gemini 3.
    "gemini": re.compile(r"gemini[- ][12](?:\.\d)?(?!\.?\d)[\w-]*", re.I),
}

# Dated records, test fixtures that must name retired ids, generated copies checked by their
# own generators, and vendored third-party skills. Each guard file names retired ids itself.
HISTORY = (
    "CHANGELOG.md", "tasks/*", "plans/*", "docs/audits/*", "docs/baselines/*", "docs/superpowers/*",
    "docs/architecture/*", "docs/context-reduction-log.md", "docs/eval-run-post-rename.txt",
    "benchmarks/cache/*", "benchmarks/fixtures/*", "benchmarks/latest.json", "evals/*", "*/evals/*",
    "*/tests/*", "*.test.ts", "*.test.tsx", "*/test_*.py", "*.lock", "modules/*/.agents/skills/*",
    "codex/agents/*", "modules/orchestra/skills/visual-coordinator/examples/graph-builder.html",
    "scripts/check-model-drift.py", BASELINE,
)


Hit = tuple[str, int, str, str]  # label, line number, token, line text


def find_hits(text: str) -> list[Hit]:
    hits = []
    for number, line in enumerate(text.splitlines(), start=1):
        for match in CLAUDE_ID.finditer(line):
            token = match.group().rstrip(".-")
            if token.lower() not in CLAUDE_IDS:
                hits.append(("claude-id", number, token, line))
        for match in CLAUDE_NAME.finditer(line):
            if (match.group(1).lower(), match.group(2)) not in CLAUDE_PROSE:
                hits.append(("claude-prose", number, match.group(), line))
        for label, pattern in RETIRED.items():
            hits.extend((label, number, match.group(), line) for match in pattern.finditer(line))
    return hits


def is_history(path: str) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in HISTORY)


def scan(root: Path) -> dict[str, list[Hit]]:
    listed = subprocess.run(["git", "ls-files", "-z"], cwd=root, capture_output=True, text=True, check=True)
    found = {}
    for path in filter(None, listed.stdout.split("\0")):
        file = root / path
        if is_history(path) or file.is_symlink() or not file.is_file():
            continue
        try:
            text = file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if hits := find_hits(text):
            found[path] = hits
    return found


def fingerprint(hit: Hit) -> str:
    label, _, token, line = hit
    digest = hashlib.sha256(line.strip().encode("utf-8")).hexdigest()[:12]
    return f"{label}: {token} @ {digest}"


def fingerprints(found: dict[str, list[Hit]]) -> dict[str, list[str]]:
    return {path: sorted(map(fingerprint, hits)) for path, hits in sorted(found.items())}


def main(argv: list[str] | None = None, root: Path = ROOT) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--update-baseline", action="store_true", help="pin every current mention as reviewed")
    args = parser.parse_args(argv)
    found = scan(root)
    actual = fingerprints(found)
    if args.update_baseline:
        (root / BASELINE).write_text(json.dumps(actual, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {BASELINE}: {sum(map(len, actual.values()))} mentions in {len(actual)} files")
        return 0
    baseline_path = root / BASELINE
    if not baseline_path.is_file():
        print(f"error: {BASELINE} is missing; run with --update-baseline and review it", file=sys.stderr)
        return 2
    expected = json.loads(baseline_path.read_text(encoding="utf-8"))
    if not all(isinstance(entries, list) for entries in expected.values()):
        print(f"error: {BASELINE} uses an old format; run with --update-baseline and review it", file=sys.stderr)
        return 2
    changed = False
    for path in sorted(actual.keys() | expected.keys()):
        unreviewed = Counter(actual.get(path, [])) - Counter(expected.get(path, []))
        removed = Counter(expected.get(path, [])) - Counter(actual.get(path, []))
        if not unreviewed and not removed:
            continue
        changed = True
        for hit in found.get(path, []):
            if unreviewed[fingerprint(hit)] > 0:
                unreviewed[fingerprint(hit)] -= 1
                label, number, token, line = hit
                print(f"{path}:{number}: unreviewed {label} {token}: {line.strip()}", file=sys.stderr)
        for entry in sorted(removed.elements()):
            print(f"{path}: baseline entry no longer present: {entry}", file=sys.stderr)
    if changed:
        print(
            "Replace each retired model id with a current one. If a mention is deliberate (a ban or legacy"
            " acceptance), review it and run: python3 scripts/check-model-drift.py --update-baseline",
            file=sys.stderr,
        )
        return 1
    print(f"model drift: {sum(map(len, found.values()))} reviewed mentions in {len(found)} files, no change")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
