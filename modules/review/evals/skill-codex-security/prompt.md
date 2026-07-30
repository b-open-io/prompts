---
max_turns: 1
allowed_tools: [Skill]
runs: 3
---

Semgrep and our secrets sweep both came back clean on the payments service, but I don't buy it — there's an authz bug in there somewhere. Kick off an OpenAI codex-security scan against src/payments and origin/main, cap it at five bucks, and export the findings as SARIF when it's done.

Reply with only the name of the single skill you would invoke for this, exactly as it appears in your available-skills list (without any plugin prefix), and nothing else. If no available skill fits, reply with exactly NONE. Do not call any tool.
