# Words to Avoid

Words that appear far more often in AI-generated text than in human writing. Replace with concrete, specific alternatives or cut entirely.

## Verbs

These verbs sound like consultant-speak or corporate announcement language.

- delve (just say "look at" or "examine")
- leverage (say "use")
- foster (say "build" or "encourage")
- underscore (say "shows" or "confirms")
- navigate (say "handle" or "manage")
- unlock (unless literally a lock)
- unleash (marketing word)
- elevate (say "improve" or be specific)
- empower (almost always cuttable)
- streamline (say what you're actually doing)
- optimize (be specific about what changes)
- encompass (say "includes" or "covers")
- harness (say "use")
- revolutionize (almost never true)
- illuminate (say "shows" or "explains")
- transcend (overwrought)
- mitigate (say "reduce" or "address")
- cultivate (say "build" or "develop")
- spearhead (say "lead")
- resonate (vague — say what the actual effect is)
- pivot (overused startup word)
- scale (be specific: "grow the team" not "scale operations")

### Copula substitutes (inflated stand-ins for "is" / "has")

AI avoids plain "is/are/has" to sound weightier. When these verbs are doing the job of a copula, swap them back to "is" or "has", or replace with the real action verb.

- serves as (say "is")
- stands as (say "is", or cut)
- represents (say "is")
- boasts (say "has")
- features (say "has", or name the action: "syncs", "exports")
- offers / provides (often just "has" or "lets you")
- marks / signals (a shift) (state the actual change)
- is a testament to (show the result instead)
- ventured into (say "started" or "added")

## Adjectives

These modify nouns without adding information.

- robust (almost always decorative)
- seamless (rarely true; describe the actual experience)
- pivotal (say "important" or explain why)
- paramount (say "most important")
- dynamic (vague)
- intricate (say what makes it complex)
- multifaceted (say which facets)
- transformative (show the transformation, don't announce it)
- unparalleled (superlatives need proof)
- crucial (say "important" or "required")
- vital (same as crucial)
- innovative (show the innovation)
- sustainable (overloaded word — be specific)
- comprehensive (vague — say what's included)
- ever-evolving (almost never adds meaning)
- game-changing (marketing speak)
- cutting-edge (says nothing specific)
- invaluable (vague — quantify the value)
- meticulous (show the care, don't announce it)
- nuanced (often precedes something obvious)
- groundbreaking (almost never is)
- holistic (vague — describe the actual scope)
- actionable (redundant modifier — advice is either actionable or it isn't)
- scalable (be specific)
- world-class (unverifiable superlative)
- bespoke (jargon for "custom")

## Adverbs

These inflate sentences without adding information. Cut or replace with precise language.

- ultimately (filler in most contexts)
- significantly (how much? say the number)
- increasingly (vague trend language — give the data)
- arguably (hedge that signals uncertainty — either claim it or don't)
- undoubtedly (overclaiming)
- inherently (often just "is")
- crucially (announcing importance instead of demonstrating it)
- notably (filler — just make the point)
- merely (minimizing word that often backfires)
- starkly (overdramatic)
- seamlessly (see adjective list)
- profoundly (overwrought — be specific)
- rapidly (how fast? give a timeframe)
- simply (condescending when used to explain something complex)
- fundamentally (often just "is")
- genuinely (often signals the opposite)
- truly (same as genuinely)
- deeply (vague intensifier)

## Nouns

Metaphor-nouns that say nothing about the actual subject.

- landscape ("the competitive landscape" → "the competition")
- realm (never use)
- tapestry ("rich tapestry of" → be specific)
- paradigm (almost always replaceable with "approach" or "model")
- synergy (never use)
- testament ("a testament to" → just say it proves or shows)
- cornerstone (cliche)
- plethora (say "many" or give a number)
- myriad (same as plethora)
- ecosystem (overused tech/business word — be specific)
- roadmap (usually fine in product contexts, overused elsewhere)
- journey (unless literal travel)
- beacon (almost always overwrought)
- symphony (rarely appropriate outside music)
- nexus (say "center" or "hub")
- innovation (vague — say what's new and different)
- framework (overused — say what the structure actually is)
- solution (tech cliche — say what it does)

## Never Claim Nobody Knows This

Models reach constantly for the idea that a thing is undiscovered, unspoken, or
overlooked. It is unverifiable — you cannot survey what everyone knows — and it
flatters the writer by making the finding sound rarer than it is. The reader
notices the self-congratulation before they notice the finding.

- "the part nobody budgets for" / "the part everyone misses"
- "what nobody is talking about" / "the conversation nobody is having"
- "as far as we can tell, nobody has written about this"
- "hidden", "undocumented", "underrated", "the secret nobody tells you"
- "most people don't realize" / "few developers know"
- "criminally overlooked", "flying under the radar"

FIX: state what you found and let its value be self-evident. "The public
changelog runs 5,248 lines and never mentions `plugin eval`" is checkable and
carries the same weight as "nobody is talking about it" — with none of the
posturing. Where a specific, verifiable absence exists, name the absence.

Humility is a human trait, and it reads as more confident than trying to
convince. A writer sure of their material states it plainly; the urge to tell
the reader how novel it is comes from doubt that the material will land.

Also flag it in headings, where it is a promise you cannot keep: "The Part
Nobody Budgets For" should say what the section contains.

## Never Denigrate the Subject

When writing about your own product, team, or codebase, describe what changed
and what it does now. Words that call the subject defective are a distinct AI
tell: the model reaches for self-criticism to sound credible, and the result
reads as an apology for the thing you are shipping.

- rot / rotten / bit rot (say what the references pointed at, and where they point now)
- cruft, bloat, mess, sloppy, garbage, junk, dead weight
- decay, neglect, rusted, crumbling
- "our terrible X", "the old broken Y", "we had let this get bad"

FIX: state the change without grading the past. "The sweep picked up earlier
renames" carries the same information as "rewriting them exposed rot" and does
not tell the reader your product was rotten.

This also applies to headings and titles. "A plugin that had outgrown its own
catalog" and "The tool was blind in one eye" both sell the reader on a defect
before they reach a single result. Name what the section contains.

Describing a specific bug you found and fixed is fine and often useful. The line
is between "the eval caught a grader that scored correct answers as wrong" and
"our test suite was rotten."

## "Worth" as Hedged Evaluation

`worth` is one of the strongest single-word AI tells in technical writing. It
lets the writer grade something without committing to a claim, and models reach
for it constantly. Every use below is cuttable.

- it's worth noting that (note it, or delete it)
- worth mentioning (mention it)
- worth considering (say what you'd do)
- worth doing / worth having / worth keeping (say why, with a number or reason)
- worth avoiding (say what breaks if you don't)
- worth migrating to (say what it gives you)
- a change worth making (make it, or state the effect)
- X is worth the tradeoff (name the tradeoff and who it favors)

Also flag it in headings, where it reads as invented significance: "The Mistake
Worth Publishing", "The Metric Worth Watching", "A Lesson Worth Learning".
A heading should say what the section contains.

FIX: state the consequence directly. "The `--ablation` arm is worth migrating
to" carries no information; "The `--ablation` arm runs a no-plugin baseline
automatically, which our runner does not" tells the reader what they get.

## Transitions That Add Nothing

Formal connectors that signal AI composition.

- in conclusion (just conclude)
- in summary (just summarize, or cut the summary)
- it is important to note (if it's important, it's in the text)
- looking ahead (just talk about the future)
- furthermore (say "also" or restructure)
- moreover (same as furthermore)
- additionally (same)
- conversely (often just "but" or restructuring)
- by and large (filler)
- at the end of the day (cliche)
- rest assured (patronizing)
- remember that (condescending)
- key takeaway (bulleted list speak — integrate the point)
- with that said (throat-clearing)
- it's worth noting that (if it's worth noting, note it)
- let's dive in (just start)
- without further ado (cut)
