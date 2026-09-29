"""Behavior tests for the hf-api wrapper shipped with promo-video-pipeline."""

from __future__ import annotations

import json
import os
import shutil
import signal
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WRAPPER = ROOT / "modules/creative/skills/promo-video-pipeline/scripts/hf-api"
SECRET = "kid123:SECRETVALUE"

# Records argv (and any -H @file contents) and answers from $FAKE_RESP/$FAKE_CODE.
FAKE_CURL = r"""#!/usr/bin/env bash
out="" hdrs=""
printf '%s\n' "$*" >> "$FAKE_LOG"
while [[ $# -gt 0 ]]; do
  case $1 in
    -o) out=$2; shift 2 ;;
    -w|-X|--max-time|--data-binary) shift 2 ;;
    -H) [[ $2 == @* ]] && hdrs+=$(cat "${2#@}"); shift 2 ;;
    -*) shift ;;
    *) url=$1; shift ;;
  esac
done
printf '%s\n' "$hdrs" >> "$FAKE_HDRS"
if [[ $url == https://cdn.example/* ]]; then echo video > "$out"; exit 0; fi
printf '%s' "$FAKE_RESP" > "$out"
printf '%s' "${FAKE_CODE:-200}"
"""


@unittest.skipUnless(shutil.which("jq"), "needs jq")
class HfApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name).resolve()
        self.state = root / "state"
        (self.state / "bin").mkdir(parents=True)
        (self.state / "gate").mkdir()
        self.hf = self.state / "bin" / "hf-api"
        shutil.copy(WRAPPER, self.hf)
        (self.state / "key").write_text(SECRET + "\n")
        (self.state / "budget").write_text("1\n")
        (self.state / "prices.json").write_text(json.dumps({
            "kling/v3/pro": {"usd_per_second": 0.1}, "flat/model": {"usd_per_request": 0.25}}))
        self.ledger = self.state / "ledger.jsonl"
        self.ledger.write_text("")
        self.work = root / "work"
        self.work.mkdir()
        fake = root / "fakebin"
        fake.mkdir()
        (fake / "curl").write_text(FAKE_CURL)
        (fake / "curl").chmod(0o755)
        self.log, self.hdrs = root / "curl.log", root / "hdrs.log"
        self.env = {**os.environ, "PATH": f"{fake}{os.pathsep}{os.environ['PATH']}",
                    "FAKE_LOG": str(self.log), "FAKE_HDRS": str(self.hdrs)}
        self.gate_proc: subprocess.Popen | None = None

    def tearDown(self) -> None:
        if self.gate_proc and self.gate_proc.poll() is None:
            os.killpg(self.gate_proc.pid, signal.SIGKILL)
            self.gate_proc.wait()
        self.tmp.cleanup()

    def hf_api(self, *args: str, **env: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run([str(self.hf), *args], cwd=self.work, env={**self.env, **env},
                              capture_output=True, text=True, timeout=30)

    def arm(self, name: str = "gate-logger.sh") -> None:
        fake = self.state / name
        fake.write_text("#!/usr/bin/env bash\nsleep 60\n")
        fake.chmod(0o755)
        self.gate_proc = subprocess.Popen([str(fake)], stdout=subprocess.DEVNULL, start_new_session=True)
        (self.state / "gate" / "armed").write_text(f"{self.gate_proc.pid}\n")

    def entries(self) -> list[dict]:
        return [json.loads(line) for line in self.ledger.read_text().splitlines()]

    def test_capabilities_name_its_own_state_dir(self) -> None:
        result = self.hf_api("capabilities", HOME="/nowhere")
        self.assertEqual(result.returncode, 0, result.stderr)
        caps = json.loads(result.stdout)
        self.assertEqual(caps["state_dir"], str(self.state))
        self.assertEqual(caps["gate_file"], f"{self.state}/gate/armed")
        self.assertTrue(caps["probe"])

    def test_unarmed_or_fake_gate_refuses(self) -> None:
        self.assertEqual(self.hf_api("generate", "--probe").returncode, 4)
        body = '{"duration": 3}'
        self.assertEqual(self.hf_api("generate", "--model", "kling/v3/pro", "--json", body).returncode, 4)
        self.arm("not-the-gate.sh")
        self.assertEqual(self.hf_api("generate", "--probe").returncode, 4)
        (self.state / "gate" / "armed").write_text("999999\n")
        self.assertEqual(self.hf_api("generate", "--probe").returncode, 4)
        self.assertFalse(self.log.exists())
        self.assertEqual(self.entries(), [])

    def test_armed_probe_passes_without_contacting_higgsfield(self) -> None:
        self.arm()
        self.assertEqual(self.hf_api("generate", "--probe").returncode, 0)
        result = self.hf_api("generate", "--probe", "--model", "kling/v3/pro", "--json", '{"duration": 3}')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.log.exists())
        self.assertEqual(self.entries(), [])

    def test_price_table_and_budget_are_enforced(self) -> None:
        self.arm()
        for args in (["--model", "unknown/model", "--json", "{}"],
                     ["--model", "kling/v3/pro", "--json", "{}"],
                     ["--model", "kling/v3/pro", "--json", '{"duration": 11}']):
            with self.subTest(args=args):
                self.assertEqual(self.hf_api("generate", *args).returncode, 4)
        self.ledger.write_text('{"cost_usd": 0.9}\n')
        self.assertEqual(self.hf_api("generate", "--model", "flat/model").returncode, 4)
        self.assertFalse(self.log.exists())

    def test_generate_books_the_estimate_and_hides_the_key(self) -> None:
        self.arm()
        resp = json.dumps({"request_id": "d7e6c0f3-6699", "status": "queued"})
        result = self.hf_api("generate", "--model", "kling/v3/pro", "--json", '{"duration": 3}', FAKE_RESP=resp)
        self.assertEqual(result.returncode, 0, result.stderr)
        [entry] = self.entries()
        self.assertEqual((entry["cmd"], entry["request_id"], entry["model"]), ("generate", "d7e6c0f3-6699", "kling/v3/pro"))
        self.assertAlmostEqual(entry["cost_usd"], 0.3)
        self.assertIn("https://platform.higgsfield.ai/kling/v3/pro", self.log.read_text())
        self.assertNotIn("SECRETVALUE", self.log.read_text())
        self.assertIn(f"Authorization: Key {SECRET}", self.hdrs.read_text())
        self.assertEqual(list(self.state.glob(".hdr.*")), [])

    def test_rejected_submit_is_not_booked_but_a_timeout_is(self) -> None:
        self.arm()
        args = ("generate", "--model", "flat/model")
        self.assertEqual(self.hf_api(*args, FAKE_RESP='{"detail": "bad"}', FAKE_CODE="422").returncode, 1)
        self.assertEqual(self.entries(), [])
        self.assertEqual(self.hf_api(*args, FAKE_RESP="", FAKE_CODE="000").returncode, 1)
        self.assertEqual([e["cost_usd"] for e in self.entries()], [0.25])

    def test_failed_and_cancelled_requests_refund_once(self) -> None:
        self.arm()
        for rid in ("req-aaaa-1111", "req-bbbb-2222"):
            resp = json.dumps({"request_id": rid, "status": "queued"})
            self.assertEqual(self.hf_api("generate", "--model", "flat/model", FAKE_RESP=resp).returncode, 0)
        failed = json.dumps({"request_id": "req-aaaa-1111", "status": "failed"})
        for _ in range(2):
            self.assertEqual(self.hf_api("status", "req-aaaa-1111", FAKE_RESP=failed).returncode, 0)
        self.assertEqual(self.hf_api("cancel", "req-bbbb-2222", FAKE_RESP="", FAKE_CODE="202").returncode, 0)
        self.assertEqual(self.hf_api("cancel", "req-bbbb-2222", FAKE_RESP="", FAKE_CODE="202").returncode, 0)
        self.assertEqual([e["cost_usd"] for e in self.entries()], [0.25, 0.25, -0.25, -0.25])
        balance = json.loads(self.hf_api("balance").stdout)
        self.assertEqual(balance["spent_usd"], 0)

    def test_completed_status_downloads_output(self) -> None:
        done = json.dumps({"request_id": "req-cccc-3333", "status": "completed",
                           "video": {"url": "https://cdn.example/clip.mp4?sig=1"}})
        result = self.hf_api("status", "req-cccc-3333", FAKE_RESP=done)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.work / "hf-output/req-cccc-3333/clip.mp4").read_text(), "video\n")

    def test_a_copy_outside_bin_or_without_a_key_does_nothing(self) -> None:
        stray = self.work / "hf-api"
        shutil.copy(WRAPPER, stray)
        result = subprocess.run([str(stray), "capabilities"], env=self.env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("install as", result.stderr)


if __name__ == "__main__":
    unittest.main()
