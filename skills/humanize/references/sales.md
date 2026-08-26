# Sales copy

Load this file when the draft is outbound email, a first reply, a discovery
question, a call opener, or a sales script. The core humanize checks still
apply. This file adds source rules, sales-specific tells, and a send shape
that most general prose passes miss.

Public sales benches measure process. They do not prove the copy sounds like a
person. Score both. Language quality shows up first in reply rate against a
human control.

## Source rule

Use a line as few-shot or as a pattern only when a named person sent or
received it, and a result is attached (reply, meeting, or published as mail
they answered). If the sender and the result cannot be named, do not use the
line.

Own closed-won and dead threads beat any public example. Feed 20–50 of the
best-performing human emails and call snippets when they exist. A model copies
distribution: "good AI drafts" produce polished sludge.

Do not use SaaS SEO blogs or swipe files as examples:

- Prospeo, Sendspark, GetReplies, Instantly template mills
- Pages titled like "10 templates that get replies in 2026"
- Any line of the form "Saw [trigger]. That usually means [generic pain]. We
  help [role] [outcome]. Worth 15 minutes?"

Trusted public sources when a private corpus is missing: Josh Braun
(joshbraun.com and his LinkedIn), Steli Efti / Close Elastic script, Jon
Buchan original letter, founder-to-founder notes posted with the actual send
(Pinker-style, Wiza internal note). Quote them as written. Do not clean them
up into brochure cadence.

## Two scores

Skip the public bench names when rewriting one email. They are calibration
for a private eval.

Score **outcome** and **language** on every sales draft.

Outcome (did it sell or qualify): research mapped to this offer, a
personalized first touch, discovery that raises intent, a next step or a
clean disqualify, and a brief a human will accept. Public calibration:
Microsoft Sales Qualification Bench, SalesLLM (deal progression, not nice
dialogue), CRMArena-Pro, Salesforce CRM LLM bench. General agent benches
(τ²-bench, AgentBench) are weak proxies for selling.

Language (does it sound like a seller): answers the actual question, does not
dump a monologue, does not restart the script every turn, one real fact about
this account, peer tone not vendor tone, mixed sentence length, empathy that
tracks the last message, discovery versus pitch ratio, one sharp question
instead of three generic ones. Outbound email reading level around grade 8.

Do not promote a prompt or model unless both a meeting-intent score and a
"would I send this" rate beat the current baseline. Blind A/B: if sellers or
prospects pick the human sample 70%+ of the time, the agent still sounds like
a model.

## Shape of a human send

One concrete observation, one implication, one low-friction question. Prove
homework in one sentence, then ask one question. Prefer to disqualify rather
than oversell.

> Generic AI: "I hope this email finds you well. I'm reaching out because we
> help VP Sales leaders leverage cutting-edge tools to streamline pipeline."
>
> Human: "Saw Acme's eng team grew 40% last quarter. I cannot see from outside
> whether coverage on the new product line kept up. Is that already handled,
> or still a gap?"

Use the Acme line only when those figures are in the brief. The move is the
lesson, not the numbers. Do not replace the implication with "that kind of
growth usually means [generic pain]." That is the mill template without a
calendar ask.

Human copy usually has at least one of: a detail that only fits this person,
uneven rhythm, a question that creates a blank rather than a calendar ask, a
voice that could be picked out of a lineup. Sometimes it is too long or too
weird on purpose.

Cadence for outbound email: lead with a short acknowledgment or the fact, one
or two substance sentences, end on a question. Max about three sentences.
Voice turns in discovery: 15–30 words. Use contractions. Skip perfect grammar
when stiffness would be the tell.

Ground every message in retrieval. The email must contain one un-fakeable
detail (news, hiring, a quote from their blog, a named asset). If research is
thin, say less. Do not invent warmth.

Rewrite pass after the first draft: "Rewrite this as if a sharp human SDR sent
it from their phone. Cut 30%. Keep the one specific fact."

## Sales-specific tells

Run the core lists in [words.md](words.md), [phrases.md](phrases.md), and
[structures.md](structures.md). Then kill these sales forms those files do
not own:

Openers: "I hope this finds you well," "I'm reaching out to."

Template sludge: "Worth a quick 15 minutes," "No pitch attached," "no
strings," "That kind of growth usually means…"

Softener stack: "happy to share if useful, no worries if not."

Zero contractions in a short outbound note.

Give or show something before the meeting ask. A question that creates a blank
beats a calendar link in the first note.

## Attributed examples

Quote as written. Steal the move. Do not clone the gimmick.

### Josh Braun, mail he answered and mail he sends

A seller wrote him about a specific video. He published it because it made him
reply:

> Josh – Your video on sales anxiety was spot on. Enjoyed your two cents on
> detaching from the outcome. Simple but not easy-:).
>
> Have you considered repurposing your videos for TikTok to expand reach
> beyond LinkedIn?
>
> @abhormozi grew from 0-23k followers in two months without lifting a finger.
>
> Here's a demo to show you what it might look like.
>
> Is this something you’d be open to exploring?

Move: names a specific video. "Have you considered" instead of "you should."
Proof is a named person, not "companies like yours." The ask is interest, not
a calendar.

His own poke-the-bear openers:

> If you run MVRs in January, how do you know there aren’t at-risk drivers in
> March?
>
> How do you know SDRs that interview well will perform well?
>
> You must be some sort of spreadsheet magician if you’re using Excel and
> Google Sheets to calculate and run commission statements.

Those questions do not pitch. His 4-T email, in his words:

> James, noticed your SDRs target HR/Benefit Directors in companies > 500
> employees.
>
> Have you tried reverse engineering high-performing cold emails to boost
> response rates?
>
> 4k+ reps are seeing an uptick. It involves a guide with copywriting +
> underlying psychology of cold emails with proof of positive responses you
> can steal.
>
> Here’s a peek.

A different seller saw he had plantar fasciitis and mailed a home remedy with
no demo ask. Give first, then the meeting is easy.

### Jared Zelman to Steven Pinker (Pinker took the meeting)

> Steven —
>
> I’m Jared Zelman, a senior at USC. I built a SaaS company to 30 employees in
> high school, sold it in college, and spent last summer flipping burgers at
> my local diner in NY.
>
> I recently watched your discussion with Joe Rogan and it really stuck with
> me. Specifically, the way you explained progress from who you are to who you
> want to be changed how I see the world as a senior in college. I’ve been
> diving into your work since and learning a ton.
>
> I’d love your advice on a few personal and career questions about building
> something meaningful in an environment (college) that often rewards
> task-completion over creativity.
>
> I know it’s a long shot, but if you have a few minutes to chat, I’d be
> really grateful and will make the most of it.

Follow-up:

> Steven — while I might be a new fan, I’ve spent probably 15 hours this week
> (time which should have perhaps been spent studying for midterms) reading
> Better Angels and Blank Slate.

The parenthetical is human. Models almost never write "time which should have
perhaps been spent studying." Specific and a little awkward beats smooth.

### Wiza internal note (Hans, then forwarded)

560 sends, 123 replies. The useful part is the 37-word note to a colleague,
not the later product-y forward:

> Hey Stephen,
>
> Came across {company} and thought they would be a good fit for us.
>
> Try reaching out to {Full Name}, seems to be the right contact.
>
> Looks like their team is using Sales Navigator. Cheers, H

No CTA, no "leverage," no three-act structure. Use this cadence for a human
handoff brief.

### Jon Buchan "drunk email"

He sent the letter; it booked Red Bull, Pepsi, HP, Symantec, and others. Do
not clone the ferret, the top hat, or the profanity bait. The lesson is
pattern interrupt plus a person on the page. One reply: "My colleague
forwarded me your spam email and we would like to meet you."

### Steli Efti / Close Elastic Sales

Named, dated, tied to first customers. Opener:

> Hi, my name is Steli Efti. I’m calling some startups in the area to find out
> if they are a good fit for our beta program.
>
> What we do in a sentence is we provide companies with a sales team on
> demand.
>
> Does this sound generally interesting to you?

Whatever they said (yes / maybe / no):

> Interesting. Tell me about your sales process.

When they asked for an email:

> I certainly will, but so I know exactly what to include in that email, can
> you tell me…

Plain. Local. One-sentence pitch. Permission question. He does not
"acknowledge and explore." He keeps going.

### Mia Pugh → Rob Charlebois at LastPass

She scrambled a headline into password-style leetspeak because LastPass sells
passwords. He posted that he almost never replies to BDR mail and took the
meeting. The joke was the relevance. Do not invent the body. If a genuine
product hook exists in the brief, use it; otherwise skip the gag.

## Voice card

Skip this section for a single email rewrite. Use it when building a sales
agent or a script set.

Define a one-page voice before generating. Three adjectives. Two tones to
refuse. Formality. Cadence. Fifteen phrases the best reps actually use.
Fifteen phrases never allowed. One belief that repeats ("we don't book
meetings that waste an AE's calendar").

Persona, not "you are a helpful assistant": a senior AE in the vertical, peer
not vendor, never opens with a compliment, proves homework in one sentence,
asks one question, would rather disqualify than oversell.

Split nodes rather than one god prompt: research brief, first touch, reply
handling, discovery, objection, meeting ask, CRM writeback. Each node has its
own length budget. Model discovery as six jobs gathered across turns, not a
checklist dump: problem, pain size, cost of inaction, current workaround,
stakeholders, timing.

Generation: temperature about 0.4–0.6 for outreach, frequency and presence
penalty so stock CTAs do not repeat, a hard max token so it cannot monologue.

Keep human: pricing, multi-threaded politics, live-call emotion, final
contract, brand strategy, anything that can blow a deal. Never auto-send a
reply to a complaint. Never send a follow-up without the prior thread.
