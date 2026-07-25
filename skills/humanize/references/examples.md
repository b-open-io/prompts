# Before / After Examples

Each example shows the AI-generated version, the humanized version, and what
changed. Every revision stays inside the source's factual boundary. When the
source is vague, the revision remains appropriately general or identifies the
missing evidence; it never manufactures specificity.

## Contents

- Full paragraph transformation
- Documentation, email, blog, and read-aloud examples
- Specificity without fabrication

---

## Example 1: Product Description

**Before (AI):**
> "Our platform leverages cutting-edge technology to empower teams to seamlessly navigate the ever-evolving digital landscape. Robust features enable stakeholders to optimize workflows and unlock unprecedented levels of productivity. It's a game-changer."

**After:**
> "The platform helps teams reduce workflow friction and get more work done."

**What changed:**
- Removed AI verbs: leverages, empower, navigate, optimize, unlock
- Removed AI adjectives: cutting-edge, seamless, ever-evolving, robust, unprecedented
- Removed "game-changer" superlative
- Preserved the original productivity claim without inventing product features
- Left room for verified details about the actual workflow

---

## Example 2: Intro Paragraph (Blog Post)

**Before (AI):**
> "In today's fast-paced world, communication has never been more important. Here's the thing: most teams aren't doing it well. The uncomfortable truth is that meetings are often a substitute for clear thinking. Let that sink in."

**After:**
> "Meetings often replace clear thinking when a team has not agreed on priorities."

**What changed:**
- Cut throat-clearing opener ("In today's fast-paced world")
- Removed "Here's the thing:" opener
- Removed "The uncomfortable truth is" opener
- Removed "Let that sink in." crutch
- Merged the supported claim into one direct sentence
- Removed the invented promise that a particular share of meetings will disappear

---

## Example 3: Technical Explanation

**Before (AI):**
> "The architecture is multifaceted and intricate. At its core, the system harnesses the power of distributed computing to ensure robust performance. Crucially, this approach enables seamless scalability. It's worth noting that the redundancy built into each layer mitigates potential failure points."

**After:**
> "The distributed architecture uses redundant layers to reduce failure points and support growth."

**What changed:**
- Removed AI adjectives: multifaceted, intricate, robust, seamless, scalable
- Removed AI verbs: harnesses, enables, mitigates
- Removed "At its core," "Crucially," "It's worth noting that"
- Preserved the supplied architecture, redundancy, failure, and growth claims
- Did not invent node behavior or deployment details

---

## Example 4: Feedback Email

**Before (AI):**
> "I wanted to reach out to circle back on our conversation. Moving forward, I think it's important to note that aligning our teams on the same page will be pivotal to our success. I'm genuinely excited about the synergies we can cultivate together."

**After:**
> "Following up on our conversation: aligning both teams will help us work together."

**What changed:**
- Removed "I wanted to reach out to" opener
- Removed "circle back," "Moving forward," "on the same page," "synergies"
- Removed "pivotal," "genuinely," "cultivate"
- Preserved the alignment goal without inventing a meeting, quarter, scope, or deadline
- Kept the email direct despite the source's limited detail

---

## Example 5: Summary Section

**Before (AI):**
> "In conclusion, it's clear that the multifaceted challenges facing organizations today require a robust, transformative approach. By harnessing innovation and fostering collaboration, teams can navigate uncertainty and ultimately emerge stronger. The journey ahead may be challenging, but the opportunities are unparalleled."

**After:**
> "Organizations face different challenges, so the response depends on the specific problem."

**What changed:**
- Removed "In conclusion" opener
- Removed AI adjective stack: multifaceted, robust, transformative, unparalleled
- Removed AI verbs: harnessing, fostering, navigate, emerge
- Removed the vague metaphor ("journey ahead")
- Removed empty optimism and unsupported claims about stronger teams
- Preserved the source's only defensible point without inventing a strategy

---

## Read-Aloud Test Example

A useful heuristic: read the text out loud. If you'd never say it that way, rewrite it.

**Before:**
> "It is worth noting that the aforementioned considerations are paramount to understanding the overarching implications of this decision."

**Out loud this sounds like:** a robot pretending to be a lawyer.

**After:**
> "The decision affects every downstream team."

Spoken version: natural, clear, complete.

---

## Specificity Without Fabrication

Replace vague language with verified detail when the source provides it. Keep
the boundary visible when it does not.

**Before (AI):**
> "The product significantly improved user engagement and drove meaningful growth in key metrics."

**After:**
> "The product increased user engagement. The source does not identify the metric or time period."

**What changed:**
- Removed unsupported magnitude words
- Preserved the engagement claim
- Identified the missing evidence instead of inventing percentages

**When verified values are supplied:**
> "Monthly active users grew 34% in 90 days."

Use the number only when it appears in the source or was verified with an
authorized tool.

## Closed-World Brief

When a prompt says the listed facts are the only supplied facts, do not derive
benefits or implementation details from them.

**Supplied fact:** "Documentation includes copyable examples."

**Safe:** "The documentation includes copyable examples."

**Unsafe:** "Copyable examples integrate immediately." The source says the
examples can be copied; it does not establish integration time or compatibility.
