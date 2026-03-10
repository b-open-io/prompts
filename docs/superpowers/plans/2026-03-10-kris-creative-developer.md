# Kris (Creative Developer) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Kris creative developer agent with two custom skills (threejs-r3f, shaders) and MCP server integrations, fully validated by research and review.

**Architecture:** Agent lives in bopen-tools plugin (`agents/creative-developer.md`). Two custom skills in `skills/threejs-r3f/` and `skills/shaders/`. Agent prompt handles creative direction, output conventions, and handoff protocols. Skills handle workflows, resource links, step-by-step recipes, and performance rules. MCP servers documented for optional installation.

**Tech Stack:** Three.js, React Three Fiber (R3F), Drei, @react-three/rapier, GLSL, TSL (Three Shader Language), pmndrs/postprocessing, Vite, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-10-kris-creative-developer-design.md`

---

## File Map

### Agent
- **Create:** `agents/creative-developer.md` — Kris agent definition (~400-600 lines)

### Skills
- **Create:** `skills/threejs-r3f/SKILL.md` — Core Three.js/R3F playbook (~1500-2000 words)
- **Create:** `skills/threejs-r3f/references/r3f-patterns.md` — Detailed R3F component patterns and recipes
- **Create:** `skills/threejs-r3f/references/drei-helpers.md` — Drei helper inventory with usage
- **Create:** `skills/threejs-r3f/references/performance.md` — Performance optimization rules and budgets
- **Create:** `skills/threejs-r3f/references/physics.md` — @react-three/rapier setup and patterns
- **Create:** `skills/shaders/SKILL.md` — Shader development playbook (~1500-2000 words)
- **Create:** `skills/shaders/references/tsl-guide.md` — TSL (Three Shader Language) workflow and node types
- **Create:** `skills/shaders/references/glsl-patterns.md` — Common GLSL shader recipes
- **Create:** `skills/shaders/references/postprocessing.md` — Post-processing pipeline setup and effects

### Registry Updates
- **Modify:** `agents/front-desk.md` — Add Kris to Martha's roster
- **Modify:** `skills/front-desk/SKILL.md` — Add Kris to directory listing
- **Modify:** `README.md` — Add Kris to agent table
- **Modify:** `WORKFLOW.json` — Add creative-developer routing (if applicable)

### Plugin Manifest
- **Modify:** `.claude-plugin/plugin.json` — Bump plugin version

---

## Chunk 1: Research and Validation Groundwork

This chunk gathers verified source material that anchors everything in Chunks 2 and 3. No files are written to the repo yet.

### Task 1: Research R3F/Drei/Three.js Current APIs

**Purpose:** Gather ground-truth documentation to anchor the threejs-r3f skill. Every pattern and recipe in the skill must trace back to real, current APIs.

- [ ] **Step 1: Dispatch researcher agent to gather R3F docs**

Prompt for researcher agent:
```
Research the current React Three Fiber (R3F) ecosystem. I need verified, current information for building a skill file. Gather:

1. R3F core API: Canvas props, useFrame, useThree, useLoader, events system. Source: https://r3f.docs.pmnd.rs/
2. Drei helpers: Full inventory of the most-used helpers from @react-three/drei. Source: https://github.com/pmndrs/drei (README)
3. @react-three/rapier: Setup patterns, RigidBody types, collider types, physics world config. Source: https://github.com/pmndrs/react-three-rapier
4. Three.js r170+ breaking changes or new APIs (especially TSL/WebGPU). Source: https://github.com/mrdoob/three.js/releases
5. pmndrs ecosystem: zustand (state), leva (debug GUI), tunnel (portals). Source: https://github.com/pmndrs
6. Performance best practices from R3F docs: https://r3f.docs.pmnd.rs/advanced/pitfalls
7. GLTF loading patterns: useGLTF, Draco compression, gltfjsx CLI tool. Source: https://github.com/pmndrs/gltfjsx

For each item: provide the exact API signatures, a minimal code example, and the source URL. Flag anything that has changed recently (last 6 months). Save output to /Users/satchmo/code/prompts/docs/superpowers/research/kris-r3f-research.md
```

- [ ] **Step 2: Dispatch researcher agent to gather shader/TSL docs**

Prompt for researcher agent:
```
Research Three.js shader development for a skill file. I need verified, current information:

1. TSL (Three Shader Language) — the new node-based shader system in Three.js for WebGPU+WebGL. Source: https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language and https://threejs.org/examples/?q=tsl
2. ShaderMaterial API — uniforms, vertexShader, fragmentShader props. Source: https://threejs.org/docs/#api/en/materials/ShaderMaterial
3. pmndrs/postprocessing — EffectComposer, available effects, performance notes. Source: https://github.com/pmndrs/postprocessing and https://pmndrs.github.io/postprocessing/
4. The Book of Shaders key concepts (noise functions, SDF, color mixing). Source: https://thebookofshaders.com/
5. lygia shader library — available modules, how to include. Source: https://github.com/patriciogonzalezvivo/lygia
6. Inigo Quilez noise/SDF reference articles. Source: https://iquilezles.org/articles/
7. Common Three.js shader examples from the official repo. Source: https://threejs.org/examples/?q=shader

For each: exact API usage, minimal code, source URL. Save to /Users/satchmo/code/prompts/docs/superpowers/research/kris-shader-research.md
```

- [ ] **Step 3: Dispatch researcher agent to validate MCP servers**

Prompt for researcher agent:
```
Validate these two MCP servers for Three.js agent integration. I need to know if they're real, maintained, and worth integrating:

1. MCP Three by basement.studio — GLTF to R3F JSX conversion
   - GitHub: https://github.com/basementstudio/mcp-three
   - Check: last commit date, star count, what tools it exposes, installation method

2. ThreeJSMCP by deya-0x — Three.js docs/examples lookup
   - GitHub: https://github.com/deya-0x/ThreeJSMCP
   - Check: last commit date, star count, what tools it exposes, installation method

For each: confirm it exists, list the MCP tools it exposes, provide the exact install/config, and flag any concerns (abandoned, broken, limited). Save to /Users/satchmo/code/prompts/docs/superpowers/research/kris-mcp-research.md
```

- [ ] **Step 4: Verify all research output exists**

```bash
ls -la /Users/satchmo/code/prompts/docs/superpowers/research/kris-*-research.md
```

Expected: 3 files (r3f, shader, mcp)

- [ ] **Step 5: Commit research**

```bash
git add docs/superpowers/research/kris-*-research.md
git commit -m "OPL-XXX: Add research docs for Kris creative developer agent"
```

---

## Chunk 2: Build the threejs-r3f Skill

All content in this chunk MUST be anchored to the research from Chunk 1. Do not invent API signatures or patterns — reference the research docs.

### Task 2: Create threejs-r3f SKILL.md

**Files:**
- Create: `skills/threejs-r3f/SKILL.md`

- [ ] **Step 1: Write the SKILL.md**

The SKILL.md should be 1500-2000 words (progressive disclosure — detailed content goes in references/).

Frontmatter:
```yaml
---
name: threejs-r3f
version: 1.0.0
description: >-
  This skill should be used when building Three.js or React Three Fiber (R3F) projects,
  creating 3D scenes, loading GLTF/GLB models, setting up physics with @react-three/rapier,
  optimizing 3D performance, scaffolding Vite+R3F projects, or exporting R3F components.
  Covers scene setup, Drei helpers, asset pipeline, responsive canvas, and performance budgets.
metadata:
  tags: three.js, react-three-fiber, r3f, drei, 3d, webgl, webgpu
---
```

Body structure (follow generative-ui SKILL.md as format model):
1. **When to use** — Trigger conditions
2. **Project scaffolding** — Two modes: standalone Vite+R3F project vs exportable component. Include exact `bun create vite` + package install commands.
3. **Scene setup** — Canvas config, camera, lighting rig, controls. Minimal working example.
4. **Drei helpers** — Top 15 most-used helpers with one-liner descriptions. Link to `references/drei-helpers.md` for full inventory.
5. **Asset pipeline** — GLTF loading with useGLTF, Draco compression, gltfjsx CLI. Link to research.
6. **Performance rules** — Draw call budgets, disposal checklist, useFrame rules. Link to `references/performance.md`.
7. **Physics** — Quick start with @react-three/rapier. Link to `references/physics.md`.
8. **Reference files** — List all references/ files with descriptions.

- [ ] **Step 2: Verify SKILL.md is under 2000 words**

```bash
wc -w skills/threejs-r3f/SKILL.md
```

### Task 3: Create threejs-r3f Reference Files

**Files:**
- Create: `skills/threejs-r3f/references/r3f-patterns.md`
- Create: `skills/threejs-r3f/references/drei-helpers.md`
- Create: `skills/threejs-r3f/references/performance.md`
- Create: `skills/threejs-r3f/references/physics.md`

- [ ] **Step 1: Write `references/r3f-patterns.md`**

Content (anchored to Chunk 1 research):
- Canvas configuration options (gl, camera, dpr, frameloop, flat)
- Camera types and when to use each (PerspectiveCamera, OrthographicCamera)
- Lighting rigs (3-point, environment-only, mixed)
- Event handling (onClick, onPointerOver, onPointerMove)
- useFrame patterns (animation, avoiding allocations, using refs)
- useThree for accessing renderer/scene/camera
- Responsive canvas (resize handling, DPR adaptation)
- Scroll-driven scenes with ScrollControls
- Portals and HUD overlays (tunnel from pmndrs)
- State management with zustand

- [ ] **Step 2: Write `references/drei-helpers.md`**

Content: Full inventory of Drei helpers organized by category. For each: name, one-liner, import, minimal usage example.
- Controls: OrbitControls, MapControls, FlyControls, ScrollControls
- Staging: Environment, Sky, Stars, Cloud, Stage, ContactShadows, Lightformer
- Shapes: RoundedBox, Torus, Text, Text3D, Html, Billboard
- Loaders: useGLTF, useTexture, useVideoTexture, useCubeTexture
- Performance: Instances, Merged, LOD, Detailed, BakeShadows, AdaptiveDpr
- Abstractions: Float, MeshWobbleMaterial, MeshDistortMaterial, GradientTexture
- Misc: useHelper, useBounds, PivotControls, TransformControls

- [ ] **Step 3: Write `references/performance.md`**

Content:
- Draw call budgets (mobile: <100, desktop: <300, target: 60fps)
- Instanced meshes for repeated geometry (InstancedMesh, Instances from Drei)
- LOD implementation (Detailed from Drei, manual LOD with distance checks)
- Geometry merging (mergeGeometries for static scenes)
- Texture optimization (format selection: KTX2/basis > WebP > PNG, atlas packing, mipmap)
- Proper disposal checklist (geometry.dispose(), material.dispose(), texture.dispose())
- useFrame optimization (never allocate in useFrame, use refs, conditional updates)
- Frustum culling (default on, manual override for particles)
- stats.js and r3f-perf integration for monitoring
- Mobile-specific: reduce DPR to 1.5, simplify shaders, reduce polygon count

- [ ] **Step 4: Write `references/physics.md`**

Content:
- @react-three/rapier quick start (Physics provider, RigidBody, colliders)
- RigidBody types: dynamic, fixed, kinematicPosition, kinematicVelocity
- Collider types: cuboid, ball, trimesh, convexHull, heightfield
- Collision events (onCollisionEnter, onCollisionExit, onContactForce)
- Character controller pattern (KinematicCharacterController)
- Joints (FixedJoint, RevoluteJoint, PrismaticJoint, SphericalJoint)
- Performance: sleep thresholds, collision groups, broadphase tuning
- Debug visualization (Debug component)
- Common patterns: ragdoll, vehicle, platformer, projectiles

- [ ] **Step 5: Commit skill**

```bash
git add skills/threejs-r3f/
git commit -m "OPL-XXX: Add threejs-r3f skill with references"
```

### Task 4: Review threejs-r3f Skill

- [ ] **Step 1: Dispatch skill-reviewer agent**

```
Review the skill at /Users/satchmo/code/prompts/skills/threejs-r3f/SKILL.md for:
- SKILL.md format compliance (frontmatter, progressive disclosure, word count)
- Triggering description effectiveness
- Reference file organization
- Technical accuracy (cross-reference against docs/superpowers/research/kris-r3f-research.md)
```

- [ ] **Step 2: Dispatch code-auditor agent for technical accuracy**

```
Audit the technical accuracy of /Users/satchmo/code/prompts/skills/threejs-r3f/ (SKILL.md + all references).
Cross-reference every code example, API signature, and performance claim against the research at docs/superpowers/research/kris-r3f-research.md.
Flag anything that is outdated, incorrect, or unverifiable. Check that resource URLs are real.
```

- [ ] **Step 3: Fix any issues found by reviewers**

- [ ] **Step 4: Commit fixes**

```bash
git add skills/threejs-r3f/
git commit -m "OPL-XXX: Address review feedback for threejs-r3f skill"
```

---

## Chunk 3: Build the Shaders Skill

All content MUST be anchored to the shader research from Chunk 1.

### Task 5: Create shaders SKILL.md

**Files:**
- Create: `skills/shaders/SKILL.md`

- [ ] **Step 1: Write the SKILL.md**

Frontmatter:
```yaml
---
name: shaders
version: 1.0.0
description: >-
  This skill should be used when writing custom shaders for Three.js, creating visual
  effects with GLSL or TSL (Three Shader Language), debugging shader issues, building
  post-processing pipelines, implementing noise functions, procedural textures, or
  custom materials. Covers shader workflow, TSL node system, GLSL patterns, debugging,
  performance optimization, and post-processing with pmndrs/postprocessing.
metadata:
  tags: shaders, glsl, tsl, webgl, webgpu, postprocessing, three.js
---
```

Body structure:
1. **When to use** — Trigger conditions (custom materials, visual effects, post-processing)
2. **Choosing TSL vs GLSL** — Decision tree. TSL for WebGPU+WebGL compat, GLSL for legacy/specific control.
3. **TSL workflow** — Node-based approach, composition patterns, quick start. Link to `references/tsl-guide.md`.
4. **GLSL workflow** — ShaderMaterial setup, uniform passing, vertex/fragment structure. Link to `references/glsl-patterns.md`.
5. **Debugging shaders** — Visual debugging (output values as colors), common errors, Spector.js, Chrome GPU profiler.
6. **Performance rules** — Avoid branching, minimize texture lookups, precision qualifiers, precompute in vertex.
7. **Post-processing** — EffectComposer setup, effect ordering rules, cost per effect. Link to `references/postprocessing.md`.
8. **Resources** — Book of Shaders, Shadertoy, lygia, Inigo Quilez, Three.js TSL examples. Actual URLs.
9. **Reference files** — List all references/ files.

- [ ] **Step 2: Verify word count**

```bash
wc -w skills/shaders/SKILL.md
```

### Task 6: Create Shader Reference Files

**Files:**
- Create: `skills/shaders/references/tsl-guide.md`
- Create: `skills/shaders/references/glsl-patterns.md`
- Create: `skills/shaders/references/postprocessing.md`

- [ ] **Step 1: Write `references/tsl-guide.md`**

Content (anchored to Chunk 1 research):
- What TSL is and why it matters (write once, run on WebGL + WebGPU)
- TSL node types: float, vec2, vec3, vec4, color, texture, uniform nodes
- Node composition: add, mul, mix, step, smoothstep, clamp
- Built-in nodes: positionLocal, positionWorld, normalLocal, normalWorld, uv, time
- Noise nodes: mx_noise_float, mx_noise_vec3 (MaterialX noise)
- Custom function nodes: Fn, tslFn
- Converting GLSL to TSL — common patterns mapped
- NodeMaterial setup in R3F
- Minimal working TSL shader example (with and without R3F)

- [ ] **Step 2: Write `references/glsl-patterns.md`**

Content: Step-by-step recipes for common shader effects. Each recipe includes:
- What it looks like (one-line visual description)
- Complete vertex + fragment shader code
- Uniform declarations and how to pass them from R3F
- Performance notes

Recipes:
- Noise (Simplex 2D/3D, FBM layering)
- Fresnel / rim lighting
- Dissolve / disintegration (noise threshold + clip)
- Hologram / scan lines
- Water surface (vertex displacement + Fresnel + refraction)
- Gradient mapping (ramp texture lookup)
- Matcap material
- Custom particle shader (point sprites with size attenuation)
- Toon / cel shading (step function on NdotL)
- Chromatic aberration (UV offset per channel)

- [ ] **Step 3: Write `references/postprocessing.md`**

Content:
- EffectComposer setup in R3F (pmndrs/postprocessing + @react-three/postprocessing)
- Effect ordering rules (order matters: tone mapping last, anti-aliasing before bloom)
- Per-effect documentation with performance cost rating (low/medium/high):
  - Bloom (medium) — threshold, intensity, mipmapBlur
  - DepthOfField (high) — focusDistance, focalLength, bokehScale
  - SSAO (high) — radius, intensity, bias
  - ChromaticAberration (low) — offset
  - Vignette (low) — eskil, offset, darkness
  - ToneMapping (low) — mode options
  - Noise/Film grain (low)
  - Outline (medium) — selection-based
  - GodRays (high) — light source mesh
- Custom effect authoring (extending Effect class)
- Selective bloom pattern (layers-based)
- Mobile considerations: skip SSAO and DOF, use simple bloom only

- [ ] **Step 4: Commit skill**

```bash
git add skills/shaders/
git commit -m "OPL-XXX: Add shaders skill with references"
```

### Task 7: Review Shaders Skill

- [ ] **Step 1: Dispatch skill-reviewer agent**

```
Review the skill at /Users/satchmo/code/prompts/skills/shaders/SKILL.md for:
- SKILL.md format compliance
- Triggering description effectiveness
- Reference file organization and progressive disclosure
- Technical accuracy (cross-reference against docs/superpowers/research/kris-shader-research.md)
```

- [ ] **Step 2: Dispatch code-auditor agent for technical accuracy**

```
Audit the technical accuracy of /Users/satchmo/code/prompts/skills/shaders/ (SKILL.md + all references).
Every shader code example must be valid GLSL or TSL. Every API reference must match current Three.js.
Cross-reference against docs/superpowers/research/kris-shader-research.md.
Flag anything outdated, incorrect, or unverifiable. Verify all resource URLs.
```

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Commit fixes**

```bash
git add skills/shaders/
git commit -m "OPL-XXX: Address review feedback for shaders skill"
```

---

## Chunk 4: Build the Agent

### Task 8: Create the creative-developer Agent

**Files:**
- Create: `agents/creative-developer.md`

- [ ] **Step 1: Write the agent file**

Frontmatter:
```yaml
---
name: creative-developer
display_name: "Kris"
version: 1.0.0
model: sonnet
description: >-
  Creative 3D web developer building Three.js and React Three Fiber experiences.
  Use this agent when the user asks to "create a 3D scene", "build a Three.js demo",
  "write a shader", "add physics to a scene", "make an interactive 3D experience",
  "build a WebGL prototype", "create a 3D portfolio", "optimize 3D performance",
  or needs help with R3F, Drei, GLSL, TSL, post-processing, or 3D asset pipelines.
tools: >-
  Read, Write, Edit, MultiEdit, Bash, WebFetch, Grep, Glob, TodoWrite,
  Skill(threejs-r3f),
  Skill(shaders),
  Skill(remotion-best-practices),
  Skill(vercel-react-best-practices),
  Skill(bopen-tools:frontend-performance),
  Skill(agent-browser),
  Skill(gemskills:generate-image),
  Skill(gemskills:generate-svg),
  Skill(gemskills:optimize-images),
  Skill(gemskills:visual-planner),
  Skill(gemskills:deck-creator),
  Skill(gemskills:browsing-styles),
  Skill(bopen-tools:mcp-apps),
  Skill(superpowers:dispatching-parallel-agents),
  Skill(superpowers:subagent-driven-development)
color: cyan
---
```

Agent prompt body (~400-600 lines) covering:
- Identity and creative philosophy (distinctive, anti-generic, pro-expressive)
- Output conventions:
  - Standalone mode: Vite+R3F project structure, package.json, entry point
  - Component mode: Single .tsx or folder with types, ready for import
- Scene setup checklist (every scene needs: Canvas, camera, lights, controls, resize handling)
- Shader workflow (invoke shaders skill before writing any custom material)
- Asset pipeline (invoke threejs-r3f skill for GLTF loading)
- Preview loop: build -> agent-browser screenshot -> self-critique -> iterate
- Performance checklist (invoke before shipping: FPS, draw calls, disposal, mobile test)
- Handoff protocols:
  - To Theo: "Integration-ready. Here's the component/project. Install these deps."
  - To Ridd: "Here's the 3D section. It expects this container size and these props."
- MCP server notes (optional installs for enhanced doc lookup):
  - MCP Three: `basementstudio/mcp-three` for GLTF->R3F conversion
  - ThreeJSMCP: `deya-0x/ThreeJSMCP` for doc/example search
- Skills invocation guide (which skill to invoke when)
- Immediate analysis protocol (scan for existing Three.js code, check package.json for deps)
- Anti-patterns:
  - Never use vanilla Three.js when R3F is available (unless explicitly asked)
  - Never skip disposal (memory leaks are the #1 3D bug)
  - Never animate in useFrame without delta time
  - Never hardcode canvas size (always responsive)

- [ ] **Step 2: Verify file length is reasonable**

```bash
wc -l agents/creative-developer.md
```

Target: 400-600 lines (comparable to designer.md at 636 or nextjs.md at 1127)

- [ ] **Step 3: Commit agent**

```bash
git add agents/creative-developer.md
git commit -m "OPL-XXX: Add Kris (creative-developer) agent"
```

### Task 9: Review Agent

- [ ] **Step 1: Dispatch skill-reviewer agent for agent format**

```
Review the agent at /Users/satchmo/code/prompts/agents/creative-developer.md for:
- Frontmatter format (name, display_name, version, model, description, tools, color)
- Description triggering effectiveness
- Tools list completeness (matches the approved spec at docs/superpowers/specs/2026-03-10-kris-creative-developer-design.md)
- Prompt quality and clarity
- Consistency with other agents in agents/ directory
```

- [ ] **Step 2: Dispatch code-auditor for technical accuracy**

```
Audit /Users/satchmo/code/prompts/agents/creative-developer.md for technical accuracy.
Every code example, API reference, and command must be correct and current.
Cross-reference against research at docs/superpowers/research/kris-*-research.md.
Check that all Skill() references in the tools list correspond to real skills.
```

- [ ] **Step 3: Fix any issues**

- [ ] **Step 4: Commit fixes**

```bash
git add agents/creative-developer.md
git commit -m "OPL-XXX: Address review feedback for creative-developer agent"
```

---

## Chunk 5: Registry Updates and Final Validation

### Task 10: Update Agent Registries

**Files:**
- Modify: `agents/front-desk.md` — Add Kris to Martha's roster
- Modify: `skills/front-desk/SKILL.md` — Add Kris to directory
- Modify: `README.md` — Add Kris to agent table
- Modify: `WORKFLOW.json` — Add routing (if file has routing entries)

- [ ] **Step 1: Add Kris to front-desk agent**

In `agents/front-desk.md`, find the agent roster section and add:
```
- **Kris** (creative-developer) — 3D creative developer. Three.js, R3F, shaders, physics, interactive prototypes. Produces 3D assets and demos; hands off to Theo/Ridd for integration.
```

- [ ] **Step 2: Add Kris to front-desk skill**

In `skills/front-desk/SKILL.md`, find the directory listing and add the same entry.

- [ ] **Step 3: Add Kris to README.md**

Find the agents table and add Kris with cyan color.

- [ ] **Step 4: Update WORKFLOW.json**

Check if `WORKFLOW.json` has routing entries. If so, add:
```json
{
  "agent": "Kris",
  "triggers": ["3d", "three.js", "threejs", "r3f", "shader", "webgl", "webgpu", "physics demo", "3d scene"],
  "description": "Creative 3D developer"
}
```

- [ ] **Step 5: Bump plugin version**

In `.claude-plugin/plugin.json`, increment the patch version by +0.0.1.

- [ ] **Step 6: Commit registry updates**

```bash
git add agents/front-desk.md skills/front-desk/SKILL.md README.md WORKFLOW.json .claude-plugin/plugin.json
git commit -m "OPL-XXX: Register Kris in agent rosters and bump plugin version"
```

### Task 11: End-to-End Agent Benchmark

- [ ] **Step 1: Dispatch tester agent with 5 sample prompts**

```
Benchmark the creative-developer agent (Kris) at /Users/satchmo/code/prompts/agents/creative-developer.md.

Test these prompts by evaluating whether the agent prompt + skills provide sufficient guidance:

1. "Create a floating 3D product card that rotates on hover"
   - Expected: R3F component with Float, mesh, raycasting hover, spring animation

2. "Build a procedural terrain with Perlin noise"
   - Expected: Custom vertex shader displacing plane geometry, shaders skill invoked

3. "Import this GLTF model and add physics"
   - Expected: useGLTF + RigidBody wrapper, threejs-r3f skill invoked

4. "Create a hologram shader effect"
   - Expected: Custom ShaderMaterial with scan lines + Fresnel, shaders skill invoked

5. "Build an interactive 3D portfolio with scroll-driven camera"
   - Expected: Standalone Vite+R3F project, ScrollControls, multiple sections

For each: assess whether Kris's prompt + skills give clear enough guidance to produce correct output. Rate coverage 1-5. Flag gaps.
```

- [ ] **Step 2: Fix any gaps identified by benchmark**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "OPL-XXX: Final polish for Kris creative-developer agent"
```

---

## Execution Order

Tasks 1 (R3F research), 1.Step 2 (shader research), and 1.Step 3 (MCP research) can run in **parallel**.

Tasks 2-3 (threejs-r3f skill) and Tasks 5-6 (shaders skill) can run in **parallel** after research completes.

Tasks 4 and 7 (reviews) can run in **parallel** after their respective skills are written.

Task 8 (agent) depends on both skills being complete.

Task 9 (agent review) depends on Task 8.

Tasks 10-11 (registry + benchmark) depend on Task 9.

```
[Task 1: Research R3F] ──┐
[Task 1: Research Shaders]─┤
[Task 1: Research MCP] ───┤
                           ▼
              ┌─── [Task 2-3: threejs-r3f skill] ─── [Task 4: Review] ───┐
              │                                                           │
              └─── [Task 5-6: shaders skill] ──────── [Task 7: Review] ──┤
                                                                          ▼
                                                          [Task 8: Agent] ─── [Task 9: Review]
                                                                                      │
                                                                                      ▼
                                                              [Task 10: Registry] ─── [Task 11: Benchmark]
```
