from __future__ import annotations

import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

AGENT = Path(__file__).resolve().parents[2] / "modules/review/agents/code-auditor.md"
SPACE = "a file.txt"
UNICODE = "ünïcødé.txt"

FAKE_CODEX = """#!/usr/bin/env bash
out=""
while (($#)); do
  [[ $1 == --output-last-message ]] && { out=$2; shift; }
  shift
done
prompt=$(cat)
n=$(ls "$PROMPTS" | wc -l)
printf '%s' "$prompt" > "$PROMPTS/$n.txt"
[[ $prompt == *FAIL_SLICE* ]] && exit 1
[[ -n ${EMPTY_VERDICT:-} ]] && { : > "$out"; exit 0; }
printf 'verdict ok\\n' > "$out"
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


class SolReviewScriptTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.repo = root / "repo"
        self.bin = root / "bin"
        self.prompts = root / "prompts"
        self.scans = root / "scans"
        for d in (self.repo, self.bin, self.prompts, self.scans):
            d.mkdir()
        (self.scans / "semgrep.json").write_text('{"results": []}\n')
        self.script = root / "sol-review.sh"
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
            TMPDIR=str(root),
            PR_NUMBER="7",
            REPO="o/r",
            SCAN_DIR=str(self.scans),
            BASE_REF="dev",
            MAX="5",
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

    def prompt_text(self) -> str:
        return "".join(p.read_text() for p in sorted(self.prompts.iterdir()))

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

    def test_failed_slice_exits_without_verdict(self) -> None:
        self.commit({SPACE: "space body\n", UNICODE: "FAIL_SLICE\n"})
        result = self.run_script()
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("verdict ok", result.stdout)
        self.assertIn("no verdict", result.stderr)

    def test_empty_verdict_exits_without_verdict(self) -> None:
        self.commit({SPACE: "space body\n"})
        result = self.run_script(EMPTY_VERDICT="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")

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
            self.assertNotEqual(result.returncode, 0, var)
            self.assertIn(var, result.stderr)

    def test_missing_scan_evidence_stops(self) -> None:
        self.commit({SPACE: "space body\n"})
        (self.scans / "semgrep.json").unlink()
        result = self.run_script()
        self.assertEqual(result.returncode, 2)
        self.assertIn("no scan evidence", result.stderr)


if __name__ == "__main__":
    unittest.main()
