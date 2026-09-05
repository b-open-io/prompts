# Skill authoring reference

Read this reference when a skill needs detailed frontmatter, invocation,
progressive disclosure, or cross-client installation guidance.

Keep the entrypoint focused on purpose, routing, essential constraints, and
the observable workflow. Put mode-specific procedures in module-local
`references/`, deterministic work in `scripts/`, and output assets in
`assets/`. Link each supporting file from the entrypoint and verify the path
from the installed plugin root.

Required Agent Skills frontmatter is `name` and `description`. Preserve
supported optional fields already used by the host.
[`allowed-tools`](https://code.claude.com/docs/en/skills#pre-approve-tools-for-a-skill)
can pre-approve tools for a skill; it is not a read-only enforcement boundary.
Use `user-invocable` and `disable-model-invocation` according to the target
host's current semantics and the repository's approval policy. Enforce
approval immediately before irreversible mutations.

For a source tree, select the owning root: `skills/<name>/` and
`agents/<name>.md` for a root plugin, or `modules/<plugin>/skills/<name>/` and
`modules/<plugin>/agents/<name>.md` for a module. Keep all references and
scripts within that root so module extraction does not leave dangling paths.
Use `${CLAUDE_PLUGIN_ROOT}` for runtime paths when the host provides it.

Use the maintained [Claude Code skills documentation](https://code.claude.com/docs/en/skills)
and [Agent Skills specification](https://agentskills.io/specification) for
schema changes. Do not copy provider manuals into a skill.
