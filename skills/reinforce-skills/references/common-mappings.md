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

### Anthropic Official (skill-creator plugin)

| Trigger | Skill |
|---------|-------|
| create-skill, new-skill, write-skill-md | skill-creator:skill-creator |
| modify-skill, improve-skill, update-skill | skill-creator:skill-creator |
| test-skill, eval-skill, benchmark-skill | skill-creator:skill-creator |

### BOpen Tools

| Trigger | Skill |
|---------|-------|
| self-audit, find-mistakes | bopen-tools:confess |
| quality-check, review-work, critique-change, diff-review | bopen-review:visual-review |
| humanize, clean-ai-slop, remove-ai-patterns | bopen-tools:humanize |
| refresh-skill-map | bopen-tools:reinforce-skills |
| npm-publish | bopen-plugin-dev:npm-publish |
| benchmark-skills, write-evals, test-skill-quality | bopen-plugin-dev:benchmark-skills |

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
| security-audit, vulnerability-review | bopen-review:code-auditor |
| design-ui, create-component, style-page | bopen-web:designer |
| write-docs, readme, api-docs | bopen-research:documentation-writer |
| database-schema, query-optimization | bopen-ops:database |
| nextjs-feature, react-component | bopen-web:nextjs |
| api-integration, webhook, third-party | bopen-ops:integration-expert |
| devops, ci-cd, deployment | bopen-ops:devops |
| payments, stripe, checkout | bopen-ops:payments |
| performance-optimization, bundle-size | bopen-web:optimizer |
| mobile-app, expo, react-native | bopen-web:mobile |
| desktop-app, native-macos, menu-bar-app, ship-dmg | bopen-creative:native-desktop |
| mcp-server, mcp-config | bopen-mcp:mcp |
| research, gather-info, web-research | bopen-research:researcher |
| agent-design, ai-agent | bopen-orchestration:agent-builder |
| marketing-copy, growth | product-skills:marketer |
| data-pipeline, analytics | bopen-ops:data |
| legal-review, privacy-policy, tos | product-skills:legal |
| testing, e2e-tests, unit-tests | bopen-review:tester |
| skill-benchmarking, eval-writing, measure-skill | bopen-review:tester |
| code-review, post-step-review | superpowers:code-reviewer |
| file-consolidation, cleanup, organize | bopen-review:consolidator |
| architecture-review | bopen-review:architecture-reviewer |
| project-planning, roadmap, linear | bopen-tools:project-manager |

### BSV / Blockchain Agents

| Trigger | Agent |
|---------|-------|
| bsv-transactions, blockchain-ops | bsv-skills:bitcoin |
| ordinals, nft, 1sat | 1sat-skills:ordinals |
| sigma-auth, bitcoin-oauth | sigma-auth:sigma-auth-guide |

### Gemini / Image Agents

| Trigger | Agent |
|---------|-------|
| generate-image, visual-content, video | gemskills:content |
| design-ui-gemini | gemskills:designer |

### Product Agents

| Trigger | Agent |
|---------|-------|
| seo, search-optimization | product-skills:seo |
| legal, compliance | product-skills:legal |

### Auth Agents

| Trigger | Agent |
|---------|-------|
| sigma-auth-help, bitcoin-auth | sigma-auth:sigma-auth-guide |

### Example Agent Map

For a full-stack Next.js app with BSV auth and a design system:

```
<!-- AGENT-MAP-START -->STOP. You WILL forget agent IDs mid-session. Check this map before delegating any complex task.|design-ui,create-component→Agent(bopen-web:designer)|security-review,audit→Agent(bopen-review:code-auditor)|write-docs,readme→Agent(bopen-research:documentation-writer)|nextjs-feature,react→Agent(bopen-web:nextjs)|sigma-auth,bitcoin-oauth→Agent(sigma-auth:sigma-auth-guide)|generate-image,visual→Agent(gemskills:content)|test,e2e→Agent(bopen-review:tester)<!-- AGENT-MAP-END -->
```
