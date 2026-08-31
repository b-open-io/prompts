# Plain language for a proposal page

The reviewer reads this page once, fast, without your context. Rule 3 in
`SKILL.md` states the register. This file carries the full specification, the
rewrite gallery, and the brief you paste into every dispatched agent.

## The register

Write every word on the page — headings, theses, captions, advocate cases,
judge verdicts, the CEO's call, button labels — to these rules.

1. **One idea per sentence.** Cap a sentence at 25 words. Split a long sentence.
   Do not join two ideas with a semicolon or an em dash.
2. **Name the actor. Use the active voice.** Write "the indexer rejects the
   output", not "the output is rejected". A passive sentence hides who acts, and
   the reviewer needs to know who acts.
3. **One word for one meaning.** Choose one term per thing and repeat it. Do not
   swap in a synonym for variety. "Output", "UTXO", and "coin" in one page read
   as three different things.
4. **Gloss a term on first use**, in the same sentence. An acronym with no gloss
   costs the reviewer a search.
5. **Name a specification before its identifier on first use.** Write
   “BRC-100 Wallet Interface,” not just “BRC-100.” Use the source's real title
   and link it when possible.
6. **Put the outcome first.** State the conclusion, then the reason. Do not
   build up to the point.
7. **Use the simple present tense.** "The wallet signs the input." Reserve the
   future tense for work that is genuinely not built yet.
8. **Give numbers, not adjectives.** Write "adds one 34-byte output", not "adds
   minimal overhead". An adjective is an opinion. A number is a fact the
   reviewer can check.
9. **No idioms, no metaphors, no filler.** A metaphor makes the reader guess at
   a mechanism. Give the mechanism.
10. **Argue with evidence, never with adjectives.** "Elegant", "clean",
   "robust", and "future-proof" carry no information. Name what the thing does.

## Cut these

| Cut | Because |
| --- | --- |
| "just", "simply", "merely" | Tells the reader the work is easy. It may not be. |
| "it's worth noting", "importantly", "of course" | Says nothing. Delete and keep the fact. |
| "arguably", "somewhat", "fairly", "quite" | Hedges with no boundary. Give the boundary. |
| "at the end of the day", "under the hood" | Idiom. Name the real thing. |
| "leverage", "unlock", "seamless", "first-class" | Sales vocabulary. Name the mechanism. |
| "robust", "elegant", "clean", "modern" | Adjective as argument. Give the number or the behavior. |
| "may or may not", "in some cases" | Unfinished research. Check it, or label it unverified. |
| "this proposal presents…" | Describes the document. The reviewer sees the document. |

## Rewrite gallery

**Hedged filler → a checkable fact**

- Before: "While this approach is arguably more elegant, it's worth noting that
  adoption remains something of an open question."
- After: "No indexer parses this format today. Two indexers need a change before
  the format works in production."

**Metaphor → mechanism**

- Before: "Option B bakes the metadata into the DNA of the transaction."
- After: "Option B writes the metadata into output 0. Every later spend carries
  it."

**Passive with no actor → named actor**

- Before: "The signature is validated before the output is released."
- After: "The overlay service validates the signature, then releases the
  output."

**Adjective → number**

- Before: "Option A is significantly cheaper."
- After: "Option A costs 34 bytes per mint. Option C costs 210 bytes."

**Synonym drift → one term**

- Before: "The collection holds items; each piece links to the parent set."
- After: "The collection holds items. Each item links to the collection."

**Process narration → the problem**

- Before: "Three advocates argued the options and a judging bench then ruled on
  the trade-offs presented below."
- After: "A creator cannot prove which items belong to a collection. Buyers
  currently trust a marketplace's word."

**Wall of clauses → one idea per sentence**

- Before: "Because the standard is still a draft and no wallet implements it
  yet, choosing it means shipping something that works only inside our own stack
  until the ecosystem catches up, which may take a year or may never happen."
- After: "The standard is a draft. No wallet implements it today. If we choose
  it, only our own stack reads the data until a wallet ships support. Nobody has
  committed to a date."

## The dispatch brief

Paste this block into every advocate, judge, and CEO prompt, under the shared
context. It sets the register once so the returns need no rewriting.

```
WRITING REGISTER — follow exactly. Your text goes on the page unedited.

- One idea per sentence. Maximum 25 words per sentence.
- Active voice. Name the actor: "the indexer rejects the output".
- One word for one meaning. Never swap in a synonym for variety.
- Gloss every term and acronym on first use, in the same sentence.
- Name every specification before its identifier on first use and link the
  source when possible.
- Outcome first, reason second.
- Numbers, not adjectives. "34 bytes per mint", never "cheap" or "elegant".
- No idioms, no metaphors, no filler ("just", "simply", "it's worth noting",
  "at the end of the day", "leverage", "seamless", "robust").
- Never argue by adjective. Name what the thing does, or cite the fact.
- Every claim traces to real code, a real spec, or a real measurement. Label an
  unverified claim "unverified" instead of stating it as settled.
- Run Skill(core:humanize) on your prose before you return it.
```

## Return shapes and word budgets

Give each role the shape below. The shapes make the returns comparable, and a
budget keeps a card readable next to its neighbors.

**Advocate**

| Field | Budget | Rule |
| --- | --- | --- |
| thesis | 1 sentence, 25 words | The strongest single reason to pick this option. |
| case | 3 claims, 2 sentences each | Each claim names a mechanism and its evidence. |
| challenges | 2–3 items, 1 sentence each | The honest costs. Hiding one destroys the card. |
| fits\_best | 1 sentence | The condition under which this option clearly wins. |
| rebuttals | 1 sentence per rival, by name | The sharpest specific weakness of that rival. |

**Judge**

| Field | Budget | Rule |
| --- | --- | --- |
| lens | 6 words | The single axis this judge evaluates. |
| winner / runner\_up | option names | No ties. A tie hides the reasoning. |
| deciding\_factor | 1 sentence | A testable statement, not a preference. |
| flip\_condition | 1 sentence | The form "would flip if <observable fact>". Name a fact somebody can go check. |

**CEO**

| Field | Budget | Rule |
| --- | --- | --- |
| decision | 1 sentence | Names the chosen option and the action. |
| reasoning | 3 sentences | Business and user terms: cost, reversibility, debt, who it serves. No technical re-argument. |
| change\_my\_mind | 1 sentence | The one fact or event that reverses the call. |

## Read-through check before publishing

Read the assembled page top to bottom and answer each question. Fix what fails.

1. Does the opening name the problem and who it hurts, with no sentence about
   how the page was made? Delete every opening sentence that would still be true
   for a completely different proposal.
2. Does any sentence run past 25 words or carry two ideas?
3. Does any sentence hide its actor behind the passive voice?
4. Does one thing go by two names anywhere on the page?
5. Does any term or acronym appear before its gloss?
6. Does any argument rest on an adjective where a number exists?
7. Does any advocate, judge, or CEO card exceed its budget above?
8. Would a reader outside this project understand every sentence on one read?
9. Does every unresolved decision have a selectable question whose options
   explain outcome, benefit, cost or risk, reversibility, and follow-up?
