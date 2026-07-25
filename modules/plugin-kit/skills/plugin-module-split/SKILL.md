---
name: plugin-module-split
version: 1.0.0
description: >-
  Split a large Claude Code or Codex plugin into a small core plus optional modules. Use for
  "split this plugin", "my plugin is too big", "reduce startup context", "Codex is omitting my
  skills", "core plus optional packs", or "publish part of my plugin separately". Covers
  marketplace subdirectory sourcing, the dependency field's silent-load behaviour, Codex adapter
  regeneration, and symlink depth. Use agent-auditor to measure first and benchmark-skills to
  verify routing after.
---

# Splitting a plugin into core and modules

Compression makes each catalog entry cheaper. Splitting changes how many load at
all. Reach for a split when the catalog is large enough that users pay for
capabilities they never invoke, or when Codex starts omitting skills.

## Decide whether a split is the right tool

Measure first with `agent-auditor`. If description bytes are the problem,
compression alone may be enough and costs no install migration.

Cardinality is the case for splitting. Codex allocates roughly two percent of
the selected model's context window to skills — `context_window * 2 // 100`,
about 5,440 tokens on a 272,000-token model — and that budget is shared across
**every installed plugin**, not allocated per plugin. A catalog with every
description stripped can still overflow it. Only loading fewer resources helps,
and only when users actually install fewer modules. A core that depends on
everything returns the catalog to its original size.

## One repository, many plugins

No second repository is needed. Both marketplaces resolve a plugin from a
subdirectory of the marketplace repo.

Claude's marketplace accepts a bare relative path for entries in the same repo,
and `git-subdir` for another repo:

```json
{ "name": "my-web", "source": "./modules/web-dev" }
{ "name": "my-web", "source": { "source": "git-subdir",
  "url": "https://github.com/org/repo.git", "path": "modules/web-dev" } }
```

Codex uses the object form:

```json
{ "name": "my-web", "source": { "source": "local", "path": "./modules/web-dev" } }
```

Each module directory carries its own `.claude-plugin/plugin.json` and
`.codex-plugin/plugin.json`, exactly as the repo root does. Resources move into
modules rather than being copied, so nothing can drift.

## Draw boundaries from references, not taxonomy

The test for every boundary is whether someone would plausibly install one side
without the other. Build the evidence rather than guessing:

```bash
# which resources cite each other by name
grep -rhoE '(skill|agent)-name-pattern' skills/ agents/
```

Resources that cite each other belong together. Resources cited by many others
belong in core. Grouping by provenance (all third-party skills in one module)
forces users to install two distributions to get one coherent toolset.

## The dependency field fails quietly

`plugin.json` accepts a `dependencies` array of plugin names. It installs
correctly, and then the loader **skips the plugin silently** in any context
where the declared dependency is absent — no error, no warning, just a plugin
whose skills never appear.

Verify this before relying on it: run the module's own eval suite against the
module alone. A module that scores zero with every case reporting that nothing
applies, and full marks with the field removed, is showing you this behaviour.

Declare a dependency only when the module genuinely cannot function without the
other plugin. References that merely recommend another plugin's skills resolve
fine for anyone who has both, and cost nothing for anyone who does not.

## What a split touches beyond the obvious

Four things move with a resource and break quietly if they do not.

**Codex agent adapters.** Codex resolves custom agents from generated `.toml`
files, not by walking the plugin. A generator written for a single flat
`agents/` directory emits nothing for agents that now live in modules, and those
agents disappear from Codex entirely while Claude keeps working. Teach the
generator the new layout and regenerate:

```bash
python3 scripts/codex-agents/generate.py
python3 scripts/codex-agents/generate.py --check
```

**Agent adapter symlinks.** An `agents/<name>/AGENTS.md` symlink pointing at
`../<name>.md` dangles the moment its target moves. Move the directory with the
agent.

**Third-party symlinks.** A vendored skill symlinked as `../.agents/skills/X`
needs `../../../.agents/skills/X` from `modules/<m>/skills/`. Adjust the target
for the added depth so vendor ownership and lockfile provenance survive.

**Bundled resources.** Anything a desktop app, installer, or script resolves at
a fixed path stays in core. Check for hardcoded `skills/<name>` paths before
moving a skill.

## Downstream references

Every relocated resource invalidates references written against its old
address. Build a rename map from resource name to new plugin, apply it across
every consumer repository, then add a check that fails on any `plugin:resource`
reference naming something its plugin does not provide. Without that check a
rename outruns its references and the failure only appears when an agent tries
to invoke a name that no longer resolves.

Test fixtures need care. A frozen characterization fixture records the ownership
it captured, so a sweep that rewrites its expectations without its data breaks
the test. Rewrite the assertion or the fixture, never one silently.

## Order of operations

1. Measure with `agent-auditor`; record the baseline.
2. Subtract anything belonging to a plugin that already owns the domain. Read
   both copies before consolidating a duplicate — the smaller one often
   documents something the larger does not.
3. Compress descriptions, verify routing with `benchmark-skills`.
4. Extract one module as a pilot, using the tightest cluster in the reference
   graph. Confirm it loads and routes on its own.
5. Register in both marketplaces; install from the marketplace, not the source
   tree.
6. Regenerate Codex adapters and run their installer against a scratch project.
7. Sweep downstream references and add the guard.
8. Extract the remaining modules, re-running the eval after each.

## Verify

- Each module loads standalone and routes correctly for its own cases.
- Core's cost is measured from the installed plugin, not the source tree.
- Codex adapters regenerate clean and install into a scratch project.
- No reference anywhere names a resource its plugin no longer provides.
