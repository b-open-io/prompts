---
name: Deck Creator
version: 1.0.0
description: This skill should be used when the user asks to "create a deck", "make a presentation", "build slides", "proposal deck", "pitch deck", "investor deck", "sales presentation", "design a deck", or needs to generate a complete slide deck with consistent visual style. Handles theme selection, copywriting, content planning, and parallel slide generation.
---

# Deck Creator

Create professional presentation decks with consistent visual style, compelling copy, and AI-generated slide images.

## When to Use

- Create a presentation or slide deck
- Build a pitch deck, proposal, or sales presentation
- Design slides for a product launch, company overview, or partnership
- Generate a complete deck from a document, requirements, or brief

## Process Overview

1. **Discovery** - Gather context, examples, and references
2. **Theme** - Establish visual style and color palette
3. **Copy** - Plan and write slide content using marketing principles
4. **Generation** - Create all slides in parallel with consistent style
5. **Assembly** - Optimize images and stitch into PDF

## Phase 1: Discovery

### Required Information

Ask these questions:
1. **AUDIENCE:** Who is the primary audience? (investors, clients, internal team, partners)
2. **PURPOSE:** What is the goal? (persuade, inform, propose, sell, educate)
3. **CONTEXT:** What's the setting? (boardroom, conference, email attachment, webinar)
4. **BRAND:** Is there existing brand guidelines? (colors, fonts, logos)
5. **REFERENCES:** Any example decks you like the style of?
6. **CONTENT:** What documents/materials should inform the content?
7. **LENGTH:** How many slides? (recommend 10-16 for most presentations)
8. **ASSETS:** Any images, logos, or graphics to include?

## Phase 2: Theme Selection

### Option A: Use Theme Factory (Recommended)

```bash
npx skills add anthropics/theme-factory
```

### Option B: Manual Theme Definition

Define colors, typography, and style parameters. Document in THEME.md.

## Phase 3: Copy & Content Planning

### Marketing Principles

1. **One Message Per Slide** - Each slide has a single clear takeaway
2. **Headlines Tell the Story** - Someone should understand the deck from headlines alone
3. **Show Don't Tell** - Use visuals, stats, and diagrams over text walls
4. **Problem → Solution → Proof** - Classic persuasion structure
5. **Concrete > Abstract** - Specific numbers beat vague claims
6. **End with Action** - Clear next steps and CTA

### Content Planning Template

Create DECK-PLAN.md with:
- Deck overview (audience, goal, key message, slide count)
- Slide-by-slide plan (type, headline, content, visual, key message)

## Phase 4: Slide Generation

### Pre-Generation Checklist

- [ ] Theme defined (colors, typography, style)
- [ ] All slides planned (10-16 slides)
- [ ] Each slide has: headline, content, visual concept
- [ ] Consistent terminology and messaging
- [ ] Output directory created

### Parallel Generation

**Launch all slide generation agents simultaneously** for efficiency:

```
Use Task tool with subagent_type=gemskills:content-specialist
Run all slide generations in parallel in a single message
```

### Post-Generation

1. **Verify Files** - Check all slides exist at correct paths
2. **Optimize Images** - Run optimization on slides directory
3. **Stitch PDF** - Combine slides into single PDF
4. **Create Index** - Generate DECK-INDEX.md with slide inventory

## Phase 5: PDF Assembly

```bash
# Prerequisites
bun add pdf-lib

# Run stitch script
bun run ~/code/prompts/skills/deck-creator/scripts/stitch-to-pdf.ts ./slides ./deck-{title-kebab-case}.pdf
```

## Output Structure

```
project/deck/
├── THEME.md                        # Visual style definition
├── DECK-PLAN.md                    # Content planning document
├── DECK-INDEX.md                   # Final deck inventory
├── deck-{title-kebab-case}.pdf     # Combined presentation PDF
└── slides/
    ├── 01-title.png
    ├── 02-problem.png
    ...
```

## Slide Types

Common slide types include:
- **Title** - First impression, establish brand
- **Problem/Opportunity** - Create urgency
- **Solution** - Present your answer
- **How It Works** - Explain the process
- **Benefits/Value** - Why customers should care
- **Social Proof** - Build credibility
- **Metrics/Traction** - Show momentum
- **Pricing/Plans** - Present options
- **Next Steps/CTA** - Drive action
- **Closing** - Memorable ending

## Best Practices

1. **Uniform Style** - Every slide uses the same theme parameters
2. **Consistent Terminology** - Use the same words for concepts throughout
3. **Visual Hierarchy** - Headlines largest, supporting text smaller
4. **Generous Whitespace** - Don't overcrowd slides
5. **Center-Weight Important Elements** - Account for cropping
6. **High Contrast** - Ensure readability on projectors
7. **No Orphan Slides** - Every slide connects to the narrative

## Additional Resources

For detailed guidance, see the references directory:

- **`references/slide-types.md`** - Expanded templates for each slide type with layout options, content structures, and visual approaches
- **`references/copywriting-guide.md`** - Marketing copy principles, headline formulas, show-don't-tell techniques, and editing checklists
- **`references/example-decks.md`** - Complete example deck plans for SaaS pitch, sales proposal, and product launch
