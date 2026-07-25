# Modeling a Named Writer

A draft can satisfy every rule in this skill and still be dull. Rules 1–4 are
subtractive: they remove what marks prose as machine-written. Nothing in them
supplies a shape, so a piece that passes cleanly often reads as accurate
statements arranged in the order the work happened.

Modeling a named writer is the additive step. It is most useful on long-form
work — a technical post, a launch narrative, a postmortem — and unnecessary on
anything under a few hundred words.

## The procedure

**1. Pick a writer you actually know well.** Not the most famous, the one whose
work you can recall specifically enough to name their moves. If you cannot list
four things they reliably do, pick someone else.

**2. Name their structural moves before writing.** Write them down. This is what
separates modeling from imitation: you are extracting a method, and a method can
be stated. Some that transfer well:

| Writer | Moves that transfer |
|---|---|
| Joel Spolsky | Names the phenomenon; opens on a concrete observation; headings that argue; ends on a rule the reader can apply |
| Dan Luu | Leads with the measurement; states what the sample size does and does not support; corrects widely-repeated advice with data |
| Julia Evans | Starts from the question a reader actually has; separates "what I know" from "what I checked"; small worked examples over abstraction |
| Paul Graham | One idea per paragraph; generalizes from a specific case; refuses the qualifier when the plain claim is true |

**3. Rewrite the outline first, not the prose.** Reorder sections by what the
reader needs next. Rewrite every heading as a claim or an instruction. Find the
named concept. Most of the gain is here, before a sentence is touched.

**4. Draft in the voice.** Let it be too much. The next step fixes it.

**5. Run the full mandatory revision pass on the result.** Non-negotiable. See
below for why.

## What transfers

- **A named concept.** "The catalog tax." One phrase for the subject, introduced
  early, reused twice, then dropped. The reader leaves able to repeat the idea.
- **Headings that make claims.** A heading is the most-read text in a long piece
  and the most commonly wasted. "Results" is a filing label. "What it said" is a
  promise. "Three ways to get a red result that means nothing" is a reason to
  keep reading.
- **Argument order over chronology.** The order the work happened in is almost
  never the order that teaches it. Lead with the finding that changes what the
  reader does first.
- **A stated stake for the reader.** Early, in their terms: what part of this
  applies to what they have built. Without it, a results piece is a report about
  you.
- **Compression.** Writers with a strong voice cut. Modeling one tends to shorten
  a draft, and the removed material is usually restatement.

## What does not transfer

**The sentence-level tics.** This is the trap, and it is not incidental — the
moves that make a beloved technical writer recognizable at the sentence level are
largely the moves Rules 1, 2, and 4 exist to remove. Antithesis is the engine of
Spolsky's contrarian energy. Tricolons are everywhere in essayistic prose. Punchy
sub-15-word paragraph endings are the rhythm of a confident columnist. Writing in
their voice will reproduce all three without being asked.

**Invented color.** A modeled voice offers atmospheric detail for free: the 2am
debugging session, the meeting where somebody said the thing, the colleague who
disagreed. If it did not happen, cut it. This is a factual claim in a technical
post, and it is the fastest way to lose a reader who knows the subject.

**Personality that outruns the evidence.** A confident stylist states things
flatly. Your draft still has to say "at three runs that swing does not separate a
clearer description from ordinary variance." Keep the hedge where the data needs
one; the voice does not get a vote on what is true.

## Measured

One 3,300-word technical post, rewritten to a named writer's structure and voice,
compared against the same content in its own voice:

| | Own voice | Modeled draft |
|---|---:|---:|
| Words | 3,543 | 3,320 |
| Antithesis constructions | 4 | 9 |
| Paragraphs ending under 15 words | 16 / 72 (22%) | 22 / 61 (36%) |

After the mandatory revision pass brought the modeled draft back under both
limits, every structural gain remained: the named concept, the claim-shaped
headings, the argument ordering, and the shorter length. Nothing of value was
carried by the tics.

That is the whole finding. Model the structure. Strip the voice. Keep both.

## When to skip this

- Anything short. There is no structure to model in three paragraphs.
- Reference documentation, changelogs, API docs. Their shape is prescribed and a
  personal structure fights it.
- Anywhere the reader expects a house voice they already recognize.
