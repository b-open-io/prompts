# Common Skill Mappings Reference

Use this table as a starting point when building skill maps. Only include skills relevant to the project's actual stack. Check the Skill tool's available skills list in the system-reminder for the full inventory.

## Plugin Skills (Namespaced)

These skills ship with plugins and are available to anyone who installs the plugin. Use the exact namespaced name.

### Superpowers

| Trigger | Skill |
|---------|-------|
| brainstorming, ideation | superpowers:brainstorming |
| planning, implementation-plan | superpowers:writing-plans |
| execution, execute-plan | superpowers:executing-plans |
| parallel-work, multiple-tasks | superpowers:dispatching-parallel-agents |
| debugging, bug-investigation | superpowers:systematic-debugging |
| code-review, post-implementation-review | superpowers:requesting-code-review |
| tdd, test-first | superpowers:test-driven-development |
| git-worktree, feature-branch | superpowers:using-git-worktrees |
| finishing-branch, merge-prep | superpowers:finishing-a-development-branch |
| verify-completion | superpowers:verification-before-completion |

### BOpen Tools

| Trigger | Skill |
|---------|-------|
| self-audit, find-mistakes | bopen-tools:confess |
| quality-check, review-work | bopen-tools:critique |
| clean-ai-slop, remove-ai-patterns | bopen-tools:stop-slop |
| refresh-skill-map | bopen-tools:reinforce-skills |
| npm-publish | bopen-tools:npm-publish |

### BSV Skills

| Trigger | Skill |
|---------|-------|
| bsv-work, blockchain | bsv-skills:* |

### Sigma Auth

| Trigger | Skill |
|---------|-------|
| auth-setup, sigma-auth | sigma-auth:setup |

## Local / Repo-Specific Skills

Some skills are installed globally in `~/.claude/skills/` or are specific to a user's setup. These do NOT have a namespace prefix. When a project depends on one of these, include it in the skill map — but note that these are the exception, not the rule.

Example: a Remotion video project might have `remotion-best-practices` installed locally:

```
remotion-work→Skill(remotion-best-practices)
```

To discover local skills available for mapping, run `ls ~/.claude/skills/` and cross-reference with the project's dependencies.
