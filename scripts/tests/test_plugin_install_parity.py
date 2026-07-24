from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))


def load_script():
    spec = importlib.util.spec_from_file_location(
        "check_plugin_install_parity",
        SCRIPTS / "check-plugin-install-parity.py",
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PARITY = load_script()


def fixture(root: Path, version: str, skills: tuple[str, ...]) -> None:
    for manifest in (".claude-plugin", ".codex-plugin"):
        path = root / manifest
        path.mkdir(parents=True)
        (path / "plugin.json").write_text(
            json.dumps({"name": "fixture", "version": version}),
            encoding="utf-8",
        )
    for name in skills:
        skill = root / "skills" / name
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text(
            f"---\nname: {name}\ndescription: {name}.\n---\nBody.\n",
            encoding="utf-8",
        )


class PluginInstallParityTests(unittest.TestCase):
    def test_matching_snapshots_pass(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source_root = root / "source"
            installed_root = root / "installed"
            fixture(source_root, "1.2.3", ("alpha", "beta"))
            fixture(installed_root, "1.2.3", ("alpha", "beta"))
            source = PARITY.snapshot("source", source_root)
            installed = PARITY.snapshot("installed", installed_root)
            self.assertEqual(PARITY.compare(source, installed), ([], []))

    def test_version_and_inventory_drift_are_reported(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source_root = root / "source"
            installed_root = root / "installed"
            fixture(source_root, "1.2.3", ("alpha", "beta"))
            fixture(installed_root, "1.2.2", ("alpha", "extra"))
            errors, warnings = PARITY.compare(
                PARITY.snapshot("source", source_root),
                PARITY.snapshot("installed", installed_root),
            )
        joined = "\n".join(errors)
        self.assertEqual(warnings, [])
        self.assertIn("version", joined)
        self.assertIn("missing skills: beta", joined)
        self.assertIn("extra skills: extra", joined)

    def test_latest_version_root_uses_semver_not_lexical_order(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            fixture(base / "1.1.9", "1.1.9", ("alpha",))
            fixture(base / "1.1.10", "1.1.10", ("alpha",))
            self.assertEqual(PARITY.latest_version_root(base).name, "1.1.10")


if __name__ == "__main__":
    unittest.main()
