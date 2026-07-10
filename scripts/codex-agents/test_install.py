#!/usr/bin/env python3
"""Automated tests for Codex agent installer safety contracts.

Covers:
1. Selection safety: install --all then curated preserves full roster
2. Force safety: --force quarantines unmanaged collision target-locally
3. Stale handling: removed-source unmodified → quarantine; modified remains
"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

# Allow `python3 scripts/codex-agents/test_install.py` from any cwd.
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from install import Summary, install_agents, uninstall_agents  # noqa: E402
from lib import (  # noqa: E402
    OWNERSHIP_FILENAME,
    TRASH_DIRNAME,
    atomic_write_text,
    discover_plugin_root,
    load_committed_manifest,
    load_ownership,
    select_manifest_agents,
    sha256_file,
    target_trash_dir,
)


def _plugin_and_source() -> tuple[Path, Path, dict]:
    plugin_root = discover_plugin_root(_HERE)
    source_dir = plugin_root / "codex" / "agents"
    if not source_dir.is_dir():
        raise RuntimeError(f"missing generated adapters: {source_dir}")
    manifest = load_committed_manifest(source_dir)
    return plugin_root, source_dir, manifest


class InstallSafetyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.plugin_root, self.source_dir, self.manifest = _plugin_and_source()
        self.tmp = tempfile.TemporaryDirectory(prefix="codex-agents-test-")
        self.target = Path(self.tmp.name) / "agents"
        self.target.mkdir(parents=True, exist_ok=True)
        self.full = select_manifest_agents(self.manifest, all_agents=True)
        self.curated = select_manifest_agents(self.manifest, all_agents=False)
        self.assertGreaterEqual(len(self.full), len(self.curated))
        self.assertGreater(len(self.curated), 0)
        # Need at least one non-curated agent for selection-safety coverage.
        self.assertGreater(
            len(self.full),
            len(self.curated),
            "fixture needs non-curated agents to prove full→curated preservation",
        )

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def _install(
        self,
        *,
        desired: list,
        all_agents: bool,
        force: bool = False,
        check: bool = False,
    ) -> tuple[int, Summary]:
        summary = Summary()
        code = install_agents(
            source_dir=self.source_dir,
            target_dir=self.target,
            desired=desired,
            full_roster=self.full,
            plugin_root=self.plugin_root,
            scope="custom",
            summary=summary,
            check=check,
            force=force,
            all_agents=all_agents,
        )
        return code, summary

    def test_full_then_curated_preserves_full_roster(self) -> None:
        """Item 1: curated install after --all must not drop valid agents."""
        code, summary = self._install(desired=self.full, all_agents=True)
        self.assertEqual(code, 0, msg=summary.errors)
        full_files = {a["generated_file"] for a in self.full}
        on_disk = {p.name for p in self.target.glob("bopen-*.toml")}
        self.assertEqual(on_disk, full_files)

        ownership_before = load_ownership(self.target)
        owned_before = set(ownership_before["agents"])
        self.assertEqual(owned_before, full_files)

        code2, summary2 = self._install(desired=self.curated, all_agents=False)
        self.assertEqual(code2, 0, msg=summary2.errors)
        self.assertEqual(summary2.quarantined, [])

        on_disk_after = {p.name for p in self.target.glob("bopen-*.toml")}
        self.assertEqual(
            on_disk_after,
            full_files,
            "curated install must leave non-curated full-roster files in place",
        )

        ownership_after = load_ownership(self.target)
        owned_after = set(ownership_after["agents"])
        self.assertEqual(
            owned_after,
            full_files,
            "ownership must retain still-valid non-curated managed agents",
        )
        # Non-curated files still exist with original content.
        non_curated = full_files - {a["generated_file"] for a in self.curated}
        self.assertTrue(non_curated)
        for name in non_curated:
            dest = self.target / name
            self.assertTrue(dest.is_file(), name)
            src = self.source_dir / name
            self.assertEqual(sha256_file(dest), sha256_file(src), name)

    def test_force_quarantines_unmanaged_collision_target_local(self) -> None:
        """Item 2+3: --force quarantines original under target-local trash."""
        sample = self.curated[0]
        filename = sample["generated_file"]
        dest = self.target / filename
        original_body = "# user unmanaged agent\nname = \"custom\"\n"
        dest.write_text(original_body, encoding="utf-8")

        # Without --force: refuse and leave file.
        code, summary = self._install(
            desired=[sample], all_agents=False, force=False
        )
        self.assertNotEqual(code, 0)
        self.assertIn(filename, summary.skipped)
        self.assertTrue(dest.is_file())
        self.assertEqual(dest.read_text(encoding="utf-8"), original_body)

        # With --force: quarantine then install managed adapter.
        code2, summary2 = self._install(
            desired=[sample], all_agents=False, force=True
        )
        self.assertEqual(code2, 0, msg=summary2.errors)
        self.assertIn(filename, summary2.updated)
        self.assertTrue(dest.is_file())
        self.assertEqual(sha256_file(dest), sha256_file(self.source_dir / filename))

        trash_root = self.target / TRASH_DIRNAME
        self.assertTrue(trash_root.is_dir(), "target-local trash must exist")
        # Nested non-TOML path; no top-level .toml under trash that Codex would
        # confuse with agents (agents dir discovery is flat *.toml).
        recovered = list(trash_root.rglob(filename))
        self.assertEqual(len(recovered), 1, recovered)
        self.assertEqual(
            recovered[0].read_text(encoding="utf-8"),
            original_body,
            "original unmanaged content must be recoverable from quarantine",
        )
        # Path is under .bopen-tools-trash/quarantine/...
        self.assertIn("quarantine", recovered[0].parts)
        self.assertTrue(str(recovered[0]).startswith(str(trash_root)))

    def test_force_quarantine_failure_aborts_without_overwrite(self) -> None:
        """If quarantine cannot be created, do not overwrite unmanaged file."""
        sample = self.curated[0]
        filename = sample["generated_file"]
        dest = self.target / filename
        original_body = "# do not destroy me\n"
        dest.write_text(original_body, encoding="utf-8")

        # Create a file where the trash directory should be, so mkdir fails.
        blocking = self.target / TRASH_DIRNAME
        blocking.write_text("not-a-directory", encoding="utf-8")

        code, summary = self._install(
            desired=[sample], all_agents=False, force=True
        )
        self.assertNotEqual(code, 0)
        self.assertIn(filename, summary.skipped)
        self.assertTrue(
            any("quarantine failed" in e for e in summary.errors),
            summary.errors,
        )
        self.assertEqual(dest.read_text(encoding="utf-8"), original_body)

    def test_stale_removed_source_unmodified_quarantined(self) -> None:
        """Item 3 + acceptance: removed-source unmodified → quarantine."""
        code, summary = self._install(desired=self.curated, all_agents=False)
        self.assertEqual(code, 0, msg=summary.errors)

        # Simulate a managed agent whose source left the full roster.
        ghost = "bopen-ghost-agent.toml"
        ghost_src_text = (
            'name = "bopen-ghost-agent"\n'
            'description = "ghost"\n'
            'developer_instructions = "x"\n'
        )
        ghost_path = self.target / ghost
        ghost_path.write_text(ghost_src_text, encoding="utf-8")
        ghost_hash = sha256_file(ghost_path)

        ownership = load_ownership(self.target)
        ownership["agents"][ghost] = {
            "hash": ghost_hash,
            "source_name": "ghost-agent",
            "source_version": "0.0.0",
            "source_hash": "sha256:dead",
            "generated_hash": ghost_hash,
            "agent_name": "bopen-ghost-agent",
        }
        atomic_write_text(
            self.target / OWNERSHIP_FILENAME,
            json.dumps(ownership, indent=2) + "\n",
        )

        # Re-run curated install; ghost is not in full roster → stale.
        code2, summary2 = self._install(desired=self.curated, all_agents=False)
        self.assertEqual(code2, 0, msg=summary2.errors)
        self.assertIn(ghost, summary2.quarantined)
        self.assertFalse(ghost_path.exists())
        recovered = list((self.target / TRASH_DIRNAME).rglob(ghost))
        self.assertEqual(len(recovered), 1)
        self.assertEqual(recovered[0].read_text(encoding="utf-8"), ghost_src_text)

        ownership_after = load_ownership(self.target)
        self.assertNotIn(ghost, ownership_after["agents"])

    def test_stale_removed_source_modified_remains(self) -> None:
        """Removed-source but user-modified managed file stays put."""
        code, summary = self._install(desired=self.curated, all_agents=False)
        self.assertEqual(code, 0, msg=summary.errors)

        ghost = "bopen-ghost-modified.toml"
        original = "original managed body\n"
        ghost_path = self.target / ghost
        ghost_path.write_text(original, encoding="utf-8")
        original_hash = sha256_file(ghost_path)

        ownership = load_ownership(self.target)
        ownership["agents"][ghost] = {
            "hash": original_hash,
            "source_name": "ghost-modified",
            "source_version": "0.0.0",
            "source_hash": "sha256:dead",
            "generated_hash": original_hash,
            "agent_name": "bopen-ghost-modified",
        }
        atomic_write_text(
            self.target / OWNERSHIP_FILENAME,
            json.dumps(ownership, indent=2) + "\n",
        )

        # User edits after install record.
        modified = "user modified content — keep me\n"
        ghost_path.write_text(modified, encoding="utf-8")

        code2, summary2 = self._install(desired=self.curated, all_agents=False)
        self.assertEqual(code2, 0, msg=summary2.errors)
        self.assertNotIn(ghost, summary2.quarantined)
        self.assertIn(ghost, summary2.skipped)
        self.assertTrue(ghost_path.is_file())
        self.assertEqual(ghost_path.read_text(encoding="utf-8"), modified)
        ownership_after = load_ownership(self.target)
        self.assertIn(ghost, ownership_after["agents"])

    def test_target_trash_dir_is_target_local(self) -> None:
        trash = target_trash_dir(self.target)
        self.assertTrue(str(trash).startswith(str(self.target.resolve())))
        self.assertEqual(trash.name, "quarantine")
        self.assertIn(TRASH_DIRNAME, trash.parts)

    def test_uninstall_uses_target_local_quarantine(self) -> None:
        code, summary = self._install(desired=self.curated[:1], all_agents=False)
        self.assertEqual(code, 0, msg=summary.errors)
        filename = self.curated[0]["generated_file"]
        self.assertTrue((self.target / filename).is_file())

        u_summary = Summary()
        u_code = uninstall_agents(
            target_dir=self.target, summary=u_summary, check=False
        )
        self.assertEqual(u_code, 0)
        self.assertIn(filename, u_summary.quarantined)
        self.assertFalse((self.target / filename).exists())
        recovered = list((self.target / TRASH_DIRNAME).rglob(filename))
        self.assertEqual(len(recovered), 1)


if __name__ == "__main__":
    unittest.main()
