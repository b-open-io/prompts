#!/usr/bin/env python3
"""Deterministic contract checks for the Orchestra skill family."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def require(text: str, needle: str, source: str) -> None:
    if needle not in text:
        raise AssertionError(f"{source}: missing {needle!r}")


def main() -> None:
    dispatchers = {
        "orchestrator": "skills/orchestrator/SKILL.md",
        "wave-coordinator": "skills/wave-coordinator/SKILL.md",
        "software-factory": "skills/software-factory/SKILL.md",
        "deploy-agent-team": "skills/deploy-agent-team/SKILL.md",
        "visual-coordinator": "skills/visual-coordinator/SKILL.md",
    }
    for name, relative in dispatchers.items():
        text = read(relative)
        require(text, "coordinator", relative)
        require(text, "dispatch contract", relative)
        require(text, "provider", relative)
        require(text, "controller", relative)
        if len(text.splitlines()) > 275:
            raise AssertionError(f"{name}: entrypoint is no longer thin")

    advisor = read("skills/advisor/SKILL.md")
    require(advisor, "references/channels.md", "advisor")
    require(advisor, "dispatch contract", "advisor")

    workers = list((SKILLS / "coordinator" / "references" / "workers").glob("*.md"))
    for worker in workers:
        text = worker.read_text(encoding="utf-8")
        if "+      " in text:
            raise AssertionError(f"{worker}: malformed command continuation")

    canvas = read("skills/visual-coordinator/examples/graph-builder.html")
    for needle in (
        'if(HARNESS==="opencode") return "opencode"',
        '["grok","claude","codex","opencode"]',
        'if(n.lane==="opencode") return \'opencode run',
        "function shQuote(value)",
        'if(!n.model)',
        "controller:n.controller||null",
        "provider:n.provider||null",
        "disclosure:n.disclosure||null",
        "context:n.context||null",
        'if(HARNESS==="opencode") lines.push',
    ):
        require(canvas, needle, "visual canvas")

    grok_fallback = canvas.index('return "grok";')
    opencode_branch = canvas.index('if(HARNESS==="opencode") return "opencode"')
    if opencode_branch > grok_fallback:
        raise AssertionError("OpenCode host falls through to Grok")
    if 'modelsFor(hostLane())[0]||"grok-4.6"' in canvas:
        raise AssertionError("non-Grok hosts can inherit a Grok default model")
    if 'modelsFor(native)[0]||"grok-4.6"' in canvas:
        raise AssertionError("seed graph can give a non-Grok host a Grok model")

    emitted = read("skills/visual-coordinator/references/emitted-spec-format.md")
    for field in ("controller", "provider", "disclosure", "context"):
        require(emitted, field, "emitted spec")
    require(emitted, "**OpenCode**", "emitted spec")

    detector = read("skills/visual-coordinator/scripts/detect-harness.sh")
    require(detector, 'add_flat_agents("codex"', "harness detector")
    require(detector, 'add_flat_agents("opencode"', "harness detector")

    print("orchestra contract checks passed")


if __name__ == "__main__":
    main()
