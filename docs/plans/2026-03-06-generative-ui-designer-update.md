# Generative UI + GemSkills + Designer Update Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a `generative-ui` glue skill in bopen-tools, install json-render third-party skills, update Mira with full gemskills access, add generative UI awareness to the agent-auditor, and equip relevant agents.

**Architecture:** A new `generative-ui` skill acts as the decision layer ("when and why"), pointing to json-render third-party skills for implementation ("how"). Mira gets the full gemskills lineup. Agent-auditor gets a 7th audit dimension.

**Tech Stack:** json-render, shadcn/ui, Gemini image generation, React/React Native/Remotion renderers

---

### Task 1: Install json-render third-party skills

**Step 1: Install json-render skills from Vercel's repo**

```bash
cd /Users/satchmo/code/prompts
npx skills add https://github.com/vercel-labs/json-render --skill json-render-core
npx skills add https://github.com/vercel-labs/json-render --skill json-render-react
npx skills add https://github.com/vercel-labs/json-render --skill json-render-shadcn
npx skills add https://github.com/vercel-labs/json-render --skill json-render-react-native
npx skills add https://github.com/vercel-labs/json-render --skill json-render-remotion
npx skills add https://github.com/vercel-labs/json-render --skill json-render-react-email
npx skills add https://github.com/vercel-labs/json-render --skill json-render-image
npx skills add https://github.com/vercel-labs/json-render --skill remotion-best-practices
```

**Step 2: Verify installation**

```bash
ls .claude/skills/
```

Expected: json-render skill directories present

**Step 3: Commit**

```bash
git add .claude/skills/
git commit -m "Add json-render third-party skills for generative UI"
```

---

### Task 2: Create `generative-ui` skill

**Files:**
- Create: `skills/generative-ui/SKILL.md`
- Create: `skills/generative-ui/references/renderer-guide.md`
- Create: `skills/generative-ui/references/component-libraries.md`

#### SKILL.md (~1,200 words)

Frontmatter:
```yaml
---
name: generative-ui
version: 0.1.0
description: >-
  This skill should be used when the user asks about "generative UI", "dynamic UI",
  "AI-generated interfaces", "json-render", "render JSON as UI", "generate a dashboard",
  "create dynamic components", "AI UI generation", or needs to decide whether to use
  static components vs AI-generated UI. Covers the json-render framework, renderer selection,
  catalog design, and integration with gemskills for visual asset generation.
user-invocable: false
---
```

Body sections:
1. **What is Generative UI** — AI generates JSON specs constrained to a catalog of predefined components. Guardrailed, predictable, cross-platform. Not "AI writes arbitrary JSX."
2. **When to Use Generative UI vs Static Components** — Decision framework:
   - Static: known layouts, fixed dashboards, content pages
   - Generative: personalized dashboards, dynamic forms, AI chat responses with rich UI, user-configurable interfaces
3. **The json-render Stack** — Core concepts (schema, catalog, spec, SpecStream). Point to third-party skills for each renderer.
4. **Renderer Selection Matrix**:

| Need | Renderer | Skill |
|------|----------|-------|
| Web app UI | `@json-render/react` | `json-render-react` |
| shadcn/ui components | `@json-render/shadcn` | `json-render-shadcn` |
| Mobile native | `@json-render/react-native` | `json-render-react-native` |
| Video compositions | `@json-render/remotion` | `json-render-remotion` |
| HTML email | `@json-render/react-email` | `json-render-react-email` |
| OG/social images | `@json-render/image` | `json-render-image` |
| Vue web apps | `@json-render/vue` | (no skill yet) |
| PDF documents | `@json-render/react-pdf` | (no skill yet) |

5. **GemSkills Integration** — Generate visual assets within generative UI:
   - `generate-image` for hero images, backgrounds, illustrations
   - `generate-svg` for logos, vector graphics
   - `generate-icon` for app icons
   - `edit-image` for post-processing
   - `generate-video` for video backgrounds in Remotion compositions
6. **Reference Files** — Pointers to renderer-guide.md and component-libraries.md

#### references/renderer-guide.md (~1,000 words)

Deep dive on each renderer:
- **React**: Web apps, dashboards, dynamic forms. Uses `defineRegistry` + `Renderer`. Supports contexts, hooks, state stores (Redux/Zustand/Jotai/XState adapters).
- **shadcn/ui**: 36 pre-built components (Radix UI + Tailwind). Pick specific components, don't spread all. Two entry points: `/catalog` (server-safe schemas) and root (React implementations).
- **React Native**: Mobile generative UI with standard mobile components, data binding, visibility, actions.
- **Remotion**: Video from JSON timeline specs. Compositions with frames, fps, dimensions. Pairs with remotion-best-practices skill.
- **React Email**: HTML/plaintext emails from JSON. Uses @react-email/components.
- **Image**: OG images, social cards via Satori. SVG and PNG output.
- **Combining renderers**: Same catalog definition, different renderers. Write once, render to web + mobile + email.

#### references/component-libraries.md (~1,200 words)

Rich catalog of available components:
- **shadcn/ui standard (36 components)**: Full list from json-render-shadcn (Card, Button, Stack, Heading, Text, Badge, Avatar, Table, Tabs, Dialog, Input, Select, Checkbox, etc.)
- **Custom component patterns**: How to define with Zod schemas, slots for children, action emission
- **GemSkills visual pipeline**: generate-image → edit-image → optimize-images workflow for producing assets used within generative UI
- **Pattern examples**:
  - AI chat with rich card responses
  - Personalized dashboard from user data
  - Dynamic form builder
  - Email template generator
  - Social card generator

**Commit:**
```bash
git add skills/generative-ui/
git commit -m "Add generative-ui skill with renderer guide and component library reference"
```

---

### Task 3: Update Mira (designer) with full gemskills + generative-ui

**Files:**
- Modify: `agents/designer.md`

**Step 1: Add gemskills to tools list**

Add after existing `Skill(gemskills:deck-creator)`:
```
Skill(gemskills:generate-image)
Skill(gemskills:generate-svg)
Skill(gemskills:generate-icon)
Skill(gemskills:edit-image)
Skill(gemskills:optimize-images)
Skill(gemskills:section-dividers)
Skill(gemskills:browsing-styles)
Skill(gemskills:avatar-portrait)
Skill(gemskills:ask-gemini)
Skill(gemskills:generate-video)
Skill(gemskills:upscale-image)
Skill(gemskills:segment-image)
Skill(bopen-tools:generative-ui)
```

**Step 2: Add Gemini Visual Generation section** (before Visual Inspection section)

Cover:
- Image generation pipeline (generate-image, edit-image, optimize-images)
- Vector graphics (generate-svg for logos, icons)
- Icon generation (generate-icon with platform-specific exports)
- Style browsing (169 styles via browsing-styles)
- Video generation (generate-video for backgrounds, animations)
- Avatar generation (avatar-portrait for profile images)
- Second opinion (ask-gemini for design critique)

**Step 3: Add Generative UI section** (after Gemini section)

Cover:
- When to reach for generative UI vs static components
- Point to `Skill(bopen-tools:generative-ui)` for the full decision framework
- json-render + shadcn pattern for dynamic dashboards
- Integration with gemskills for visual assets within generated UI

**Step 4: Bump version 1.0.4 -> 1.0.5**

**Commit:**
```bash
git add agents/designer.md
git commit -m "Update Mira with full gemskills and generative-ui awareness"
```

---

### Task 4: Update other agents with generative-ui skill

**Files:**
- Modify: `agents/agent-builder.md` — Add `Skill(bopen-tools:generative-ui)` to tools, bump 1.4.3 -> 1.4.4
- Modify: `agents/nextjs.md` — Add `Skill(bopen-tools:generative-ui)` to tools, bump 1.0.4 -> 1.0.5
- Modify: `agents/mobile.md` — Add `Skill(bopen-tools:generative-ui)` to tools, bump 1.1.6 -> 1.1.7
- Modify: `agents/integration-expert.md` — Add `Skill(bopen-tools:generative-ui)` to tools, bump 1.2.11 -> 1.2.12

Each agent just needs the skill in tools — the skill itself contains all the guidance. No body changes needed.

**Commit:**
```bash
git add agents/agent-builder.md agents/nextjs.md agents/mobile.md agents/integration-expert.md
git commit -m "Add generative-ui skill to agent-builder, nextjs, mobile, and integration-expert agents"
```

---

### Task 5: Update agent-auditor with 7th dimension

**Files:**
- Modify: `skills/agent-auditor/SKILL.md`

**Add after dimension 6 (Agent Equipment):**

### 7. Generative UI Awareness

If the agent's domain involves UI generation or rendering:

**Checks:**
- Does the agent have `Skill(bopen-tools:generative-ui)` in tools?
- If the agent works with React/Next.js, does it know about json-render?
- If the agent works with React Native, does it know about `@json-render/react-native`?
- If the agent produces visual assets, does it have relevant gemskills?
- Does the agent understand when to use generative UI vs static components?

**Applicable agents:** designer, agent-builder, nextjs, mobile, integration-expert

**Not applicable:** code-auditor, documentation-writer, researcher, devops, database, payments (skip this dimension)

**Commit:**
```bash
git add skills/agent-auditor/SKILL.md
git commit -m "Add generative UI awareness as 7th audit dimension"
```

---

### Task 6: Bump plugin version and push

**Files:**
- Modify: `.claude-plugin/plugin.json` — 1.0.80 -> 1.0.81

**Commit and push:**
```bash
git add .claude-plugin/plugin.json
git commit -m "Bump plugin to 1.0.81"
git push
```

---

## Verification Checklist

- [ ] `ls .claude/skills/` shows json-render skills installed
- [ ] `ls skills/generative-ui/` shows SKILL.md + references/ with 2 files
- [ ] `wc -w skills/generative-ui/SKILL.md` under 1,500 words
- [ ] `grep generative-ui agents/designer.md` shows skill in tools
- [ ] `grep gemskills agents/designer.md` shows 12+ gemskills
- [ ] `grep generative-ui agents/agent-builder.md` shows skill in tools
- [ ] `grep generative-ui agents/nextjs.md` shows skill in tools
- [ ] `grep generative-ui agents/mobile.md` shows skill in tools
- [ ] `grep generative-ui agents/integration-expert.md` shows skill in tools
- [ ] `grep "Generative UI" skills/agent-auditor/SKILL.md` shows 7th dimension
- [ ] plugin.json version is 1.0.81
