---
max_turns: 1
allowed_tools: [Skill]
runs: 3
---

Add `vercel security check` to GitHub Actions. The job must fail on High-risk
Dashboard findings without leaking sample identities into the build log.

Reply with only the name of the single skill you would invoke for this, exactly
as it appears in your available-skills list (without any plugin prefix), and
nothing else. If no available skill fits, reply with exactly NONE. Do not call
any tool.
