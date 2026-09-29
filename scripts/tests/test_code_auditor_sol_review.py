from __future__ import annotations

import json
import os
import re
import signal
import subprocess
import tempfile
import time
import unittest
from pathlib import Path

AGENT = Path(__file__).resolve().parents[2] / "modules/review/agents/code-auditor.md"
SPACE = "a file.txt"
UNICODE = "ünïcødé.txt"

FAKE_CODEX = """#!/usr/bin/env bash
if [[ ${1:-} == --version ]]; then
  [[ -n ${VERSION_FAIL:-} ]] && exit 1
  echo "${CODEX_VERSION-codex-cli 0.159.0}"; exit 0
fi
out=""; schema=""
while (($#)); do
  case $1 in
    --output-last-message|-o) out=$2; shift ;;
    --output-schema) schema=$2; shift ;;
  esac
  shift
done
[[ -s $schema ]] || { echo "missing --output-schema" >&2; exit 9; }
cp "$schema" "$PROMPTS/../schema-seen.json"
prompt=$(cat)
n=$(ls "$PROMPTS" | wc -l)
printf '%s' "$prompt" > "$PROMPTS/$n.txt"
[[ -n ${SLOW:-} ]] && sleep 10
[[ $prompt == *FAIL_SLICE* ]] && exit 1
[[ -n ${EMPTY_VERDICT:-} ]] && { : > "$out"; exit 0; }
if [[ $prompt =~ RESP_([a-z0-9_]+) ]]; then
  cp "$RESPONSES/${BASH_REMATCH[1]}.txt" "$out"
elif [[ $prompt == *HIGH_SLICE* ]]; then
  echo '{"findings":[{"severity":"HIGH","file":"a.ts","line":3,"title":"injection","detail":"d"}]}' > "$out"
elif [[ $prompt == *MED_SLICE* ]]; then
  echo '{"findings":[{"severity":"MED","file":"a.ts","line":null,"title":"weak check","detail":"d"}]}' > "$out"
elif [[ $prompt == *VAGUE_SLICE* ]]; then
  echo 'verdict ok, looks mergeable' > "$out"
else
  echo '{"findings":[{"severity":"LOW","file":"a.ts","line":1,"title":"verdict ok","detail":"d"}]}' > "$out"
fi
"""

FAKE_GH = """#!/usr/bin/env bash
[[ -n ${GH_FAIL:-} ]] && exit 1
[[ $* == "pr view 7 --repo o/r --json body -q .body" ]] || exit 3
echo "claim: adds files"
"""


def script() -> str:
    text = AGENT.read_text()
    section = text.split("### Sol Code Review Process", 1)[1]
    match = re.search(r"^```bash\n(.*?)^```$", section, re.M | re.S)
    assert match, "Sol review script block not found"
    return match.group(1)


class Fixture(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        root = self.root = Path(self.tmp.name)
        self.repo = root / "repo"
        self.bin = root / "bin"
        self.prompts = root / "prompts"
        self.scans = root / "scans"
        self.responses = root / "responses"
        for d in (self.repo, self.bin, self.prompts, self.scans, self.responses):
            d.mkdir()
        (self.scans / "semgrep.json").write_text('{"results": []}\n')
        self.script = root / "review.sh"
        self.script.write_text(script())
        for name, body in (("codex", FAKE_CODEX), ("gh", FAKE_GH)):
            path = self.bin / name
            path.write_text(body)
            path.chmod(0o755)

        self.env = {
            k: v
            for k, v in os.environ.items()
            if not k.startswith("GIT_") and k != "CDPATH"
        }
        self.env.update(
            PATH=f"{self.bin}{os.pathsep}{os.environ['PATH']}",
            GIT_CONFIG_GLOBAL=os.devnull,
            GIT_CONFIG_NOSYSTEM="1",
            GIT_AUTHOR_NAME="Test",
            GIT_AUTHOR_EMAIL="test@example.com",
            GIT_COMMITTER_NAME="Test",
            GIT_COMMITTER_EMAIL="test@example.com",
            PROMPTS=str(self.prompts),
            RESPONSES=str(self.responses),
            TMPDIR=str(root),
            PR_NUMBER="7",
            REPO="o/r",
            SCAN_DIR=str(self.scans),
            BASE_REF="dev",
            MAX="2",
        )
        self.git("init", "-q", "-b", "dev")
        (self.repo / "base.txt").write_text("base\n")
        self.git("add", ".")
        self.git("commit", "-qm", "base")
        self.git("checkout", "-qb", "feature")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def git(self, *args: str) -> None:
        subprocess.run(
            ["git", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", *args],
            cwd=self.repo,
            env=self.env,
            check=True,
        )

    def commit(self, files: dict[str, str]) -> None:
        for name, body in files.items():
            (self.repo / name).write_text(body)
        self.git("add", "-A")
        self.git("commit", "-qm", "change")

    def run_script(self, **env: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["bash", str(self.script)],
            cwd=self.repo,
            env={**self.env, **env},
            capture_output=True,
            text=True,
        )

    def review(self, name: str, text: str) -> subprocess.CompletedProcess[str]:
        (self.responses / f"{name}.txt").write_text(text)
        self.commit({f"{name}.txt": f"RESP_{name}\n"})
        return self.run_script()

    def assert_cleaned(self) -> None:
        self.assertEqual(list(self.root.glob("sol-review.*")), [])

    def prompt_text(self) -> str:
        return "".join(p.read_text() for p in sorted(self.prompts.iterdir()))


class SolReviewScriptTest(Fixture):
    def test_covers_every_line_of_odd_names(self) -> None:
        big = "".join(f"big line {i}\n" for i in range(12))
        self.commit({SPACE: "space body\n", UNICODE: "unicode body\n", "big.txt": big})
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("verdict ok", result.stdout)
        text = self.prompt_text()
        for line in ["+space body", "+unicode body", *(f"+big line {i}" for i in range(12))]:
            self.assertIn(line, text)
        self.assertIn(f"+++ b/{SPACE}", text)
        self.assertIn(f"+++ b/{UNICODE}", text)
        self.assertIn("claim: adds files", text)
        self.assertIn('"results"', text)
        self.assertGreater(len(list(self.prompts.iterdir())), 2)
        self.assertIn("SUMMARY: slices=", result.stdout)
        self.assertIn("blocked=0 CRITICAL=0 HIGH=0 MED=0", result.stdout)
        self.assert_cleaned()

    def test_high_finding_blocks_but_prints_findings(self) -> None:
        self.commit({SPACE: "space body\n", UNICODE: "HIGH_SLICE\n"})
        result = self.run_script()
        self.assertEqual(result.returncode, 3, result.stderr)
        self.assertIn("- [HIGH] a.ts:3 injection", result.stdout)
        self.assertIn("verdict ok", result.stdout)
        self.assertIn("blocked=1 CRITICAL=0 HIGH=1", result.stdout)
        self.assert_cleaned()

    def test_med_finding_blocks_even_when_mergeable(self) -> None:
        self.commit({SPACE: "MED_SLICE\n"})
        result = self.run_script()
        self.assertEqual(result.returncode, 3, result.stderr)
        self.assertIn("- [MED] a.ts:- weak check", result.stdout)
        self.assertIn("blocked=1 CRITICAL=0 HIGH=0 MED=1 LOW=0", result.stdout)

    def test_unparseable_verdict_fails(self) -> None:
        self.commit({SPACE: "space body\n", UNICODE: "VAGUE_SLICE\n"})
        result = self.run_script()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout, "")
        self.assertIn("invalid findings JSON", result.stderr)
        self.assertIn("looks mergeable", result.stderr)
        self.assert_cleaned()

    def test_failed_slice_exits_without_verdict(self) -> None:
        self.commit({SPACE: "space body\n", UNICODE: "FAIL_SLICE\n"})
        result = self.run_script()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout, "")
        self.assertIn("no verdict", result.stderr)
        self.assert_cleaned()

    def test_empty_verdict_exits_without_verdict(self) -> None:
        self.commit({SPACE: "space body\n"})
        result = self.run_script(EMPTY_VERDICT="1")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout, "")
        self.assert_cleaned()

    def test_terminate_removes_work_dir(self) -> None:
        self.commit({SPACE: "space body\n"})
        proc = subprocess.Popen(
            ["bash", str(self.script)],
            cwd=self.repo,
            env={**self.env, "SLOW": "1"},
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        )
        deadline = time.monotonic() + 10
        while not any(self.prompts.iterdir()) and time.monotonic() < deadline:
            time.sleep(0.05)
        self.assertTrue(list(self.root.glob("sol-review.*")))
        os.killpg(proc.pid, signal.SIGTERM)
        out, _ = proc.communicate(timeout=10)
        self.assertNotEqual(proc.returncode, 0)
        self.assertEqual(out, b"")
        self.assert_cleaned()

    def test_missing_base_ref_stops(self) -> None:
        self.commit({SPACE: "space body\n"})
        result = self.run_script(BASE_REF="origin/nope")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(list(self.prompts.iterdir()), [])

    def test_fetches_unresolved_origin_base(self) -> None:
        self.commit({SPACE: "space body\n"})
        self.git("remote", "add", "origin", str(self.repo))
        result = self.run_script(BASE_REF="origin/dev")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("+space body", self.prompt_text())

    def test_empty_diff_stops(self) -> None:
        result = self.run_script()
        self.assertEqual(result.returncode, 2)
        self.assertIn("empty diff", result.stderr)
        self.assert_cleaned()

    def test_pr_body_failure_stops(self) -> None:
        self.commit({SPACE: "space body\n"})
        result = self.run_script(GH_FAIL="1")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(list(self.prompts.iterdir()), [])

    def test_requires_pr_number_and_repo(self) -> None:
        self.commit({SPACE: "space body\n"})
        for var in ("PR_NUMBER", "REPO", "SCAN_DIR"):
            env = {k: v for k, v in self.env.items() if k != var}
            result = subprocess.run(
                ["bash", str(self.script)], cwd=self.repo, env=env, capture_output=True, text=True
            )
            self.assertEqual(result.returncode, 2, var)
            self.assertIn(var, result.stderr)
            result = self.run_script(**{var: ""})
            self.assertEqual(result.returncode, 2, var)

    def test_invalid_inputs_exit_2(self) -> None:
        self.commit({SPACE: "space body\n"})
        for env in ({"PR_NUMBER": "7; rm -rf /"}, {"REPO": "o/r --web"}, {"MAX": "abc"}, {"MAX": "0"}, {"MAX": ""}):
            result = self.run_script(**env)
            self.assertEqual(result.returncode, 2, env)
            self.assertEqual(list(self.prompts.iterdir()), [], env)

    def test_slices_keep_file_and_hunk_headers(self) -> None:
        self.commit({"big.txt": "".join(f"big line {i}\n" for i in range(7))})
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        prompts = [p.read_text() for p in sorted(self.prompts.iterdir())]
        self.assertEqual(len(prompts), 4)
        for text in prompts:
            self.assertIn("+++ b/big.txt", text)
            self.assertRegex(text, r"(?m)^@@ ")
        joined = "".join(prompts)
        for i in range(7):
            self.assertEqual(joined.count(f"+big line {i}\n"), 1)

    def test_byte_cap_splits_on_hunk_boundaries(self) -> None:
        body = "".join(f"line {i} {'x' * 2000}\n" for i in range(3000))
        self.commit({"wide.txt": body})
        lines = body.splitlines(keepends=True)
        for i in range(0, 3000, 100):
            lines[i] = f"edit {i} {'y' * 2000}\n"
        self.commit({"wide.txt": "".join(lines)})
        self.git("branch", "-f", "dev", "HEAD~1")
        result = self.run_script(MAX="100000", CAP="200000")
        self.assertEqual(result.returncode, 0, result.stderr)
        prompts = [p.read_text() for p in sorted(self.prompts.iterdir())]
        self.assertGreater(len(prompts), 1)
        for text in prompts:
            self.assertLessEqual(len(text.encode()), 200000)
            self.assertIn("+++ b/wide.txt", text)
            diff = text.split("### Diff slice", 1)[1]
            self.assertRegex(diff, r"^\n```diff\ndiff --git")
            self.assertNotIn("(hunk continued)", diff)
        joined = "".join(prompts)
        for i in range(0, 3000, 100):
            self.assertEqual(joined.count(f"+edit {i} "), 1)

    def test_generated_fixtures_are_summarized(self) -> None:
        (self.repo / "benchmarks").mkdir()
        huge = "".join(json.dumps({"i": i, "blob": "z" * 5000}) + "\n" for i in range(400))
        self.commit({"benchmarks/run.jsonl": huge, "benchmarks/result.json": "{}\n", "code.ts": "export {}\n"})
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        text = self.prompt_text()
        self.assertNotIn("zzzzzzzzzz", text)
        self.assertRegex(text, r"benchmarks/run.jsonl \+400 -0 blob=[0-9a-f]{40}")
        self.assertIn("benchmarks/result.json +1 -0", text)
        self.assertIn("+export {}", text)

    def test_oversized_line_and_cap_stop(self) -> None:
        self.commit({"long.ts": "x" * 300000 + "\n"})
        result = self.run_script(CAP="200000")
        self.assertEqual(result.returncode, 2)
        self.assertIn("slice budget", result.stderr)
        self.assertEqual(list(self.prompts.iterdir()), [])
        for cap in ("900001", "0", "abc"):
            result = self.run_script(CAP=cap)
            self.assertEqual(result.returncode, 2, cap)
            self.assertEqual(list(self.prompts.iterdir()), [], cap)
        self.assert_cleaned()

    def test_missing_scan_evidence_stops(self) -> None:
        self.commit({SPACE: "space body\n"})
        (self.scans / "semgrep.json").unlink()
        result = self.run_script()
        self.assertEqual(result.returncode, 2)
        self.assertIn("no scan evidence", result.stderr)


def finding(severity: str = "LOW", title: str = "t", line: object = 1, **extra: object) -> dict:
    return {"severity": severity, "file": "a.ts", "line": line, "title": title, "detail": "d", **extra}


def doc(*findings: dict) -> str:
    return json.dumps({"findings": list(findings)})


class SolJsonContractTest(Fixture):
    def test_passes_a_strict_schema_file(self) -> None:
        result = self.review("schema", doc())
        self.assertEqual(result.returncode, 0, result.stderr)
        schema = json.loads((self.root / "schema-seen.json").read_text())
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(schema["required"], ["findings"])
        item = schema["properties"]["findings"]["items"]
        self.assertFalse(item["additionalProperties"])
        self.assertEqual(item["properties"]["severity"]["enum"], ["CRITICAL", "HIGH", "MED", "LOW"])
        self.assertEqual(item["properties"]["line"]["type"], ["integer", "null"])
        self.assertEqual(sorted(item["required"]), sorted(item["properties"]))

    def test_clean_empty_findings_pass(self) -> None:
        result = self.review("clean", doc())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("blocked=0 CRITICAL=0 HIGH=0 MED=0", result.stdout)
        self.assert_cleaned()

    def test_low_only_passes(self) -> None:
        result = self.review("low", doc(finding("LOW", "naming", None), finding("LOW", "style")))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("- [LOW] a.ts:- naming", result.stdout)
        self.assertIn("blocked=0 CRITICAL=0 HIGH=0 MED=0 LOW=2", result.stdout)

    def test_blocking_severities_exit_3(self) -> None:
        for severity in ("CRITICAL", "HIGH", "MED"):
            with self.subTest(severity=severity):
                name = severity.lower()
                result = self.review(name, doc(finding(severity, f"{name} issue")))
                self.assertEqual(result.returncode, 3, result.stderr)
                self.assertIn(f"- [{severity}] a.ts:1 {name} issue", result.stdout)
                self.assertIn(f"{severity}=1", result.stdout)
                self.assert_cleaned()

    def test_severity_wins_over_reassuring_text(self) -> None:
        result = self.review("claims", doc(finding("HIGH", "no issues found, safe to merge", 0)))
        self.assertEqual(result.returncode, 3, result.stderr)
        self.assertIn("blocked=1 CRITICAL=0 HIGH=1", result.stdout)

    def test_invalid_output_fails(self) -> None:
        cases = {
            "notjson": "{findings: []}",
            "truncated": '{"findings": [',
            "prose": "Here you go:\n" + doc() + "\nVERDICT: MERGEABLE yes",
            "trailing": doc() + "\nall clear",
            "twodocs": doc() + doc(),
            "wrongcase": doc(finding("High")),
            "unknownsev": doc(finding("INFO")),
            "extrakey": doc(finding(confidence="high")),
            "extratop": json.dumps({"findings": [], "verdict": "MERGEABLE yes"}),
            "missing": json.dumps({"issues": []}),
            "nullfindings": json.dumps({"findings": None}),
            "array": "[]",
            "missingfield": json.dumps({"findings": [{"severity": "LOW", "file": "a", "line": 1, "title": "t"}]}),
            "floatline": doc(finding(line=1.5)),
            "negline": doc(finding(line=-1)),
            "strline": doc(finding(line="3")),
            "numtitle": doc(finding(title=7)),
            "dupkey": '{"findings": [{"severity": "HIGH", "severity": "LOW", "file": "a", "line": 1, "title": "t", "detail": "d"}]}',
            "empty": "",
        }
        for name, text in cases.items():
            with self.subTest(name=name):
                result = self.review(name, text)
                self.assertEqual(result.returncode, 1, result.stdout)
                self.assertEqual(result.stdout, "")
                self.assertIn("no verdict", result.stderr)
                self.assert_cleaned()

    def test_duplicate_keys_at_any_depth_fail(self) -> None:
        item = '{"severity": "LOW", "file": "a", "line": 1, "title": "t", "detail": "d"%s}'
        high = item.replace("LOW", "HIGH") % ""
        cases = {
            "duphighfirst": '{"findings": [%s], "findings": []}' % high,
            "dupbothfull": '{"findings": [%s], "findings": [%s]}' % (high, item % ""),
            "dupbothempty": '{"findings": [], "findings": []}',
            "dupseverity": '{"findings": [%s]}' % high.replace('"file"', '"severity": "LOW", "file"'),
            "dupemptyvalues": '{"findings": [%s]}' % (item % ', "x": {}, "x": {}'),
            "dupinemptyobject": '{"findings": [], "z": {"k": [], "k": []}}',
        }
        for name, text in cases.items():
            with self.subTest(name=name):
                result = self.review(name, text)
                self.assertEqual(result.returncode, 1, result.stdout)
                self.assertEqual(result.stdout, "")
                self.assertIn("duplicate key", result.stderr)
                self.assert_cleaned()

    def test_non_finite_and_non_integer_numbers_fail(self) -> None:
        for i, value in enumerate(["NaN", "Infinity", "-Infinity", "1e400", "3.0", "true", "1000000000"]):
            with self.subTest(value=value):
                text = '{"findings": [{"severity": "LOW", "file": "a", "line": %s, "title": "t", "detail": "d"}]}' % value
                result = self.review(f"num{i}", text)
                self.assertEqual(result.returncode, 1, result.stdout)
                self.assertIn("invalid findings JSON", result.stderr)

    def test_whitespace_around_json_is_valid(self) -> None:
        result = self.review("spaced", "\n  " + doc(finding("LOW")) + "\r\n\n")
        self.assertEqual(result.returncode, 0, result.stderr)


class CodexVersionTest(Fixture):
    def test_old_or_unreadable_codex_exits_2(self) -> None:
        self.commit({SPACE: "space body\n"})
        for env in (
            {"CODEX_VERSION": "codex-cli 0.156.0"},
            {"CODEX_VERSION": "codex-cli 0.99.9"},
            {"CODEX_VERSION": "codex-cli dev"},
            {"CODEX_VERSION": ""},
            {"VERSION_FAIL": "1"},
        ):
            with self.subTest(env=env):
                result = self.run_script(**env)
                self.assertEqual(result.returncode, 2, result.stderr)
                self.assertIn("codex", result.stderr)
                self.assertEqual(list(self.prompts.iterdir()), [])

    def test_minimum_and_newer_codex_pass(self) -> None:
        self.commit({SPACE: "space body\n"})
        for version in ("codex-cli 0.156.1", "codex-cli 0.159.0", "codex-cli 0.157.0-alpha.2", "codex-cli 1.0.0"):
            with self.subTest(version=version):
                result = self.run_script(CODEX_VERSION=version)
                self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
