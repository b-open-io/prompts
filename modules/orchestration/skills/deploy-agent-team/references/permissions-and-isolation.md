# Permissions and Isolation

## Permission Model — Critical

Agent-team permission behavior depends on the installed Claude Code build and the
`Agent` schema it exposes. Start by configuring the lead, then use a per-spawn
mode when the schema supports one:

- Allow only the file edits and commands the planned tasks require.
- Keep destructive commands and sensitive directories denied.
- Expect permission requests to bubble up to the lead when an operation was not
  pre-approved.
- Prefer `dontAsk` or `auto` for unattended workers; use `plan` when the lead
  must approve an approach before edits.
- Do not use `--dangerously-skip-permissions` as a convenience default. It removes
  permission checks for the lead and every teammate.

If a task genuinely requires unrestricted operation, run the entire session inside
an explicit external sandbox and obtain user approval for that trust boundary.

### When to Use `plan` Mode

Require plan approval for teammates making large structural changes — database
migrations, API redesigns, or major refactors — by stating that requirement when
asking the lead to spawn them:

```
Spawn a database teammate to design the billing schema. Require plan approval
before it edits any files.
```

The agent will exit plan mode and send you a `plan_approval_request`. You respond with:
```
SendMessage(
  type: "plan_approval_response",
  request_id: "...",    # from the request
  recipient: "db-designer",
  approve: true
)
```

Then the agent proceeds with implementation.

## File Isolation for Parallel Edits

Partition work so every teammate owns a disjoint set of files, and pin shared
interfaces in each task description before work starts. When the installed
`Agent` schema supports `isolation: "worktree"`, use it for workers whose edits
may overlap and have the lead integrate each branch.

If that field is unavailable, use isolated subagents, agent view sessions, or
manually created worktrees instead of letting teammates write the same files in
one checkout. The lead owns integration and reruns acceptance checks after each
merge.
