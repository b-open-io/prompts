# Plugin context and release harness

The bopen-tools catalog is large enough that host startup budgets, not only
individual skill quality, are part of the plugin's public behavior. These tools
measure that behavior without changing routing, invocation policy, or installed
plugin contents.

## Current baseline

The 1.1.111 source tree measured on 2026-07-24 contains:

- 85 discoverable skill folders: 69 authored and 16 third-party symlinks
- 78 Claude-implicit and 83 Codex-implicit skills
- 36,635 bytes of skill descriptions, roughly 9,190 tokens at four bytes/token
- 7,303 bytes for source skill identity/path lines before descriptions
- 31 agents and 14 commands

The installed Claude 1.1.110 snapshot projected about 29,101 always-on tokens.
That figure includes skills, agents, and commands; Claude reports legacy
commands in its Skills component group. The exact number varies with host
version and installed plugin state, which is why it is captured rather than
hardcoded as a release threshold.

A live Codex `gpt-5.6-sol` snapshot reported a 272,000-token model window and a
5,440-token skill budget. The current probe rendered 302 skill identities and
zero descriptions. A prior startup in the same environment discovered 373
implicit skills and omitted 71 after removing every description. Catalog
cardinality must therefore be measured in every fresh host profile.

Codex's installed bopen-tools package currently contains the 69 authored skills
but not the 16 source symlinks. Those third-party skills are visible in this
repository through `.agents/skills`. The parity checker reports the omission as
an error by default. Release diagnostics may temporarily classify the exact
known set as warnings with `--allow-codex-third-party-omissions` while
OPL-3191 owns the optional-pack migration.

## Static weight report

```bash
python3 scripts/plugin-weight.py --format markdown
python3 scripts/plugin-weight.py --output /tmp/bopen-weight.json
python3 scripts/plugin-weight.py --baseline /tmp/previous-weight.json
```

The report includes:

- authored versus symlinked skills
- Claude and Codex implicit-invocation policies
- description, body, reference, and script sizes
- minimum identity/path cost
- agent and command weight
- duplicate skill names
- numeric deltas against a recorded baseline

Optional gates are available for controlled migrations:

```bash
python3 scripts/plugin-weight.py \
  --max-implicit-skills 12 \
  --max-description-chars 2200 \
  --fail-on-duplicates
```

Do not apply those example core-pack thresholds to the current monolith before
the domain-pack migration is complete.

## Exact host snapshots

Capture the current Codex startup prompt and model budget:

```bash
python3 scripts/capture-codex-context.py \
  --model gpt-5.6-sol \
  --output /tmp/codex-context.json
```

For deterministic tests, provide recorded inputs:

```bash
python3 scripts/capture-codex-context.py \
  --prompt-file fixtures/prompt-input.json \
  --models-file fixtures/models.json
```

The parser accepts both raw `<skills_instructions>` text and the JSON envelope
returned by `codex debug prompt-input`. An isolated Codex profile can be passed
with `--codex-home`.

Capture Claude's projected component cost:

```bash
python3 scripts/capture-claude-context.py \
  --source-root . \
  --output /tmp/claude-context.json
```

Recorded `claude plugin details` output can be supplied with `--details-file`.
Hooks are reported separately because they have no model-context cost unless
they return additional context.

## Source/package/install parity

Compare explicit roots:

```bash
python3 scripts/check-plugin-install-parity.py \
  --source-root . \
  --packed-root /tmp/unpacked-plugin \
  --claude-root ~/.claude/plugins/cache/b-open-io/bopen-tools/VERSION \
  --codex-root ~/.codex/plugins/cache/b-open-io/bopen-tools/VERSION \
  --require-all
```

Or inspect the newest installed host roots:

```bash
python3 scripts/check-plugin-install-parity.py --auto-detect
```

The check compares both manifest versions and skill, agent, and command
inventories. It never modifies installed plugins.

## Routing evaluation

`scripts/evaluate-skill-routing.py` scores recorded host results independently
from the existing skill-output benchmark:

```json
{
  "cases": [
    {
      "id": "visual-review-direct",
      "prompt": "Show me what changed on this branch as a review page.",
      "expected_skills": ["bopen-tools:visual-review"],
      "acceptable_alternatives": [],
      "forbidden_skills": ["bopen-tools:free-roam-testing"]
    }
  ]
}
```

Each result supplies `case_id`, `host`, and `invoked_skills`. The evaluator
reports precision, recall, omissions, forbidden hits, per-case outcomes, and a
confusion matrix:

```bash
python3 scripts/evaluate-skill-routing.py \
  --cases /tmp/routing-cases.json \
  --results /tmp/claude-results.jsonl \
  --format markdown
```

Recorded-result scoring is deterministic. Fresh Claude and Codex event adapters
remain tracked in OPL-3193; model/API runs must not be mixed into the
deterministic unit-test tier.

## Release matrix

Run the deterministic tier:

```bash
python3 scripts/run-plugin-harness.py --output /tmp/plugin-harness.json
```

Add the full hook suite:

```bash
python3 scripts/run-plugin-harness.py --hooks
```

Add installed-host probes after publishing:

```bash
python3 scripts/run-plugin-harness.py --hooks --live
```

The complete release sequence is:

| Stage | Evidence |
|---|---|
| Static | Manifests, docs, generated adapters, unit tests, weight report |
| Hooks | Full Claude/Codex hook regression suite |
| Package | Unpacked artifact matches the reviewed source inventory |
| Claude | Updated marketplace install, plugin details, fresh-session smoke |
| Codex | Marketplace upgrade, plugin install, prompt snapshot, fresh-session smoke |
| Routing | Direct, indirect, negative, boundary, and ambiguity results |
| Execution | Existing skill benchmarks and workflow-specific integration tests |
| Release | Both manifests, changelog, README, git remote, and installed versions agree |

Any command that exits nonzero remains unfinished work until fixed or explicitly
waived. Live host results are retained as release evidence; they are not silently
converted into deterministic fixtures.
