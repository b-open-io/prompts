# Repository model-compatibility audit

- [x] Inventory explicit model names, IDs, and “latest/current/best” claims.
- [x] Classify matches as active routing, intentional examples, historical artifacts, or stale guidance.
- [x] Review agent frontmatter and model delegation behavior.
- [x] Review coordinator, advisor, orchestrator, and related delegation skills.
- [x] Apply only high-confidence, minimal corrections.
- [x] Validate changed metadata, links/references, scripts, and repository checks.
- [x] Review the final diff for accidental or unrelated changes.

## Review

- Replaced retired model IDs and unsupported tool names while retaining stable
  aliases, configurable environment variables, and historical benchmark records.
- Preserved and documented X's official MCP route for raw X data; xAI remains the
  synthesis path.
- Corrected routing, model-profile validation, script path variables, cost-unit
  math, response parsing, metadata, benchmark commands, and stale persona names.
- Moved support documents out of `agents/` so Claude no longer discovers them as
  runnable agents.
- Validation passed for frontmatter, tracked JSON/Python, shell syntax, the
  benchmark build, normal Claude plugin validation, and `git diff --check`.
- `claude plugin validate --strict .` still treats the intentional root
  `CLAUDE.md` repository guide as a warning; normal validation passes.
- Edited skills retain older ClawNet attestation snapshots. Re-signing requires a
  ClawNet signing identity, which is not available in this environment.
