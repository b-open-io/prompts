---
name: humanize
version: 1.0.9
description: >-
  Strip AI writing patterns from any prose a human will read — emails, docs, reports, posts,
  commit messages. Apply automatically before delivering a draft, and on "humanize", "make this
  sound less AI", "de-AI this", "this sounds like ChatGPT", or "edit this".
user-invocable: false
---

# Humanize

Strip AI writing patterns from prose. Follow these three rules exactly.

## The Three Rules

### Rule 1: No setup-and-dismiss (antithesis), in any form

The single most recognizable AI tell is the antithesis move: name something to dismiss or diminish, then pivot to the "real" claim. **Banning a phrase does not work** — block "not X, it's Y" and the model swaps in "rather than X, Y" or "while X, Y" and makes the exact same move. So ban the MOVE, not the words. Before writing any sentence, ask: **does it prop up the real point by first knocking down an alternative?** If so, delete the dismissed half and state the claim alone.

The move wears many costumes. Every one of these is the same pattern:

**With negation (easy to catch):**
- "not X — it's Y" / "isn't X, it's Y" / "It's not about X, it's about Y"
- "not just X but Y" / "not only X but also Y" / "more than just X"
- "no X, no Y, just Z" / "stop X, start Y"
- "Not X. Y." (dramatic fragment pair)

**Without any "not" (the disguised forms — these slip past a keyword search and are how the pattern usually escapes):**
- "rather than X, Y" / "X rather than Y"
- "instead of X, Y"
- "less X, more Y"
- "While X is true, Y…" / "X may be Z, but Y…" (concessive setup that exists only to pivot)
- "Where most/others do X, we do Y"
- "forget X — Y" / "say goodbye to X" / "no more X"
- "gone are the days of X"
- "X? Think again." / "beyond just X"

FIX: Say Y. Drop the comparison entirely. If the positive claim is clear, the contrast adds nothing but a machine fingerprint.

**Frequency is the dead giveaway.** A single antithesis can read as human — people use the move occasionally. Corpus analysis of 16,000 articles found the 2026 signature is *burstiness*: the same piece using "not X, it's Y" (or a disguised cousin) three or more times. If you must keep one, keep exactly one. Aim for zero.

**The one exception: a measured correction.** When the dismissed half is a belief the reader actually holds and the pivot is evidence, the move is reporting a result. "Everybody assumes it's the skills. Measured, agents were 54% of the cost." Nothing is knocked down there but a real expectation, and the correction is the finding. The test is whether the first half would survive as a standalone claim someone would defend. If it exists only to make the second half sound bigger, it is the AI tell — cut it. Keep at most one per piece, and only where you have the number.

Examples:
- BAD: "Uptime isn't optional — it's the foundation." → GOOD: "Uptime is the foundation."
- BAD: "Rather than bolting analytics on later, we build it in from day one." → GOOD: "Analytics is built in from day one."
- BAD: "Where most CLIs make you memorize flags, ours guesses intent." → GOOD: "The CLI infers intent from plain commands."
- BAD: "Less configuring, more shipping." → GOOD: "Setup takes two minutes."
- BAD: "Gone are the days of manual deploys." → GOOD: "Every push deploys automatically."
- BAD: "We're building tools that make agents behave like thoughtful collaborators, not just code generators." → GOOD: "We're building tools that make agents behave like thoughtful collaborators."
- BAD: "Not prompting. Enforcement." → GOOD: Describe what it does. The reader will get it.
- BAD: "Not features. Outcomes." → GOOD: Drop it entirely. If your previous sentence was clear, this adds nothing.

### Rule 2: Never list exactly three parallel items

When you write a list, count the items. If there are exactly 3 items in parallel structure, either remove one (making it 2) or add one (making it 4).

- BAD: "fast, reliable, and secure" (3 items)
- GOOD: "fast and reliable" (2 items)
- GOOD: "fast, reliable, secure, and well-documented" (4 items)
- BAD: "We build X, we test Y, and we ship Z" (3 parallel clauses)
- GOOD: "We build X and ship Z" (2 clauses)

This applies everywhere: adjective lists, verb lists, noun lists, parallel sentences.

### Rule 3: No indirect repetition

Never restate the same point in different words for emphasis. Say it once clearly and move on. If the first sentence already conveys the meaning, the restating sentence is dead weight.

- BAD: "When the clock runs out, the rule deletes itself. No cleanup." → "No cleanup" just restates "deletes itself."
- GOOD: "When the timer expires, the rule deletes itself."
- BAD: "It's completely free. Zero cost to you." → "Zero cost" restates "completely free."
- GOOD: "It's free."
- BAD: "The data is encrypted at rest. Your information stays protected." → second sentence restates the first.
- GOOD: "The data is encrypted at rest."

### Rule 4: Only one short paragraph ending per piece

After writing, check the last sentence of every paragraph. Count its words. At most ONE paragraph may end with a sentence under 15 words. All other paragraphs must end with a sentence of 20+ words that includes a specific detail, number, or example.

- BAD: Para 1 ends "That's the real advantage." (5 words), Para 2 ends "It compounds." (2 words), Para 3 ends "Start early." (2 words)
- GOOD: Para 1 ends "That's the real advantage." (5 words), Para 2 ends "Teams that invested in CI early shipped 40% more features in their second year than teams that bolted it on later." (22 words), Para 3 ends with a 25-word sentence containing a specific data point or example.

## Modeling a Named Writer

Rules 1–4 remove the machine fingerprint. They do not supply a shape. A draft
can pass every check and still read as a list of true statements in the order
they happened, which is the most common failure of a report-style piece.

The fix is to pick a writer whose work you know well and model them — but model
the **structure**, never the sentences. Their organizing moves transfer. Their
sentence-level habits are what Rules 1–4 exist to remove, and importing them
undoes the pass. See [references/style-modeling.md](references/style-modeling.md)
for the full procedure and the measured evidence.

**Take these four:**

1. **A named concept.** One phrase for the thing the piece is about, introduced
   early and reused. The reader leaves with a handle.
2. **Headings that make claims.** "First, find out who is actually eating" tells
   the reader what they will learn; "Agents were 54% of the cost" only records a
   fact. Every heading should be a claim or an instruction.
3. **Argument order over chronology.** Sequence sections by what the reader needs
   next, which is rarely the order the work happened in.
4. **A reason to read past your numbers.** State what transfers to the reader's
   own situation, in their terms, before the detail starts.

**Leave these:** the voice tics. Most beloved technical writers lean hard on
antithesis, tricolons, and punchy short paragraph endings — those are engines of
their prose and violations of Rules 1, 2, and 4. Also leave invented color: a
modeled voice will offer you atmospheric detail ("the sort of thing you find at
2am") that you cannot substantiate. Cut it.

**Always run the full revision pass on the modeled draft.** Measured on one
3,300-word technical post, a first draft written to a named writer's voice more
than doubled its antithesis count and pushed short paragraph endings from 22% of
paragraphs to 36%. The structural gains survived the cleanup. The tics had to go.

## Additional Guidelines

- **Cut filler openers.** Start with the actual point, not "In today's rapidly evolving..." See [references/phrases.md](references/phrases.md).
- **Replace AI vocabulary.** Avoid "nice-to-have," "table stakes," "compound returns," "first-class," "highest-leverage," "force multiplier," "false economy." See [references/words.md](references/words.md).
- **Use plain copulas.** AI dodges "is/are/has" with inflated verbs to sound momentous: "serves as," "stands as," "represents," "boasts," "features," "marks a shift," "is a testament to." Write "is" or "has." "The API serves as the backbone of the platform" → "The API runs every request."
- **Kill false ranges.** "from startups to enterprises," "whether you're a solo dev or a Fortune 500," "from X to Y" — these fake comprehensiveness while saying nothing. Name the actual audience or cut the range.
- **Trust the reader.** State the point and move on.

## Mandatory Revision Pass

After writing any prose, you must do a concrete revision pass before delivering. This is not optional — the first draft will contain AI patterns no matter how carefully you write it. Do these checks mechanically:

1. **Hunt the antithesis move by meaning, not just by the word "not."** First scan the literal tokens: "not", "n't", "isn't", "aren't", "stop", "no ". Then scan the disguised tokens that do the same job with no "not" in sight: "rather than", "instead of", "less … more", "while ", "where ", "forget", "gone are the days", "no more", "beyond just". For every hit, ask: is an alternative being set up only to be knocked down? If so, delete the dismissed half and keep the bare positive claim. "Observability isn't an afterthought" and "Rather than treat observability as an afterthought, we build it in" both collapse to the same fix: "Observability is built in from the start."
2. **Count every parallel list.** If you find exactly three items in parallel structure (X, Y, and Z), either drop one item or add a fourth.
3. **Check for indirect repetition.** Read each pair of consecutive sentences. Does the second just restate the first in different words? Delete the restating sentence.
4. **Read the last sentence of each paragraph.** Count the words. If more than one ending is under 15 words, rewrite the short ones to be 20+ words with specific details.
5. **Check for "nice-to-have", "table stakes", "false economy"** and the other AI vocabulary. Replace with plain language.
6. **Never denigrate the subject.** Search for "rot", "cruft", "bloat", "mess", "sloppy", "garbage", "decay", "neglect". Writing about your own product, describe what changed and what it does now; do not grade the past. This applies hardest to headings, where a defect framing lands before any result does.
7. **If you modeled a named writer, check their tics hardest.** A modeled voice reproduces antithesis, tricolons, and short paragraph endings without being asked. Re-run checks 1, 2, and 4 on that draft specifically, and cut any atmospheric detail the voice supplied that you cannot substantiate.
8. **Search for "worth".** It grades something without committing to a claim — "worth noting", "worth doing", "worth avoiding", "worth migrating to" — and is one of the strongest single-word AI tells. Replace every hit with the consequence itself. In a heading it is always wrong: "The Mistake Worth Publishing" should say what the section covers.

Do this revision pass silently — don't mention it in your output. Just deliver the cleaned text.

## Quick Checks

Before delivering revised prose:

- Search for "not" / "n't" + contrast → rewrite as direct positive claim
- Search for the no-"not" antithesis tokens — "rather than", "instead of", "less…more", "while", "where", "forget", "gone are the days" → if an alternative is set up only to be dismissed, cut it and keep the bare claim
- Search for inflated copulas — "serves as", "stands as", "boasts", "is a testament to" → replace with "is" / "has"
- Count every list: exactly 3 items → change to 2 or 4
- Consecutive sentences saying the same thing differently → keep only the better one
- Last sentence of each paragraph: are they all short? → lengthen all but one
- "Stop X, start Y" → just say Y
- Three sentences in a row the same length? Break one up.
- Does the first sentence actually say anything? If not, delete it.

## Scoring

After editing, rate the text 1–10 on each dimension:

| Dimension | Question to ask |
|-----------|-----------------|
| Directness | Does it state facts, or announce them? |
| Rhythm | Are sentences varied in length and structure? |
| Trust | Does it respect reader intelligence? |
| Voice | Does it sound like a person wrote it? |
| Density | Is anything cuttable without losing meaning? |

Below 35/50: revise again.

## What Good Looks Like

**AI version (bad):**
> **Speed.** We don't just build fast infrastructure — we build infrastructure that's fast, reliable, and scalable. Your transactions process in milliseconds, not minutes. That's the difference.

**Humanized version (good):**
> **Speed.** Transactions process in under 200ms. We cache settlement data locally so round-trips to the clearinghouse don't block your checkout flow. Most integrations go live in a day or two.

Notice what changed: the binary contrast ("don't just X — we Y") is gone, the tricolon ("fast, reliable, and scalable") became specific claims, the punchline ending ("That's the difference") became a practical detail, and the paragraph ends with a long informational sentence rather than a mic-drop.

Good humanized prose:
- States claims directly without "not X — it's Y" setup
- Uses two items in lists, not three
- Ends paragraphs with specific details, not dramatic summaries
- Uses specific numbers instead of general superlatives
- Varies sentence structure between sections

## Additional Resources

- **[references/words.md](references/words.md)** — AI-overused vocabulary by part of speech
- **[references/phrases.md](references/phrases.md)** — Throat-clearing openers, filler phrases, jargon substitutions
- **[references/structures.md](references/structures.md)** — Formulaic sentence and paragraph patterns to avoid
- **[references/examples.md](references/examples.md)** — Before/after transformations with annotations
- **[references/style-modeling.md](references/style-modeling.md)** — Modeling a named writer's structure on long-form work, and the tics to leave behind
