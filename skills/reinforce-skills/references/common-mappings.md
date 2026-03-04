# Common Skill & Agent Mappings Reference

Use this table as a starting point when building skill maps and agent maps. Only include entries relevant to the project's actual stack and work patterns. Check the Skill tool's available skills list and Agent tool's available subagent types in the system-reminder for the full inventory.

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

---

## Agent Maps

Agent maps use the `plugin:agent-name` format matching the `subagent_type` parameter of the Agent tool. Only include agents whose work pattern recurs in this project.

### BOpen Tools Agents

| Trigger | Agent |
|---------|-------|
| security-audit, vulnerability-review | bopen-tools:code-auditor |
| design-ui, create-component, style-page | bopen-tools:design-specialist |
| write-docs, readme, api-docs | bopen-tools:documentation-writer |
| database-schema, query-optimization | bopen-tools:database-specialist |
| nextjs-feature, react-component | bopen-tools:nextjs-specialist |
| api-integration, webhook, third-party | bopen-tools:integration-expert |
| devops, ci-cd, deployment | bopen-tools:devops-specialist |
| payments, stripe, checkout | bopen-tools:payment-specialist |
| performance-optimization, bundle-size | bopen-tools:optimizer |
| mobile-app, react-native | bopen-tools:mobile-specialist |
| mcp-server, mcp-config | bopen-tools:mcp-specialist |
| research, gather-info, web-research | bopen-tools:research-specialist |
| agent-design, ai-agent | bopen-tools:agent-specialist |
| marketing-copy, growth | bopen-tools:marketing-specialist |
| data-pipeline, analytics | bopen-tools:data-specialist |
| legal-review, privacy-policy, tos | bopen-tools:legal-specialist |
| testing, e2e-tests, unit-tests | bopen-tools:test-specialist |
| code-review, post-step-review | superpowers:code-reviewer |
| file-consolidation, cleanup, organize | bopen-tools:consolidator |
| architecture-review | bopen-tools:architecture-reviewer |
| project-planning, roadmap, linear | bopen-tools:project-manager |

### BSV / Blockchain Agents

| Trigger | Agent |
|---------|-------|
| bsv-transactions, blockchain-ops | bsv-skills:bitcoin-specialist |
| ordinals, nft, 1sat | 1sat-skills:ordinals-specialist |
| sigma-auth, bitcoin-oauth | sigma-auth:sigma-auth-guide |

### Gemini / Image Agents

| Trigger | Agent |
|---------|-------|
| generate-image, visual-content, video | gemskills:content-specialist |
| design-ui-gemini | gemskills:design-specialist |

### Product Agents

| Trigger | Agent |
|---------|-------|
| seo, search-optimization | product-skills:seo-specialist |
| legal, compliance | product-skills:legal-specialist |

### Auth Agents

| Trigger | Agent |
|---------|-------|
| sigma-auth-help, bitcoin-auth | sigma-auth:sigma-auth-guide |

### Example Agent Map

For a full-stack Next.js app with BSV auth and a design system:

```
<!-- AGENT-MAP-START -->STOP. You WILL forget agent IDs mid-session. Check this map before delegating any complex task.|design-ui,create-component→Agent(bopen-tools:design-specialist)|security-review,audit→Agent(bopen-tools:code-auditor)|write-docs,readme→Agent(bopen-tools:documentation-writer)|nextjs-feature,react→Agent(bopen-tools:nextjs-specialist)|sigma-auth,bitcoin-oauth→Agent(sigma-auth:sigma-auth-guide)|generate-image,visual→Agent(gemskills:content-specialist)|test,e2e→Agent(bopen-tools:test-specialist)<!-- AGENT-MAP-END -->
```
