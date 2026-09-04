from __future__ import annotations

import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))


def load_script(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / filename)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CHECK_DOCS = load_script("check_docs", "check-docs.py")


def write_doc(root: Path, relative: str, body: str) -> None:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body, encoding="utf-8")


class StaleClaimTests(unittest.TestCase):
    def problems_for(self, root: Path, relative: str, body: str) -> list[str]:
        write_doc(root, relative, body)
        problems: list[str] = []
        CHECK_DOCS.validate_stale_claims(problems, root)
        return [item for item in problems if item.startswith(relative + ":")]

    def test_active_team_calls_flagged(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            create_problems = self.problems_for(root, "skills/demo/SKILL.md", "Run TeamCreate(team_name: \"x\") first.\n")
            delete_problems = self.problems_for(root, "skills/demo/SKILL.md", "Finish with TeamDelete() when done.\n")
        self.assertTrue(any("TeamCreate" in item for item in create_problems), create_problems)
        self.assertTrue(any("TeamDelete" in item for item in delete_problems), delete_problems)

    def test_active_opencode_exec_flagged(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            problems = self.problems_for(
                root, "skills/demo/SKILL.md", "Consult via `opencode exec --model x` headlessly.\n"
            )
        self.assertTrue(any("opencode exec" in item for item in problems), problems)

    def test_opencode_exec_negations_allowed(self) -> None:
        negations = [
            "There is no `opencode exec` and no native DAG/workflow engine).\n",
            "no phases. There is no `opencode exec`.\n",
            "# opencode worker — no `opencode exec` exists; `opencode run` is the entrypoint.\n",
            "**OpenCode**: no workflow runtime and no `opencode exec`. Translate the\n",
            "There is no opencode exec command; the headless entrypoint is `opencode run`.\n",
            "- There is no `opencode exec`. The consult entrypoint is `opencode run`:\n",
        ]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for index, body in enumerate(negations):
                with self.subTest(index=index):
                    self.assertEqual(
                        self.problems_for(root, f"skills/neg{index}/SKILL.md", body), []
                    )

    def test_stale_legacy_sku_flagged(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            problems = self.problems_for(
                root, "skills/demo/SKILL.md", "Use `muse-spark/muse-spark-1.3` for private work.\n"
            )
        self.assertTrue(any("muse-spark/muse-spark-1.3" in item for item in problems), problems)

    def test_bare_go_sku_flagged_unless_unavailable(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            bare = self.problems_for(
                root, "skills/bare/SKILL.md", "Route via `opencode-go/muse-spark-1.3` for privacy.\n"
            )
            disclosed = self.problems_for(
                root,
                "skills/disclosed/SKILL.md",
                "- `opencode-go/muse-spark-1.3` is unavailable unless the live catalog lists it.\n",
            )
            contributor = self.problems_for(
                root,
                "skills/ok/SKILL.md",
                "ADVISOR_MODEL=\"opencode-go/muse-spark-1.3-contributor\" pin explicitly.\n",
            )
        self.assertTrue(any("opencode-go/muse-spark-1.3" in item for item in bare), bare)
        self.assertEqual(disclosed, [])
        self.assertEqual(contributor, [])

    def test_wrap_artifact_flagged(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            problems = self.problems_for(
                root, "skills/demo/SKILL.md", " +      --sandbox workspace\n"
            )
        self.assertTrue(any("wrap artifact" in item for item in problems), problems)

    def test_changelog_and_eval_fixtures_excluded(self) -> None:
        stale = (
            "TeamCreate(team_name: \"x\")\n"
            "Run `opencode exec --model x`.\n"
            "Use `muse-spark/muse-spark-1.3`.\n"
            "Route via `opencode-go/muse-spark-1.3`.\n"
            " +      --sandbox workspace\n"
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_doc(root, "CHANGELOG.md", "# history\n\n" + stale)
            write_doc(root, "modules/orchestra/skills/coordinator/evals/evals.json", stale)
            problems: list[str] = []
            CHECK_DOCS.validate_stale_claims(problems, root)
        self.assertEqual(problems, [])


class VisualWorkflowContractTests(unittest.TestCase):
    """Small semantic guards for the public visual workflow contract."""

    ROOT = Path(__file__).resolve().parents[2]
    HTML = ROOT / "modules/orchestra/skills/visual-coordinator/examples/graph-builder.html"
    DETECTOR = ROOT / "modules/orchestra/skills/visual-coordinator/scripts/detect-harness.sh"
    TOOL = ROOT / "tools/visual-coordinator"

    def test_schema_and_command_contracts(self) -> None:
        if shutil.which("bun") is None:
            self.skipTest("Bun is not installed in the isolated Python runner")
        result = subprocess.run(
            ["bun", "run", "test"], cwd=self.TOOL, capture_output=True, text=True, check=True
        )
        self.assertIn("passed", result.stdout)

    def test_generated_artifact_is_current_and_portable(self) -> None:
        if shutil.which("bun") is None:
            self.skipTest("Bun is not installed in the isolated Python runner")
        result = subprocess.run(
            ["bun", "run", "check:plugin"], cwd=self.TOOL, capture_output=True, text=True, check=True
        )
        self.assertIn("artifact is current", result.stdout)

    def test_mobile_preview_and_keyboard_edges(self) -> None:
        text = self.HTML.read_text(encoding="utf-8")
        for term in ("Visual Coordinator", "Review mode", "Export workflow", "React Flow"):
            self.assertIn(term, text)
        self.assertNotRegex(text, r'<script[^>]+src=')
        self.assertNotRegex(text, r'<link[^>]+rel=["\']stylesheet')

    def test_detector_discovers_opencode_and_toml_rosters(self) -> None:
        env = dict(os.environ)
        env.pop("GROK_AGENT", None)
        env.pop("GROK_HOME", None)
        env.pop("OPENCODE", None)
        env.pop("OPENCODE_PID", None)
        env.pop("CLAUDECODE", None)
        env.pop("CLAUDE_PLUGIN_ROOT", None)
        env.pop("CODEX_HOME", None)
        env.pop("CODEX_SANDBOX", None)
        env["PATH"] = "/usr/bin:/bin"
        env["BOPEN_HOST_HARNESS"] = "codex"
        output = subprocess.run(["bash", str(self.DETECTOR)], cwd=self.ROOT, env=env, capture_output=True, text=True, check=True)
        detected = json.loads(output.stdout)
        self.assertEqual(detected["harness"], "codex")
        env["BOPEN_HOST_HARNESS"] = "spoofed"
        refused = subprocess.run(["bash", str(self.DETECTOR)], cwd=self.ROOT, env=env, capture_output=True, text=True, check=True)
        self.assertEqual(json.loads(refused.stdout)["harness"], "unknown")

    def test_detector_queries_each_configured_opencode_provider(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            config_dir = temp / ".config" / "opencode"
            config_dir.mkdir(parents=True)
            (config_dir / "opencode.json").write_text(
                '{"model":"alpha/first","provider":{"alpha":{"models":{"first":{}}},"beta":{"models":{"second":{}}}}}\n',
                encoding="utf-8",
            )
            calls = temp / "calls"
            fake = temp / "opencode"
            fake.write_text(
                "#!/usr/bin/env bash\n"
                "printf '%s\\n' \"$*\" >> \"$OPENCODE_CALLS\"\n"
                "case \"$1:$2\" in\n"
                "  models:alpha) printf '%s\\n' 'first' 'alpha/shared' 'first' ;;\n"
                "  models:beta) printf '%s\\n' 'beta/second' 'beta/shared' ;;\n"
                "  models:) printf '%s\\n' 'unscoped/should-not-be-used'; exit 9 ;;\n"
                "  *) exit 9 ;;\n"
                "esac\n",
                encoding="utf-8",
            )
            fake.chmod(0o755)
            env = dict(os.environ)
            env.update({"HOME": str(temp), "PATH": f"{temp}:/usr/bin:/bin", "OPENCODE_CALLS": str(calls)})
            env["BOPEN_HOST_HARNESS"] = "codex"
            detected = json.loads(
                subprocess.run(
                    ["bash", str(self.DETECTOR)], cwd=self.ROOT, env=env,
                    capture_output=True, text=True, check=True,
                ).stdout
            )
            self.assertEqual(detected["models"]["opencode"], [
                "alpha/first", "alpha/shared", "beta/second", "beta/shared",
            ])
            self.assertEqual(calls.read_text(encoding="utf-8").splitlines(), ["models alpha", "models beta"])

    def test_detector_handles_opencode_inventory_failure_without_logging_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            fake = temp / "opencode"
            fake.write_text(
                "#!/usr/bin/env bash\n"
                "printf '%s\\n' 'token=do-not-log' >&2\n"
                "exit 7\n",
                encoding="utf-8",
            )
            fake.chmod(0o755)
            env = dict(os.environ)
            env.update({"HOME": str(temp), "PATH": f"{temp}:/usr/bin:/bin"})
            env["BOPEN_HOST_HARNESS"] = "opencode"
            result = subprocess.run(
                ["bash", str(self.DETECTOR)], cwd=self.ROOT, env=env,
                capture_output=True, text=True, check=True,
            )
            detected = json.loads(result.stdout)
            self.assertEqual(detected["models"]["opencode"], [])
            self.assertNotIn("do-not-log", result.stdout)
            self.assertNotIn("do-not-log", result.stderr)

    def test_detector_redirects_opencode_data_home_for_read_only_sandbox(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            readonly_data = temp / "readonly-data"
            readonly_data.mkdir()
            readonly_data.chmod(0o500)
            config_dir = temp / ".config" / "opencode"
            config_dir.mkdir(parents=True)
            (config_dir / "opencode.json").write_text(
                '{"provider":{"alpha":{"models":{"first":{}}}}}\n',
                encoding="utf-8",
            )
            fake = temp / "opencode"
            fake.write_text(
                "#!/usr/bin/env bash\n"
                "if [[ -z \"${XDG_DATA_HOME:-}\" || \"$XDG_DATA_HOME\" == \"$OPENCODE_READONLY_DATA\" ]]; then\n"
                "  printf '%s\\n' 'OpenCode received its read-only data home' >&2\n"
                "  exit 17\n"
                "fi\n"
                "mkdir -p \"$XDG_DATA_HOME/opencode\"\n"
                "printf '%s\\n' 'alpha/first'\n",
                encoding="utf-8",
            )
            fake.chmod(0o755)
            env = dict(os.environ)
            env.update({
                "HOME": str(temp),
                "PATH": f"{temp}:/usr/bin:/bin",
                "XDG_DATA_HOME": str(readonly_data),
                "OPENCODE_READONLY_DATA": str(readonly_data),
                "BOPEN_HOST_HARNESS": "codex",
            })
            try:
                result = subprocess.run(
                    ["bash", str(self.DETECTOR)], cwd=self.ROOT, env=env,
                    capture_output=True, text=True, check=True,
                )
            finally:
                readonly_data.chmod(0o700)
            detected = json.loads(result.stdout)
            self.assertEqual(detected["models"]["opencode"], ["alpha/first"])
            self.assertNotIn("read-only data home", result.stdout)
            self.assertNotIn("read-only data home", result.stderr)

    def test_clean_tree_passes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_doc(
                root,
                "skills/demo/SKILL.md",
                "There is no `opencode exec`; use `opencode run`.\n"
                "First named `Agent` spawn creates the team implicitly.\n",
            )
            problems: list[str] = []
            CHECK_DOCS.validate_stale_claims(problems, root)
        self.assertEqual(problems, [])


class GrokWrapperTests(unittest.TestCase):
    ROOT = Path(__file__).resolve().parents[2]
    WRAPPER = ROOT / "modules/orchestra/skills/coordinator/scripts/run-grok-worker.sh"

    def test_exact_model_and_redacted_inventory(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            fake = temp / "grok"
            fake.write_text(
                "#!/usr/bin/env bash\n"
                "if [[ $1 == --sandbox ]]; then [[ $2 == workspace ]] || exit 9; shift 2; fi\n"
                "if [[ $1 == models ]]; then printf '%s\\n' 'You are logged in with grok.com.' '  * grok-4.6 (default)'; exit 0; fi\n"
                "if [[ $1 == inspect ]]; then printf '%s\\n' \"{\\\"grokVersion\\\":\\\"1.0.13\\\",\\\"cwd\\\":\\\"$PWD\\\",\\\"mcpServers\\\":[{\\\"env\\\":[{\\\"name\\\":\\\"API_KEY\\\",\\\"value\\\":\\\"do-not-log\\\"}]}],\\\"token\\\":\\\"do-not-log\\\",\\\"safe\\\":\\\"ok\\\"}\"; exit 0; fi\n"
                "printf '%s\\n' done\n",
                encoding="utf-8",
            )
            fake.chmod(0o755)
            prompt = temp / "prompt.md"
            prompt.write_text("Research only.\n", encoding="utf-8")
            log = temp / "run.log"
            env = dict(os.environ)
            env["PATH"] = f"{temp}:/usr/bin:/bin"
            command = ["bash", str(self.WRAPPER), "--auth", "grok.com", "--model", "grok-4.6", "--mode", "read", "--cwd", str(temp), "--prompt-file", str(prompt), "--log", str(log)]
            subprocess.run(command, cwd=self.ROOT, env=env, capture_output=True, text=True, check=True)
            inventory = Path(str(log) + ".inspect.json").read_text(encoding="utf-8")
            self.assertNotIn("do-not-log", inventory)
            self.assertIn("<redacted>", inventory)
            self.assertIn("bopenSandboxProbe", inventory)
            self.assertIn("effectiveContainment", inventory)
            partial = command.copy()
            partial[partial.index("grok-4.6")] = "grok-4"
            rejected = subprocess.run(partial, cwd=self.ROOT, env=env, capture_output=True, text=True)
            self.assertNotEqual(rejected.returncode, 0)

    def test_write_mode_fails_closed_on_checkout_mismatch(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            subprocess.run(["git", "init", "-b", "codex/expected"], cwd=temp, check=True, capture_output=True)
            subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=temp, check=True)
            subprocess.run(["git", "config", "user.name", "Test"], cwd=temp, check=True)
            (temp / "README.md").write_text("test\n", encoding="utf-8")
            subprocess.run(["git", "add", "README.md"], cwd=temp, check=True)
            subprocess.run(["git", "commit", "-m", "base"], cwd=temp, check=True, capture_output=True)
            prompt = temp / "prompt.md"
            prompt.write_text("Implement the bounded change.\n", encoding="utf-8")
            command = [
                "bash", str(self.WRAPPER), "--auth", "grok.com", "--model", "grok-4.6",
                "--mode", "write", "--cwd", str(temp), "--prompt-file", str(prompt),
                "--log", str(temp / "run.log"), "--branch", "codex/wrong",
                "--base-ref", "HEAD", "--ownership", "README.md",
            ]

            rejected = subprocess.run(command, cwd=self.ROOT, capture_output=True, text=True)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertIn("branch mismatch", rejected.stderr)

    def test_read_mode_fails_closed_when_inspect_cwd_differs(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            fake = temp / "grok"
            fake.write_text(
                "#!/usr/bin/env bash\n"
                "if [[ $1 == --sandbox ]]; then shift 2; fi\n"
                "if [[ $1 == models ]]; then printf '%s\\n' 'You are logged in with grok.com.' '  * grok-4.6 (default)'; exit 0; fi\n"
                "if [[ $1 == inspect ]]; then printf '%s\\n' '{\"grokVersion\":\"1.0.13\",\"cwd\":\"/tmp/not-the-worker\"}'; exit 0; fi\n"
                "printf '%s\\n' done\n",
                encoding="utf-8",
            )
            fake.chmod(0o755)
            prompt = temp / "prompt.md"
            prompt.write_text("Research only.\n", encoding="utf-8")
            env = dict(os.environ)
            env["PATH"] = f"{temp}:/usr/bin:/bin"
            command = [
                "bash", str(self.WRAPPER), "--auth", "grok.com", "--model", "grok-4.6",
                "--mode", "read", "--cwd", str(temp), "--prompt-file", str(prompt),
                "--log", str(temp / "run.log"),
            ]

            rejected = subprocess.run(command, cwd=self.ROOT, env=env, capture_output=True, text=True)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertIn("cwd mismatch", rejected.stderr)


if __name__ == "__main__":
    unittest.main()
