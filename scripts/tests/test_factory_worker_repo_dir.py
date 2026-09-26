from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path


WORKER = Path(__file__).resolve().parents[1] / "prompts-factory-worker.sh"
GH_SENTINEL = 42
GIT_LOCATION_VARS = (
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_COMMON_DIR",
    "GIT_INDEX_FILE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_CEILING_DIRECTORIES",
    "GIT_DISCOVERY_ACROSS_FILESYSTEM",
    "GIT_NAMESPACE",
)


def base_env() -> dict[str, str]:
    # Keep the user's git config (signing, hooks) and any ambient repo
    # location out of both setup and the worker run.
    env = {
        k: v
        for k, v in os.environ.items()
        if k not in GIT_LOCATION_VARS
        and k not in ("CDPATH", "GIT_CONFIG_COUNT")
        and not k.startswith(("GIT_CONFIG_KEY_", "GIT_CONFIG_VALUE_"))
    }
    env.update(
        GIT_CONFIG_GLOBAL=os.devnull,
        GIT_CONFIG_NOSYSTEM="1",
        GIT_AUTHOR_NAME="Test",
        GIT_AUTHOR_EMAIL="test@example.com",
        GIT_COMMITTER_NAME="Test",
        GIT_COMMITTER_EMAIL="test@example.com",
    )
    return env


def git(*args: str, cwd: Path) -> None:
    subprocess.run(
        ["git", "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null", *args],
        cwd=cwd,
        env=base_env(),
        check=True,
        capture_output=True,
    )


def make_repo(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    git("init", "-q", "-b", "main", cwd=path)
    git("commit", "-q", "--allow-empty", "-m", "c1", cwd=path)
    return path


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
        self.env = {**base_env(), "HOME": str(self.home), "PATH": f"{bin_dir}:{os.environ['PATH']}"}

        self.main = make_repo(self.root / "main")
        self.other = make_repo(self.root / "other")
        self.worktree = self.root / "wt"
        git("worktree", "add", "-q", "-b", "wt", str(self.worktree), cwd=self.main)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def run_worker(
        self, repo_dir: Path | str, extra: dict[str, str] | None = None, cwd: Path | None = None
    ) -> subprocess.CompletedProcess[str]:
        manifest = self.home / ".prompts-factory" / "loop" / "loop.json"
        manifest.write_text(json.dumps({"repoDir": str(repo_dir)}))
        return subprocess.run(
            ["bash", str(WORKER)],
            env={**self.env, **(extra or {})},
            cwd=cwd,
            capture_output=True,
            text=True,
        )

    def assert_accepted(self, repo_dir: Path | str, **kw) -> None:
        result = self.run_worker(repo_dir, **kw)
        self.assertNotIn("BAD_REPO_DIR", result.stderr)
        self.assertEqual(result.returncode, GH_SENTINEL, result.stderr)
        self.assertEqual(result.stdout, "")

    def assert_rejected(self, repo_dir: Path | str, **kw) -> None:
        result = self.run_worker(repo_dir, **kw)
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

    def test_trailing_slash(self) -> None:
        self.assert_accepted(f"{self.main}/")

    def test_paths_with_spaces(self) -> None:
        spaced = make_repo(self.root / "has space")
        self.assert_accepted(spaced)
        spaced_wt = self.root / "wt with space"
        git("worktree", "add", "-q", "-b", "spaced", str(spaced_wt), cwd=self.main)
        self.assert_accepted(spaced_wt)

    def test_submodule(self) -> None:
        git("-c", "protocol.file.allow=always", "submodule", "add", "-q", str(self.other), "sub", cwd=self.main)
        sub = self.main / "sub"
        self.assertTrue((sub / ".git").is_file())
        self.assert_accepted(sub)

    def test_nested_repo(self) -> None:
        self.assert_accepted(make_repo(self.main / "nested"))

    def test_relative_with_cdpath(self) -> None:
        decoy = self.root / "decoy"
        (decoy / "main").mkdir(parents=True)
        self.assert_accepted("main", cwd=self.root, extra={"CDPATH": f"{decoy}:"})

    def test_plain_dir(self) -> None:
        plain = self.root / "plain"
        plain.mkdir()
        self.assert_rejected(plain)

    def test_plain_dir_with_git_dir(self) -> None:
        plain = self.root / "plain"
        plain.mkdir()
        self.assert_rejected(plain, extra={"GIT_DIR": str(self.other / ".git")})

    def test_plain_dir_with_git_work_tree(self) -> None:
        plain = self.root / "plain"
        plain.mkdir()
        self.assert_rejected(
            plain, extra={"GIT_DIR": str(self.other / ".git"), "GIT_WORK_TREE": str(plain)}
        )
        self.assert_rejected(plain, extra={"GIT_WORK_TREE": str(plain)}, cwd=self.other)

    def test_git_dir_itself(self) -> None:
        self.assert_rejected(self.main / ".git")

    def test_bare_repo(self) -> None:
        bare = self.root / "bare.git"
        git("init", "-q", "--bare", str(bare), cwd=self.root)
        self.assert_rejected(bare)

    def test_subdirectory_of_checkout(self) -> None:
        sub = self.main / "sub"
        sub.mkdir()
        self.assert_rejected(sub)

    def test_missing_dir(self) -> None:
        self.assert_rejected(self.root / "missing")


if __name__ == "__main__":
    unittest.main()
