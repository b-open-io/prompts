"""Behavior tests for the promo-video-pipeline spend gate."""

from __future__ import annotations

import json
import os
import shutil
import signal
import subprocess
import tempfile
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GATE = ROOT / "modules/creative/skills/promo-video-pipeline/scripts/gate-logger.sh"
INIT = {"type": "system", "subtype": "init", "model": "claude-opus-5-5", "mcp_servers": [], "skills": []}


def tool(command: str) -> dict:
    return {"type": "assistant", "message": {"content": [
        {"type": "tool_use", "name": "Bash", "input": {"command": command}}]}}


def wait(check, timeout: float = 10) -> bool:
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if check():
            return True
        time.sleep(0.1)
    return False


@unittest.skipUnless(shutil.which("jq") and shutil.which("setsid"), "needs jq and setsid")
class GateLoggerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.start()

    def tearDown(self) -> None:
        self.stop()

    def start(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.state = root / "st"
        self.state.mkdir()
        self.hf = self.state / "hf-api"
        self.hf.write_text("#!/bin/sh\nexit 0\n")
        self.hf.chmod(0o755)
        self.ledger = self.state / "ledger.jsonl"
        self.ledger.write_text("")
        self.key = self.state / "key"
        self.key.write_text("secret\n")
        self.dir = root / "gate"
        self.stream = root / "run.jsonl"
        self.stream.write_text("")
        self.gate = subprocess.Popen(
            ["bash", str(GATE), "--dir", str(self.dir), "--hf-api", str(self.hf), "--ledger",
             str(self.ledger), "--key", str(self.key), "--budget", "15", "--stream", str(self.stream)],
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, start_new_session=True,
        )
        self.assertTrue(wait(lambda: (self.dir / "ready").exists()), "gate never became ready")
        self.run_proc = subprocess.Popen(["sleep", "60"], start_new_session=True)
        (self.dir / "run.pid").write_text(f"{self.run_proc.pid}\n")

    def stop(self) -> None:
        for proc in (self.run_proc, self.gate):
            if proc.poll() is None:
                proc.kill()
            proc.wait(timeout=10)
        self.gate.stderr.close()
        self.tmp.cleanup()

    def emit(self, *events: dict) -> None:
        with self.stream.open("a") as f:
            for event in events:
                f.write(json.dumps(event) + "\n")

    def arm(self) -> None:
        self.emit(INIT)
        self.assertTrue(wait(lambda: (self.dir / "armed").exists()), "gate never armed")

    def finish(self) -> int:
        self.run_proc.terminate()
        self.run_proc.wait(timeout=10)
        return self.gate.wait(timeout=15)

    def test_similar_names_do_not_trip(self) -> None:
        self.arm()
        self.emit(tool("ls keyframes/ && cat keyed.txt monkey && cat ledger.jsonl.bak"))
        self.assertTrue(wait(lambda: "keyframes" in (self.dir / "gate.log").read_text()))
        self.assertFalse((self.dir / "tripped").exists())
        self.assertEqual(self.finish(), 0)

    def test_protected_path_tokens_trip(self) -> None:
        commands = (f"cat {self.key}", "cat key", "cat ./key", 'cat "key"', "tail st/ledger.jsonl",
                    f"cp x {self.state}/hf-api")
        for i, command in enumerate(commands):
            with self.subTest(command=command):
                if i:
                    self.stop()
                    self.start()
                self.arm()
                self.emit(tool(command))
                self.assertEqual(self.gate.wait(timeout=15), 3)
                self.assertIn("protected path", (self.dir / "tripped").read_text())
                self.assertIsNotNone(self.run_proc.wait(timeout=10))

    def test_signal_kills_the_run(self) -> None:
        self.arm()
        os.killpg(self.gate.pid, signal.SIGTERM)
        self.assertEqual(self.gate.wait(timeout=15), 3)
        self.assertFalse((self.dir / "armed").exists())
        self.assertIn("signal", (self.dir / "tripped").read_text())
        self.assertIsNotNone(self.run_proc.wait(timeout=10))


if __name__ == "__main__":
    unittest.main()
