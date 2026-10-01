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
SCRIPTS = ROOT / "modules/creative/skills/promo-video-pipeline/scripts"
GATE = SCRIPTS / "gate-logger.sh"
# BSD userland (macOS) rejects `head -c 0` and has no `realpath -m`.
BSD_HEAD = """#!/usr/bin/env bash
for ((i = 1; i <= $#; i++)); do
  if [[ ${!i} == -c ]]; then j=$((i + 1)); [[ ${!j} == 0 ]] && { echo "head: illegal byte count -- 0" >&2; exit 1; }; fi
done
exec /usr/bin/head "$@"
"""
BSD_REALPATH = """#!/usr/bin/env bash
[[ " $* " == *" -m "* ]] && { echo "realpath: illegal option -- m" >&2; exit 1; }
exec /usr/bin/realpath "$@"
"""
INIT = {"type": "system", "subtype": "init", "model": "claude-opus-5-5", "mcp_servers": [], "skills": []}


def tool(command: str, model: str = "claude-opus-5-5") -> dict:
    return {"type": "assistant", "message": {"model": model, "content": [
        {"type": "tool_use", "name": "Bash", "input": {"command": command}}]}}


def wait(check, timeout: float = 10) -> bool:
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if check():
            return True
        time.sleep(0.1)
    return False


@unittest.skipUnless(shutil.which("jq"), "needs jq")
class GateLoggerTest(unittest.TestCase):
    path = os.environ["PATH"]

    def setUp(self) -> None:
        self.start()

    def tearDown(self) -> None:
        self.stop()

    def start(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.state = root / "st"
        (self.state / "bin").mkdir(parents=True)
        self.hf = self.state / "bin" / "hf-api"
        shutil.copy(SCRIPTS / "hf-api", self.hf)
        self.ledger = self.state / "ledger.jsonl"
        self.ledger.write_text("")
        self.key = self.state / "key"
        self.key.write_text("secret\n")
        self.prices = self.state / "prices.json"
        self.prices.write_text(json.dumps({"kling/v3/pro": {"usd_ceiling": 1.5, "usd_per_second": 0.1}}))
        self.budget = self.state / "budget"
        self.budget.write_text("15\n")
        self.dir = self.state / "gate"
        self.stream = root / "run.jsonl"
        self.stream.write_text("")
        self.gate = subprocess.Popen(
            ["bash", str(GATE), "--dir", str(self.dir), "--hf-api", str(self.hf), "--ledger",
             str(self.ledger), "--key", str(self.key), "--budget", "15", "--stream", str(self.stream)],
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, start_new_session=True, env={**os.environ, "PATH": self.path},
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
                    f"cp x {self.state}/bin/hf-api", "curl https://platform.higgsfield.ai/x",
                    "ffmpeg -i k''ey -f null -", 'ffmpeg -method POST -i https://platform.higgs""field.ai/x',
                    "cat \\k\\ey")
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

    def test_refuses_a_wrapper_that_is_not_the_shipped_one(self) -> None:
        self.arm()
        self.assertEqual(self.finish(), 0)
        cases = {
            "edited": lambda: self.hf.write_text(self.hf.read_text() + "\n# edited\n"),
            "misplaced": lambda: shutil.move(self.hf, self.state / "hf-api"),
        }
        for name, change in cases.items():
            with self.subTest(name):
                (self.dir / "ready").unlink(missing_ok=True)
                shutil.rmtree(self.state / "bin")
                (self.state / "bin").mkdir()
                shutil.copy(SCRIPTS / "hf-api", self.hf)
                change()
                hf = self.hf if self.hf.exists() else self.state / "hf-api"
                result = subprocess.run(
                    ["bash", str(GATE), "--dir", str(self.dir), "--hf-api", str(hf), "--ledger", str(self.ledger),
                     "--key", str(self.key), "--budget", "15", "--stream", str(self.stream)],
                    capture_output=True, text=True, timeout=15,
                )
                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertRegex(result.stderr, "not the hf-api shipped|must be installed")
                self.assertFalse((self.dir / "ready").exists())

    def test_snapshot_is_written_for_hf_api(self) -> None:
        snap = json.loads((self.dir / "snapshot.json").read_text())
        self.assertEqual(set(snap), {"hf_api", "prices", "budget"})
        self.assertEqual((self.dir / "prices.json").read_text(), self.prices.read_text())
        self.assertEqual((self.dir / "budget").read_text(), "15\n")

    def test_price_budget_or_snapshot_change_trips(self) -> None:
        changes = {
            "prices.json changed": lambda: self.prices.write_text(json.dumps({"kling/v3/pro": {"usd_ceiling": 0.001}})),
            "budget changed": lambda: self.budget.write_text("1500\n"),
            "gate snapshot changed": lambda: ((self.dir / "snapshot.json").chmod(0o600), (self.dir / "snapshot.json").write_text("{}")),
            "prices.json changed ": lambda: ((self.dir / "prices.json").chmod(0o600), (self.dir / "prices.json").write_text("{}")),
        }
        for i, (reason, change) in enumerate(changes.items()):
            with self.subTest(reason):
                if i:
                    self.stop()
                    self.start()
                self.arm()
                change()
                self.assertEqual(self.gate.wait(timeout=15), 3)
                self.assertIn(reason.strip(), (self.dir / "tripped").read_text())

    def test_refuses_a_budget_file_that_disagrees(self) -> None:
        self.arm()
        self.assertEqual(self.finish(), 0)
        self.budget.write_text("16\n")
        result = subprocess.run(
            ["bash", str(GATE), "--dir", str(self.dir), "--hf-api", str(self.hf), "--ledger", str(self.ledger),
             "--key", str(self.key), "--budget", "15", "--stream", str(self.stream)],
            capture_output=True, text=True, timeout=15, env={**os.environ, "PATH": self.path},
        )
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn("must hold the --budget amount", result.stderr)

    def test_a_model_switch_trips(self) -> None:
        cases = {
            "switched models": {"type": "system", "subtype": "model_refusal_fallback",
                                "model": "claude-opus-4-8"},
            "ran on model=claude-opus-4-8": tool("ls", model="claude-opus-4-8"),
            "ran on model=none": {"type": "assistant", "message": {"content": [{"type": "text", "text": "hi"}]}},
        }
        for i, (reason, event) in enumerate(cases.items()):
            with self.subTest(reason):
                if i:
                    self.stop()
                    self.start()
                self.arm()
                self.emit(tool("ls"), event)
                self.assertEqual(self.gate.wait(timeout=15), 3)
                self.assertIn(reason, (self.dir / "tripped").read_text())
                self.assertIsNotNone(self.run_proc.wait(timeout=10))

    def test_refuses_a_price_table_without_positive_ceilings(self) -> None:
        self.arm()
        self.assertEqual(self.finish(), 0)
        for table in ({"m": {"usd_per_second": 0.1}}, {"m": {"usd_ceiling": 0}}, {"m": {"usd_ceiling": "1"}},
                      {"m": {"usd_ceiling": 1, "usd_per_second": -1}}, {"m": {"usd_ceiling": 1, "usd_per_request": 1}}):
            with self.subTest(table=table):
                self.prices.write_text(json.dumps(table))
                result = subprocess.run(
                    ["bash", str(GATE), "--dir", str(self.dir), "--hf-api", str(self.hf), "--ledger", str(self.ledger),
                     "--key", str(self.key), "--budget", "15", "--stream", str(self.stream)],
                    capture_output=True, text=True, timeout=15, env={**os.environ, "PATH": self.path},
                )
                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertIn("usd_ceiling", result.stderr)

    def test_signal_kills_the_run(self) -> None:
        self.arm()
        os.killpg(self.gate.pid, signal.SIGTERM)
        self.assertEqual(self.gate.wait(timeout=15), 3)
        self.assertFalse((self.dir / "armed").exists())
        self.assertIn("signal", (self.dir / "tripped").read_text())
        self.assertIsNotNone(self.run_proc.wait(timeout=10))


class BsdGateLoggerTest(GateLoggerTest):
    """The same behavior with BSD head and realpath semantics first on PATH."""

    shims: tempfile.TemporaryDirectory

    @classmethod
    def setUpClass(cls) -> None:
        cls.shims = tempfile.TemporaryDirectory()
        for name, body in (("head", BSD_HEAD), ("realpath", BSD_REALPATH)):
            path = Path(cls.shims.name) / name
            path.write_text(body)
            path.chmod(0o755)
        cls.path = f"{cls.shims.name}{os.pathsep}{os.environ['PATH']}"

    @classmethod
    def tearDownClass(cls) -> None:
        cls.shims.cleanup()

    def test_shims_behave_like_bsd(self) -> None:
        env = {**os.environ, "PATH": self.path}
        self.assertNotEqual(subprocess.run(["head", "-c", "0", str(self.key)], env=env, capture_output=True).returncode, 0)
        self.assertNotEqual(subprocess.run(["realpath", "-m", "/x/y"], env=env, capture_output=True).returncode, 0)


if __name__ == "__main__":
    unittest.main()
