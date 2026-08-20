# Plan 000: General-Legal/legal-templates — Anthony's review and integration options

> **Trigger**: https://x.com/rwalk_xyz/status/2090166976056299990 (Ryan Walker, 2026-08-19) announcing
> https://github.com/General-Legal/legal-templates — a free, CC0-1.0-licensed library of
> attorney-drafted legal templates for startups (MSA, NDAs, privacy policies, DPAs, HIPAA BAA,
> advisor agreement, CA offer letter, cookie notice, terms of use), published by General Legal
> (general.legal).
>
> **Ask**: have Anthony (product-skills:legal) review the library and decide how we incorporate it
> into our legal-document pipeline; enumerate integration options for discussion.

## Status

- **Status**: PHASE 1 SHIPPED — Option A+D executed 2026-08-20 (product-skills `d2c521c`, plugin 1.0.16, skill 0.2.3); Phase 2 derivatives open
- **Priority**: P2
- **Effort**: S (Option A) → M (Options B/C)
- **Risk**: LOW (CC0 removes licensing risk; residual risk is content staleness and unreviewed upstream drift)
- **Category**: skills / content sourcing / legal ops
- **Owner**: Anthony (legal) for content; prompt-engineer (Zack) for skill wiring
- **Target repo**: `b-open-io/product-skills` (legal-compliance skill, Anthony's roster). Note: the `pm-toolkit` skills referenced below come from the third-party `phuryn/pm-skills` marketplace — not ours to modify; template custody consolidates in `product-skills:legal-compliance` (see plan 001). This repo (`prompts`) only hosts the plan and, if chosen, skills-lock provenance conventions.

## What the library is

Twelve templates, each shipped as:

- the full template in **LLM-optimized markdown** (`template.md`) with `<mark>` tags marking every field that must be customized,
- the original `.docx` source, plus Python scripts for download/format conversion.

(The top-level README claims a per-template `README.md` with key-provision guidance; those
files don't actually exist in the template directories — see Anthony's review.)

License is **CC0 1.0 Universal** — free to use, modify, and redistribute for any purpose, no
attribution required. That makes vendoring, adaptation, and even on-chain publication legally
clean; the only obligations are the ones we impose on ourselves (provenance, review discipline).

Coverage: Advisor Agreement · HIPAA BAA · Cookie Notice · DPA (US + Global) · Employee Offer
Letter (California exempt) · MSA · NDA (mutual + one-way) · Privacy Policy (US-only +
GDPR-enhanced) · Terms of Use.

## Anthony's review

Reviewed by: Anthony (legal) — 2026-08-20 — repo HEAD `c7c947f` ("Refresh templates and add new processing", 2026-05-14)

### Provenance & licensing

**License.** CC0 1.0 Universal — a public-domain dedication, not a permission license. We may reuse verbatim, modify, redistribute, and commercialize with no attribution and no copyleft. There is no license-side obstacle to dropping these into b-open-io products, contracts, or even our own template distributions.

**Publisher & credibility.** Published by General Legal (general.legal); README states templates are "Attorney-drafted … Created by the attorneys at General Legal." Repo has 1.4k stars / 129 forks, so it has community visibility. All 4 commits are by one author (Ryan Walker), Apr 25 – May 14, 2026. Templates ship as LLM-optimized markdown (`<mark>` tags on fill-in fields) plus original `.docx`, with conversion scripts — a genuinely useful format for agent-driven customization.

**Disclaimers: none.** Notably, the repo contains **no "not legal advice / no attorney-client relationship" disclaimer anywhere** — unusual for a law-firm publication and a signal that repo hygiene was not lawyer-reviewed. Also, the top-level README claims each template dir has a `README.md` (overview + key provisions); in fact the template directories inspected contain **only `template.md`** — the documented per-template READMEs don't exist.

**Residual risks.** (a) "Attorney-drafted" is unverifiable and CC0 removes even implied warranty of quality; (b) US/Delaware/California-centric — no other-jurisdiction coverage; (c) templates visibly derive from specific past deals (see MSA below), so unremoved deal DNA is a real hazard; (d) staleness: no changelog, no versioning, no commitment to track law changes.

### Quality assessment (four templates read in full)

**MSA — mid-quality, vendor-favorable, and NOT generic.** The biggest finding: this is **not a neutral SaaS MSA — it is a lightly scrubbed on-premises license agreement for an AI-evaluation platform**. Definitions include "**Generic Judges**" ("Company' pre-built measures of specific types of risks") and "Platform" is defined as "Company' platform **designed to test and validate Customer's generative AI applications**." Deployment model is on-prem in a "Customer Environment" with source code delivered for installation. Anyone adopting it for hosted SaaS/API must rewrite the license grant, support, and security allocation wholesale.

*Which side:* strongly **vendor/Company-favorable**: fees non-refundable **plus** post-termination acceleration ("Customer shall pay Company all remaining Fees … as if the Order Term had run its full course"); 12% late interest; net-60 then suspension; broad Feedback IP assignment; publicity rights for Company; no SLA, no service credits, no uptime warranty at all (pure AS-IS disclaimer); Customer indemnifies for Output use; and a drafting error in No Assignment — "**Neither party** shall assign … without obtaining the prior written consent **of Company**" — literally requiring only Company's consent.

*Good bones:* clean DPA-trigger clause (§ Personal Data), mutual 12-month-fees cap with sensible carve-outs (confidentiality, IP misappropriation, gross negligence/willful misconduct, indemnity), standard IP indemnity with the usual (i)–(iii) exclusions, AAA expedited arbitration (Delaware).

*Red flags:* typos ("herby agree," recurring "Company'" for "Company's," a stray "Client"), broken auto-numbering from docx conversion (orphan "1." items), and confidentiality requires marking + 30-day written summaries of oral disclosures — an operational trap most teams won't follow.

**Global DPA — the strongest document in the repo; current; aggressively processor-friendly.** Technically up to date: 2021 SCCs (Decision (EU) 2021/914) with correct module selection (Modules 2 & 3), UK IDTA Addendum B.1.0, Swiss FADP 2020/FDPIC variations, Irish governing law/forum for SCCs, and a genuinely modern **AI clause**: "Provider will not use Personal Data to train, fine-tune, develop, or improve any artificial intelligence or machine learning model … unless … expressly authorized," with a matching subprocessor flow-down and an automated-decision-making transparency commitment. "State Privacy Laws" is defined generically ("comprehensive state-specific data privacy laws … currently in effect") so it self-updates past CCPA/CPRA, VCDPA, CPA, etc. **Gap: no mention of the EU-US Data Privacy Framework** as a transfer mechanism (only SCCs, plus a Provider right to swap mechanisms).

*Which side:* as advertised, **processor-friendly**: customer reimburses DSR assistance, DPIAs, and audits at "then-current professional services rates"; SOC 2/ISO report accepted in lieu of audit; 15-day subprocessor objection window with termination-and-pay-up as "sole and exclusive remedy"; deletion feasibility "as determined in Provider's sole discretion"; breach notice only "without undue delay" (no hour/day figure — GDPR-fine for a processor, but customers will redline); and a broad **Restricted Data** warranty barring SSNs, PHI, biometrics, financial credentials, under-16 data, and special categories. As the *provider-side* paper for our own services this is excellent; it is unusable as our *customer-side* form.

**Mutual NDA — solid, pro-discloser, with visible biotech DNA.** Comprehensive discloser-protective drafting: no residuals clause; exceptions must be shown "with competent written evidence"; a combination-of-elements clause; deemed-confidential treatment of deal existence; 5-year term, 7-year survival, **indefinite for trade secrets**. Two standouts: §16 bars feeding the other party's Confidential Information into "any training, self-improving, machine-learning software, algorithms … or other artificial intelligence tools" without consent — modern and directly relevant to AI-agent workflows (note: it can bite *our* AI tooling too); and a Feedback license grant unusual in an NDA. Leftover biotech language ("compositions of matter, structures or sequences of materials … assays," bar on using CI "to support any application for regulatory or marketing approval") betrays repurposing from a life-sciences form; hardcoded "__________, 2026__" date; one clause asymmetrically references "consent of the Company" in the injunction section. Delaware law; broken markdown numbering again.

**GDPR-enhanced Privacy Policy — thorough scaffolding, worst conversion quality.** Substantively current on the US side: CCPA/CPRA statutory-category chart, generic "State Privacy Laws" rights framing (access/correct/delete/appeal/opt-outs incl. profiling), **GPC honored as an opt-out signal**, Shine the Light, Nevada, and a Texas DPSA sensitive-data "sale" notice. Modern AI content: chatbot/generative-AI provider disclosures and an AI-training-on-de-identified-data opt-out. European annex is a proper legal-bases table, EU/UK representative slots, DPO option, ICO details. Two problems: (1) the transfers section states flatly that "the US is not the subject of an 'adequacy decision'" — **no DPF mention**, and post-July-2023 that framing is imprecise for DPF-certified importers; (2) the markdown is the roughest in the repo — broken index, empty hyperlinks ("please visit ."), mangled heading levels, a duplicated "Events, promotions and contests" row where "corporate transactions" belongs. **Work from the .docx original, not the markdown, for this one.**

### Fit for b-open-io

**Directly useful (light adaptation):** Mutual & one-way NDAs (strip biotech phrasing; keep the AI-tools clause — but check it against our own agent pipelines before signing symmetric paper). Advisor agreement, CA offer letter (we hire/advise in the US). **Global DPA as our provider-side form for Sigma Identity** — it's processor-friendly, which is our posture as an OAuth IdP; the "authentication details" category in Annex 1 already fits; keep the credentials carve-out ("other than credentials created for and used solely to access the Services") intact. Cookie notice.

**Heavy adaptation:** *MSA* for the 1Sat API / hosted services — must convert from on-prem license to hosted API/SaaS terms, delete Judges/Platform deal residue, add SLA and API rate/abuse terms. *ToU and privacy policies* for the marketplace need crypto-specific surgery: the privacy policy has no concept of **wallet addresses, on-chain transaction data, or the impossibility of deleting immutable public-ledger data** — GDPR erasure language ("we will either delete or anonymize") is unfulfillable for inscribed/on-chain data and must be rewritten with an on-chain-data disclosure; the "Other users and the public" clause is a useful starting hook. ToU needs digital-asset risk allocation, no-custody/no-broker positioning, and sanctions/AML terms.

**Missing entirely (we must source elsewhere):** token/airdrop terms and token-sale risk disclosures (securities/commodities analysis); stablecoin terms (GENIUS-Act-era reserve/redemption disclosures); NFT/ordinals marketplace listing & takedown (DMCA + stolen-inscription policy); custody/wallet terms; **AI-product output disclaimers and acceptable-use for our agent/bot products** (the MSA's Outputs disclaimer is a partial donor); open-source contributor CLA/DCO; DAO/contributor agreements; BAA is present but irrelevant to us; no IP assignment/PIIA, no consulting agreement, no SAFE/equity docs.

### Freshness / maintenance risk

Four commits over ~3 weeks (Apr 25 – May 14, 2026), single author, no releases, no issues process, one "refresh" commit since launch. This is a **marketing-adjacent one-shot drop with one touch-up, not a living project**. The DPA/privacy docs are current *as of mid-2026*, but nothing suggests they will track the state-privacy-law pipeline, SCC revisions, or DPF litigation. Treat the repo as a **snapshot to vendor into our own repo** (CC0 makes that clean): fork it, record the commit hash, diff against upstream occasionally, and put our adapted versions under our own review cycle rather than depending on upstream.

*Standard caveat: this is internal legal-information analysis of template quality and fit; adapted documents for production use should get a licensed-attorney review in the relevant jurisdiction.*

## Why this matters to us

Anthony's existing pipeline (`bo-legal-doc-pipeline` in the setup playground catalog:
`pm-toolkit:draft-nda`, `pm-toolkit:privacy-policy`, `product-skills:legal-compliance`) currently
drafts documents **from model memory**. A vetted, attorney-drafted, CC0 base text upgrades every
one of those drafts from "plausible" to "grounded in a reviewed template", at zero licensing cost.
The library also overlaps SOC 2/compliance work (DPA, BAA, cookie notice feed
`product-skills:soc2-*` evidence and vendor-paperwork flows).

## Integration options

### Option A — Pin + vendor as skill references (recommended)

Vendor the reviewed markdown templates into the owning skills as `references/`, pinned to
upstream commit `c7c947f`, **after a repair pass** per Anthony's findings: regenerate broken
markdown from the `.docx` originals (the GDPR privacy policy especially), fix the flagged
drafting errors (MSA "No Assignment" asymmetry, NDA biotech residue, hardcoded dates), and add
the missing not-legal-advice framing:

- `pm-toolkit:draft-nda` → mutual + one-way NDAs (biotech language stripped; AI-tools clause kept)
- `pm-toolkit:privacy-policy` → US + GDPR privacy policies (rebuilt from .docx), cookie notice
- `product-skills:legal-compliance` → Global/US DPA, ToU, advisor agreement, CA offer letter

The MSA does **not** get vendored as-is — Anthony found it is a repurposed on-prem AI-eval-platform
deal document, not a generic SaaS MSA; it moves to Option C as donor material. The BAA is skipped
(no HIPAA exposure).

Record provenance per vendored template in a lock entry (same shape as this repo's
`skills-lock.json`: `source`, `ref` (commit SHA), `computedHash`, computed over our repaired
copy). SKILL.md instructions change from "draft a privacy policy" to "start from
`references/privacy-policy-gdpr.md`, resolve every `<mark>` field, then apply the b-open
adaptation checklist".

- **Pros**: works offline/deterministically; upstream edits can never silently change our
  indemnification or liability language (a real supply-chain concern for legal text); hash makes
  drift auditable; CC0 means no attribution burden.
- **Cons**: staleness is now ours to manage — needs a re-review cadence (see below).

### Option B — Live-reference the upstream repo at a pinned SHA

Skills fetch templates from `raw.githubusercontent.com/General-Legal/legal-templates/<SHA>/...`
at use time; nothing vendored.

- **Pros**: no copies to maintain; smallest diff.
- **Cons**: breaks offline/sandboxed sessions; adds a network dependency to legal drafting; the
  CLAUDE.md rule "never copy external docs into skills folders — install the plugin that owns
  them" does not really apply here (this is not fast-moving platform API documentation, and no
  plugin owns it — it is CC0 source *content*, closer to the json-render/ext-apps vendoring we
  already do via skills-lock). Pin to a SHA regardless; never fetch `main`.

### Option C — Adapt-and-own: b-open derivative template set

Use the library as raw material and publish our own derivative set with crypto/AI riders.
Anthony's review makes the queue concrete:

1. **Sigma Identity DPA** (lightest lift) — the Global DPA is the standout asset: current 2021
   SCCs + UK IDTA + Swiss FADP mechanics, an AI-training prohibition clause, and a
   processor-friendly posture that matches ours as an OAuth IdP. Add an EU-US Data Privacy
   Framework mention (the one currency gap found).
2. **1Sat marketplace ToU + privacy policy** — needs crypto surgery the library has no concept
   of: wallet addresses and on-chain transaction data as personal data, GDPR erasure being
   unfulfillable for immutable inscribed data, digital-asset risk allocation,
   no-custody/no-broker positioning, sanctions/AML, DMCA + stolen-inscription takedown.
3. **Hosted-API MSA** — rebuilt from the vendor-favorable bones of theirs (liability cap, IP
   indemnity, arbitration) with the on-prem/AI-eval deal residue removed and SLA + API abuse
   terms added.
4. **AI-product terms** — output disclaimers and acceptable use for agent/bot products (their
   MSA's Outputs disclaimer is a partial donor); plus the token/stablecoin/CLA documents the
   library doesn't cover at all.

Optionally publish reviewed derivatives via ClawNet attestation so Anthony's review is
cryptographically vouched on-chain — a natural showcase of our own trust layer applied to legal
content.

- **Pros**: closes the gaps the upstream library will never cover (it is generic-startup,
  US/Delaware/California-centric); attestation gives every derivative a review provenance story.
- **Cons**: the real drafting work lands on us; do this per-document as need arises, on top of
  Option A, not instead of it.

### Option D — Adopt their packaging conventions ("lessons learned")

Independent of the content, the repo's *format* is worth copying into our own
document-producing skills:

1. **LLM-optimized markdown as the canonical format**, with `<mark>` tags on every
   must-customize field — machine-checkable: a skill can grep for unresolved `<mark>` before
   declaring a draft done.
2. **Per-template README** (overview + key provisions + which side it favors) separate from the
   template body — progressive disclosure, exactly our SKILL.md → references/ pattern.
3. **.docx derived from markdown by script**, not hand-maintained in parallel — one source of
   truth; pairs with our existing `docx` skill for final output.

These apply to SOC 2 policy drafting, internal-comms templates, and any future contract skill,
whatever we decide on A–C.

## Recommendation

**A + D now, C incrementally.** Pin to upstream `c7c947f`, run the repair pass, vendor into the
three owning skills with lock-entry provenance, add the `<mark>`-resolution check to their
SKILL.md flows, and adopt the packaging conventions for our own document skills. Build
b-open-specific derivatives (Option C) in Anthony's priority order: Sigma Identity DPA first
(lightest, strongest source document), then 1Sat marketplace ToU + privacy policy, then the
hosted-API MSA and AI-product terms. Skip Option B: Anthony's verdict is explicit — this is a
one-shot drop to snapshot, not a living upstream to depend on.

**Re-review cadence**: Anthony re-reviews vendored templates every 6 months or on any major
privacy-law change (new state acts, SCC/DPF developments), whichever comes first; diff against
upstream at the same time in case it does get refreshed; bump the skill versions (+0.0.1) on
each re-review.

**Standard caveat**: every generated document remains a first draft for licensed counsel to
review before signing — the library's own positioning, and already how Anthony's pipeline is
framed in the catalog.

## Next steps (pending discussion)

- [ ] Decide A/B/C/D mix (recommendation above)
- [ ] Anthony: repair pass on templates to vendor (regenerate GDPR privacy policy from .docx,
      fix MSA assignment-clause asymmetry, strip NDA biotech residue, add not-legal-advice framing)
- [ ] Zack (prompt-engineer): wire repaired templates into `pm-toolkit:draft-nda`,
      `pm-toolkit:privacy-policy`, `product-skills:legal-compliance` in their owning repos,
      with lock-entry provenance and the `<mark>`-resolution check
- [ ] Anthony: produce the b-open adaptation checklist (per-template deltas for crypto/AI context)
- [ ] Anthony: derivative queue — (1) Sigma Identity DPA (+ DPF mention), (2) 1Sat marketplace
      ToU + privacy policy with on-chain-data disclosures, (3) hosted-API MSA, (4) AI-product terms
- [ ] Optional: ClawNet-publish reviewed derivatives with Anthony's attestation
