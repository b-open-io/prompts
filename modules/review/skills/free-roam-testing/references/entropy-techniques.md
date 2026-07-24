# Entropy Techniques

Free roam only finds new bugs if each pass genuinely differs from the last. This file is the toolbox for manufacturing that variety. Track what you've already tried in scratch state so you don't loop on the same path.

## Personas (rotate per run)

Each persona changes *what you do* and *how you judge* what happens.

- **Confused first-timer** — ignores the happy path, misreads labels, clicks the wrong CTA, doesn't know the jargon. Surfaces onboarding and copy problems.
- **Impatient power user** — keyboard shortcuts, double-clicks, skips steps, opens 3 tabs, expects speed. Surfaces race conditions, double-submit bugs, perf.
- **Hostile / abusive user** — tries to break things, injects payloads, probes auth boundaries, manipulates URLs and IDs. Surfaces security smells and validation gaps.
- **Constrained user** — mobile viewport, flaky connection, screen reader, slow CPU. Surfaces responsive breakage, accessibility, and loading-state bugs.
- **Distracted user** — abandons flows midway, navigates away mid-request, returns later, leaves stale tabs. Surfaces state/session and recovery bugs.

## Input fuzz payloads

Try these in any text/number/file field. Many apps validate the happy path and nothing else.

| Class | Payloads |
|---|---|
| Empty / whitespace | `""`, `"   "`, leading/trailing spaces, tabs, newlines |
| Oversized | 10k-char paste, very long single word (no spaces), huge numbers |
| Unicode / emoji | `😀`, RTL marks, zero-width chars, combining diacritics, `𝕦𝕟𝕚𝕔𝕠𝕕𝕖` |
| Injection-ish | `<script>alert(1)</script>`, `'; DROP TABLE`, `{{7*7}}`, `../../etc/passwd`, `${jndi:...}` |
| Type confusion | letters in number fields, negatives where positives expected, `0`, `-1`, `MAX_INT`, `NaN`, decimals in integer fields |
| Format edge | malformed email (`a@`, `@b`, `a@@b`), bad dates (`2026-13-40`), wrong currency/locale |
| File upload | wrong extension, 0-byte file, huge file, double extension (`x.png.exe`), mismatched MIME |

On prod, injection payloads are *probes for validation*, not exploits — observe whether input is sanitized; never escalate into an actual attack or data exfiltration.

## Path variation tactics

- Enter a flow from a deep link, not just the homepage.
- Use browser back/forward mid-flow; refresh on a transient page.
- Submit a form twice rapidly; cancel and resubmit.
- Open the same action in two tabs and interleave them.
- Follow secondary/footer/error-page links most users ignore.
- Manipulate URL params and IDs (does another user's `?id=` leak data?).
- Trigger every error state you can (bad input, 404 routes, expired sessions) and check the recovery path.

## What to capture for each anomaly

A finding the execution loop can't reproduce is wasted. Record:

1. **Steps** — exact path/actions, copy-pasteable.
2. **Expected vs actual.**
3. **Evidence** — screenshot, `read_console_messages` output, `read_network_requests` failures, final URL/state.
4. **Category** — broken / wrong / confusing / slow / unsafe.
5. **Severity + reproducibility** — does it happen every time or intermittently?

## Dedup heuristics

Before filing, check open tickets for a match on: same route + same category, same console error signature, or same failed endpoint. If it matches, comment the new repro on the existing ticket instead of opening a duplicate. Only genuinely new signatures become new tickets.
