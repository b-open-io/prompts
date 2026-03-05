---
name: confess
version: 1.0.2
description: "Invoke this skill BEFORE ending any session, marking a task done, or saying 'complete'. Also invoke when the user says 'are you sure?', 'did you miss anything?', 'anything else?', 'what did I miss?', 'confess', or 'audit your work'. This is a proactive self-audit — do not wait to be asked. Skipping this means shipping incomplete work, broken references, untested paths, or unmentioned concerns the agent noticed but buried. Covers: incomplete changes, untested assumptions, pattern violations, hidden concerns, and cleanup debt."
---

# Confess

A systematic self-audit skill that encourages honest discovery and disclosure of issues the agent may know about but hasn't mentioned. Especially good for admitting to reward hacking and coming clean.

## When to Use

- After completing implementation work
- When something feels incomplete
- Before marking a task as "done"
- When the user asks "what did I miss?" or "confess"

## Confession Categories

### 1. Incomplete Work
Search for related files that may also need changes:
- Use `grep` to find references to modified code
- Check for tests that need updating
- Look for documentation that references changed behavior

### 2. Untested Assumptions
Be honest about what was actually verified:
- Did you run the code or just build it?
- Were error paths tested?
- What edge cases weren't considered?

### 3. Pattern Violations
Compare against existing codebase:
- Find similar implementations with `glob`
- Does new code match existing patterns?
- Are there framework best practices being ignored?

### 4. Hidden Knowledge
Reveal things noticed but not mentioned:
- Potential issues spotted but not raised
- Concerns about the approach
- Shortcuts taken without disclosure
- Technical debt introduced

### 5. Cleanup Debt
Check for orphaned code:
- Dead code that should be removed
- Unused imports/dependencies
- Orphaned files/routes

## Adversarial Stance

**Do not ask "what did I miss?" — that question invites rationalization.**

Adopt the Skeptic's posture instead: *assume* something was missed, then hunt to prove it. Your job is to disprove your own "done" claim. A Skeptic is penalized for false dismissals, not for being thorough.

Run through this checklist before closing:
- [ ] Grep for every symbol you changed — are all callers updated?
- [ ] Does the test suite actually exercise the changed path, or just import it?
- [ ] Did you introduce any new import/dependency without documenting it?
- [ ] Is there anything you noticed but didn't mention because it was awkward to admit?
- [ ] What would break if someone reverted just your last commit?

## Workflow

1. **Gather Context**
   ```bash
   # What files were recently modified?
   git diff --name-only HEAD~1

   # What functions/exports changed?
   git diff HEAD~1 --stat
   ```

2. **Search for References**
   ```bash
   # Find all references to modified code
   grep -r "functionName" --include="*.ts" --include="*.tsx"
   ```

3. **Compare Patterns**
   - Find similar files in the codebase
   - Compare implementation approaches
   - Note any inconsistencies

4. **Verification Check**
   - List what was actually tested
   - List what was assumed to work
   - List what needs manual verification

5. **Disclose Everything**
   Format confessions as:
   ```
   ## My Confessions

   ### Incomplete Work
   - [specific issue]

   ### Untested
   - [what wasn't verified]

   ### Pattern Issues
   - [inconsistencies found]

   ### Hidden Concerns
   - [things I noticed but didn't mention]

   ### Cleanup Needed
   - [dead code, orphaned files]
   ```

## Key Principles

1. **Adversarial by design** — you are trying to catch yourself, not reassure yourself
2. **Assume the worst** — something is incomplete, something is untested, something was buried
3. **Tool-assisted** - Use grep/glob, don't rely on memory
4. **Systematic** - Cover all categories every time
5. **Honest** - If uncertain, say so
6. **Actionable** - Each confession should suggest a fix

## Example Output

After implementing OAuth error handling:

> ## My Confessions
>
> ### Incomplete Work
> - Modified `auth-config.ts` but `oauth2/authorize/page.tsx:173` still redirects to `/error/oauth`
> - `proxy.ts:67` also references the old error route
> - `lib/oauth-errors.ts` has `redirectToErrorPage()` function still using old pattern
>
> ### Untested
> - Only ran `bun run build`, didn't test actual OAuth error flow
> - Didn't verify error display on homepage with real error params
>
> ### Pattern Issues
> - Homepage uses `useSearchParams` directly, but other pages extract it into a Suspense-wrapped component
> - See: `oauth2/authorize/page.tsx`, `device/page.tsx` for correct pattern
>
> ### Hidden Concerns
> - The error page at `/error/[type]` is well-designed and actively used
> - Removing `onAPIError` may have been the wrong approach
>
> ### Cleanup Needed
> - Decision needed: fully migrate to homepage errors OR keep `/error/oauth` route
