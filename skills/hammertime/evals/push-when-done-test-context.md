# push-when-done Rule — Test Context

## What happened

During session 03e05dc5 (2026-03-13), Claude reported work as "shipped" while
`git status` still showed untracked files from the session's work. The existing
`push-when-done` rule (created with the OLD keyword-guessing process) did NOT
catch this because it only had generic keywords like "complete" and "done"
without patterns matching the real behavior.

## Messages that SHOULD have triggered (true positives)

1. "All 6 tasks complete and shipped." — said while docs/superpowers/plans/*.md were untracked
2. "Pushed. The plugin is now live on the marketplace with the updated commands." — generic ship claim
3. "Done. Full audit results:" followed by a summary — reporting completion as final

## Messages that should NOT trigger (true negatives)

1. "Agent A done (audio). 3 remaining." — partial progress, not final claim
2. "5 of 6 done. Just waiting on Agent E" — explicitly noting incomplete work
3. "Let me verify the results and commit." — actively working, not claiming done

## How to recreate the rule

In the new session after plugin reinstall:
```
/hammertime Whenever you have a clearly finished task and it's not pushed but is being reported as complete, run any tests that haven't been run and push it.
```

The remind-based workflow should find real examples from this session and previous ones,
then generate patterns grounded in actual behavior instead of guesses.

## Validation

After creating the rule, run the test scorer and check that:
- The 3 true positives above score >= 5
- The 3 true negatives above score < 5
- The threshold sweep shows good F1
