#!/usr/bin/env python3
"""Shared helpers for Codex custom-agent generation and installation."""

from __future__ import annotations

import hashlib
import json
import os
import re
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

GENERATOR_SCHEMA_VERSION = "2"
MANIFEST_FILENAME = "manifest.json"
OWNERSHIP_FILENAME = ".bopen-tools-agents.json"
MANAGED_PREFIX = "bopen-"
MANAGED_SUFFIX = ".toml"
EXCLUDED_SOURCE_NAMES = frozenset()
CURATED_SOURCE_NAMES: tuple[str, ...] = (
    "front-desk",
    "agent-builder",
    "prompt-engineer",
    "researcher",
    "tester",
    "documentation-writer",
    "architecture-reviewer",
    "code-auditor",
)

CODEX_COMPAT_PRELUDE = """\
# Codex compatibility prelude (bopen-tools)

You are running as a Codex custom agent adapted from a Claude Code agent
definition in this plugin. Preserve the role, constraints, and output style of
the canonical body below.

## Runtime translation (Claude → Codex)

| Claude concept | Codex-native behavior |
|---|---|
| `Read` / `Grep` / `Glob` | Use Codex filesystem tools or shell (`rg`, `cat`, `find`) |
| `Write` / `Edit` | Use Codex `apply_patch` or equivalent file-edit tools |
| `Bash` | Use Codex shell execution |
| `WebFetch` / `WebSearch` | Use Codex web tools or shell HTTP when available |
| `Skill(name)` | Open and follow the matching skill's `SKILL.md` from available skills; do not invent skills |
| `Agent(...)` / Task subagents | Spawn Codex custom agents when available (prefer `bopen_*`); otherwise complete the work yourself |
| `TaskCreate` / `TaskUpdate` / `TaskGet` / `TaskList` | Use available Codex plan/task/goal tools when the active surface exposes them; otherwise keep a concise checklist in your response |
| Source `model:` / Claude model routing | Informational only — inherit the parent Codex session model |

## Rules

- Prefer tools available in this Codex session. If a Claude-only tool is missing,
  use the nearest Codex equivalent and note the substitution only when it matters.
- Do not assume Claude Code plugin paths or `CLAUDE.md`-only conventions unless
  those files exist in the active workspace.
- Do not change models, sandbox mode, or global Codex config unless the user
  explicitly asks.

---
"""


def sha256_text(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def sha256_bytes(data: bytes) -> str:
    return "sha256:" + hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def managed_filename(source_name: str) -> str:
    return f"{MANAGED_PREFIX}{source_name}{MANAGED_SUFFIX}"


def managed_agent_name(source_name: str) -> str:
    # Codex custom-agent names accept lowercase letters, digits, and
    # underscores only. Keep the generated filename's bopen- prefix for clear
    # ownership, but translate the runtime name to the supported identifier.
    return "bopen_" + source_name.replace("-", "_")


def is_managed_filename(name: str) -> bool:
    return name.startswith(MANAGED_PREFIX) and name.endswith(MANAGED_SUFFIX)


def source_name_from_managed_filename(name: str) -> str:
    if not is_managed_filename(name):
        raise ValueError(f"not a managed agent filename: {name}")
    return name[len(MANAGED_PREFIX) : -len(MANAGED_SUFFIX)]


def discover_plugin_root(start: Path | None = None) -> Path:
    """Locate the bopen-tools plugin root from env, this checkout, or a cache install."""
    env = os.environ.get("BOPEN_PLUGIN_ROOT") or os.environ.get("CLAUDE_PLUGIN_ROOT")
    if env:
        candidate = Path(env).expanduser().resolve()
        if _looks_like_plugin_root(candidate):
            return candidate
        raise SystemExit(
            f"BOPEN_PLUGIN_ROOT/CLAUDE_PLUGIN_ROOT is set but is not a plugin root: {candidate}"
        )

    here = (start or Path(__file__)).resolve()
    search_points = [here]
    if here.is_file():
        search_points.append(here.parent)

    # Walk parents looking for plugin markers.
    for point in list(search_points):
        for parent in [point, *point.parents]:
            if _looks_like_plugin_root(parent):
                return parent

    raise SystemExit(
        "Could not discover plugin root. Set BOPEN_PLUGIN_ROOT to the bopen-tools "
        "checkout or installed plugin cache directory."
    )


def _looks_like_plugin_root(path: Path) -> bool:
    if not path.is_dir():
        return False
    agents = path / "agents"
    if not agents.is_dir():
        return False
    # Prefer roots that already have codex adapters or a plugin manifest.
    has_sources = any(agents.glob("*.md"))
    has_manifest = (path / ".claude-plugin" / "plugin.json").is_file()
    has_codex = (path / "codex" / "agents").is_dir()
    has_scripts = (path / "scripts" / "codex-agents").is_dir()
    return has_sources and (has_manifest or has_codex or has_scripts)


def codex_agents_dir(plugin_root: Path) -> Path:
    return plugin_root / "codex" / "agents"


def agent_sources_dir(plugin_root: Path) -> Path:
    return plugin_root / "agents"


def default_project_agents_dir(cwd: Path | None = None) -> Path:
    return (cwd or Path.cwd()).resolve() / ".codex" / "agents"


def default_user_agents_dir() -> Path:
    codex_home = os.environ.get("CODEX_HOME")
    if codex_home:
        return Path(codex_home).expanduser().resolve() / "agents"
    return Path.home().resolve() / ".codex" / "agents"


TRASH_DIRNAME = ".bopen-tools-trash"


def target_trash_dir(target_dir: Path) -> Path:
    """Return a target-local quarantine directory for managed agents.

    Path is nested under a hidden non-TOML directory so Codex agent discovery
    (which scans the agents dir for ``*.toml``) never loads quarantined files.
    Example: ``<target>/.bopen-tools-trash/quarantine/``

    No temp-directory fallback — quarantine must survive process exit and
    remain recoverable next to the install target.
    """
    trash = target_dir.resolve() / TRASH_DIRNAME / "quarantine"
    try:
        trash.mkdir(parents=True, exist_ok=True)
        probe = trash / ".write-probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
    except OSError as exc:
        raise OSError(
            f"Could not create target-local quarantine directory at {trash}: {exc}"
        ) from exc
    return trash


# Back-compat alias used by older call sites / docs; requires target_dir.
def bopen_trash_dir(target_dir: Path) -> Path:
    return target_trash_dir(target_dir)


@dataclass(frozen=True)
class AgentSource:
    source_name: str
    source_path: Path
    relative_source_path: str
    version: str
    description: str
    body: str
    source_hash: str
    curated: bool

    @property
    def generated_filename(self) -> str:
        return managed_filename(self.source_name)

    @property
    def agent_name(self) -> str:
        return managed_agent_name(self.source_name)


@dataclass(frozen=True)
class GeneratedAgent:
    source: AgentSource
    toml_text: str
    generated_hash: str
    overrides: dict[str, Any]


def list_source_files(plugin_root: Path) -> list[Path]:
    agents_dir = agent_sources_dir(plugin_root)
    files = sorted(agents_dir.glob("*.md"), key=lambda p: p.name)
    return [p for p in files if p.is_file()]


def load_agent_sources(plugin_root: Path) -> list[AgentSource]:
    curated = set(CURATED_SOURCE_NAMES)
    sources: list[AgentSource] = []
    for path in list_source_files(plugin_root):
        source_name = path.stem
        if source_name in EXCLUDED_SOURCE_NAMES:
            continue
        raw = path.read_text(encoding="utf-8")
        fields, body = parse_agent_markdown(raw, path=path)
        name = str(fields.get("name") or source_name).strip()
        if name != source_name:
            # Prefer filename as stable ID; warn via exception only on empty.
            name = source_name
        version = str(fields.get("version") or "0.0.0").strip().strip("\"'")
        description = str(fields.get("description") or "").strip()
        if not description:
            raise ValueError(f"{path}: missing required frontmatter field 'description'")
        sources.append(
            AgentSource(
                source_name=source_name,
                source_path=path.resolve(),
                relative_source_path=f"agents/{path.name}",
                version=version,
                description=description,
                body=body,
                source_hash=sha256_text(raw),
                curated=source_name in curated,
            )
        )
    return sources


def parse_agent_markdown(text: str, path: Path | None = None) -> tuple[dict[str, Any], str]:
    """Parse Claude agent Markdown with a purpose-built frontmatter reader."""
    label = str(path) if path else "<memory>"
    if not text.startswith("---"):
        raise ValueError(f"{label}: missing YAML frontmatter opening ---")
    # Allow optional BOM already stripped; require newline after opening fence.
    if text.startswith("---\n"):
        rest = text[4:]
    elif text.startswith("---\r\n"):
        rest = text[5:]
    else:
        raise ValueError(f"{label}: frontmatter must start with --- on its own line")

    # Find closing fence at beginning of a line.
    match = re.search(r"(?m)^---\s*$", rest)
    if not match:
        raise ValueError(f"{label}: missing YAML frontmatter closing ---")
    fm_text = rest[: match.start()]
    body = rest[match.end() :]
    if body.startswith("\r\n"):
        body = body[2:]
    elif body.startswith("\n"):
        body = body[1:]

    fields = parse_frontmatter_fields(fm_text)
    return fields, body


def parse_frontmatter_fields(fm_text: str) -> dict[str, Any]:
    """Parse the known subset of agent frontmatter fields without PyYAML."""
    lines = fm_text.splitlines()
    fields: dict[str, Any] = {}
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            i += 1
            continue
        if re.match(r"^\s", line):
            # Orphan indented line — skip (should be consumed by block handlers).
            i += 1
            continue

        m = re.match(r"^([A-Za-z0-9_-]+)\s*:\s*(.*)$", line)
        if not m:
            i += 1
            continue

        key, raw_val = m.group(1), m.group(2)
        raw_val_stripped = raw_val.strip()

        # Multiline block scalar: |, |-, |+, >, >-, >+
        if re.match(r"^[|>][+-]?\s*(?:#.*)?$", raw_val_stripped):
            style = raw_val_stripped[0]
            chomp = ""
            if len(raw_val_stripped) > 1 and raw_val_stripped[1] in "+-":
                chomp = raw_val_stripped[1]
            i += 1
            block_lines: list[str] = []
            # Determine indentation from first non-empty content line.
            indent: int | None = None
            while i < n:
                bl = lines[i]
                if bl.strip() == "":
                    block_lines.append("")
                    i += 1
                    continue
                leading = len(bl) - len(bl.lstrip(" "))
                if bl.startswith("\t"):
                    raise ValueError(f"tab indentation not supported in frontmatter key '{key}'")
                if indent is None:
                    if leading == 0:
                        break
                    indent = leading
                if leading < indent and bl.strip():
                    break
                block_lines.append(bl[indent:] if indent is not None else bl)
                i += 1
            # Trim trailing empty lines for |- style (default for |-)
            while block_lines and block_lines[-1] == "":
                block_lines.pop()
            if style == ">":
                # Folded: join non-empty lines with spaces, keep blank as paragraph break.
                paragraphs: list[str] = []
                current: list[str] = []
                for bl in block_lines:
                    if bl == "":
                        if current:
                            paragraphs.append(" ".join(current))
                            current = []
                    else:
                        current.append(bl)
                if current:
                    paragraphs.append(" ".join(current))
                value = "\n\n".join(paragraphs)
            else:
                value = "\n".join(block_lines)
            if chomp == "+":
                value = value + "\n"
            # chomp '-' or default for our purposes: no trailing newline required
            fields[key] = value
            continue

        # Empty value may start a list or nested map; we only need simple lists.
        if raw_val_stripped == "" or raw_val_stripped.startswith("#"):
            i += 1
            items: list[Any] = []
            saw_list = False
            while i < n:
                bl = lines[i]
                if bl.strip() == "" or bl.lstrip().startswith("#"):
                    i += 1
                    continue
                if not re.match(r"^\s", bl):
                    break
                lm = re.match(r"^\s+-\s+(.*)$", bl)
                if lm:
                    saw_list = True
                    items.append(_parse_scalar(lm.group(1).strip()))
                    i += 1
                    continue
                # Nested map line under empty key — skip for our purposes.
                if re.match(r"^\s+[A-Za-z0-9_-]+\s*:", bl):
                    i += 1
                    continue
                break
            fields[key] = items if saw_list else None
            continue

        # Inline list: [a, b]
        if raw_val_stripped.startswith("["):
            # May span multiple lines until closing ]
            collected = raw_val_stripped
            i += 1
            while collected.count("[") > collected.count("]") and i < n:
                collected += " " + lines[i].strip()
                i += 1
            fields[key] = _parse_flow_sequence(collected)
            continue

        fields[key] = _parse_scalar(raw_val_stripped)
        i += 1

    return fields


def _parse_scalar(raw: str) -> Any:
    if not raw:
        return ""
    # Strip trailing comments for unquoted scalars (not inside quotes).
    if raw[0] in "\"'":
        return _parse_quoted(raw)
    # Comment strip for plain scalars
    if " #" in raw:
        raw = raw.split(" #", 1)[0].rstrip()
    lower = raw.lower()
    if lower == "true":
        return True
    if lower == "false":
        return False
    if lower in {"null", "~"}:
        return None
    # Integers / versions stay as strings if dotted
    return raw


def _parse_quoted(raw: str) -> str:
    quote = raw[0]
    if quote not in "\"'":
        return raw
    # Handle simple single-line quoted strings; support \" and ''
    if quote == "'":
        # YAML single-quoted: '' is escaped quote
        if raw.endswith("'") and len(raw) >= 2:
            inner = raw[1:-1]
            return inner.replace("''", "'")
        return raw[1:]
    # Double-quoted
    out: list[str] = []
    i = 1
    while i < len(raw):
        ch = raw[i]
        if ch == "\\" and i + 1 < len(raw):
            nxt = raw[i + 1]
            escapes = {"n": "\n", "t": "\t", "r": "\r", "\\": "\\", '"': '"', "/": "/"}
            out.append(escapes.get(nxt, nxt))
            i += 2
            continue
        if ch == '"':
            break
        out.append(ch)
        i += 1
    return "".join(out)


def _parse_flow_sequence(raw: str) -> list[Any]:
    raw = raw.strip()
    if not (raw.startswith("[") and raw.endswith("]")):
        return [raw]
    inner = raw[1:-1].strip()
    if not inner:
        return []
    items: list[Any] = []
    buf: list[str] = []
    in_quote: str | None = None
    escape = False
    for ch in inner:
        if escape:
            buf.append(ch)
            escape = False
            continue
        if ch == "\\" and in_quote == '"':
            buf.append(ch)
            escape = True
            continue
        if in_quote:
            buf.append(ch)
            if ch == in_quote:
                in_quote = None
            continue
        if ch in "\"'":
            in_quote = ch
            buf.append(ch)
            continue
        if ch == ",":
            item = "".join(buf).strip()
            if item:
                items.append(_parse_scalar(item))
            buf = []
            continue
        buf.append(ch)
    item = "".join(buf).strip()
    if item:
        items.append(_parse_scalar(item))
    return items


def load_optional_overrides(plugin_root: Path, source_name: str) -> dict[str, Any]:
    """Load optional explicit Codex overrides for one agent.

    Supported locations (first match wins):
    - scripts/codex-agents/overrides/<source-name>.toml
    - scripts/codex-agents/overrides/<source-name>.json
    """
    base = plugin_root / "scripts" / "codex-agents" / "overrides"
    toml_path = base / f"{source_name}.toml"
    json_path = base / f"{source_name}.json"
    if toml_path.is_file():
        data = tomllib.loads(toml_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError(f"{toml_path}: override root must be a table")
        return data
    if json_path.is_file():
        data = json.loads(json_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError(f"{json_path}: override root must be an object")
        return data
    return {}


def render_toml_string(value: str) -> str:
    """Render arbitrary text as a TOML string value.

    Uses a single-line basic string when possible; otherwise a multi-line basic
    string. Handles bodies containing triple single/double quotes safely and
    preserves exact content (no forced trailing newline).
    """
    # Escape backslashes first, then quotes, so """ cannot terminate early.
    escaped = value.replace("\\", "\\\\")
    escaped = escaped.replace('"', '\\"')

    def _esc_ctrl(match: re.Match[str]) -> str:
        code = ord(match.group(0))
        return f"\\u{code:04x}"

    # Control characters except tab/newline/carriage-return must be escaped.
    escaped = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", _esc_ctrl, escaped)

    if "\n" not in value and "\r" not in value:
        return f'"{escaped}"'

    # Multi-line basic string: a newline immediately after the opening
    # delimiter is trimmed by TOML, so prefix with \n and do not add an extra
    # closing newline beyond what the source value already contains.
    return f'"""\n{escaped}"""'


def normalize_developer_instructions(text: str) -> str:
    """Strip trailing spaces/tabs at line ends only.

    Preserves line structure, internal spacing, and whether the text ends with
    a newline. Applied to generated ``developer_instructions`` so committed
    TOML passes ``git diff --check`` without mutating source agent hashes.
    """
    ends_with_newline = text.endswith("\n") or text.endswith("\r\n")
    lines = text.splitlines()
    cleaned = [line.rstrip(" \t") for line in lines]
    result = "\n".join(cleaned)
    if ends_with_newline:
        result += "\n"
    elif text == "":
        return ""
    return result


def render_agent_toml(source: AgentSource, overrides: dict[str, Any] | None = None) -> str:
    overrides = dict(overrides or {})
    # Never allow model override from Claude frontmatter mapping.
    overrides.pop("model", None)

    description = source.description
    if "description" in overrides and overrides["description"] is not None:
        description = str(overrides.pop("description"))

    name = source.agent_name
    if "name" in overrides and overrides["name"] is not None:
        name = str(overrides.pop("name"))

    developer_instructions = CODEX_COMPAT_PRELUDE + "\n" + source.body
    if not developer_instructions.endswith("\n"):
        developer_instructions += "\n"
    if "developer_instructions" in overrides and overrides["developer_instructions"] is not None:
        # Explicit full replacement only if provided as complete text.
        developer_instructions = str(overrides.pop("developer_instructions"))
        if not developer_instructions.endswith("\n"):
            developer_instructions += "\n"
    developer_instructions = normalize_developer_instructions(developer_instructions)

    # sandbox_mode only when explicitly present in overrides.
    sandbox_mode = overrides.pop("sandbox_mode", None)

    header_lines = [
        "# Generated by scripts/codex-agents/generate.py — DO NOT EDIT BY HAND",
        f"# source: {source.relative_source_path}",
        f"# source_version: {source.version}",
        f"# source_hash: {source.source_hash}",
        f"# generator_schema_version: {GENERATOR_SCHEMA_VERSION}",
        "",
        f"name = {render_toml_string(name)}",
        f"description = {render_toml_string(description)}",
        f"developer_instructions = {render_toml_string(developer_instructions)}",
    ]

    if sandbox_mode is not None:
        if not isinstance(sandbox_mode, str):
            raise ValueError(f"{source.source_name}: sandbox_mode override must be a string")
        header_lines.append(f"sandbox_mode = {render_toml_string(sandbox_mode)}")

    # Pass through a small allowlist of extra explicit Codex keys if present.
    allowed_extra = {
        "reasoning_effort",
        "nickname",
        "mcp_servers",
        "skills",
    }
    for key, value in overrides.items():
        if key not in allowed_extra:
            # Ignore unknown keys rather than inventing schema.
            continue
        if isinstance(value, str):
            header_lines.append(f"{key} = {render_toml_string(value)}")
        elif isinstance(value, bool):
            header_lines.append(f"{key} = {'true' if value else 'false'}")
        elif isinstance(value, (int, float)):
            header_lines.append(f"{key} = {value}")
        elif isinstance(value, list) and all(isinstance(x, str) for x in value):
            items = ", ".join(render_toml_string(x) for x in value)
            header_lines.append(f"{key} = [{items}]")

    text = "\n".join(header_lines) + "\n"
    # Validate immediately.
    parsed = tomllib.loads(text)
    for required in ("name", "description", "developer_instructions"):
        if required not in parsed:
            raise ValueError(f"{source.source_name}: generated TOML missing {required}")
    if "model" in parsed:
        raise ValueError(f"{source.source_name}: generated TOML must omit model")
    if not re.fullmatch(r"[a-z0-9_]+", str(parsed["name"])):
        raise ValueError(
            f"{source.source_name}: Codex agent name must use lowercase letters, "
            "digits, and underscores"
        )
    return text


def generate_all(plugin_root: Path) -> list[GeneratedAgent]:
    generated: list[GeneratedAgent] = []
    for source in load_agent_sources(plugin_root):
        overrides = load_optional_overrides(plugin_root, source.source_name)
        toml_text = render_agent_toml(source, overrides)
        generated.append(
            GeneratedAgent(
                source=source,
                toml_text=toml_text,
                generated_hash=sha256_text(toml_text),
                overrides=overrides,
            )
        )
    return generated


def build_manifest(generated: list[GeneratedAgent]) -> dict[str, Any]:
    agents = []
    for item in sorted(generated, key=lambda g: g.source.source_name):
        agents.append(
            {
                "source_name": item.source.source_name,
                "source_path": item.source.relative_source_path,
                "source_version": item.source.version,
                "source_hash": item.source.source_hash,
                "generated_file": item.source.generated_filename,
                "generated_hash": item.generated_hash,
                "agent_name": item.source.agent_name,
                "curated": item.source.curated,
                "default_install": item.source.curated,
            }
        )
    return {
        "schema_version": "1",
        "generator_schema_version": GENERATOR_SCHEMA_VERSION,
        "manager": "bopen-tools",
        "excluded": sorted(EXCLUDED_SOURCE_NAMES),
        "curated": list(CURATED_SOURCE_NAMES),
        "agents": agents,
    }


def manifest_json(manifest: dict[str, Any]) -> str:
    return json.dumps(manifest, indent=2, sort_keys=False) + "\n"


def write_generated_tree(plugin_root: Path, out_dir: Path) -> dict[str, Any]:
    generated = generate_all(plugin_root)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Remove stale managed files in out_dir that are no longer generated.
    expected = {g.source.generated_filename for g in generated}
    expected.add(MANIFEST_FILENAME)
    for path in sorted(out_dir.iterdir()):
        if not path.is_file():
            continue
        if path.name == MANIFEST_FILENAME:
            continue
        if is_managed_filename(path.name) and path.name not in expected:
            path.unlink()

    for item in generated:
        target = out_dir / item.source.generated_filename
        atomic_write_text(target, item.toml_text)

    manifest = build_manifest(generated)
    atomic_write_text(out_dir / MANIFEST_FILENAME, manifest_json(manifest))
    return manifest


def atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.tmp.{os.getpid()}")
    try:
        tmp.write_text(text, encoding="utf-8")
        os.replace(tmp, path)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass


def atomic_copy_file(src: Path, dest: Path) -> None:
    data = src.read_bytes()
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(f".{dest.name}.tmp.{os.getpid()}")
    try:
        tmp.write_bytes(data)
        os.replace(tmp, dest)
    finally:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass


def load_committed_manifest(agents_dir: Path) -> dict[str, Any]:
    path = agents_dir / MANIFEST_FILENAME
    if not path.is_file():
        raise FileNotFoundError(f"missing manifest: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def load_ownership(target_dir: Path) -> dict[str, Any]:
    path = target_dir / OWNERSHIP_FILENAME
    if not path.is_file():
        return {
            "schema_version": "1",
            "manager": "bopen-tools",
            "agents": {},
        }
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"{path}: ownership manifest must be an object")
    data.setdefault("schema_version", "1")
    data.setdefault("manager", "bopen-tools")
    data.setdefault("agents", {})
    if not isinstance(data["agents"], dict):
        raise ValueError(f"{path}: agents must be an object")
    return data


def write_ownership(target_dir: Path, ownership: dict[str, Any]) -> None:
    atomic_write_text(target_dir / OWNERSHIP_FILENAME, json.dumps(ownership, indent=2) + "\n")


def select_manifest_agents(manifest: dict[str, Any], all_agents: bool) -> list[dict[str, Any]]:
    agents = list(manifest.get("agents") or [])
    if all_agents:
        return agents
    curated = set(manifest.get("curated") or CURATED_SOURCE_NAMES)
    return [a for a in agents if a.get("source_name") in curated or a.get("default_install")]
