#!/usr/bin/env python3
"""The promo launcher in SKILL.md confines the headless run and refuses an exposed key."""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKILL = ROOT / "modules/creative/skills/promo-video-pipeline/SKILL.md"


def launcher() -> str:
    blocks = re.findall(r"```bash\n(.*?)```", SKILL.read_text(), re.S)
    return next(b for b in blocks if b.startswith("set -euo pipefail"))


def part(start: str, end: str) -> str:
    text = launcher()
    lo = text.index(start)
    return text[lo:text.index(end, lo) + len(end)]


class LauncherTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.state = self.dir / "home/.hf-api"
        self.work = self.dir / "work"
        self.state.mkdir(parents=True)
        self.work.mkdir()
        self.state.chmod(0o700)
        (self.state / "key").write_text("id:secret\n")
        (self.state / "key").chmod(0o600)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def run_part(self, script: str, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
        prelude = 'set -euo pipefail\nno_run() { echo "$*; no run" >&2; exit 1; }\n'
        return subprocess.run(
            ["bash", "-c", prelude + script],
            cwd=cwd or self.work, text=True, capture_output=True,
            env={**os.environ, "HF_STATE": str(self.state)},
        )

    def exposure(self, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
        perm = re.search(r"^perm\(\).*$", launcher(), re.M)
        assert perm
        return self.run_part(perm.group(0) + "\n" + part("# Refuse wherever", "run-settings.json\"\n"), cwd)

    def test_launcher_parses(self) -> None:
        done = subprocess.run(["bash", "-n"], input=launcher(), text=True, capture_output=True)
        self.assertEqual(done.returncode, 0, done.stderr)

    def test_settings_confine_the_run(self) -> None:
        done = self.run_part("wd=$(pwd -P)\n" + part("jq -n --arg wd", 'confine the run"'))
        self.assertEqual(done.returncode, 0, done.stderr)
        cfg = json.loads((self.work / "run-settings.json").read_text())
        box = cfg["sandbox"]
        self.assertTrue(box["enabled"] and box["failIfUnavailable"])
        self.assertFalse(box["allowUnsandboxedCommands"])
        self.assertFalse(box["autoAllowBashIfSandboxed"])
        self.assertEqual(box["excludedCommands"], ["hf-api *"])
        self.assertEqual(box["network"], {"allowedDomains": [], "strictAllowlist": True})
        self.assertIn("~/.hf-api", box["filesystem"]["denyRead"])
        self.assertIn("~/.hf-api", box["filesystem"]["denyWrite"])
        self.assertEqual(cfg["permissions"]["defaultMode"], "dontAsk")
        self.assertIn("Read(~/.hf-api/**)", cfg["permissions"]["deny"])
        self.assertIn("Edit(~/.hf-api/**)", cfg["permissions"]["deny"])

    def test_run_loads_only_the_run_settings(self) -> None:
        text = launcher()
        self.assertIn('--setting-sources "" --settings ./run-settings.json', text)
        self.assertIn("--permission-mode dontAsk", text)
        self.assertNotIn("Bash(*)", text)

    def test_exposed_key_refuses(self) -> None:
        self.assertEqual(self.exposure().returncode, 0, self.exposure().stderr)
        (self.state / "key").chmod(0o644)
        done = self.exposure()
        self.assertNotEqual(done.returncode, 0)
        self.assertIn("mode 600 or 400", done.stderr)

    def test_open_state_dir_refuses(self) -> None:
        self.state.chmod(0o755)
        self.assertIn("must be mode 700", self.exposure().stderr)

    def test_state_inside_work_dir_refuses(self) -> None:
        self.assertIn("inside the working directory", self.exposure(self.dir).stderr)

    def detach(self, keep: tuple[str, ...]) -> subprocess.CompletedProcess[str]:
        """Start `sleep` through DETACH with only `keep` (plus basics) on PATH."""
        bin_dir = self.dir / ("bin-" + "-".join(keep or ("none",)))
        bin_dir.mkdir()
        for name in ("bash", "sleep", "ps", "tr", "kill", *keep):
            found = shutil.which(name)
            if found:
                (bin_dir / name).symlink_to(found)
        block = part("# Starts a command as the leader", 'own session"; fi\n')
        script = block + '"${DETACH[@]}" sleep 30 &\npid=$!\nsleep 0.5\n' \
            'sid=$(ps -o sid= -p "$pid" | tr -d " ")\necho "$pid $sid"\nkill "$pid"\n'
        return subprocess.run([str(bin_dir / "bash"), "-c", 'set -euo pipefail\nno_run() { echo "$*; no run" >&2; exit 1; }\n' + script],
                              cwd=self.work, text=True, capture_output=True, env={"PATH": str(bin_dir)})

    def test_detach_falls_back_without_setsid(self) -> None:
        for keep in (("setsid",), ("perl",), ("python3",)):
            if not shutil.which(keep[0]):
                continue
            with self.subTest(keep=keep):
                done = self.detach(keep)
                self.assertEqual(done.returncode, 0, done.stderr)
                pid, sid = done.stdout.split()
                self.assertEqual(pid, sid, "the started command must lead its own session with the PID the launcher records")

    def test_detach_refuses_without_any_way_to_setsid(self) -> None:
        done = self.detach(())
        self.assertNotEqual(done.returncode, 0)
        self.assertIn("setsid, perl, or python3 is needed", done.stderr)

    def test_project_settings_refuse(self) -> None:
        (self.work / ".claude").mkdir()
        self.assertIn("remove ./.claude", self.exposure().stderr)


if __name__ == "__main__":
    unittest.main()
