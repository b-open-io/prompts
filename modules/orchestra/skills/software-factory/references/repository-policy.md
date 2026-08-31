# Repository policy and factory self-bootstrap

A factory's delivery boundary is not real until the repository enforces it.
"Propose-only" in a prompt protects only the code path that read the prompt;
it does not constrain the setup session, another tool, or an administrator
credential.

## Factory constitution

Treat the files that define the factory itself as High-tier policy:

- runner, prompts, model and budget configuration
- verification gates and CI workflows
- repository rules, CODEOWNERS, and credentials
- loop manifest, state migration, and scheduling

Create and change these files on a feature branch through a human-review PR.
The factory may propose changes to its own constitution but cannot approve or
merge them. Bootstrap is part of the factory boundary, not an exception to it.

## Load-bearing controls

Before declaring a GitHub-backed factory ready:

1. Query the live default branch and confirm it is protected. Run
   `scripts/check-factory-policy.sh`; do not infer protection from docs.
2. Identify the credential the unattended worker will use. It must be a bot or
   GitHub App that can push feature branches and open PRs but cannot bypass the
   default-branch rule or approve its own work.
3. Require pull requests for the default branch. For unattended factories,
   use a ruleset with no worker/admin bypass, block force-push and deletion,
   and require the actual gate status names used by the repository.
4. CODEOWN the factory constitution so a distinct human identity reviews
   changes to it.

Local hooks are defense-in-depth. The hosting provider's rule is the
authorization boundary.

If protection or a constrained worker identity is missing, keep the worker
paused and manual/prove-only. Missing or malformed state, an unpinned model,
missing checker for auto-merge, or documentation-only budgets also fail
readiness.

## Acceptance evidence

Factory initialization is complete only when the handoff records:

- the bootstrap PR URL (never a direct default-branch commit)
- live branch-policy check output and worker identity/capability
- a valid paused `state.json` that the runner fails closed without
- explicit model pins for every lane
- executable iteration, retry, wall-clock, budget, and accept-rate breakers
- PR linter self-test and the repository's real required status names
- LoopTop registration plus a sanitized `events.jsonl` prove event

Do not install or change repository rules silently. Explain the proposed rule
and get authorization immediately before that external mutation.
