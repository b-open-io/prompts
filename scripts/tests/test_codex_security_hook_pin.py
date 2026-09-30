"""The codex-security pre-commit recipe pins the generated hook to gpt-6-sol at xhigh."""

from __future__ import annotations

import os
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "modules/review/skills/codex-security/references/sdk-and-automation.md"

# Mirrors the hook @openai/codex-security 0.1.31 `install-hook` writes.
FAKE_CLI = r"""#!/usr/bin/env bash
set -eu
[[ $1 == install-hook ]] || exit 9
repo=$2 sev=${4:-high}
hook=$(git -C "$repo" rev-parse --path-format=absolute --git-path hooks/pre-commit)
[[ -e $hook ]] && { echo "A pre-commit hook already exists at $hook." >&2; exit 2; }
mkdir -p "$(dirname "$hook")"
printf "#!/bin/sh\nset -eu\nexec '/usr/bin/node' '/opt/it'\"'\"'s/cli.js' scan . --working-tree --fail-on-severity %s\n" "$sev" > "$hook"
chmod 755 "$hook"
${FAKE_EXTRA:-true} "$hook"
"""


def recipe() -> str:
    section = DOC.read_text().split("## 3. Pre-commit hook", 1)[1]
    return re.search(r"^```bash\n(.*?)^```$", section, re.M | re.S).group(1)


class HookPinTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.repo = root / "repo"
        subprocess.run(["git", "init", "-q", str(self.repo)], check=True)
        bin_dir = root / "bin"
        bin_dir.mkdir()
        (bin_dir / "codex-security").write_text(FAKE_CLI)
        (bin_dir / "codex-security").chmod(0o755)
        self.script = root / "pin.sh"
        self.script.write_text(recipe().replace("REPO=/path/to/repository", f"REPO='{self.repo}'"))
        self.env = {**os.environ, "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}"}
        self.hook = self.repo / ".git/hooks/pre-commit"

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def run_recipe(self, **env: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(["bash", str(self.script)], env={**self.env, **env}, capture_output=True, text=True)

    def test_pins_the_generated_scan_line(self) -> None:
        result = self.run_recipe()
        self.assertEqual(result.returncode, 0, result.stderr)
        lines = self.hook.read_text().splitlines()
        self.assertEqual(lines[:2], ["#!/bin/sh", "set -eu"])
        self.assertTrue(lines[2].endswith("scan . --working-tree --fail-on-severity high --model gpt-6-sol --effort xhigh"))
        self.assertEqual(list(self.hook.parent.glob("*.orig")), [])
        self.assertTrue(os.access(self.hook, os.X_OK))

    def test_leaves_an_existing_hook_alone(self) -> None:
        self.hook.parent.mkdir(parents=True, exist_ok=True)
        self.hook.write_text("#!/bin/sh\necho custom\n")
        result = self.run_recipe()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(self.hook.read_text(), "#!/bin/sh\necho custom\n")

    def test_removes_a_hook_it_cannot_pin(self) -> None:
        result = self.run_recipe(FAKE_EXTRA="sed -i.bak -e s/scan/sweep/")
        self.assertEqual(result.returncode, 1)
        self.assertIn("could not pin", result.stderr)
        self.assertFalse(self.hook.exists())

    def test_removes_the_hook_when_install_hook_fails_after_writing(self) -> None:
        result = self.run_recipe(FAKE_EXTRA="false")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("hook removed", result.stderr)
        self.assertFalse(self.hook.exists())

    def test_removes_the_hook_when_sed_fails(self) -> None:
        shim = Path(self.tmp.name) / "shim"
        shim.mkdir()
        (shim / "sed").write_text("#!/bin/sh\nexit 4\n")
        (shim / "sed").chmod(0o755)
        result = self.run_recipe(PATH=f"{shim}{os.pathsep}{self.env['PATH']}")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("hook removed", result.stderr)
        self.assertFalse(self.hook.exists())
        self.assertEqual(list(self.hook.parent.glob("*.orig")), [])


if __name__ == "__main__":
    unittest.main()
