#!/usr/bin/env python3
"""Validate a semantic UI-audio event map against an existing theme.

The auditor is deliberately dependency-free so it can run in any application
repository before audio generation or integration work begins.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


COVERAGE_AREAS = (
    "routes",
    "overlays",
    "async",
    "auth",
    "payment",
    "blockchain",
    "keyboard",
    "gamepad",
)


@dataclass(frozen=True)
class Finding:
    severity: str
    code: str
    location: str
    message: str


class Audit:
    def __init__(self, event_map_path: Path, theme_path: Path):
        self.event_map_path = event_map_path.resolve()
        self.theme_path = theme_path.resolve()
        self.findings: list[Finding] = []
        self.event_map: dict[str, Any] = {}
        self.theme: dict[str, Any] = {}
        self.interaction_count = 0
        self.sounded_count = 0
        self.silent_count = 0
        self.unused_count = 0

    def add(self, severity: str, code: str, location: str, message: str) -> None:
        self.findings.append(Finding(severity, code, location, message))

    def error(self, code: str, location: str, message: str) -> None:
        self.add("error", code, location, message)

    def info(self, code: str, location: str, message: str) -> None:
        self.add("info", code, location, message)

    def load_json(self, path: Path, label: str) -> dict[str, Any]:
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            self.error("file-not-found", label, f"File does not exist: {path}")
            return {}
        except (OSError, UnicodeError) as exc:
            self.error("file-unreadable", label, f"Could not read {path}: {exc}")
            return {}
        except json.JSONDecodeError as exc:
            self.error(
                "invalid-json",
                label,
                f"Invalid JSON in {path} at line {exc.lineno}, column {exc.colno}: {exc.msg}",
            )
            return {}
        if not isinstance(value, dict):
            self.error("invalid-root", label, "The JSON root must be an object.")
            return {}
        return value

    def run(self) -> dict[str, Any]:
        self.event_map = self.load_json(self.event_map_path, "event-map")
        self.theme = self.load_json(self.theme_path, "theme")
        if self.event_map:
            self.validate_event_map_shape()
        theme_sounds = self.validate_theme()
        referenced = self.validate_interactions(theme_sounds)
        self.report_unused_slots(theme_sounds, referenced)
        return self.result()

    def validate_event_map_shape(self) -> None:
        if self.event_map.get("schema_version") != 1:
            self.error(
                "unsupported-schema",
                "schema_version",
                "schema_version must be 1.",
            )

        app = self.event_map.get("app")
        if not isinstance(app, dict) or not _text(app.get("name")):
            self.error("missing-app-name", "app.name", "Record the audited application name.")

        coverage = self.event_map.get("coverage")
        if not isinstance(coverage, dict):
            self.error(
                "missing-coverage",
                "coverage",
                "Coverage must consider routes, overlays, async, auth, payment, "
                "blockchain, keyboard, and gamepad interactions.",
            )
            return

        for area in COVERAGE_AREAS:
            location = f"coverage.{area}"
            entry = coverage.get(area)
            if not isinstance(entry, dict):
                self.error("missing-coverage-area", location, f"Audit coverage for {area}.")
                continue
            status = entry.get("status")
            if status not in ("reviewed", "not_applicable"):
                self.error(
                    "invalid-coverage-status",
                    f"{location}.status",
                    "Status must be 'reviewed' or 'not_applicable'.",
                )
                continue
            items = entry.get("items")
            if status == "reviewed":
                if not isinstance(items, list):
                    self.error(
                        "missing-inventory",
                        f"{location}.items",
                        "A reviewed area must include its inventory (an empty list is allowed with a reason).",
                    )
                elif not items and not _text(entry.get("reason")):
                    self.error(
                        "unexplained-empty-inventory",
                        location,
                        "Explain why this reviewed area has no inventory items.",
                    )
            elif not _text(entry.get("reason")):
                self.error(
                    "missing-not-applicable-reason",
                    f"{location}.reason",
                    "Explain why this interaction area is not applicable.",
                )

    def validate_theme(self) -> dict[str, Any]:
        if not self.theme:
            return {}
        sounds = self.theme.get("sounds")
        if not isinstance(sounds, dict):
            self.error("invalid-theme-sounds", "theme.sounds", "theme.json must contain a sounds object.")
            return {}

        for name, config in sounds.items():
            location = f"theme.sounds.{name}"
            if not _text(name):
                self.error("invalid-theme-slot", location, "Theme sound names must be non-empty strings.")
                continue
            if not isinstance(config, dict):
                self.error("invalid-theme-slot", location, "Theme sound configuration must be an object.")
                continue
            file_value = config.get("file")
            if not _text(file_value):
                self.error("missing-theme-file", f"{location}.file", "Theme slot must name an audio file.")
                continue
            asset_path = Path(file_value)
            if not asset_path.is_absolute():
                asset_path = self.theme_path.parent / asset_path
            if not asset_path.is_file():
                self.error(
                    "missing-asset",
                    f"{location}.file",
                    f"Audio asset does not exist: {asset_path.resolve()}",
                )
        return sounds

    def validate_interactions(self, theme_sounds: dict[str, Any]) -> set[str]:
        if not self.event_map:
            return set()
        interactions = self.event_map.get("interactions")
        if not isinstance(interactions, list):
            self.error(
                "invalid-interactions",
                "interactions",
                "interactions must be an array of semantic interaction records.",
            )
            return set()

        self.interaction_count = len(interactions)
        referenced: set[str] = set()
        seen_ids: set[str] = set()
        app_root = self.resolve_app_root()

        for index, interaction in enumerate(interactions):
            base = f"interactions[{index}]"
            if not isinstance(interaction, dict):
                self.error("invalid-interaction", base, "Interaction must be an object.")
                continue

            interaction_id = interaction.get("id")
            if not _text(interaction_id):
                self.error("missing-interaction-id", f"{base}.id", "Interaction id is required.")
            elif interaction_id in seen_ids:
                self.error("duplicate-interaction-id", f"{base}.id", f"Duplicate id: {interaction_id}")
            else:
                seen_ids.add(interaction_id)

            self.validate_domains(interaction.get("domains"), f"{base}.domains")
            self.validate_decision(interaction.get("decision"), base, theme_sounds, referenced)
            self.validate_source_evidence(interaction.get("source_evidence"), base, app_root)
            self.validate_browser_evidence(interaction.get("browser_evidence"), base)
            self.validate_visual_alternative(interaction.get("visual_alternative"), base)
            self.validate_repetition(interaction.get("repetition"), base)

        return referenced

    def resolve_app_root(self) -> Path:
        app = self.event_map.get("app")
        root_value = app.get("root", ".") if isinstance(app, dict) else "."
        if not _text(root_value):
            self.error("invalid-app-root", "app.root", "app.root must be a path string.")
            root_value = "."
        root = Path(root_value)
        if not root.is_absolute():
            root = self.event_map_path.parent / root
        return root.resolve()

    def validate_domains(self, domains: Any, location: str) -> None:
        if not isinstance(domains, list) or not domains:
            self.error("missing-domains", location, "Assign at least one audited coverage domain.")
            return
        for domain in domains:
            if domain not in COVERAGE_AREAS:
                self.error(
                    "unknown-domain",
                    location,
                    f"Unknown domain {domain!r}; expected one of {', '.join(COVERAGE_AREAS)}.",
                )

    def validate_decision(
        self,
        decision: Any,
        base: str,
        theme_sounds: dict[str, Any],
        referenced: set[str],
    ) -> None:
        location = f"{base}.decision"
        if not isinstance(decision, dict):
            self.error(
                "missing-decision",
                location,
                "Map the interaction to a sound or document intentional silence.",
            )
            return
        decision_type = decision.get("type")
        if decision_type == "sound":
            self.sounded_count += 1
            sound = decision.get("sound")
            if not _text(sound):
                self.error("missing-sound", f"{location}.sound", "A sound decision must name a theme slot.")
            elif sound not in theme_sounds:
                self.error(
                    "unknown-sound",
                    f"{location}.sound",
                    f"Sound {sound!r} is not defined in theme.json.",
                )
            else:
                referenced.add(sound)
        elif decision_type == "silence":
            self.silent_count += 1
            if not _text(decision.get("reason")):
                self.error(
                    "missing-silence-reason",
                    f"{location}.reason",
                    "Intentional silence requires a reason.",
                )
        else:
            self.error(
                "invalid-decision",
                f"{location}.type",
                "Decision type must be 'sound' or 'silence'.",
            )

    def validate_source_evidence(self, evidence: Any, base: str, app_root: Path) -> None:
        location = f"{base}.source_evidence"
        if not isinstance(evidence, list) or not evidence:
            self.error("missing-source-evidence", location, "Record at least one source-code observation.")
            return
        for index, item in enumerate(evidence):
            item_location = f"{location}[{index}]"
            if not isinstance(item, dict) or not _text(item.get("path")):
                self.error("invalid-source-evidence", item_location, "Source evidence requires a path.")
                continue
            source_path = Path(item["path"])
            if not source_path.is_absolute():
                source_path = app_root / source_path
            if not source_path.is_file():
                self.error(
                    "missing-source-path",
                    f"{item_location}.path",
                    f"Evidence source does not exist: {source_path.resolve()}",
                )
            line = item.get("line")
            if line is not None and (not isinstance(line, int) or isinstance(line, bool) or line < 1):
                self.error("invalid-source-line", f"{item_location}.line", "Line must be a positive integer.")
            if not _text(item.get("observation")):
                self.error(
                    "missing-source-observation",
                    f"{item_location}.observation",
                    "Explain what the source proves about this interaction.",
                )

    def validate_browser_evidence(self, evidence: Any, base: str) -> None:
        location = f"{base}.browser_evidence"
        if not isinstance(evidence, list) or not evidence:
            self.error("missing-browser-evidence", location, "Record at least one browser verification.")
            return
        for index, item in enumerate(evidence):
            item_location = f"{location}[{index}]"
            if not isinstance(item, dict):
                self.error("invalid-browser-evidence", item_location, "Browser evidence must be an object.")
                continue
            if not _text(item.get("url")):
                self.error("missing-browser-url", f"{item_location}.url", "Record the tested URL or route.")
            steps = item.get("steps")
            if not isinstance(steps, list) or not steps or not all(_text(step) for step in steps):
                self.error("missing-browser-steps", f"{item_location}.steps", "Record non-empty reproduction steps.")
            if not _text(item.get("observation")):
                self.error(
                    "missing-browser-observation",
                    f"{item_location}.observation",
                    "Record what was visibly and audibly observed.",
                )
            if item.get("result") != "pass":
                self.error(
                    "browser-verification-failed",
                    f"{item_location}.result",
                    "Browser verification must pass before the wiring audit is complete.",
                )

    def validate_visual_alternative(self, alternative: Any, base: str) -> None:
        location = f"{base}.visual_alternative"
        if not isinstance(alternative, dict):
            self.error(
                "missing-visual-alternative",
                location,
                "Document the visible or non-audio equivalent for the interaction.",
            )
            return
        if alternative.get("verified") is not True:
            self.error(
                "unverified-visual-alternative",
                f"{location}.verified",
                "The visual/non-audio equivalent must be verified.",
            )
        if not _text(alternative.get("description")):
            self.error(
                "missing-visual-description",
                f"{location}.description",
                "Describe the visible or non-audio feedback.",
            )

    def validate_repetition(self, repetition: Any, base: str) -> None:
        location = f"{base}.repetition"
        if not isinstance(repetition, dict):
            self.error(
                "missing-repetition-policy",
                location,
                "Document how repeated or rapid triggers are handled.",
            )
            return
        if not _text(repetition.get("policy")):
            self.error("missing-repetition-policy", f"{location}.policy", "Name the repetition policy.")
        if not _text(repetition.get("details")):
            self.error(
                "missing-repetition-details",
                f"{location}.details",
                "Describe throttle, dedupe, once-per-action, or why unrestricted repeat is safe.",
            )
        if repetition.get("verified") is not True:
            self.error(
                "unverified-repetition-policy",
                f"{location}.verified",
                "Verify the repetition policy in the browser.",
            )

    def report_unused_slots(self, theme_sounds: dict[str, Any], referenced: set[str]) -> None:
        if not self.event_map or not self.theme:
            return
        unused = sorted(set(theme_sounds) - referenced)
        self.unused_count = len(unused)
        for sound in unused:
            self.info(
                "unused-theme-slot",
                f"theme.sounds.{sound}",
                f"Theme slot {sound!r} is not mapped. This is allowed; do not force a use without a semantic need.",
            )

    def result(self) -> dict[str, Any]:
        error_count = sum(finding.severity == "error" for finding in self.findings)
        info_count = sum(finding.severity == "info" for finding in self.findings)
        return {
            "valid": error_count == 0,
            "event_map": str(self.event_map_path),
            "theme": str(self.theme_path),
            "summary": {
                "interactions": self.interaction_count,
                "sounded": self.sounded_count,
                "intentional_silence": self.silent_count,
                "unused_theme_slots": self.unused_count,
                "errors": error_count,
                "info": info_count,
            },
            "findings": [asdict(finding) for finding in self.findings],
        }


def _text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def render_text(result: dict[str, Any]) -> str:
    summary = result["summary"]
    lines = [
        "UI audio wiring audit",
        f"Event map: {result['event_map']}",
        f"Theme:     {result['theme']}",
        "",
        (
            f"Interactions: {summary['interactions']} "
            f"({summary['sounded']} sounded, "
            f"{summary['intentional_silence']} intentional silence)"
        ),
        f"Unused theme slots: {summary['unused_theme_slots']} (allowed)",
        f"Errors: {summary['errors']}",
    ]
    if result["findings"]:
        lines.append("")
        lines.append("Findings:")
        for finding in result["findings"]:
            lines.append(
                f"  {finding['severity'].upper():5} [{finding['code']}] "
                f"{finding['location']}: {finding['message']}"
            )
    lines.append("")
    lines.append("PASS: audit is complete" if result["valid"] else "FAIL: fix audit errors")
    return "\n".join(lines)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit semantic UI-audio wiring against a generated theme."
    )
    parser.add_argument("event_map", nargs="?", type=Path, help="Path to the event-map JSON file")
    parser.add_argument("--event-map", dest="event_map_option", type=Path, help="Path to the event-map JSON file")
    parser.add_argument("--theme", required=True, type=Path, help="Path to theme.json")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON")
    args = parser.parse_args(argv)
    if args.event_map and args.event_map_option:
        parser.error("provide the event map positionally or with --event-map, not both")
    args.event_map = args.event_map_option or args.event_map
    if args.event_map is None:
        parser.error("an event map is required")
    return args


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    result = Audit(args.event_map, args.theme).run()
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(render_text(result))
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    sys.exit(main())
