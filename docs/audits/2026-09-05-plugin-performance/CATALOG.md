# Plugin and marketplace catalog

Snapshot: prompts dev `6ba4688`; marketplace fetched `2026-09-05T04:43:44.421Z`.

The repository inventory counts discoverable resources under each of the ten shipped plugin roots. Vendored symlink targets count once through their shipping skill path. Generated adapters and references are separate support files, not additional authored skills.

| Plugin | Version | Skills | Agents | Commands | Static startup estimate |
|---|---|---:|---:|---:|---:|
| core | 1.1.162 | 14 | 3 | 14 | 2,038 |
| brand-rep | 0.1.8 | 0 | 2 | 0 | 215 |
| creative | 0.1.4 | 10 | 4 | 0 | 1,658 |
| dev-ops | 0.1.9 | 5 | 5 | 0 | 1,415 |
| mcp-dev | 0.1.4 | 14 | 1 | 0 | 1,723 |
| orchestra | 0.1.25 | 8 | 1 | 0 | 1,151 |
| plugin-kit | 0.1.7 | 10 | 2 | 0 | 1,543 |
| research | 0.1.4 | 7 | 3 | 0 | 1,027 |
| review | 0.1.15 | 7 | 5 | 0 | 1,706 |
| web-dev | 0.1.5 | 9 | 4 | 0 | 1,771 |

84 skills (68 authored, 16 vendored), 30 agents, 14 commands. The sum of plugin estimates is 14,247 tokens; core alone is 2,038. These are the existing reporter’s four-bytes-per-token estimates at this checkout path, **not observed host token usage**. The reporter includes descriptions, skill identity paths, and agent tools, but omits command descriptions, generated command skills, host framing, injected hooks and other installed plugins. Do not compare this directly with the blog’s installed-host measurements.

## On-demand body candidates

Large bodies are opportunities to inspect conditional material, not proof of wasted tokens. Keep operational constraints and domain knowledge; route to supporting references only where it preserves task success.

| Resource | Kind | Body words |
|---|---|---:|
| mcp-dev:mcp | agent | 14,727 |
| orchestra:agent-builder | agent | 10,153 |
| plugin-kit:prompt-engineer | agent | 8,713 |
| web-dev:nextjs | agent | 5,347 |
| review:visual-proposal | skill | 4,284 |
| web-dev:designer | agent | 4,261 |
| orchestra:software-factory | skill | 3,504 |
| creative:cartographer | agent | 3,382 |
| dev-ops:database | agent | 3,282 |
| review:security-ops | agent | 2,975 |
| dev-ops:devops | agent | 2,888 |
| review:code-auditor | agent | 2,738 |

## Wider marketplace

The connector returned 27 plugins, 253 skills, and 41 agents. This is catalog coverage, not a full content audit of every external repository. See `marketplace-catalog.csv` and `marketplace-snapshot.json`.

## Files

- `resource-catalog.csv`: all 128 skills, agents, and commands in prompts, with paths and size/policy fields.
- `plugin-inventory.json`: existing inventory reporter results for all ten roots.
- `support-catalog.csv`: 186 tracked hook, eval, manifest, and adapter files selected by path/type; not a count of runtime hook invocations.
- `marketplace-catalog.csv`: 294 published catalog resource entries.
- `deterministic-checks.json`: unedited baseline check output, including environment failures.

Regenerate per-plugin reports with `python3 scripts/plugin-weight.py --root <plugin-root> --output <file>`. Scan core and every `modules/*` plugin; running once at repository root inventories core only.
