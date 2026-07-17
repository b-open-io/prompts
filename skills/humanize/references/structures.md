# Structural Patterns to Avoid

These are recognizable sentence and paragraph patterns that AI models generate repeatedly. They're not wrong, exactly — but they're predictable in a way that signals machine authorship.

## Binary Contrasts

Creating a false "not X, but Y" drama when you could just say Y. This is the most common AI tell. **Blocking the literal phrase does not work** — the model substitutes a synonym structure and makes the identical move. Watch for the *move* (set up an alternative, knock it down, pivot to the real claim), not just the words.

### With negation (obvious)

| Pattern | Example | Problem |
|---------|---------|---------|
| "Not because X. Because Y." | "Not because it's easy. Because it's hard." | Telegraphed reversal |
| "[X] isn't the problem. [Y] is." | "Time isn't the problem. Clarity is." | Formulaic reframe |
| "The answer isn't X. It's Y." | "The answer isn't more data. It's better questions." | Predictable pivot |
| "It feels like X. It's actually Y." | "It feels like chaos. It's actually a pattern." | Setup/reveal cliche |
| "The question isn't X. It's Y." | "The question isn't when. It's whether." | Rhetorical misdirection |
| "Not X. But Y." | "Not perfection. But consistency." | Mechanical contrast |
| "Not only X but also Y" | "Not only fast but also secure." | Padded parallelism |
| "stops being X and starts being Y" | "stops being work and starts being art" | False transformation arc |

### Disguised — no "not" anywhere (these are how the pattern escapes review)

| Pattern | Example | Problem |
|---------|---------|---------|
| "X rather than Y" / "rather than X, Y" | "We coach rather than command." | Same antithesis, no "not" to grep |
| "instead of X, Y" | "Instead of dashboards, you get answers." | Strawman pivot |
| "less X, more Y" | "Less meetings, more shipping." | Slogan contrast |
| "While X…, Y" (concessive setup) | "While speed matters, accuracy is paramount." | Dialectical hedge that exists only to pivot |
| "Where most/others X, we Y" | "Where most tools bury settings, we surface them." | Competitor-as-strawman |
| "forget X" / "say goodbye to X" / "no more X" | "Forget manual exports." | Dismiss-then-sell |
| "gone are the days of X" | "Gone are the days of brittle cron jobs." | Nostalgia-contrast cliche |
| "beyond just X" / "more than just X" | "Analytics beyond just pageviews." | Inflation by negation |

**Fix:** Say Y. "The problem is clarity." "We coach." "Accuracy is what we optimize for." State the claim directly and drop the discarded half — it carries no information, only fingerprint.

## Dramatic Fragmentation

Short sentence fragments used for theatrical effect. The effect wears off immediately.

| Pattern | Example | Problem |
|---------|---------|---------|
| "[Noun]. That's it." | "Focus. That's it." | Performative simplicity |
| "X. And Y. And Z." | "Work harder. And smarter. And longer." | Staccato drama |
| "This unlocks something. [Word]." | "This unlocks something. Everything." | Artificial revelation |
| Three-word conclusion sentence | "That's the lesson." / "Simple as that." | False profundity |

**Fix:** Integrate into normal sentences. Trust the content to land without theatrical presentation.

## Rhetorical Setups

Announcing insight before delivering it.

| Pattern | Problem |
|---------|---------|
| "What if I told you that..." | Socratic posturing; just say the thing |
| "Here's what I mean:" | Redundant preview |
| "Think about it:" | Condescending prompt |
| "And that's okay." | Granting reader permission they didn't ask for |
| "Sound familiar?" | Rhetorical question with an assumed answer |
| "You've been there." | Assuming shared experience that may not exist |
| "We've all been there." | Same problem |

**Fix:** Make the point. Let readers draw their own conclusions.

## Tricolon Overuse

Three-item lists feel structured and complete — so AI defaults to them constantly.

**AI default:** "Speed, quality, and cost."
**Alternative:** "Speed and cost." (Two items are often enough.)

**AI default:** "Think clearly, act decisively, and move fast."
**Alternative:** "Think clearly and move fast." (Drop the middle term if it's implied.)

Watch for:
- Three-adjective stacks: "bold, clear, and direct"
- Three-point summaries at paragraph ends
- Three-item problem/cause/solution structures
- Three rhetorical questions in sequence

**Fix:** Vary list length. Use two items. Use four. Use one with specifics.

## Concluding Summary Paragraphs

AI models are trained to "wrap up" content, which produces summaries that restate what was just said.

Signs:
- Last paragraph begins with "In conclusion," "To summarize," "Ultimately,"
- Last paragraph covers the same ground as the body in compressed form
- Ending that restates the opening framing

**Fix:** End where the content ends. If there's a genuine forward-looking close or call to action, write it directly. If there's nothing more to say, stop.

## Over-Listicle Structure

Converting prose into bullet points when sentences would communicate better.

Signs:
- Every paragraph is replaced by a bulleted list
- Bullets are one word or a fragment ("Speed," "Clarity," "Focus")
- Main ideas buried inside list items instead of led with
- No prose between headers — just lists all the way down

**Fix:** Use lists for genuinely list-like content (steps, options, items). Use prose for reasoning, argument, and narrative.

## Paragraph-Ending Punchlines

AI text has a distinctive habit: every paragraph ends with a short, dramatic summary sentence. Read three paragraphs of AI prose and you'll see it — each one closes with a punchy one-liner that "lands the point." Real writing doesn't do this. Real paragraphs end at different lengths and in different ways.

Signs:
- Every paragraph's last sentence is under 15 words
- Last sentences are declarative statements that summarize the paragraph
- The pattern repeats across 3+ consecutive paragraphs
- Endings feel like mic-drops: "That's the real advantage." / "And it compounds." / "This is what matters."

**Fix:** Make paragraph endings vary. One might end with a long sentence (20+ words). One might end mid-thought, flowing into the next paragraph. One might end with a specific example or data point rather than an abstract claim. At most one paragraph in a piece should end with a short punchy line.

## Parallel Structure in Conclusions

When wrapping up a piece that covers multiple points (features, values, benefits), AI defaults to restating them in parallel structure: "X does A, Y does B, and Z does C." This creates a formulaic closer that signals machine authorship.

Signs:
- Final sentence lists all the key points in one parallel construction
- "Whether you need A, B, or C, we've got you covered"
- Three clauses with identical grammatical structure summarizing the piece
- The closer mirrors the intro's structure exactly

**Fix:** End with one specific point, a forward-looking statement, or just stop. Don't repackage everything into one tidy parallel sentence.

## Rhythm Traps

| Pattern | Problem | Fix |
|---------|---------|-----|
| Three sentences same length in a row | Metronomic, robotic feel | Break one up or combine two |
| Every paragraph ends with short punchy sentence | Predictable beat | Vary paragraph endings |
| Em-dash before a reveal — [word] | Telegraphed payoff | Use period or comma, or rephrase |
| Unspaced em-dash: "word—word" | AI default; humans usually write "word — word" with spaces, and use 2–3 per piece, not 20+ | Space them, and cut most |
| "word — adj, adj, adj — word" cluster | Em-dash bracketing a tricolon = double tell | Rewrite as a plain sentence |
| Paragraphs starting with "So," | Conversational filler | Start with content |
| Sentences starting with "Look," | Confrontational filler | Remove and state the point |
| Stacked short sentences | Exhausting fragmentation | Combine into one with appropriate clauses |
| Dashes for dramatic pause — everywhere | Loses impact through overuse | Reserve for genuine asides |

## Absolute Words

Words that claim universal truth where none exists.

- always, never (usually not true)
- everyone, everybody (not true)
- nobody (not true)
- everything, nothing (not true)
- all, none (not true)

**Fix:** Be specific. "Most teams" not "every team." "Rarely" not "never."

## Intensifier Stack

AI piles intensifiers to signal confidence.

- deeply, truly, fundamentally, inherently, simply, literally, inevitably

**Fix:** Remove. The claim is either true or it needs a different argument, not a stronger adverb.

## Copula Avoidance

A strong current tell (flagged in Wikipedia's "Signs of AI writing"): models dodge the plain verbs "is," "are," and "has," reaching instead for inflated substitutes that make ordinary facts sound momentous.

| AI verb | Example | Fix |
|---------|---------|-----|
| serves as | "The cache serves as the backbone of the system." | "The cache stores every session." |
| stands as | "It stands as a testament to good design." | Cut, or say what it does. |
| represents | "This represents a major step forward." | "This ships 2x faster." |
| boasts | "The app boasts a clean interface." | "The app has three screens." |
| features | "The platform features real-time sync." | "The platform syncs in real time." |
| marks (a shift) | "This marks a shift in how teams work." | State the actual change. |
| is a testament to | "A testament to the team's effort." | Show the result instead. |

**Fix:** Use "is" and "has." If the verb is doing rhetorical inflation rather than reporting an action, it's a tell.

## Appended Participial Tail

AI ends a sentence, then bolts on an "-ing" clause to simulate analytical depth. The tail almost always restates significance instead of adding a fact.

- "The team shipped the redesign, highlighting their focus on usability."
- "Adoption doubled, underscoring the demand for the feature."
- "Regulations tightened, reflecting a broader industry shift."
- "Revenue grew, contributing to a stronger market position."

**Tell words in the tail:** highlighting, underscoring, reflecting, contributing to, signaling, demonstrating, emphasizing, marking.

**Fix:** Stop at the fact, or make the tail carry new information. "Adoption doubled in six weeks" beats "Adoption doubled, underscoring the demand."

## Invented Concept Labels

AI coins an abstract compound — [domain word] + [problem noun] — and presents it as an established, defined term. One can be a useful coinage; several in one piece is a tell.

- "the supervision paradox" / "the acceleration trap" / "workload creep"
- "alignment vacuum" / "context collapse" / "the automation gap"

**Fix:** Describe the actual phenomenon in plain words. If you genuinely need a label, define it once and earn it — don't sprinkle several.

## False Range

AI fakes comprehensiveness by spanning a fake spectrum. The range sounds inclusive but names nothing specific.

- "from startups to enterprises"
- "from X to Y" (when X and Y are just two ends picked for sweep)
- "whether you're a solo dev or a Fortune 500"
- "everyone from beginners to experts"

**Fix:** Name the actual audience ("for teams of 5–50") or cut the range and make a concrete claim.

## Assistant & Formatting Tells

Output-layer signatures that leak from chat-assistant training rather than from
prose style. They rarely show up in human-written documents and are quick to
scrub. (This set is adapted from the 24-pattern checklist in
[ericosiu/ai-marketing-skills](https://github.com/ericosiu/ai-marketing-skills)
(`x-longform-post`), MIT — the items our prose rules above don't already cover.)

| Tell | Example | Fix |
|------|---------|-----|
| Sycophantic opener | "Great question!" / "Excellent point!" | Cut. Answer the thing. |
| Collaborative closer | "I hope this helps!" / "Let me know if you need anything else." | Cut. The content is the help. |
| Knowledge-cutoff disclaimer | "As of my last update…" / "I may not have the latest…" | Cut, or state the actual date of the fact. |
| Curly/smart quotes | "word" / 'word' auto-substituted | Use straight quotes unless the house style is deliberately typographic. |
| Emoji on headings/bullets | "## 🚀 Getting Started" / "• ✅ Done" | Remove decorative emoji from structure. |
| Title Case In Every Heading | "How To Configure The Server" | Sentence case: "How to configure the server." |
| Mechanical boldface | random **phrases** bolded for weight, several per paragraph | Bold only true labels/terms; let sentences carry emphasis. |
| Inline-header vertical list | every item is "**Label:** value" stacked | Use a real list or prose; reserve the bold-label form for genuine definitions. |

**Fix:** These are surface artifacts — a find-and-replace pass usually clears
them. They matter most in copy that ships to users or gets pasted from a chat
transcript.
