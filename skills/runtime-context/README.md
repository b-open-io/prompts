# Runtime Context Skill

Detects the invoking host and reports capabilities observed by the detector.
Not user-invocable; other agents and system prompts consume this skill.

## Host and capability facts

The detector supports these host labels:

| Host | Evidence |
|---|---|
| Claude Code | explicit marker, or `CLAUDE_CODE`, `CLAUDE_SESSION_ID`, `CLAUDECODE` |
| Codex | explicit marker, or `CODEX_THREAD_ID`, `CODEX_SESSION_ID` |
| Grok | `BOPEN_HOST_HARNESS=grok` |
| OpenCode | `BOPEN_HOST_HARNESS=opencode` |
| Sandbox | `VERCEL_SANDBOX_ID` or `/vercel/sandbox` |
| Local / unknown | explicit `local`, or no reliable evidence/conflicting markers |

Run the detector from the plugin root:

```bash
bash skills/runtime-context/scripts/detect.sh
```

`runtime` identifies the host. Existing fields such as `has_bash`, `has_bun`,
`has_node`, `has_skills`, `skills_count`, `sandbox_id`, `working_dir`, and
runtime versions remain available. `capabilities` reports command and local
skill-directory checks. A shell script cannot inspect tools exposed by its
parent agent, so it does not claim `Skill()`, browser, file, or visualization
tools from environment variables and does not fabricate `has_skill_tool`.

## Usage guidance

Use the file, browser, shell, and visualization tools exposed in the current
session. If one is unavailable, say which capability is missing and continue
with the available interface or read a relevant `SKILL.md` directly.

BitPlan is optional when it is available and useful for a visual plan. Do not
announce runtime capabilities on every task; report them when requested or
when they affect the plan.
