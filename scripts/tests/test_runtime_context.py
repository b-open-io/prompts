from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DETECTOR = ROOT / "skills/runtime-context/scripts/detect.sh"


class RuntimeContextTests(unittest.TestCase):
    def detect(
        self,
        *,
        cwd: Path,
        path: str | None = None,
        extra: dict[str, str] | None = None,
    ) -> dict[str, object]:
        env = {
            "HOME": str(cwd / "home"),
            "PATH": path or os.environ.get("PATH", ""),
        }
        env.update(extra or {})
        for key in (
            "BOPEN_HOST_HARNESS",
            "CLAUDE_CODE",
            "CLAUDE_SESSION_ID",
            "CLAUDECODE",
            "CODEX_THREAD_ID",
            "CODEX_SESSION_ID",
            "VERCEL_SANDBOX_ID",
        ):
            if key not in (extra or {}):
                env.pop(key, None)
        result = subprocess.run(
            ["/bin/bash", str(DETECTOR)],
            cwd=cwd,
            env=env,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_explicit_harnesses_and_unknown_are_distinct_from_lanes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            cwd = Path(directory)
            for host in ("claude-code", "codex", "grok", "opencode", "local", "unknown"):
                report = self.detect(cwd=cwd, extra={"BOPEN_HOST_HARNESS": host})
                self.assertEqual(report["runtime"], host)
            report = self.detect(cwd=cwd, extra={"BOPEN_HOST_HARNESS": "spoofed"})
            self.assertEqual(report["runtime"], "unknown")

    def test_session_markers_conflicts_and_unknown_fallback(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            cwd = Path(directory)
            self.assertEqual(
                self.detect(cwd=cwd, extra={"CODEX_THREAD_ID": "thread"})["runtime"],
                "codex",
            )
            self.assertEqual(
                self.detect(cwd=cwd, extra={"CLAUDE_SESSION_ID": "session"})["runtime"],
                "claude-code",
            )
            report = self.detect(cwd=cwd, extra={"BOPEN_HOST_HARNESS": "invalid"})
            self.assertEqual(report["runtime"], "unknown")
            self.assertEqual(self.detect(cwd=cwd)["runtime"], "unknown")

    def test_sandbox_and_conflicting_markers(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            cwd = Path(directory)
            report = self.detect(cwd=cwd, extra={"VERCEL_SANDBOX_ID": "sbx-1"})
            self.assertEqual(report["runtime"], "sandbox")
            report = self.detect(
                cwd=cwd, extra={"CLAUDE_SESSION_ID": "session", "CODEX_SESSION_ID": "session"}
            )
            self.assertEqual(report["runtime"], "unknown")
            report = self.detect(
                cwd=cwd,
                extra={
                    "BOPEN_HOST_HARNESS": "grok",
                    "CODEX_SESSION_ID": "session",
                    "VERCEL_SANDBOX_ID": "sandbox",
                },
            )
            self.assertEqual(report["runtime"], "grok")

    def test_json_escapes_paths_and_values_and_does_not_fabricate_skill_tool(self) -> None:
        with tempfile.TemporaryDirectory(prefix='runtime-"\\') as directory:
            cwd = Path(directory)
            report = self.detect(
                cwd=cwd,
                extra={
                    "BOPEN_HOST_HARNESS": "codex",
                    "VERCEL_SANDBOX_ID": 'id"\\line\nend',
                },
            )
        self.assertEqual(report["runtime"], "codex")
        self.assertEqual(report["sandbox_id"], 'id"\\line\nend')
        self.assertEqual(Path(str(report["working_dir"])).resolve(), cwd.resolve())
        self.assertNotIn("has_skill_tool", report)

    def test_json_escapes_all_json_control_characters(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            cwd = Path(directory)
            value = "".join(chr(code) for code in range(1, 32))
            report = self.detect(cwd=cwd, extra={"VERCEL_SANDBOX_ID": value})
        self.assertEqual(report["sandbox_id"], value)

    def test_capabilities_follow_fixture_path_not_host_identity(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            cwd = Path(directory)
            bin_dir = cwd / "bin"
            bin_dir.mkdir()
            for name, target in (
                ("python3", sys.executable),
                ("find", "/usr/bin/find"),
                ("wc", "/usr/bin/wc"),
                ("tr", "/usr/bin/tr"),
            ):
                (bin_dir / name).symlink_to(target)
            report = self.detect(
                cwd=cwd,
                path=str(bin_dir),
                extra={"BOPEN_HOST_HARNESS": "codex"},
            )
        self.assertEqual(report["runtime"], "codex")
        capabilities = report["capabilities"]
        self.assertFalse(capabilities["bun"])
        self.assertFalse(capabilities["node"])
        self.assertFalse(capabilities["claude_cli"])
        self.assertFalse(capabilities["codex_cli"])


if __name__ == "__main__":
    unittest.main()
