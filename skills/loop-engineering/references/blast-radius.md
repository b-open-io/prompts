# Blast Radius & the Promotion Protocol

The central insight of safe loop design: **the variable that decides how much autonomy a loop gets is the reversibility of what it can do — not its reliability score.** This is the consensus across Anthropic's agent-autonomy research, security practitioners (Sophos "blast radius reduction"), and working loop engineers (Addy Osmani, Simon Willison).

Why reliability alone is insufficient: a loop with a 99% accept rate still produces a catastrophic outcome on the 1% of runs where the action is *irreversible*. You can't average your way out of a deleted production table. So reliability promotes a loop *within* a tier; it never moves a loop *across* the irreversibility line.

## The three tiers

| Tier | Reversibility | Examples | Autonomy gate |
|---|---|---|---|
| **Low** | fully reversible | read-only ops, drafting, creating files in a sandbox/ephemeral env | Autonomous + append-only audit log. Self-certify once the verifier is consistently green. |
| **Medium** | recoverable with effort | staging code changes, sending external API messages, non-destructive writes | Flag for a timed human review window (e.g. 30 min before execution). |
| **High** | irreversible | production deploys, data deletion, financial ops, credential use, push to main | Mandatory pre-execution human approval — **every time, regardless of accept-rate history.** |

## Approval fatigue is a real failure mode

Don't over-gate. Humans asked to approve too frequently stop reading and rubber-stamp — so gating low-risk actions *reduces* overall safety by training the operator to click "yes." Reserve human gates for the High tier. For everything else, auto-approve and rely on the audit log + anomaly monitoring. The mature pattern from Anthropic's longitudinal data is **pattern-recognition-based monitoring** (watch for anomalies), not per-action approval.

## The promotion protocol (prove → harden → automate)

Going from a hand-run loop to an unattended scheduled one:

1. **Prove (watched).** Run the full cycle manually 3–5 times with a human watching. Confirm the gate actually *fails* bad output — a gate that never rejects anything is not a gate.
2. **Harden (watched).** Add stop conditions, the pre-flight circuit breaker, the state file, and the never-touch list. Run a few more watched cycles. Measure accept rate and cost-per-accepted-change.
3. **Automate — only if all hold:**
   - The loop runs in a sandbox / scoped credentials (no ambient prod access), **or** its actions are confirmed Low-tier.
   - External verification is automated and objective (tests, exit codes, diff scans — not LLM self-assessment).
   - The cost circuit breaker has been *tested* (it actually fires).
   - The audit log is append-only and inspectable post-hoc.

For any loop that can touch production state, keep a mandatory human-review step at the terminal verification stage **forever** — the track record never buys out the irreversibility gate.

## Self-improving caps

The iteration cap is a reliability dial, raised by evidence:

- Start conservative (15–20 iterations). A loop regularly exceeding ~30 turns signals a broken stop condition or a scope problem — investigate, don't just raise the cap.
- When the process surfaces a defect, fix the process first.
- When accept rate proves out over N runs, raise the cap and **log the decision in the state backend** so the change is auditable. The loop improving itself is a tracked event, not a vibe.
