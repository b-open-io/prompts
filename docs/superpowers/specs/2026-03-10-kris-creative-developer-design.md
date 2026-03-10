# Kris — Creative Developer Agent Design Spec

**Date**: 2026-03-10
**Status**: Approved
**Plugin**: bopen-tools (prompts repo)

## Identity

| Field | Value |
|-------|-------|
| `name` | `creative-developer` |
| `display_name` | Kris |
| `color` | cyan |
| `model` | sonnet |
| `version` | 1.0.0 |

**Avatar**: Generated at `/Users/satchmo/code/bopen-ai/public/images/agents/kris.png` (pixel art, Stardew Valley style)

## Role

3D creative developer producing Three.js/R3F scenes, shaders, physics demos, interactive prototypes, and standalone creative experiences.

Kris is a **studio artist, not a site builder**. He produces assets and prototypes that other agents integrate.

## Scope Boundaries

### Kris owns
- 3D scenes, shaders, physics demos
- R3F components ready to drop into existing projects
- Interactive prototypes and creative demos
- Standalone Three.js experiences (Awwwards-style pieces)
- Shader development (GLSL, TSL)
- Post-processing pipelines
- 3D asset pipelines (GLTF/GLB loading, optimization)
- Code-driven 3D video (via Remotion + Three.js)

### Kris hands off to
- **Theo** (nextjs agent): Next.js integration, routing, project-level scaffolding when 3D is embedded in a larger app
- **Ridd** (designer agent): Page layout, UI components, design system integration, accessibility
- **Lisa** (gemskills content): AI-generated video (Veo), when the ask is generated media not coded 3D

### Output formats
- **Standalone Vite+R3F project**: For demos, prototypes, standalone experiences
- **Exportable R3F component**: `.tsx` file/folder that Theo/Ridd can import into any Next.js project
- The brief determines which format

## Skills — Existing (13)

| Skill | Purpose |
|-------|---------|
| `Skill(remotion-best-practices)` | 3D video output; has `rules/3d.md` with R3F patterns |
| `Skill(vercel-react-best-practices)` | React fundamentals (R3F is React) |
| `Skill(bopen-tools:frontend-performance)` | FPS profiling, draw call analysis |
| `Skill(agent-browser)` | Preview and screenshot 3D scenes |
| `Skill(gemskills:generate-image)` | Textures, HDR environments, reference images |
| `Skill(gemskills:generate-svg)` | SVG assets for HUD/overlay elements |
| `Skill(gemskills:optimize-images)` | Texture compression |
| `Skill(gemskills:visual-planner)` | Scene layout on infinite canvas |
| `Skill(gemskills:deck-creator)` | Presenting concepts and storyboards |
| `Skill(gemskills:browsing-styles)` | Visual style exploration before creating |
| `Skill(superpowers:dispatching-parallel-agents)` | Fan out work |
| `Skill(superpowers:subagent-driven-development)` | Systematic execution |
| `Skill(bopen-tools:mcp-apps)` | Deliver 3D as MCP App in Claude Desktop |

## Skills — Custom to Build (2)

### 1. `threejs-r3f` — Core Three.js/R3F Playbook

**Scope**: Everything needed to go from brief to working 3D scene.

**Contents**:
- Project scaffolding templates (Vite+R3F standalone vs exportable component)
- R3F scene setup patterns (Canvas config, camera types, lighting rigs, controls)
- Drei helpers inventory (Environment, OrbitControls, Float, Text3D, useGLTF, etc.)
- GLTF/GLB asset loading pipeline (useGLTF, Draco compression, lazy loading)
- Responsive canvas and device adaptation patterns
- Performance rules:
  - Instanced meshes for repeated geometry
  - LOD (Level of Detail) implementation
  - Frustum culling configuration
  - Proper disposal (geometries, materials, textures)
  - Draw call budgets (target: <100 for mobile, <300 for desktop)
  - useFrame optimization (avoid allocations, use refs)
- Texture optimization workflow (format selection, atlas packing, mipmap strategy)
- Common recipes:
  - Scroll-driven 3D scenes (with ScrollControls)
  - Environment maps and HDR lighting
  - PBR materials configuration
  - Physics integration (@react-three/rapier setup, rigid bodies, colliders)
  - Particle systems
  - Click/hover interaction via raycasting
- References directory:
  - R3F docs and API reference links
  - Drei docs
  - pmndrs ecosystem overview (zustand for state, leva for debug GUI)
  - Three.js migration guides
  - Three.js examples index

### 2. `shaders` — Shader Development Playbook

**Scope**: Writing, debugging, and optimizing custom shaders for Three.js.

**Contents**:
- TSL (Three Shader Language) workflow:
  - Node-based shader graph approach
  - WebGPU compatibility (one codebase, both renderers)
  - TSL node types and composition patterns
  - Migration from GLSL to TSL
- GLSL fundamentals workflow:
  - Vertex/fragment shader structure
  - Uniforms, varyings, attributes
  - ShaderMaterial vs RawShaderMaterial decision tree
- Debugging workflow:
  - Visual debugging (output intermediate values as colors)
  - Common error patterns and fixes
  - Performance profiling (Spector.js, Chrome GPU profiler)
- Performance rules:
  - Avoid dynamic branching in fragment shaders
  - Minimize texture lookups
  - Use appropriate precision qualifiers (mediump vs highp)
  - Precompute values in vertex shader when possible
  - Limit overdraw with depth testing
- Common shader patterns (step-by-step recipes):
  - Noise functions (Perlin, Simplex, Worley, FBM)
  - Fresnel/rim lighting
  - Dissolve/disintegration effect
  - Hologram/scan lines
  - Water surface (reflection, refraction, caustics)
  - Fire/smoke (ray marching basics)
  - Gradient mapping
  - Custom particle shaders
  - Matcap materials
  - Outline/toon shading
- Post-processing pipeline:
  - EffectComposer setup and effect ordering
  - Performance cost per effect (bloom, DOF, SSAO, etc.)
  - pmndrs/postprocessing library patterns
  - Custom post-processing passes
- Resources:
  - The Book of Shaders (thebookofshaders.com)
  - Shadertoy (reference, not copy-paste)
  - Three.js TSL examples (threejs.org/examples/?q=tsl)
  - lygia shader library (github.com/patriciogonzalezvivo/lygia)
  - Inigo Quilez articles (iquilezles.org)

## MCP Server Integrations (2)

| Server | Source | Purpose |
|--------|--------|---------|
| **MCP Three** | `basementstudio/mcp-three` (GitHub/LobeHub) | GLTF/GLB to R3F JSX conversion, model structure analysis |
| **ThreeJSMCP** | `deya-0x/ThreeJSMCP` (GitHub) | Three.js documentation and examples lookup via MCP |

## Agent Prompt Coverage

The agent `.md` prompt itself covers:
- Creative direction philosophy (distinctive, not generic)
- Output conventions (file structure, naming, exports for both output modes)
- Preview loop workflow (build -> screenshot via agent-browser -> critique -> refine)
- Decision tree: standalone project vs exportable component
- Handoff protocol to Theo (Next.js integration) and Ridd (page design)
- Physics patterns (@react-three/rapier — compact enough for the prompt)
- WebXR notes (future extension point)

## Validation Plan

| Step | Agent | Task |
|------|-------|------|
| 1 | **Researcher** | Gather current R3F, Drei, Three.js, TSL docs and source. Verify all resource links. Anchor skill content to real APIs. |
| 2 | **Skill creator** | Draft both skills (`threejs-r3f`, `shaders`) using researcher output as ground truth |
| 3 | **Skill reviewer** | Check structure, triggering descriptions, progressive disclosure, SKILL.md format compliance |
| 4 | **Code auditor** | Verify technical accuracy of every recipe, pattern, and performance rule against source code |
| 5 | **Tester** | Benchmark Kris against sample prompts: shader demo, physics scene, portfolio prototype, GLTF import |

## Decisions Made

- **Home repo**: bopen-tools (prompts) — Kris writes code, not media
- **No overlap with Ridd**: Ridd does 2D UI, Kris does 3D. Clean boundary.
- **No custom physics skill**: @react-three/rapier patterns fit in the threejs-r3f skill and agent prompt
- **No custom post-processing skill**: Covered within the shaders skill
- **Shader skill is separate**: Shaders are a major part of Kris's work and warrant dedicated workflow/recipes
- **MCP servers for doc access**: ThreeJSMCP + MCP Three provide runtime knowledge without bloating skills

## Consolidation Note (Same Session)

Ridd consolidation was completed alongside this design:
- Mira renamed to Ridd in bopen-tools (v1.0.9), kept all 34 tools
- Folded unique Ridd content (web3icons, Anthropic plugins)
- Deleted gemskills duplicate
- Updated all references (front-desk, docs-writer, README, WORKFLOW)
