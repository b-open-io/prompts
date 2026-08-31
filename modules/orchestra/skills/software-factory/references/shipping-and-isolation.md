# Shipping and isolated verification

A factory that leaves accepted work in a local checkout is not a shipping system. Give one worker explicit ownership of promotion, while keeping the default branch behind the High-tier human gate.

## Guarded branch promotion

A practical long-lived path is:

```text
feature branch → reviewed change → dev → cooling period → approved PR → default branch
                                      │
                                      └─ every new commit resets the clock and approval
```

- Workers may publish gated changes to `dev` or open feature PRs into `dev` according to the project's Medium-tier policy.
- Keep one `dev` → default-branch PR open. The shipping worker updates its human-readable summary and evidence instead of opening duplicates.
- Notify the reviewer when the PR opens and whenever its head changes. State the exact review deadline, what will ship, the gate evidence, and how to stop promotion.
- The cooling period starts at the latest commit and resets on every update. Approval submitted before the latest commit is stale.
- Positive human approval is mandatory. Silence is never approval for the default branch. After a fresh approval and green required checks, provider auto-merge may perform the mechanical merge.
- Protect the default branch with required PR review, stale-approval dismissal, required status checks, and no direct worker pushes.

GitHub's native review request is the baseline notification because it is attached to the artifact being approved. Email or Discord may supplement it, but delivery must be deterministic code—not a model composing and sending ad hoc messages. Keep Resend keys or Discord webhooks in the notification service or local credential store; never place them in prompts, tickets, logs, or disposable test environments.

## Disposable plugin-install gate

Use the cheapest environment that reproduces the user path:

1. A hosted CI runner checks out the exact commit. It is already a disposable VM.
2. Strict-validate every Claude plugin and marketplace manifest.
3. Add the repository as a local Codex marketplace and install every repository-local plugin into the runner's fresh config.
4. Run the repository's cross-runtime harness and generated-adapter checks.
5. Destroy the runner. No production credentials should be present.

This gate proves packaging and installation without spending model tokens or exposing an interactive account. Add a Vercel Sandbox or another microVM only when the test needs a running service, browser, or untrusted executable. Give that sandbox short-lived scoped credentials, record teardown, and keep production OAuth sessions out of it.

For Claude Code, local development may also use `claude --plugin-dir <path>` and `claude plugin validate --strict <path>`. For Codex, use a fresh runner and install from the checked-out `.agents/plugins/marketplace.json`. Provider login and live model calls belong in a separately authorized end-to-end rung, not the default install gate.
