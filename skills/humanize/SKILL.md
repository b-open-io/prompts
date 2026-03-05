---
name: humanize
version: 1.0.2
description: Invoke this skill whenever producing text that a human will read — emails, messages, documentation, reports, blog posts, announcements, commit messages, or any prose draft. Trigger signals include: task is a writing or editing task, output will be sent or published, user says "humanize", "make this sound less AI", "de-AI this", "this sounds like ChatGPT", "make it sound more natural", or "edit this". Do not wait for the user to ask — apply this automatically before delivering any human-facing draft. Skipping this means delivering text with predictable AI patterns (filler openers, overused vocabulary, formulaic structure) that erodes trust and sounds generated.
---

# Humanize

Strip AI writing patterns from prose. Follow these three rules exactly.

## The Three Rules

### Rule 1: No negation-then-contrast

Before writing any sentence, check: does it say what something ISN'T before saying what it IS? If yes, delete the negative part. Keep only the positive claim.

- BANNED: "not X — it's Y", "isn't X, it's Y", "stop X, start Y", "no X, no Y, no Z", "aren't nice-to-haves — they're Y"
- FIX: Just say Y. Delete everything before the dash, "but", or contrast.

Examples:
- BAD: "Uptime isn't optional — it's the foundation." → GOOD: "Uptime is the foundation."
- BAD: "No setup, no config, no hassle." → GOOD: "Setup takes two minutes."
- BAD: "Stop managing servers and start shipping." → GOOD: "Ship features while the infrastructure runs itself."

### Rule 2: Never list exactly three parallel items

When you write a list, count the items. If there are exactly 3 items in parallel structure, either remove one (making it 2) or add one (making it 4).

- BAD: "fast, reliable, and secure" (3 items)
- GOOD: "fast and reliable" (2 items)
- GOOD: "fast, reliable, secure, and well-documented" (4 items)
- BAD: "We build X, we test Y, and we ship Z" (3 parallel clauses)
- GOOD: "We build X and ship Z" (2 clauses)

This applies everywhere: adjective lists, verb lists, noun lists, parallel sentences.

### Rule 3: Only one short paragraph ending per piece

After writing, check the last sentence of every paragraph. Count its words. At most ONE paragraph may end with a sentence under 15 words. All other paragraphs must end with a sentence of 20+ words that includes a specific detail, number, or example.

- BAD: Para 1 ends "That's the real advantage." (5 words), Para 2 ends "It compounds." (2 words), Para 3 ends "Start early." (2 words)
- GOOD: Para 1 ends "That's the real advantage." (5 words), Para 2 ends "Teams that invested in CI early shipped 40% more features in their second year than teams that bolted it on later." (22 words), Para 3 ends with a 25-word sentence containing a specific data point or example.

## Additional Guidelines

- **Cut filler openers.** Start with the actual point, not "In today's rapidly evolving..." See [references/phrases.md](references/phrases.md).
- **Replace AI vocabulary.** Avoid "nice-to-have," "table stakes," "compound returns," "first-class," "highest-leverage," "force multiplier," "false economy." See [references/words.md](references/words.md).
- **Trust the reader.** State the point and move on.

## Mandatory Revision Pass

After writing any prose, you must do a concrete revision pass before delivering. This is not optional — the first draft will contain AI patterns no matter how carefully you write it. Do these checks mechanically:

1. **Find every "not" / "n't" / "isn't" / "aren't" / "stop".** For each one, check if it's followed by a contrast (a dash, "but", or a period introducing the opposite claim). If so, delete the negative clause and keep only the positive claim. "Observability isn't an afterthought" → "Observability is built in from the start."
2. **Count every parallel list.** If you find exactly three items in parallel structure (X, Y, and Z), either drop one item or add a fourth.
3. **Read the last sentence of each paragraph.** Count the words. If more than one ending is under 15 words, rewrite the short ones to be 20+ words with specific details.
4. **Check for "nice-to-have", "table stakes", "false economy"** and the other AI vocabulary in rule 5. Replace with plain language.

Do this revision pass silently — don't mention it in your output. Just deliver the cleaned text.

## Quick Checks

Before delivering revised prose:

- Search for "not" / "n't" + contrast → rewrite as direct positive claim
- Count every list: exactly 3 items → change to 2 or 4
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
