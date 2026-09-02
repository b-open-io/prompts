---
name: humanize
version: 1.0.12
description: >-
  This skill should be used for human-facing prose — emails, docs, reports, posts, release notes,
  and commit messages — when the user asks to "humanize", "make this sound less AI", "de-AI
  this", "this sounds like ChatGPT", or "edit this". This skill should also be used when the user
  asks to "humanize this sales email", "this SDR copy sounds like AI", "cold email",
  "outbound email", or "sales script". Preserve facts, evidence, citations, house style, and
  intended meaning while removing clustered AI-writing patterns.
user-invocable: false
---

# Humanize

Edit prose until it reads as specific, grounded human writing. Treat the
patterns below as editorial signals, not proof that a person or model wrote the
text. Pattern density and context matter more than any single word or sentence.

## Preserve truth before style

Keep every supported claim inside the source material or user brief's factual
boundary.

- Preserve names, dates, numbers, quotations, examples, capabilities,
  attribution, citations, links, uncertainty, and causal direction.
- Never invent a statistic, customer result, source, quotation, anecdote, or
  product behavior to make a sentence sound concrete.
- Draw specificity from supplied text, verified tools, or facts the user
  provided. Keep the claim general when the evidence is general.
- Treat "these are the only supplied facts" and equivalent instructions as a
  closed-world constraint. Headings may classify those facts, but body copy
  must not infer a mechanism, benefit, outcome, audience, or implementation.
  Restate the facts and stop.
- Preserve necessary qualifications. Remove a hedge only when the source
  supports the stronger claim.
- Preserve house style when it is explicit, including spelling, typography,
  heading conventions, and technical terminology.

Run this check again after the style pass. A polished factual change is still a
failed edit.

## Core editorial checks

### 1. Cut staged contrast

Remove contrast that exists only to inflate the preferred claim. Check the move
by meaning; phrase bans miss most variants.

- "not X — it's Y" / "not just X but Y" / "no X, just Y"
- "rather than X, Y" / "instead of X, Y" / "less X, more Y"
- "while X is true, Y" when the concession has no job beyond the pivot
- "where others do X, we do Y" / "forget X" / "gone are the days"

State the positive claim alone when that preserves the meaning. Keep contrast
when it reports a real correction, defines a boundary, or distinguishes two
facts the reader needs. Repeated staged contrasts are the tell; an occasional
necessary contrast is ordinary prose.

Do not add a staged contrast to give a fresh draft a slogan or closing beat.
Constructions such as "X shouldn't require Y—it requires Z" still make the same
decorative move even without the word "not."

Examples:
- BAD: "Uptime isn't optional — it's the foundation." → GOOD: "Uptime is the foundation."
- BAD: "Rather than bolting analytics on later, we build it in from day one." → GOOD: "Analytics is built in from day one."
- BAD: "Where most CLIs make you memorize flags, ours guesses intent." → GOOD: "The CLI infers intent from plain commands."

### 2. Break repeated symmetry

Keep a three-item list when the subject genuinely has three items. Rewrite when
triads, parallel clauses, or identically shaped sections recur as a composition
habit, especially in slogans and conclusions.

- BAD: "fast, reliable, and secure" (3 items)
- GOOD when all three are facts: "The API supports CSV, JSON, and XML."
- GOOD after removing filler: "fast and reliable"
- BAD: four company values with the same heading-plus-two-sentences template
- BAD: three consecutive paragraphs ending in parallel benefit summaries

Vary sentence shape because the content varies. Do not add a fourth item or
delete a required third item merely to change the count.

### 3. Remove indirect repetition

Delete a sentence that only restates the preceding sentence, section, or
conclusion. Keep repetition required for navigation, safety, or deliberate
reference documentation.

- BAD: "When the clock runs out, the rule deletes itself. No cleanup." → "No cleanup" just restates "deletes itself."
- GOOD: "When the timer expires, the rule deletes itself."
- BAD: "It's completely free. Zero cost to you." → "Zero cost" restates "completely free."
- GOOD: "It's free."

### 4. Vary rhythm without quotas

Read paragraph endings as a sequence. Rewrite only when several paragraphs end
with interchangeable punchlines or when sentence lengths become metronomic.
Allow short endings where they fit. Never lengthen a sentence with invented
detail to satisfy a word count.

- Cut generic closers such as "That's the difference," "It compounds," and
  "This changes everything."
- End on a supplied fact, a consequence already supported by the source, a
  useful transition, or the natural end of the thought.
- Break stacked fragments and repeated sentence lengths.

For the full pattern catalog, read
[references/structures.md](references/structures.md) when editing long-form,
marketing, heavily formatted prose, or operational summaries.

## Content-level checks

### Remove unsupported significance

Delete claims that a routine fact "marks a shift," "reflects a broader trend,"
"leaves an enduring legacy," or "underscores the importance" of the subject
unless the source supplies that analysis. Report the fact and its documented
consequence.

Check sentence-ending participial tails:

- "..., highlighting..."
- "..., underscoring..."
- "..., reflecting..."
- "..., contributing to..."

Stop at the fact when the tail adds interpretation without evidence.

### Name the source of a claim

Remove invented consensus: "experts argue," "observers note," "industry reports
show," "widely regarded," or "several sources" when the supplied material does
not identify those authorities. Attribute a claim to the actual source and do
not turn one opinion into a field-wide view.

### Remove promotional drift

Replace praise with observable facts. Catch press-release language, generic
commitment claims, travel-guide description, and claims of excellence or
importance. Retain evaluative language when it is quoted or attributed.

### Keep stable names

Reuse the correct noun when repetition improves clarity. Do not cycle through
synonyms such as "platform," "solution," "offering," and "system" merely to
avoid repeating a product name.

## Operational summaries

For commit messages, release notes, edit summaries, and status updates, name
what changed. Remove canned assurances such as:

- "improved clarity and readability"
- "ensured compliance"
- "preserved the original meaning"
- "added sourced content"
- "maintained a neutral tone"

Describe the concrete edit: "Remove duplicate setup steps," "Correct the timeout
default," or "Document the two supported authentication flows." Mention
preservation only when it is itself the change being reviewed.

## Modeling a named writer

Model structure, never sentences. Extract a named concept, claim-shaped
headings, argument order, and a reason for the reader to continue. Leave the
writer's antithesis, triads, punchlines, and invented color behind.

Read [references/style-modeling.md](references/style-modeling.md) before using a
named writer on long-form work. Skip this step for short copy, reference docs,
changelogs, and established house voices.

## Sales copy

When the draft is outbound email, a first reply, a discovery question, a call
opener, or a sales script, also read
[references/sales.md](references/sales.md).

Use a line as few-shot only when a named person sent or received it and a
result is attached. Do not use SaaS template mills. Ground one un-fakeable
fact from this account. If research is thin, say less. Do not invent warmth,
reach, or prices.

## Mandatory revision pass

Run this pass silently before delivering human-facing prose. When the user asks
for finished copy, return only that copy unless they also ask for rationale,
annotations, or an edit summary.

1. Compare the revision with the source. Restore any changed fact, uncertainty,
   attribution, citation, link, or unsupported new detail.
2. Scan staged contrasts by meaning, including disguised forms. Remove
   comparisons that only prop up the preferred claim.
3. Scan repeated triads, parallel clauses, identical section templates, and
   listicle structure. Keep enumerations required by the facts.
4. Delete indirect repetition, throat-clearing, summary restatement, and
   dramatic fragments.
5. Remove unsupported significance, broader-trend claims, participial tails,
   invented consensus, and promotional praise.
6. Replace inflated copulas and dense vocabulary clusters with plain language.
   Retain exact technical uses and necessary hedges.
7. Check stable naming, false ranges, denigration, "nobody knows" claims, and
   hedged evaluation such as "worth noting."
8. Read paragraph endings and sentence lengths as sequences. Break repetitive
   rhythm without enforcing word counts.
9. Remove assistant residue: sycophantic openers, collaborative closers,
   decorative emoji, mechanical boldface, canned headings, and cutoff
   disclaimers. Preserve explicit house style.
10. For operational summaries, replace process assurances with the concrete
    change.
11. For sales copy, also run the checks in
    [references/sales.md](references/sales.md): attributed sources only, one
    un-fakeable fact, banned sales tells, observation then implication then
    one question.

## Stop condition

Deliver when the revision preserves the source, removes repeated formulaic
patterns, and reads naturally for its genre. Do not keep editing until every
possible indicator disappears; that produces another synthetic house style.

## Additional Resources

- **[references/words.md](references/words.md)** — Vocabulary clusters to review
  in context, including inflated copulas and unsupported novelty claims
- **[references/phrases.md](references/phrases.md)** — Filler openers, emphasis
  crutches, jargon, and meta-commentary
- **[references/structures.md](references/structures.md)** — Detailed prose,
  formatting, attribution, promotional, and operational-summary patterns
- **[references/examples.md](references/examples.md)** — Factual-boundary-safe
  before/after transformations
- **[references/style-modeling.md](references/style-modeling.md)** — Structural
  modeling for long-form work
- **[references/sales.md](references/sales.md)** — Outbound and sales-script
  checks: source rule, sales tells, attributed examples, voice card. Search
  `Source rule`, `Sales-specific tells`, `Attributed examples`, `Voice card`.
