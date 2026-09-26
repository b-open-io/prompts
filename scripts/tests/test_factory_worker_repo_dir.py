from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path


WORKER = Path(__file__).resolve().parents[1] / "prompts-factory-worker.sh"
GH_SENTINEL = 42


def git(*args: str, cwd: Path) -> None:
    subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@t", *args],
        cwd=cwd,
        check=True,
        capture_output=True,
    )


class RepoDirCheckTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.home = self.root / "home"
        (self.home / ".prompts-factory" / "loop").mkdir(parents=True)
        # A stub gh stops the worker right after the repoDir check passes.
        bin_dir = self.root / "bin"
        bin_dir.mkdir()
        gh = bin_dir / "gh"
        gh.write_text(f"#!/bin/sh\nexit {GH_SENTINEL}\n")
        gh.chmod(0o755)
        self.env = {**os.environ, "HOME": str(self.home), "PATH": f"{bin_dir}:{os.environ['PATH']}"}

        self.main = self.root / "main"
        self.main.mkdir()
        git("init", "-q", "-b", "main", cwd=self.main)
        git("commit", "-q", "--allow-empty", "-m", "c1", cwd=self.main)
        self.worktree = self.root / "wt"
        git("worktree", "add", "-q", "-b", "wt", str(self.worktree), cwd=self.main)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def run_worker(self, repo_dir: Path) -> subprocess.CompletedProcess[str]:
        manifest = self.home / ".prompts-factory" / "loop" / "loop.json"
        manifest.write_text(json.dumps({"repoDir": str(repo_dir)}))
        return subprocess.run(["bash", str(WORKER)], env=self.env, capture_output=True, text=True)

    def assert_accepted(self, repo_dir: Path) -> None:
        result = self.run_worker(repo_dir)
        self.assertNotIn("BAD_REPO_DIR", result.stderr)
        self.assertEqual(result.returncode, GH_SENTINEL, result.stderr)

    def assert_rejected(self, repo_dir: Path) -> None:
        result = self.run_worker(repo_dir)
        self.assertEqual(result.returncode, 2, result.stderr)
        self.assertIn(f"BAD_REPO_DIR: {repo_dir} from loop.json is not a git checkout", result.stderr)

    def test_normal_checkout(self) -> None:
        self.assertTrue((self.main / ".git").is_dir())
        self.assert_accepted(self.main)

    def test_worktree(self) -> None:
        self.assertTrue((self.worktree / ".git").is_file())
        self.assert_accepted(self.worktree)

    def test_symlink_to_worktree(self) -> None:
        link = self.root / "link"
        link.symlink_to(self.worktree)
        self.assert_accepted(link)

    def test_plain_dir(self) -> None:
        plain = self.root / "plain"
        plain.mkdir()
        self.assert_rejected(plain)

    def test_subdirectory_of_checkout(self) -> None:
        sub = self.main / "sub"
        sub.mkdir()
        self.assert_rejected(sub)

    def test_missing_dir(self) -> None:
        self.assert_rejected(self.root / "missing")


if __name__ == "__main__":
    unittest.main()
