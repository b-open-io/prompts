---
name: skill-publish
description: This skill should be used when the user asks to "publish a plugin", "release a plugin", "bump plugin version", "update a Claude Code plugin", "update a Codex plugin", "publish skills", or mentions plugin publishing, plugin release, or skill distribution. Handles synchronized host manifests, changelog and README updates, git workflow, cache refresh, and standalone Agent Skills.
disable-model-invocation: true
metadata:
  author: b-open-io
  version: "1.0.1"
---

# Skill Publish

Publish Claude Code plugins and standalone Agent Skills with proper versioning, changelog management, and git workflow.

## Determine Publish Type

Before starting, identify the publish type based on project structure:

| Indicator | Type |
|-----------|------|
| `.claude-plugin/plugin.json` and/or `.codex-plugin/plugin.json` exists | **Hosted plugin** |
| Standalone `SKILL.md` with no plugin manifest | **Standalone Agent Skill** |

Hosted plugins publish by pushing to GitHub. Repositories supporting multiple
hosts must keep every real manifest and their shared marketplace metadata in
sync. Codex caches plugin contents by version, so a stale version can preserve
stale skills even after the source commit moves.

Standalone Agent Skills follow the agentskills.io specification and distribute as directories containing `SKILL.md`.

## Hosted Plugin Workflow

### 1. Check Current State

```bash
# Read and validate every host manifest
python3 scripts/check-plugin-manifests.py

# Check git is clean and up to date
git fetch origin && git status

# Review commits since last version bump
git log --oneline $(git describe --tags --abbrev=0 2>/dev/null || echo HEAD~10)..HEAD
```

### 2. Reconcile Documentation

`CHANGELOG.md` is required. Summarize every user-visible or operational change
since the last release under `Unreleased`. Update `README.md` whenever the
public inventory, installation flow, runtime behavior, or advertised feature
set changes. Run the repository documentation check when available:

```bash
python3 scripts/check-docs.py
```

Compare the last manifest-bump commit with current HEAD so changes committed
under a stale version are not omitted.

### 3. Bump Every Real Manifest

Use the repository's synchronized bump command when present. For bopen-tools:

```bash
python3 scripts/check-plugin-manifests.py --bump-patch
```

Otherwise edit every host manifest together. Bump the patch version unless the
user explicitly requests and justifies a larger change:

```
0.1.6 → 0.1.7
1.0.23 → 1.0.24
```

### 4. Finalize CHANGELOG.md

Move the reviewed `Unreleased` notes into a dated release entry:

```markdown
## [X.X.X] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes
```

Keep an empty `Unreleased` heading for the next change. Verify that the release
heading matches every manifest exactly.

### 5. Validate Plugin Structure

Before publishing, verify the plugin is well-formed:

- `.claude-plugin/plugin.json` has required `name` field
- Component directories (commands/, agents/, skills/, hooks/) contain valid files
- Skills have `SKILL.md` with valid YAML frontmatter (name + description)
- Agents and commands have `.md` files with YAML frontmatter
- Referenced files and scripts exist
- Every host manifest and marketplace version is synchronized
- `CHANGELOG.md` contains the release version
- README inventories match the authored skills, agents, commands, and hooks
- Generated host adapters are current

For bopen-tools, run:

```bash
python3 scripts/check-plugin-manifests.py
python3 scripts/check-docs.py
python3 scripts/codex-agents/generate.py --check
bash hooks/tests/run-tests.sh
git diff --check
```

### 6. Commit and Push

**Critical: Pushing to the default branch IS publishing.** The Claude Code plugin marketplace automatically picks up the latest commit.

```bash
# Stage only reviewed, owned paths; never sweep unrelated worktree changes.
git add .claude-plugin/plugin.json .codex-plugin/plugin.json CHANGELOG.md README.md
git add path/to/each/reviewed/component
git commit -m "Release vX.X.X"
git push origin <default-branch>
git log origin/<default-branch>..<default-branch>
```

If either real manifest was bumped, push in the same session. A committed but
unpushed bump is a stranded release.

### 7. Verify Publication on Every Host

After pushing, verify the plugin update is available:

```bash
CLAUDECODE= claude plugin update <plugin-name>@<publisher>
codex plugin marketplace upgrade
codex plugin add <plugin-name>@<publisher>
```

The `CLAUDECODE=` prefix avoids nested Claude session errors. For Codex,
`marketplace add` does not refresh an existing snapshot; use `marketplace
upgrade` before reinstalling. Confirm the installed root contains the new
version, then smoke-test both hosts in fresh sessions.

**Note:** The marketplace may take a few minutes to reflect the new version.

### 8. Update Downstream References

If the plugin version is tracked elsewhere (e.g., a marketplace page, documentation, or `lib/plugins.ts`), update those references to match the new version.

## Standalone Agent Skill Workflow

For skills not bundled in a Claude Code plugin, follow the agentskills.io specification.

### 1. Validate SKILL.md

Verify frontmatter meets the spec. For details, consult `references/agentskills-spec.md`.

Required fields:
- `name`: 1-64 chars, lowercase alphanumeric + hyphens, must match directory name
- `description`: 1-1024 chars, describes what and when

Optional fields:
- `license`, `compatibility`, `metadata`, `allowed-tools`

### 2. Validate Structure

```
skill-name/
├── SKILL.md          # Required
├── scripts/          # Optional executables
├── references/       # Optional docs loaded on demand
└── assets/           # Optional static resources
```

### 3. Version via Metadata

Track version in the frontmatter `metadata` field:

```yaml
metadata:
  author: org-name
  version: "1.1.0"
```

### 4. Distribute

Standalone skills distribute as directories. Common methods:
- Git repository (push to GitHub)
- Archive (zip the skill directory)
- Package registry (if applicable)

## Common Issues

### Plugin Not Updating

If `claude plugin update` does not pick up changes:
- Verify the push landed on the default branch (usually `main` or `master`)
- Check that `.claude-plugin/plugin.json` is valid JSON
- Wait a few minutes for marketplace propagation

### Version Already Exists

If the version string was already used in a previous commit, bump again to the next patch before pushing.

### Nested Session Error

Always prefix CLI commands with `CLAUDECODE=` when running from within an active Claude Code session to avoid the "nested session" error.

## Additional Resources

### Reference Files

- **`references/agentskills-spec.md`** — Complete agentskills.io specification summary for standalone skills
