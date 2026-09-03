from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any


SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))


def load_script(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / filename)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


EXTRACTION = load_script("check_plugin_extraction", "check-plugin-extraction.py")


def run_git(cwd: Path, *args: str) -> None:
    command = [
        "git",
        "-c",
        "user.name=test",
        "-c",
        "user.email=test@example.com",
        "-c",
        "commit.gpgsign=false",
        *args,
    ]
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        raise AssertionError(f"git {args} failed: {result.stderr}")


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def write_marketplace(root: Path, entries: list[tuple[str, str]]) -> None:
    write_json(
        root / ".agents" / "plugins" / "marketplace.json",
        {
            "name": "fixture",
            "plugins": [
                {"name": name, "source": {"source": "local", "path": path}}
                for name, path in entries
            ],
        },
    )


def write_plugin_manifest(root: Path, name: str) -> None:
    write_json(
        root / "modules" / name / ".claude-plugin" / "plugin.json",
        {"name": name, "version": "0.0.1"},
    )


def commit_repo(root: Path) -> None:
    run_git(root, "init")
    run_git(root, "add", "-A")
    run_git(root, "commit", "-m", "fixture")


def write_skill(path: Path, body: str = "# skill\n") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")


def dangling_vendored_repo(root: Path) -> None:
    write_marketplace(root, [("core", "./"), ("mod", "./modules/mod")])
    write_plugin_manifest(root, "mod")
    write_skill(root / ".agents" / "skills" / "vendored" / "SKILL.md")
    link = root / "modules" / "mod" / "skills" / "vendored"
    link.parent.mkdir(parents=True, exist_ok=True)
    os.symlink("../../../.agents/skills/vendored", link)
    commit_repo(root)


class PluginExtractionTests(unittest.TestCase):
    def invoke(
        self, root: Path, extra: list[str] | None = None
    ) -> tuple[int, dict[str, Any], str]:
        previous = EXTRACTION.ROOT
        EXTRACTION.ROOT = root
        output = root.parent / f"{root.name}-report.json"
        try:
            argv = list(extra or [])
            argv.extend(["--output", str(output)])
            from io import StringIO
            from contextlib import redirect_stdout

            buf = StringIO()
            with redirect_stdout(buf):
                code = EXTRACTION.main(argv)
            report = json.loads(output.read_text(encoding="utf-8"))
            return code, report, buf.getvalue()
        finally:
            EXTRACTION.ROOT = previous
            if output.exists():
                output.unlink()

    def plugin(self, report: dict[str, Any], name: str) -> dict[str, Any]:
        for entry in report["plugins"]:
            if entry["name"] == name:
                return entry
        self.fail(f"plugin {name!r} missing from report")

    def test_working_tree_dangling_vendored_symlink_fails_mod(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "repo"
            root.mkdir()
            dangling_vendored_repo(root)
            code, report, stdout = self.invoke(root)
        self.assertEqual(code, 1)
        self.assertFalse(report["passed"])
        self.assertEqual(self.plugin(report, "core")["problems"], [])
        mod = self.plugin(report, "mod")
        self.assertEqual(len(mod["problems"]), 1)
        problem = mod["problems"][0]
        self.assertIn(problem["kind"], ("dangling-symlink", "escaping-symlink"))
        self.assertEqual(problem["path"], "skills/vendored")
        self.assertIn("skills/vendored", stdout)

    def test_module_local_vendored_symlink_passes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "repo"
            root.mkdir()
            dangling_vendored_repo(root)
            link = root / "modules" / "mod" / "skills" / "vendored"
            link.unlink()
            # One .. from skills/ is the plugin root, matching modules/mod/.agents.
            os.symlink("../.agents/skills/vendored", link)
            write_skill(
                root / "modules" / "mod" / ".agents" / "skills" / "vendored" / "SKILL.md"
            )
            code, report, _stdout = self.invoke(root)
        self.assertEqual(code, 0)
        self.assertTrue(report["passed"])
        self.assertEqual(self.plugin(report, "core")["problems"], [])
        mod = self.plugin(report, "mod")
        self.assertEqual(mod["problems"], [])
        self.assertEqual(mod["symlink_count"], 1)

    def test_missing_skill_md_is_unreadable_skill(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "repo"
            root.mkdir()
            write_marketplace(root, [("mod", "./modules/mod")])
            write_plugin_manifest(root, "mod")
            keep = root / "modules" / "mod" / "skills" / "empty" / ".keep"
            keep.parent.mkdir(parents=True)
            keep.write_text("keep\n", encoding="utf-8")
            commit_repo(root)
            code, report, stdout = self.invoke(root)
        self.assertEqual(code, 1)
        problems = self.plugin(report, "mod")["problems"]
        self.assertTrue(
            any(
                item["kind"] == "unreadable-skill" and item["path"] == "skills/empty"
                for item in problems
            ),
            problems,
        )
        self.assertIn("unreadable-skill", stdout)

    def test_ref_head_matches_working_tree_for_dangling_symlink(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "repo"
            root.mkdir()
            dangling_vendored_repo(root)
            working_code, working_report, _working_out = self.invoke(root)
            ref_code, ref_report, _ref_out = self.invoke(root, ["--ref", "HEAD"])
        self.assertEqual(working_code, 1)
        self.assertEqual(ref_code, 1)
        self.assertEqual(
            self.plugin(working_report, "mod")["problems"],
            self.plugin(ref_report, "mod")["problems"],
        )
        self.assertEqual(ref_report["ref"], "HEAD")

    def test_plugin_flag_restricts_to_named_plugin(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "repo"
            root.mkdir()
            dangling_vendored_repo(root)
            code, report, stdout = self.invoke(root, ["--plugin", "mod"])
        self.assertEqual(code, 1)
        names = [entry["name"] for entry in report["plugins"]]
        self.assertEqual(names, ["mod"])
        self.assertNotIn("core", stdout)

    def test_unregistered_module_is_reported(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "repo"
            root.mkdir()
            write_marketplace(root, [("core", "./")])
            write_plugin_manifest(root, "orphan")
            write_json(
                root / "modules" / "orphan" / ".claude-plugin" / "plugin.json",
                {"name": "orphan", "version": "0.0.1"},
            )
            (root / "README").write_text("core\n", encoding="utf-8")
            commit_repo(root)
            code, report, stdout = self.invoke(root)
        self.assertEqual(code, 1)
        orphan = self.plugin(report, "orphan")
        self.assertEqual(orphan["path"], "modules/orphan")
        self.assertEqual(
            orphan["problems"],
            [{"kind": "unregistered-module", "path": "modules/orphan"}],
        )
        self.assertIn("unregistered-module", stdout)


if __name__ == "__main__":
    unittest.main()
