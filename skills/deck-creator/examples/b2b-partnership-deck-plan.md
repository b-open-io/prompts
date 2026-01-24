# Example: B2B Partnership Proposal Deck

This example shows a complete deck plan for a B2B fintech partnership proposal.

## Discovery Results

### Audience
- **Primary:** Regional bank executives (C-suite, risk, compliance)
- **Secondary:** Technical leadership evaluating feasibility

### Purpose
- Secure partnership for digital settlement proof-of-concept
- Position as infrastructure partner, not crypto company

### Context
- Boardroom presentation
- Follow-up to initial discussion about remittance settlement

### Brand Guidelines
- Presenter company branding
- Partner bank co-branding consideration
- No crypto aesthetics - banking professionalism

### References Provided
- Existing proposal PDF
- Production stablecoin codebase as technical proof

### Content Sources
- Regional remittance market data ($30B+ market)
- Production system metrics
- Regulatory positioning framework

### Length Decision
- 14 slides (comprehensive proposal)

---

## Theme Definition

### Color Palette
```
Background: #0a1628 (deep navy)
Primary:    #e91e8c (magenta - innovation)
Secondary:  #7c3aed (purple - tech)
Text:       #ffffff (white)
Accent:     Linear gradient purple→magenta
```

### Typography
```
Headlines: Bold, 48-64px
Subheads:  Medium, 24-32px
Body:      Regular, 18-20px
Stats:     Extra Bold, 72-96px
```

### Style Parameters
```yaml
Aspect Ratio: 16:9 (1920x1080)
Iconography: Line-based, 2px stroke, rounded
Layout: Card-based sections, generous whitespace
Mood: Professional, tech-forward, trustworthy
```

---

## Slide Plan

### Slide 1: Title
- **Type:** Title Slide
- **Headline:** "Bank-Backed Digital Settlement"
- **Subhead:** "A Remittance-First Proof of Concept for Real-Time Settlement"
- **Visual:** Dark navy with circuit pattern, digital currency concept
- **Key Message:** Premium, institutional credibility

### Slide 2: The Opportunity
- **Type:** Market/Opportunity
- **Headline:** "The Regional Remittance Opportunity"
- **Content:** $30B+ market, significant GDP percentage, 1-3 day vs <5 second settlement
- **Visual:** World map with remittance corridors, comparison timeline
- **Key Message:** Massive market with clear pain point

### Slide 3: The Problem
- **Type:** Problem Statement
- **Headline:** "Current Settlement is Broken"
- **Content:** 4 pain points - Slow, Expensive, Opaque, Manual
- **Visual:** Icon grid with severity indicators
- **Key Message:** Well-documented problem everyone recognizes

### Slide 4: The Solution
- **Type:** Solution Overview
- **Headline:** "Tokenized Settlement, Not Cryptocurrency"
- **Content:** What it is vs what it isn't comparison
- **Visual:** Simple flow diagram, banking iconography
- **Key Message:** Infrastructure, not speculation

### Slide 5: How It Works
- **Type:** Process Flow
- **Headline:** "The Settlement Flow"
- **Content:** 5-step vertical process
- **Visual:** Clean flowchart with consumer touchpoints highlighted
- **Key Message:** Consumers see local currency only; blockchain invisible

### Slide 6: Control
- **Type:** Features/Benefits
- **Headline:** "Complete Control, Zero Outsourced Risk"
- **Content:** 6 control points in 2x3 grid
- **Visual:** Shield iconography, central bank partner logo
- **Key Message:** Bank never loses control

### Slide 7: Proven Tech
- **Type:** Social Proof
- **Headline:** "Built on Production Infrastructure"
- **Content:** Production stablecoin reference, architecture diagram
- **Visual:** Clean architecture boxes, "battle-tested" badge
- **Key Message:** Proven in production, not experimental

### Slide 8: Compliance
- **Type:** Features/Benefits
- **Headline:** "Designed for Regulatory Comfort"
- **Content:** 6 compliance points
- **Visual:** Compliance checkmarks, central bank consideration
- **Key Message:** Built to satisfy regulators

### Slide 9: Scope
- **Type:** Scope/Parameters
- **Headline:** "Start Small, Prove Value"
- **Content:** PoC parameters, success metrics table
- **Visual:** Map with corridors, gauge graphics
- **Key Message:** Controlled experiment with clear criteria

### Slide 10: Partnership
- **Type:** Roles/Responsibilities
- **Headline:** "Clear Partnership Structure"
- **Content:** Bank vs Tech Partner responsibilities
- **Visual:** Two columns with logos, handshake center
- **Key Message:** Clean separation of roles

### Slide 11: Vision
- **Type:** Roadmap
- **Headline:** "Earned Optionality, Not Commitment"
- **Content:** 4-phase timeline with gate criteria
- **Visual:** Horizontal timeline with checkpoints
- **Key Message:** Optionality earned through performance

### Slide 12: Why Us
- **Type:** Company/Team
- **Headline:** "Your Technical Partner"
- **Content:** 4 differentiators, credibility points
- **Visual:** Company logo, credibility badges
- **Key Message:** Experienced partner understanding banking

### Slide 13: Next Steps
- **Type:** CTA/Next Steps
- **Headline:** "Proposed Path Forward"
- **Content:** 4-step process with week markers
- **Visual:** Horizontal process, "Let's Begin" arrow
- **Key Message:** Clear, actionable next steps

### Slide 14: Closing
- **Type:** Closing
- **Headline:** "Payment Rail Modernization, Not Monetary Experiment"
- **Content:** Key quote, closing principle
- **Visual:** Minimal, quote prominent
- **Key Message:** Professional close reinforcing positioning

---

## Generation Commands

All slides generated in parallel using gemskills:content-specialist:

```bash
# Example generation command structure
bun run scripts/generate.ts "Professional presentation slide, 16:9 aspect ratio..." \
  --aspect 16:9 --size 2K --output /path/to/slides/01-title.png
```

## Output Structure

```
partnership-deck/
├── THEME.md
├── DECK-PLAN.md
├── DECK-INDEX.md
└── slides/
    ├── 01-title.png
    ├── 02-opportunity.png
    ├── 03-problem.png
    ├── 04-solution.png
    ├── 05-how-it-works.png
    ├── 06-control.png
    ├── 07-proven-tech.png
    ├── 08-compliance.png
    ├── 09-scope.png
    ├── 10-partnership.png
    ├── 11-vision.png
    ├── 12-why-us.png
    ├── 13-next-steps.png
    └── 14-closing.png
```
