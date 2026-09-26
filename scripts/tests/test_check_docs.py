from __future__ import annotations

import importlib.util
import json
import os
import re
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

    def test_detector_rejects_superseded_grok_models(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            fake = temp / "grok"
            fake.write_text(
                "#!/usr/bin/env bash\n"
                "if [[ $1 == models ]]; then\n"
                "  printf '%s\\n' '  - grok-4.6' '  * grok-4.7 (default)' '  - gpt-6-sol'\n"
                "fi\n",
                encoding="utf-8",
            )
            fake.chmod(0o755)
            env = dict(os.environ)
            env.update({
                "HOME": str(temp),
                "PATH": f"{temp}:/usr/bin:/bin",
                "BOPEN_HOST_HARNESS": "grok",
            })
            output = subprocess.run(
                ["bash", str(self.DETECTOR)], cwd=self.ROOT, env=env,
                capture_output=True, text=True, check=True,
            )
            detected = json.loads(output.stdout)
            self.assertEqual(detected["models"]["grok"], ["grok-4.7", "gpt-6-sol"])
            self.assertIs(detected["credit_pressure"], False)
            env["BOPEN_USAGE_CREDIT_PRESSURE"] = "1"
            pressured = subprocess.run(
                ["bash", str(self.DETECTOR)], cwd=self.ROOT, env=env,
                capture_output=True, text=True, check=True,
            )
            self.assertIs(json.loads(pressured.stdout)["credit_pressure"], True)

    def _detect_grok(self, script: str, extra_env: dict[str, str] | None = None, config: str | None = None) -> dict:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            fake = temp / "grok"
            fake.write_text("#!/usr/bin/env bash\n" + script, encoding="utf-8")
            fake.chmod(0o755)
            if config is not None:
                (temp / ".grok").mkdir()
                (temp / ".grok" / "config.toml").write_text(config, encoding="utf-8")
            env = {key: value for key, value in os.environ.items() if key not in {"XAI_API_KEY", "GROK_API_KEY", "GROK_HOME"}}
            env.update({"HOME": str(temp), "PATH": f"{temp}:/usr/bin:/bin", "BOPEN_HOST_HARNESS": "grok", **(extra_env or {})})
            output = subprocess.run(["bash", str(self.DETECTOR)], cwd=self.ROOT, env=env, capture_output=True, text=True, check=True)
            self.assertNotIn("secret-key", output.stdout)
            return json.loads(output.stdout)

    def test_detector_reports_grok_default_and_signed_in_auth(self) -> None:
        detected = self._detect_grok(
            "if [[ $1 == models ]]; then printf '%s\\n' 'You are logged in with grok.com.' '  - grok-4.7' '  * gpt-6-sol (default)'; fi\n"
        )
        self.assertEqual(detected["grok_auth"], "grok.com")
        self.assertEqual(detected["models"]["grok"], ["grok-4.7", "gpt-6-sol"])
        self.assertEqual(detected["models"]["grok_default"], "gpt-6-sol")

    def test_detector_uses_api_catalog_when_not_signed_in(self) -> None:
        detected = self._detect_grok(
            "if [[ $1 != models ]]; then exit 0; fi\n"
            "if [[ -n ${XAI_API_KEY:-} ]]; then printf '%s\\n' 'You are using XAI_API_KEY' '  * grok-4.7 (default)'; exit 0; fi\n"
            "printf '%s\\n' 'You are not logged in.'\n",
            {"XAI_API_KEY": "secret-key"},
        )
        self.assertEqual(detected["grok_auth"], "api")
        self.assertEqual(detected["models"]["grok"], ["grok-4.7"])
        self.assertEqual(detected["models"]["grok_default"], "grok-4.7")

    def test_detector_maps_custom_grok_ids_to_their_base_url_provider(self) -> None:
        detected = self._detect_grok(
            "if [[ $1 == models ]]; then printf '%s\\n' 'You are logged in with grok.com.' '  * grok-4.7 (default)' '  - gpt-6-sol' '  - house-model'; fi\n",
            config=(
                '[model."gpt-6-sol"]\nmodel = "gpt-6-sol"\nbase_url = "https://api.openai.com/v1"\nenv_key = "OPENAI_API_KEY"\n\n'
                '[model."house-model"]\nmodel = "house"\n\n'
                '[model."unlisted"]\nbase_url = "https://api.anthropic.com/v1"\n'
            ),
        )
        self.assertEqual(detected["grok_model_providers"], {"gpt-6-sol": "openai"})

    def test_detector_parses_single_quoted_toml_like_double_quoted(self) -> None:
        listing = "if [[ $1 == models ]]; then printf '%s\\n' 'You are logged in with grok.com.' '  * grok-4.7 (default)' '  - ox-alpha' '  - gpt-6-sol'; fi\n"
        config = (
            '[model."ox-alpha"]\nmodel = "grok-4.6"\nbase_url = "https://api.x.ai/v1"\n\n'
            '[model."gpt-6-sol"]\nmodel = "gpt-6-sol"\nbase_url = "https://api.openai.com/v1"\n'
        )
        double = self._detect_grok(listing, config=config)
        single = self._detect_grok(listing, config=config.replace('"', "'"))
        for detected in (double, single):
            self.assertEqual(detected["grok_model_providers"], {"ox-alpha": "xai", "gpt-6-sol": "openai"})
            self.assertEqual(detected["grok_model_targets"], {"ox-alpha": "grok-4.6", "gpt-6-sol": "gpt-6-sol"})

    def test_detector_resolves_nothing_from_unparseable_toml(self) -> None:
        detected = self._detect_grok(
            "if [[ $1 == models ]]; then printf '%s\\n' 'You are logged in with grok.com.' '  * grok-4.7 (default)' '  - ox-alpha'; fi\n",
            config='[model."ox-alpha"\nmodel = grok-4.6\n',
        )
        self.assertEqual(detected["models"]["grok"], ["grok-4.7", "ox-alpha"])
        self.assertEqual(detected["grok_model_providers"], {})
        self.assertEqual(detected["grok_model_targets"], {})

    def test_detector_reports_custom_grok_alias_targets(self) -> None:
        detected = self._detect_grok(
            "if [[ $1 == models ]]; then printf '%s\\n' 'You are logged in with grok.com.' '  * grok-4.7 (default)' '  - ox-alpha'; fi\n",
            config='[model."ox-alpha"]\nmodel = "grok-4.6"\nbase_url = "https://api.x.ai/v1"\n',
        )
        self.assertEqual(detected["grok_model_providers"], {"ox-alpha": "xai"})
        self.assertEqual(detected["grok_model_targets"], {"ox-alpha": "grok-4.6"})

    SLASHY_LISTING = (
        "if [[ $1 == models ]]; then printf '%s\\n' 'You are logged in with grok.com.' "
        "'  * xai/grok-4.6 (default)' '  - xai/ox-alpha' '  - openrouter/x-ai/grok-4.7' '  - openrouter/x-ai/grok-4.6' '  - XAI/GROK-4.5'; fi\n"
    )
    SLASHY_CONFIG = '[model."xai/ox-alpha"]\nmodel = "grok-4.7"\nbase_url = "https://api.x.ai/v1"\n'

    def test_detector_keeps_slash_qualified_grok_ids_whole(self) -> None:
        detected = self._detect_grok(self.SLASHY_LISTING, config=self.SLASHY_CONFIG)
        self.assertEqual(detected["models"]["grok"], ["xai/ox-alpha", "openrouter/x-ai/grok-4.7"])
        self.assertEqual(detected["models"]["grok_default"], "xai/grok-4.6")
        self.assertEqual(detected["grok_model_targets"], {"xai/ox-alpha": "grok-4.7"})
        self.assertEqual(detected["grok_model_providers"], {"xai/ox-alpha": "xai"})

    def test_slash_qualified_grok_ids_round_trip_into_the_canvas(self) -> None:
        if shutil.which("bun") is None:
            self.skipTest("Bun is not installed in the isolated Python runner")
        detected = self._detect_grok(self.SLASHY_LISTING, extra_env={"BOPEN_USAGE_CREDIT_PRESSURE": "1"}, config=self.SLASHY_CONFIG)
        probe = """
import { defaultWorkflow, parseEnvironment, validateWorkflow, mainNodeId } from "./src/workflow-schema";
const environment = parseEnvironment(JSON.parse(process.argv[2]));
const workflow = defaultWorkflow(environment);
workflow.nodes = [workflow.nodes[0], ...["xai/ox-alpha", "openrouter/x-ai/grok-4.7"].map((model, index) => ({
  ...workflow.nodes[1], id: `build-${index}`, title: `Build ${index}`, lane: "grok", provider: "external", model, disclosure: "Approved xAI dispatch",
}))];
workflow.edges = [];
console.log(JSON.stringify({
  models: environment.lanes.grok.models,
  main: mainNodeId(workflow, environment),
  coordinator: workflow.nodes[0].model,
  issues: validateWorkflow(workflow, environment).map((issue) => issue.message),
}));
"""
        with tempfile.NamedTemporaryFile("w", suffix=".ts", dir=self.TOOL, delete=False) as handle:
            handle.write(probe)
        try:
            result = subprocess.run(["bun", handle.name, json.dumps(detected)], cwd=self.TOOL, capture_output=True, text=True, check=True)
        finally:
            Path(handle.name).unlink()
        observed = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(observed["models"], ["xai/ox-alpha", "openrouter/x-ai/grok-4.7"])
        self.assertEqual(observed["main"], "coordinate")
        self.assertEqual(observed["coordinator"], "xai/grok-4.6")
        self.assertEqual(observed["issues"], [])

    def test_detector_never_assumes_a_custom_id_serves_itself(self) -> None:
        detected = self._detect_grok(
            "if [[ $1 == models ]]; then printf '%s\\n' 'You are logged in with grok.com.' '  * grok-4.7 (default)' '  - ox-alpha'; fi\n",
            config='[model."ox-alpha"]\nbase_url = "https://openrouter.ai/api/v1"\n',
        )
        self.assertEqual(detected["grok_model_providers"], {"ox-alpha": "openrouter"})
        self.assertEqual(detected["grok_model_targets"], {})

    def test_detector_never_adds_config_only_grok_ids(self) -> None:
        detected = self._detect_grok(
            "if [[ $1 == models ]]; then printf '%s\\n' 'You are logged in with grok.com.' '  * grok-4.7 (default)'; fi\n",
            config='[model."gpt-6-sol"]\nmodel = "gpt-6-sol"\n',
        )
        self.assertEqual(detected["models"]["grok"], ["grok-4.7"])

    def test_detector_reports_wrapper_path_and_codex_main(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            codex_home = temp / "codex"
            codex_home.mkdir()
            (codex_home / "config.toml").write_text('model = "gpt-6-astra"\n', encoding="utf-8")
            env = {key: value for key, value in os.environ.items() if key != "BOPEN_GROK_WORKER"}
            env.update({"HOME": str(temp), "PATH": "/usr/bin:/bin", "CODEX_HOME": str(codex_home), "BOPEN_HOST_HARNESS": "codex"})
            detected = json.loads(subprocess.run(
                ["bash", str(self.DETECTOR)], cwd=temp, env=env, capture_output=True, text=True, check=True,
            ).stdout)
            wrapper = Path(detected["grok_worker"])
            self.assertTrue(wrapper.is_absolute())
            self.assertEqual(wrapper.resolve(), (self.ROOT / "modules/orchestra/skills/coordinator/scripts/run-grok-worker.sh").resolve())
            self.assertEqual(detected["models"]["codex_default"], "gpt-6-astra")

            env["BOPEN_GROK_WORKER"] = str(temp / "missing/run-grok-worker.sh")
            missing = json.loads(subprocess.run(
                ["bash", str(self.DETECTOR)], cwd=temp, env=env, capture_output=True, text=True, check=True,
            ).stdout)
            self.assertIsNone(missing["grok_worker"])

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
                "if [[ $1 == models ]]; then printf '%s\\n' 'You are logged in with grok.com.' '  * grok-4.7 (default)'; exit 0; fi\n"
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
            command = ["bash", str(self.WRAPPER), "--auth", "grok.com", "--model", "grok-4.7", "--credit-pressure", "--mode", "read", "--cwd", str(temp), "--prompt-file", str(prompt), "--log", str(log)]
            subprocess.run(command, cwd=self.ROOT, env=env, capture_output=True, text=True, check=True)
            inventory = Path(str(log) + ".inspect.json").read_text(encoding="utf-8")
            self.assertNotIn("do-not-log", inventory)
            self.assertIn("<redacted>", inventory)
            self.assertIn("bopenSandboxProbe", inventory)
            self.assertIn("effectiveContainment", inventory)
            partial = command.copy()
            partial[partial.index("grok-4.7")] = "grok-4"
            rejected = subprocess.run(partial, cwd=self.ROOT, env=env, capture_output=True, text=True)
            self.assertNotEqual(rejected.returncode, 0)

    RAW_GROK_COMMAND = re.compile(r"^\s*(?:env\s.*\s)?grok\s+(?:--prompt-file|--single|-p|-m)\b")
    RAW_GROK_INLINE = re.compile(r"`grok\s+(?:--prompt-file|--single|-p|-m)\b")
    # Only a negation within three words before the command ("never a raw `grok --single`") exempts it.
    RAW_GROK_NEGATED = re.compile(r"(?i)\b(?:never|not|no|hand-roll)\b(?:\W+\w+){0,3}\W*$")

    def raw_grok_dispatches(self, text: str) -> list[int]:
        return [
            lineno
            for lineno, line in enumerate(text.splitlines(), start=1)
            if self.RAW_GROK_COMMAND.search(line)
            or any(not self.RAW_GROK_NEGATED.search(line[:match.start()]) for match in self.RAW_GROK_INLINE.finditer(line))
        ]

    def test_raw_grok_detector_flags_the_old_wave_instruction(self) -> None:
        flagged = [
            "`grok --single -m gpt-6-sol` inside a supervisor, or `codex exec`.",
            "must not be offered. Custom ids run through `grok --single -m`, which is a",
            "(`grok --single -m gpt-6-sol`), not as a native slug.",
        ]
        for line in flagged:
            with self.subTest(line=line):
                self.assertEqual(self.raw_grok_dispatches(line), [1])
        for line in ("confirming the entry; never a raw `grok --single` dispatch.", "hand-roll a `grok --prompt-file` call.", "Never emit a raw `grok -m` dispatch."):
            with self.subTest(line=line):
                self.assertEqual(self.raw_grok_dispatches(line), [])

    def test_documented_grok_dispatch_uses_only_the_wrapper(self) -> None:
        docs = [self.ROOT / "modules/orchestra/skills", self.ROOT / "modules/orchestra/agents"]
        offenders = [
            f"{path.relative_to(self.ROOT)}:{lineno}"
            for root in docs
            for path in root.rglob("*.md")
            for lineno in self.raw_grok_dispatches(path.read_text(encoding="utf-8"))
        ]
        self.assertEqual(offenders, [])

        docs = self.ROOT / "modules/orchestra/skills/coordinator"

        guide = (docs / "references/workers/grok.md").read_text(encoding="utf-8")
        block = re.search(r"^ {4}bash /absolute/path/to/coordinator/scripts/run-grok-worker\.sh \\\n(?: {6}.*\n)*?(?: {6}.*--mode read.*\n)(?: {6}.*\n)*", guide, re.M)
        self.assertIsNotNone(block, "workers/grok.md must document a read-mode wrapper dispatch")
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            spec = temp / "spec.md"
            spec.write_text("Research only.\n", encoding="utf-8")
            command = (block.group(0).replace("\\\n", " ")
                       .replace("/absolute/path/to/coordinator/scripts/run-grok-worker.sh", str(self.WRAPPER))
                       .replace("<repo>", str(temp)).replace("<spec>", str(spec))
                       .replace("/tmp/dispatch-<id>.log", str(temp / "run.log")))
            for model in ("GPT-5.6-LUNA", "gpt-5.6-luna", "GROK-4.6", "grok-4.6"):
                with self.subTest(model=model):
                    env = {key: value for key, value in os.environ.items() if key != "BOPEN_USAGE_CREDIT_PRESSURE"}
                    env["BOPEN_WORKER_MODEL"] = model
                    rejected = subprocess.run(["bash", "-c", command], cwd=self.ROOT, env=env, capture_output=True, text=True)
                    self.assertEqual(rejected.returncode, 2, rejected.stderr)
                    self.assertRegex(rejected.stderr, "GPT-5.6 models are out of policy|pinned to grok-4.7")

    ALIAS_CONFIG = (
        '[model."ox-alpha"]\nmodel = "grok-4.7"\nbase_url = "https://api.x.ai/v1"\n\n'
        '[model."ox-old"]\nmodel = "grok-4.6"\nbase_url = "https://api.x.ai/v1"\n\n'
        '[model."ox-blank"]\nbase_url = "https://api.x.ai/v1"\n\n'
        '[model."or-grok"]\nmodel = "x-ai/grok-4.6"\nbase_url = "https://openrouter.ai/api/v1"\n\n'
        '[model."or-luna"]\nmodel = "gpt-5.6-luna"\nbase_url = "https://api.openai.com/v1"\n\n'
        '[model."gpt-6-sol"]\nmodel = "gpt-6-sol"\nbase_url = "https://api.openai.com/v1"\n'
    )

    def test_wrapper_applies_grok_rules_to_custom_aliases(self) -> None:
        for quote in ('"', "'"):
            with self.subTest(quote=quote):
                self._check_alias_rules(self.ALIAS_CONFIG.replace('"', quote))

    def test_wrapper_fails_closed_on_unparseable_or_missing_alias_entries(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            (temp / ".grok").mkdir()
            config = temp / ".grok" / "config.toml"
            prompt = temp / "prompt.md"
            prompt.write_text("Research only.\n", encoding="utf-8")
            env = {key: value for key, value in os.environ.items() if key not in {"BOPEN_USAGE_CREDIT_PRESSURE", "GROK_HOME"}}
            env.update({"HOME": str(temp), "PATH": "/usr/bin:/bin"})
            base = ["bash", str(self.WRAPPER), "--auth", "grok.com", "--mode", "read", "--cwd", str(temp), "--prompt-file", str(prompt), "--log", str(temp / "run.log")]
            config.write_text('[model."ox-alpha"\nmodel = grok-4.7\n', encoding="utf-8")
            broken = subprocess.run(base + ["--model", "ox-alpha", "--credit-pressure"], cwd=self.ROOT, env=env, capture_output=True, text=True)
            self.assertEqual(broken.returncode, 2, broken.stderr)
            self.assertIn("could not parse", broken.stderr)
            config.write_text('[model."gpt-6-sol"]\nmodel = "gpt-6-sol"\n', encoding="utf-8")
            missing = subprocess.run(base + ["--model", "ox-alpha", "--credit-pressure"], cwd=self.ROOT, env=env, capture_output=True, text=True)
            self.assertEqual(missing.returncode, 2, missing.stderr)
            self.assertIn("no resolvable [model] entry", missing.stderr)
            hostless = subprocess.run(base + ["--model", "gpt-6-sol"], cwd=self.ROOT, env=env, capture_output=True, text=True)
            self.assertEqual(hostless.returncode, 2, hostless.stderr)
            self.assertIn("has no base_url", hostless.stderr)
            config.write_text("[model.'ox-alpha']\nbase_url = 'https://openrouter.ai/api/v1'\n", encoding="utf-8")
            modelless = subprocess.run(base + ["--model", "ox-alpha"], cwd=self.ROOT, env=env, capture_output=True, text=True)
            self.assertEqual(modelless.returncode, 2, modelless.stderr)
            self.assertIn("has no explicit model", modelless.stderr)
            for qualified in ("xai/ox-alpha", "XAI/OX-ALPHA", "openrouter/x-ai/ox-alpha"):
                config.write_text(f'[model."{qualified}"]\nmodel = "gpt-6-sol"\nbase_url = "https://openrouter.ai/api/v1"\n', encoding="utf-8")
                offlane = subprocess.run(base + ["--model", qualified, "--credit-pressure"], cwd=self.ROOT, env=env, capture_output=True, text=True)
                self.assertEqual(offlane.returncode, 2, offlane.stderr)
                self.assertIn("pinned to grok-4.7", offlane.stderr)
            for blank in ("   ", "", " grok-4.7 "):
                config.write_text(f'[model."ox-alpha"]\nmodel = "{blank}"\nbase_url = "https://openrouter.ai/api/v1"\n', encoding="utf-8")
                padded = subprocess.run(base + ["--model", "ox-alpha", "--credit-pressure"], cwd=self.ROOT, env=env, capture_output=True, text=True)
                self.assertEqual(padded.returncode, 2, padded.stderr)
                self.assertIn("has no explicit model", padded.stderr)
            for target, pressure, expected in (
                ("openrouter/x-ai/ox-alpha", False, "pinned to grok-4.7"),
                ("openrouter/x-ai/ox-alpha", True, "pinned to grok-4.7"),
                ("xai/ox-alpha", True, "pinned to grok-4.7"),
                ("openrouter/x-ai/grok-4.7", False, "usage-credit-pressure fallback"),
                ("openrouter/x-ai/grok-4.7", True, "grok is not installed"),
            ):
                config.write_text(f'[model."ox-alpha"]\nmodel = "{target}"\nbase_url = "https://openrouter.ai/api/v1"\n', encoding="utf-8")
                nested = subprocess.run(base + ["--model", "ox-alpha"] + (["--credit-pressure"] if pressure else []), cwd=self.ROOT, env=env, capture_output=True, text=True)
                self.assertEqual(nested.returncode, 1 if expected == "grok is not installed" else 2, (target, pressure, nested.stderr))
                self.assertIn(expected, nested.stderr)
            config.write_text("[model.'ox-alpha']\nmodel = 'ox-alpha'\nbase_url = ''\n", encoding="utf-8")
            empty_host = subprocess.run(base + ["--model", "ox-alpha"], cwd=self.ROOT, env=env, capture_output=True, text=True)
            self.assertEqual(empty_host.returncode, 2, empty_host.stderr)
            self.assertIn("has no base_url", empty_host.stderr)
            config.unlink()
            absent = subprocess.run(base + ["--model", "gpt-6-sol"], cwd=self.ROOT, env=env, capture_output=True, text=True)
            self.assertEqual(absent.returncode, 2, absent.stderr)
            builtin = subprocess.run(base + ["--model", "grok-4.7", "--credit-pressure"], cwd=self.ROOT, env=env, capture_output=True, text=True)
            self.assertEqual(builtin.returncode, 1, builtin.stderr)
            self.assertIn("grok is not installed", builtin.stderr)

    def _check_alias_rules(self, config_text: str) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            (temp / ".grok").mkdir()
            (temp / ".grok" / "config.toml").write_text(config_text, encoding="utf-8")
            prompt = temp / "prompt.md"
            prompt.write_text("Research only.\n", encoding="utf-8")
            env = {key: value for key, value in os.environ.items() if key not in {"BOPEN_USAGE_CREDIT_PRESSURE", "GROK_HOME"}}
            env.update({"HOME": str(temp), "PATH": "/usr/bin:/bin"})
            base = ["bash", str(self.WRAPPER), "--auth", "grok.com", "--mode", "read", "--cwd", str(temp), "--prompt-file", str(prompt), "--log", str(temp / "run.log")]
            rejected = [
                (["--model", "ox-alpha"], "usage-credit-pressure"),
                (["--model", "OX-ALPHA"], "usage-credit-pressure"),
                (["--model", "ox-old", "--credit-pressure"], "pinned to grok-4.7"),
                (["--model", "ox-blank", "--credit-pressure"], "has no explicit model"),
                (["--model", "or-grok", "--credit-pressure"], "pinned to grok-4.7"),
                (["--model", "or-luna"], "GPT-5.6 models are out of policy"),
            ]
            for extra, message in rejected:
                with self.subTest(extra=extra):
                    result = subprocess.run(base + extra, cwd=self.ROOT, env=env, capture_output=True, text=True)
                    self.assertEqual(result.returncode, 2, result.stderr)
                    self.assertIn(message, result.stderr)
            for extra in (["--model", "ox-alpha", "--credit-pressure"], ["--model", "gpt-6-sol"]):
                with self.subTest(extra=extra):
                    result = subprocess.run(base + extra, cwd=self.ROOT, env=env, capture_output=True, text=True)
                    self.assertEqual(result.returncode, 1, result.stderr)
                    self.assertIn("grok is not installed", result.stderr)

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
                "bash", str(self.WRAPPER), "--auth", "grok.com", "--model", "grok-4.7", "--credit-pressure",
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
                "if [[ $1 == models ]]; then printf '%s\\n' 'You are logged in with grok.com.' '  * grok-4.7 (default)'; exit 0; fi\n"
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
                "bash", str(self.WRAPPER), "--auth", "grok.com", "--model", "grok-4.7", "--credit-pressure",
                "--mode", "read", "--cwd", str(temp), "--prompt-file", str(prompt),
                "--log", str(temp / "run.log"),
            ]

            rejected = subprocess.run(command, cwd=self.ROOT, env=env, capture_output=True, text=True)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertIn("cwd mismatch", rejected.stderr)

    def test_model_policy_rejects_off_policy_grok_and_superseded_sol(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            prompt = temp / "prompt.md"
            prompt.write_text("Research only.\n", encoding="utf-8")
            env = {key: value for key, value in os.environ.items() if key != "BOPEN_USAGE_CREDIT_PRESSURE"}
            base = ["bash", str(self.WRAPPER), "--auth", "grok.com", "--mode", "read", "--cwd", str(temp), "--prompt-file", str(prompt), "--log", str(temp / "run.log")]
            cases = [
                (["--model", "grok-4.7"], {}, "usage-credit-pressure"),
                (["--model", "grok-4.6", "--credit-pressure"], {}, "pinned to grok-4.7"),
                (["--model", "grok-4.6"], {"BOPEN_USAGE_CREDIT_PRESSURE": "1"}, "pinned to grok-4.7"),
                (["--model", "gpt-5.6-sol"], {}, "GPT-5.6 models are out of policy"),
                (["--model", "openrouter/openai/gpt-5.6-luna"], {}, "GPT-5.6 models are out of policy"),
                (["--model", "xai/grok-4.6", "--credit-pressure"], {}, "pinned to grok-4.7"),
                (["--model", "openrouter/x-ai/grok-4.6"], {}, "pinned to grok-4.7"),
                (["--model", "openrouter/x-ai/grok-4.7"], {}, "usage-credit-pressure"),
                (["--model", "gpt-6-sol", "--effort", "max"], {}, "--effort must be"),
                (["--model", "GPT-5.6-LUNA"], {}, "GPT-5.6 models are out of policy"),
                (["--model", "OpenRouter/OpenAI/GPT-5.6-Sol"], {}, "GPT-5.6 models are out of policy"),
                (["--model", "GROK-4.6", "--credit-pressure"], {}, "pinned to grok-4.7"),
                (["--model", "XAI/Grok-4.6"], {}, "pinned to grok-4.7"),
                (["--model", "GROK-4.7"], {}, "usage-credit-pressure"),
            ]
            for extra, overrides, message in cases:
                with self.subTest(extra=extra, overrides=overrides):
                    rejected = subprocess.run(base + extra, cwd=self.ROOT, env={**env, **overrides}, capture_output=True, text=True)
                    self.assertEqual(rejected.returncode, 2)
                    self.assertIn(message, rejected.stderr)


class ModelDefaultTests(unittest.TestCase):
    ROOT = Path(__file__).resolve().parents[2]

    def test_root_model_defaults_match_dispatch_policy(self) -> None:
        data = json.loads((self.ROOT / "settings.json").read_text(encoding="utf-8"))
        settings = {entry["key"]: entry["default"] for entry in data["settings"]}
        self.assertEqual(settings["BOPEN_WORKER_MODEL"], "claude-opus-5-5")
        self.assertEqual(settings["BOPEN_ADVISOR_MODEL"], "claude-opus-5-5")


if __name__ == "__main__":
    unittest.main()
