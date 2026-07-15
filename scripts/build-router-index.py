#!/usr/bin/env python3
"""Build ~/.claude/bopen-tools/router-index.json from installed b-open-io plugins.

Scans every plugin under the marketplace cache (default
~/.claude/plugins/cache/b-open-io/*/), picks the latest installed version of
each plugin, and extracts a routing entry per skills/*/SKILL.md and
agents/*.md: {kind, id, triggers, hint}. Triggers are the quoted phrases
found in the frontmatter `description` plus significant keywords (stopwords
dropped). id is "<plugin>:<name>" using the frontmatter `name` field.

stdlib only, no third-party YAML — frontmatter is parsed with a minimal
hand-rolled reader that handles plain scalars and block scalars (|, |-, >,
>-), which covers every SKILL.md / agent .md in this ecosystem.

Usage:
  python3 scripts/build-router-index.py [--cache-root DIR] [--output FILE]

Invoked by hooks/session-context.sh (SessionStart) when the index is
missing or older than the newest plugin cache directory.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone

# Common English stopwords plus corpus-specific boilerplate that appears in
# nearly every skill/agent description ("agent", "skill", "user", ...) and
# would otherwise become a universal false-positive trigger.
STOPWORDS = frozenset(
    """
    a about after again all also an and any are as asks ask at be because
    been before being below between both but by can cannot could did do
    does doing down during each few for from further had has have having he
    her here hers herself him himself his how i if in into is it its itself
    just like me more most needs need not now of off on once only or other
    our ours ourselves out over own same she should so some such than that
    the their theirs them themselves then there these they this those
    through to too under until up very was we were what when where which
    while who whom why will with without you your yours yourself
    yourselves agent agents skill skills plugin plugins user users use uses
    used using want wants context example examples commentary assistant
    covers cover handles handle helps help needed working works wants
    plausibly instead rather either every into onto
    """.split()
)

QUOTE_RE = re.compile(r'"([^"\n]{3,80})"')
TAG_RE = re.compile(r"<[^>]+>")
URL_RE = re.compile(r"https?://\S+")
WORD_RE = re.compile(r"[A-Za-z][A-Za-z'-]{2,}")
BLOCK_SCALAR_MARKS = {"|", "|-", "|+", ">", ">-", ">+"}
MAX_TRIGGERS_PER_ENTRY = 40


def version_key(version: str) -> tuple[int, ...]:
    parts = []
    for chunk in version.split("."):
        m = re.match(r"\d+", chunk)
        parts.append(int(m.group()) if m else 0)
    return tuple(parts)


def dedent_block(lines: list[str]) -> str:
    non_empty = [ln for ln in lines if ln.strip()]
    if not non_empty:
        return ""
    indent = min(len(ln) - len(ln.lstrip(" ")) for ln in non_empty)
    stripped = [ln[indent:] if len(ln) >= indent else ln for ln in lines]
    return "\n".join(stripped).strip()


def parse_frontmatter(text: str) -> dict[str, str]:
    """Extract top-level frontmatter keys as strings. Nested structures
    (lists, mappings) are ignored — only scalar and block-scalar values are
    returned, which is all `name` and `description` ever use here."""
    lines = text.split("\n")
    if not lines or lines[0].strip() != "---":
        return {}
    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break
    if end_idx is None:
        return {}

    fm_lines = lines[1:end_idx]
    data: dict[str, str] = {}
    key_re = re.compile(r"^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*(.*)$")
    i = 0
    n = len(fm_lines)
    while i < n:
        line = fm_lines[i]
        if not line.strip() or line.startswith("#") or line[:1] in (" ", "\t"):
            i += 1
            continue
        m = key_re.match(line)
        if not m:
            i += 1
            continue
        key, rest = m.group(1), m.group(2).strip()
        if rest in BLOCK_SCALAR_MARKS or rest == "":
            block_lines = []
            j = i + 1
            while j < n and (fm_lines[j].strip() == "" or fm_lines[j][:1] in (" ", "\t")):
                block_lines.append(fm_lines[j])
                j += 1
            data[key] = dedent_block(block_lines)
            i = j
        else:
            value = rest
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            data[key] = value
            i += 1
    return data


EXAMPLE_BLOCK_RE = re.compile(r"<example", re.IGNORECASE)
NEGATIVE_ROUTING_RE = re.compile(
    r"\b(?:this (?:skill|agent) should not be used|it should not be used|"
    r"do not use|not for)\b",
    re.IGNORECASE,
)


def description_head(description: str) -> str:
    """The trigger-bearing portion of a description, before any worked
    <example> dialogue. Dialogue quotes ("I'll use the X agent to...") are
    assistant narration, not user-intent phrasing, and would otherwise pollute
    the trigger set with near-arbitrary full sentences."""
    m = EXAMPLE_BLOCK_RE.search(description)
    head = description[: m.start()] if m else description
    negative = NEGATIVE_ROUTING_RE.search(head)
    return head[: negative.start()] if negative else head


def extract_triggers(description: str) -> list[str]:
    head = description_head(description)
    phrases: set[str] = set()
    for m in QUOTE_RE.finditer(head):
        phrase = m.group(1).strip().lower()
        if phrase and not phrase.isdigit():
            phrases.add(phrase)

    # Quoted phrases are already high-signal triggers. Do not also index their
    # component words (for example, "build" or "interface") as broad positive
    # keywords; that turns exact examples into unrelated false positives.
    plain = QUOTE_RE.sub(" ", head)
    plain = TAG_RE.sub(" ", plain)
    plain = URL_RE.sub(" ", plain)
    keywords: set[str] = set()
    for w in WORD_RE.findall(plain):
        wl = w.lower().strip("'-")
        if len(wl) < 4 or wl in STOPWORDS:
            continue
        keywords.add(wl)

    triggers = sorted(phrases) + sorted(keywords)
    if len(triggers) > MAX_TRIGGERS_PER_ENTRY:
        # Keep every phrase (higher signal), fill the remainder with keywords.
        budget = max(0, MAX_TRIGGERS_PER_ENTRY - len(phrases))
        triggers = sorted(phrases) + sorted(keywords)[:budget]
    return sorted(set(triggers))


def first_sentence(description: str) -> str:
    text = re.sub(r"\s+", " ", description).strip()
    cut = text.find("<")
    if cut != -1:
        text = text[:cut].strip()
    m = re.search(r"(.+?[.!?])(\s|$)", text)
    sentence = m.group(1) if m else text
    if len(sentence) > 200:
        sentence = sentence[:197] + "..."
    return sentence


def build_entry(kind: str, plugin_name: str, md_path: str) -> dict | None:
    try:
        with open(md_path, "r", encoding="utf-8") as f:
            text = f.read()
    except OSError:
        return None

    fm = parse_frontmatter(text)
    name = fm.get("name", "").strip()
    description = fm.get("description", "").strip()
    if not name or not description:
        return None

    triggers = extract_triggers(description)
    if not triggers:
        return None

    return {
        "kind": kind,
        "id": f"{plugin_name}:{name}",
        "triggers": triggers,
        "hint": first_sentence(description),
    }


def find_latest_version_dirs(cache_root: str) -> dict[str, str]:
    plugins: dict[str, str] = {}
    if not os.path.isdir(cache_root):
        return plugins
    for plugin_name in sorted(os.listdir(cache_root)):
        plugin_dir = os.path.join(cache_root, plugin_name)
        if not os.path.isdir(plugin_dir):
            continue
        versions = [
            d for d in os.listdir(plugin_dir) if os.path.isdir(os.path.join(plugin_dir, d))
        ]
        if not versions:
            continue
        latest = max(versions, key=version_key)
        plugins[plugin_name] = os.path.join(plugin_dir, latest)
    return plugins


def collect_entries(plugin_name: str, plugin_path: str) -> list[dict]:
    entries: list[dict] = []

    skills_dir = os.path.join(plugin_path, "skills")
    if os.path.isdir(skills_dir):
        for skill_name in sorted(os.listdir(skills_dir)):
            skill_md = os.path.join(skills_dir, skill_name, "SKILL.md")
            if os.path.isfile(skill_md):
                entry = build_entry("skill", plugin_name, skill_md)
                if entry:
                    entries.append(entry)

    agents_dir = os.path.join(plugin_path, "agents")
    if os.path.isdir(agents_dir):
        for fname in sorted(os.listdir(agents_dir)):
            if fname.endswith(".md"):
                entry = build_entry("agent", plugin_name, os.path.join(agents_dir, fname))
                if entry:
                    entries.append(entry)

    return entries


def build_index(cache_root: str) -> dict:
    plugins = find_latest_version_dirs(cache_root)
    entries: list[dict] = []
    for plugin_name, plugin_path in plugins.items():
        entries.extend(collect_entries(plugin_name, plugin_path))
    entries.sort(key=lambda e: (e["kind"], e["id"]))
    return {
        "version": 1,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_cache_root": cache_root,
        "entry_count": len(entries),
        "entries": entries,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cache-root",
        default=os.path.expanduser("~/.claude/plugins/cache/b-open-io"),
        help="Marketplace plugin cache root (default: ~/.claude/plugins/cache/b-open-io)",
    )
    parser.add_argument(
        "--output",
        default=os.path.expanduser("~/.claude/bopen-tools/router-index.json"),
        help="Output path (default: ~/.claude/bopen-tools/router-index.json)",
    )
    args = parser.parse_args()

    index = build_index(args.cache_root)

    out_dir = os.path.dirname(args.output)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    tmp_path = f"{args.output}.tmp.{os.getpid()}"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")
    os.replace(tmp_path, args.output)

    print(f"Wrote {index['entry_count']} entries to {args.output}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
