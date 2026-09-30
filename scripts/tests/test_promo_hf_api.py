"""Behavior tests for the hf-api wrapper shipped with promo-video-pipeline."""

from __future__ import annotations

import hashlib
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
code=${FAKE_CODE:-200}
if [[ -n ${FAKE_CODES:-} && -s $FAKE_CODES ]]; then
  code=$(head -n 1 "$FAKE_CODES"); tail -n +2 "$FAKE_CODES" > "$FAKE_CODES.next"; mv "$FAKE_CODES.next" "$FAKE_CODES"
fi
printf '%s' "$code"
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
            "kling/v3/pro": {"usd_ceiling": 1.5, "usd_per_second": 0.1}, "flat/model": {"usd_ceiling": 0.25}}))
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
        self.snapshot()

    def snapshot(self) -> None:
        """What gate-logger.sh writes at start: copies of prices.json and budget, and every sha256."""
        gate = self.state / "gate"
        for name in ("prices.json", "budget"):
            shutil.copy(self.state / name, gate / name)
        digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
        (gate / "snapshot.json").write_text(json.dumps({
            "hf_api": digest(self.hf), "prices": digest(self.state / "prices.json"), "budget": digest(self.state / "budget")}))

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

    def test_generate_checks_the_gate_snapshot_every_call(self) -> None:
        body = ("generate", "--model", "kling/v3/pro", "--json", '{"duration": 3}')
        changes = {
            "prices.json changed": lambda: (self.state / "prices.json").write_text(json.dumps({"kling/v3/pro": {"usd_ceiling": 0.0001}})),
            "budget changed": lambda: (self.state / "budget").write_text("1000\n"),
            "prices.json changed ": lambda: (self.state / "gate/prices.json").write_text("{}"),
            "not the wrapper the gate verified": lambda: self.hf.write_text(self.hf.read_text() + "\n# edited\n"),
            "malformed": lambda: (self.state / "gate/snapshot.json").write_text('{"hf_api": "x"}'),
            "has not snapshotted": lambda: (self.state / "gate/snapshot.json").unlink(),
        }
        for reason, change in changes.items():
            with self.subTest(reason):
                shutil.copy(WRAPPER, self.hf)
                (self.state / "budget").write_text("1\n")
                (self.state / "prices.json").write_text(json.dumps({"kling/v3/pro": {"usd_ceiling": 1.5, "usd_per_second": 0.1}}))
                self.arm()
                self.assertEqual(self.hf_api("generate", "--probe").returncode, 0)
                change()
                for args in (body, ("generate", "--probe"), (body[0], "--probe", *body[1:])):
                    result = self.hf_api(*args)
                    self.assertEqual(result.returncode, 4, result.stderr)
                    self.assertIn(reason.strip(), result.stderr)
                os.killpg(self.gate_proc.pid, signal.SIGKILL)
                self.gate_proc.wait()
        self.assertFalse(self.log.exists())
        self.assertEqual(self.entries(), [])

    def test_body_file_must_be_inside_the_working_directory(self) -> None:
        self.arm()
        (self.work / "body.json").write_text('{"duration": 3}')
        self.assertEqual(self.hf_api("generate", "--probe", "--model", "kling/v3/pro", "--body-file", "body.json").returncode, 0)
        outside = self.state / "outside.json"
        outside.write_text('{"duration": 3}')
        for path in (str(outside), "../state/outside.json", "~/x.json"):
            with self.subTest(path=path):
                result = self.hf_api("generate", "--probe", "--model", "kling/v3/pro", "--body-file", path)
                self.assertEqual(result.returncode, 2)

    def spent(self) -> float:
        return round(sum(e["cost_usd"] for e in self.entries()), 6)

    def test_generate_books_the_estimate_and_hides_the_key(self) -> None:
        self.arm()
        resp = json.dumps({"request_id": "d7e6c0f3-6699", "status": "queued"})
        result = self.hf_api("generate", "--model", "kling/v3/pro", "--json", '{"duration": 3}', FAKE_RESP=resp)
        self.assertEqual(result.returncode, 0, result.stderr)
        reserve, gen, settle = self.entries()
        self.assertEqual([e["cmd"] for e in (reserve, gen, settle)], ["reserve", "generate", "settle"])
        self.assertEqual(reserve["reservation"], settle["reservation"])
        self.assertEqual((gen["request_id"], gen["model"]), ("d7e6c0f3-6699", "kling/v3/pro"))
        self.assertAlmostEqual(gen["cost_usd"], 0.3)
        self.assertAlmostEqual(self.spent(), 0.3)
        log = self.log.read_text()
        self.assertIn("https://api.higgsfield.ai/kling/v3/pro", log)
        self.assertIn(f"Idempotency-Key: {reserve['reservation']}", log)
        self.assertNotIn("SECRETVALUE", log)
        self.assertIn(f"Authorization: Key {SECRET}", self.hdrs.read_text())
        self.assertEqual(list(self.state.glob(".hdr.*")), [])
        self.assertFalse((self.state / "lock").exists())

    def test_rejected_submit_releases_the_reservation(self) -> None:
        self.arm()
        result = self.hf_api("generate", "--model", "flat/model", FAKE_RESP='{"detail": "bad"}', FAKE_CODE="422")
        self.assertEqual(result.returncode, 1)
        self.assertEqual([e["cmd"] for e in self.entries()], ["reserve", "release"])
        self.assertEqual(self.spent(), 0)
        self.assertEqual(len(self.log.read_text().splitlines()), 1)

    def test_ambiguous_failure_retries_with_the_same_key_then_keeps_the_reservation(self) -> None:
        self.arm()
        result = self.hf_api("generate", "--model", "flat/model", FAKE_RESP="", FAKE_CODE="000")
        self.assertEqual(result.returncode, 1)
        self.assertIn("stays booked", result.stderr)
        self.assertEqual([e["cmd"] for e in self.entries()], ["reserve"])
        self.assertEqual(self.spent(), 0.25)
        keys = {l.split("Idempotency-Key: ")[1].split()[0] for l in self.log.read_text().splitlines()}
        self.assertEqual(len(self.log.read_text().splitlines()), 3)
        self.assertEqual(len(keys), 1)

    def test_a_retry_that_succeeds_books_once(self) -> None:
        self.arm()
        codes = Path(self.tmp.name) / "codes"
        codes.write_text("503\n000\n200\n")
        resp = json.dumps({"request_id": "req-dddd-4444", "status": "queued"})
        result = self.hf_api("generate", "--model", "flat/model", FAKE_RESP=resp, FAKE_CODES=str(codes))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual([e["cmd"] for e in self.entries()], ["reserve", "generate", "settle"])
        self.assertEqual(self.spent(), 0.25)

    def test_a_reservation_blocks_a_concurrent_overspend(self) -> None:
        self.arm()
        self.ledger.write_text('{"cmd": "reserve", "reservation": "res-other", "cost_usd": 0.8}\n')
        result = self.hf_api("generate", "--model", "flat/model")
        self.assertEqual(result.returncode, 4)
        self.assertIn("over the $1 budget", result.stderr)
        self.assertFalse(self.log.exists())

    def test_bad_prices_refuse(self) -> None:
        tables = {
            "zero": {"flat/model": {"usd_ceiling": 0}},
            "negative": {"flat/model": {"usd_ceiling": -1}},
            "string": {"flat/model": {"usd_ceiling": "0.25"}},
            "no ceiling": {"flat/model": {"usd_per_second": 0.1}},
            "zero rate": {"flat/model": {"usd_ceiling": 1, "usd_per_second": 0}},
            "old key": {"flat/model": {"usd_ceiling": 1, "usd_per_request": 0.01}},
            "not an object": {"flat/model": 0.25},
        }
        for name, table in tables.items():
            with self.subTest(name):
                (self.state / "prices.json").write_text(json.dumps(table))
                result = self.hf_api("estimate", "--model", "flat/model", "--json", '{"duration": 3}')
                self.assertEqual(result.returncode, 4, result.stdout)

    def test_prices_use_the_ceiling_unless_a_duration_scales_them(self) -> None:
        cases = [('{"duration": 3}', 0.3), ("{}", 1.5), ('{"duration": "3"}', 1.5), ('{"duration": 0}', 1.5)]
        for body, want in cases:
            with self.subTest(body=body):
                result = self.hf_api("estimate", "--model", "kling/v3/pro", "--json", body)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertAlmostEqual(json.loads(result.stdout)["cost_usd"], want)
        self.assertAlmostEqual(json.loads(self.hf_api("estimate", "--model", "flat/model", "--json", '{"duration": 30}').stdout)["cost_usd"], 0.25)
        over = self.hf_api("estimate", "--model", "kling/v3/pro", "--json", '{"duration": 16}')
        self.assertEqual(over.returncode, 4)
        self.assertIn("ceiling", over.stderr)

    def test_failed_and_cancelled_requests_refund_once(self) -> None:
        self.arm()
        for rid in ("req-aaaa-1111", "req-bbbb-2222"):
            resp = json.dumps({"request_id": rid, "status": "queued"})
            self.assertEqual(self.hf_api("generate", "--model", "flat/model", FAKE_RESP=resp).returncode, 0)
        self.assertEqual(self.spent(), 0.5)
        failed = json.dumps({"request_id": "req-aaaa-1111", "status": "failed"})
        for _ in range(2):
            self.assertEqual(self.hf_api("status", "req-aaaa-1111", FAKE_RESP=failed).returncode, 0)
        self.assertEqual(self.hf_api("cancel", "req-bbbb-2222", FAKE_RESP="", FAKE_CODE="202").returncode, 0)
        self.assertEqual(self.hf_api("cancel", "req-bbbb-2222", FAKE_RESP="", FAKE_CODE="202").returncode, 0)
        self.assertEqual([e["cmd"] for e in self.entries()].count("refund"), 2)
        self.assertEqual(self.spent(), 0)
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
