# Three.js / R3F MCP Server Research

**Research date:** 2026-03-10
**Purpose:** Validate MCP servers for Three.js agent integration

---

## What Matters

- **mcp-three (basementstudio)** is the clear winner: actively maintained, published on npm, wraps the battle-tested `gltfjsx` CLI, zero open issues. Recommended.
- **ThreeJSMCP (deya-0x)** works for doc lookup but requires a manual build step and local path config. Low adoption (1 star). Use with caution.
- **locchung/three-js-mcp** has no real documentation, minimal source, and is more a proof-of-concept. Avoid.
- **Flux159/mcp-game-asset-gen** is the most feature-complete alternative for asset generation (images, textures, 3D from text) but requires paid API keys (OpenAI, Fal.ai, Gemini). Worth evaluating separately.

---

## Server 1: mcp-three by basement.studio

**GitHub:** https://github.com/basementstudio/mcp-three
**npm:** https://www.npmjs.com/package/mcp-three

### Status

| Field | Value |
|---|---|
| Exists | Yes |
| Archived | No |
| Stars | 23 |
| Forks | 2 |
| Open issues | 0 |
| Created | 2025-07-12 |
| Last commit | 2025-08-13 (`fix draco`) |
| npm version | 0.1.4 (5 releases, all on 2025-07-12) |
| License | None specified |

**Note on commit history:** The repo was created July 12, 2025, and the last commit was August 13, 2025 (Draco compression fix). Activity is low but the tool is complete and stable — not abandoned.

### What It Does

Wraps the `gltfjsx` npm library (the standard tool from the pmndrs/R3F ecosystem) as an MCP server. When you give it a path to a `.gltf` or `.glb` file, it returns React Three Fiber JSX component code you can paste directly into a project.

**Underlying dependencies:**
- `gltfjsx@^6.5.3` — the battle-tested pmndrs converter
- `three-stdlib@^2.36.0` — Three.js standard library
- `xmcp@^0.1.8` — basement.studio's own MCP server framework
- `zod` — schema validation

### MCP Tools Exposed

#### `gltfjsx`

**Description:** Converts a GLTF/GLB 3D model file into a reusable, declarative React Three Fiber JSX component.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `modelPath` | string | Yes | Absolute path to the .gltf or .glb file |
| `options.types` | boolean | No | Add TypeScript definitions |
| `options.keepnames` | boolean | No | Keep original node names from GLTF |
| `options.keepgroups` | boolean | No | Keep empty groups, disable pruning |
| `options.bones` | boolean | No | Lay out bones declaratively |
| `options.meta` | boolean | No | Include metadata as userData |
| `options.shadows` | boolean | No | Let meshes cast and receive shadows |
| `options.precision` | number | No | Float decimal precision (default: 3) |
| `options.instance` | boolean | No | Instance re-occurring geometry |
| `options.instanceall` | boolean | No | Instance every geometry |
| `options.exportdefault` | boolean | No | Use default export |
| `options.resolution` | number | No | Texture resize resolution (default: 1024) |
| `options.keepmeshes` | boolean | No | Do not join compatible meshes |
| `options.keepmaterials` | boolean | No | Do not palette join materials |
| `options.format` | string | No | Texture format (default: 'webp') |
| `options.simplify` | boolean | No | Enable mesh simplification |
| `options.ratio` | number | No | Simplifier ratio |
| `options.error` | number | No | Simplifier error threshold (default: 0.0001) |

**Note:** Draco compression (`draco` option), `transform`, and `console` options are present in source but currently commented out. A Draco fix was the subject of the last commit (Aug 13, 2025) so this may be in progress.

**Annotations:** `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`

The tool also returns implementation guidance in its response: specifically, it instructs the agent to replace `useGLTF(...) as GLTFResult` with `useGLTF(...) as any as GLTFResult` to fix TypeScript narrowing errors.

#### `get-model-structure`

**Description:** Analyzes a GLTF/GLB file and returns its scene hierarchy as JSON. Useful for debugging or understanding model structure before conversion.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `modelPath` | string | Yes | Absolute path to the .gltf or .glb file |

### Installation Config

```json
{
  "mcpServers": {
    "mcp-three": {
      "command": "npx",
      "args": ["mcp-three"]
    }
  }
}
```

No API keys or environment variables required. Works entirely on the local filesystem.

### How GLTF-to-R3F Conversion Works

The tool loads the GLTF file using `three-stdlib`'s GLTFLoader in a Node.js context, passes the parsed scene graph to `gltfjsx`'s programmatic API, and returns the resulting JSX string. This is the same conversion you'd get running `npx gltfjsx model.glb` from the CLI — the MCP layer just makes it callable by an AI agent without spawning a shell process.

### Limitations

- Requires absolute file paths (relative paths are rejected)
- Draco compression is disabled in the current build (commented out in source, fix commit landed Aug 13, 2025 — may be live in 0.1.4 or pending a new release)
- No published changelog
- No tests in the repo
- Small team (basement.studio), low community adoption

### Assessment

**Recommended.** It does exactly one thing well: converts GLTF/GLB to R3F JSX. The underlying `gltfjsx` library is the ecosystem standard (used by thousands of R3F projects). Zero open issues, published on npm, works via `npx` with no setup. An agent can use this to turn any 3D asset into a React component.

---

## Server 2: ThreeJSMCP by deya-0x

**GitHub:** https://github.com/deya-0x/ThreeJSMCP

### Status

| Field | Value |
|---|---|
| Exists | Yes |
| Archived | No |
| Stars | 1 |
| Forks | 0 |
| Open issues | 0 |
| Created | 2026-01-11 |
| Last commit | 2026-01-11 (same day as creation) |
| Language | JavaScript (100%) |
| License | MIT |

**Note:** Created and last updated on the same day, January 11, 2026. No activity since initial publish. One star.

### What It Does

Scrapes/serves Three.js API documentation (from threejs.org/docs) as MCP tools, allowing an agent to look up class info, search concepts, and get getting-started guidance. It is a documentation access layer, not a model converter or code generator.

### MCP Tools Exposed

| Tool | Description |
|---|---|
| `search_threejs_docs` | Search for Three.js classes, methods, or concepts by keyword |
| `get_threejs_class_info` | Get detailed info about a specific class (constructor signatures, methods, properties) |
| `list_threejs_categories` | List all major categories in the Three.js API docs |
| `get_threejs_category` | Get all classes within a specific category |
| `get_threejs_getting_started` | Return installation and basic setup guidance |
| `explain_threejs_concept` | Explain a Three.js concept (cameras, renderers, geometries, etc.) |

**Classes covered:** Cameras (PerspectiveCamera, OrthographicCamera), Geometries (BoxGeometry, SphereGeometry, etc.), Materials (MeshStandardMaterial, MeshPhongMaterial, etc.), Renderers, Math utilities, Loaders, and more.

### Installation

Requires a manual build — no npm package published.

```bash
git clone https://github.com/deya-0x/ThreeJSMCP
cd ThreeJSMCP
npm install
npm run build
```

### Configuration for Claude Desktop

```json
{
  "mcpServers": {
    "threejs-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/ThreeJSMCP/dist/index.js"]
    }
  }
}
```

You must adjust the path to where you cloned the repo. The path must be absolute.

### Limitations

- No npm package — must clone and build manually
- Path in config is installation-specific (not portable)
- Single developer, zero community traction (1 star, 0 forks)
- Created and never updated (same-day repo)
- Three.js documentation is already well-known to modern LLMs — this tool may add little value over the model's training data
- No version pinning for Three.js docs (may lag official releases)

### Assessment

**Use with caution.** The tool set is sensible but the value proposition is weak: Claude already knows Three.js API well from training. This is only worth integrating if your agent needs guaranteed up-to-date doc lookup for very recent Three.js releases, or if you want to explicitly constrain the agent to official docs. The manual build + local path requirement makes deployment friction higher than it should be.

---

## Server 3: three-js-mcp by locchung (Alternative)

**GitHub:** https://github.com/locchung/three-js-mcp
**PulseMCP:** https://www.pulsemcp.com/servers/locchung-three-js
**mcp.so:** https://mcp.so/server/three-js-mcp/locchung

### Status

| Field | Value |
|---|---|
| Exists | Yes |
| Archived | No |
| Stars | 22 |
| Forks | 8 |
| Open issues | 1 |
| Created | 2025-03-23 |
| Last commit | 2025-03-23 (same day as creation) |
| Language | JavaScript + TypeScript |

**Note:** Created and last committed on the same day. The README explicitly says "only basic function." The single source file is `src/main.ts` but a raw fetch of that file returned 404, suggesting the source may have been restructured or the repo has issues.

### What It Does

Based on directory listing and external descriptions: a WebSocket-based MCP server that enables real-time manipulation of Three.js scenes via natural language. Described as allowing object creation, movement, rotation, and scene state retrieval.

### MCP Tools

No README documentation of tools. The source file structure confirms there is a `build/` directory (pre-built) and a single `src/main.ts`. Tools cannot be confirmed without successfully reading the source.

### Limitations

- No documentation of tools
- No README installation instructions
- Source file inaccessible via raw GitHub URL
- Single-day development, never updated
- "Only basic function" per the author's own description

### Assessment

**Avoid.** No documentation, no tool listing, single-day commit history, and source file is inaccessible. The star count (22) appears to come from MCP directory listings rather than real usage. Not suitable for integration.

---

## Server 4: mcp-game-asset-gen by Flux159 (Alternative)

**GitHub:** https://github.com/Flux159/mcp-game-asset-gen

### Status

| Field | Value |
|---|---|
| Exists | Yes |
| Archived | No |
| Stars | 14 |
| Forks | 5 |
| Open issues | 0 |
| Created | 2025-11-08 |
| Last commit | 2025-12-06 |
| Language | TypeScript |

### What It Does

A full asset generation pipeline for game development. Generates images, textures, character sheets, pixel art, and 3D models using multiple AI providers. Different in scope from the other servers — this is about generating assets, not converting existing ones or looking up docs.

Has a companion Three.js demo project at https://github.com/Flux159/three-generator.

### MCP Tools Exposed

**Image generation:**
- `openai_generate_image` — DALL-E image generation
- `gemini_generate_image` — Google Gemini 2.5 Flash / 3 Pro image generation
- `falai_generate_image` — FAL.ai Qwen image generation
- `falai_edit_image` — FAL.ai image editing

**Game asset generation:**
- `generate_character_sheet` — Multi-pose character reference sheets
- `generate_character_variation` — Combine reference images into variations
- `generate_pixel_art_character` — Pixel art sprites at specific dimensions (8x8 through 96x96)
- `generate_texture` — Seamless/tileable textures for 3D materials
- `generate_object_sheet` — Multi-viewpoint (front/back/left/right/top/bottom) reference sheets

**3D model generation:**
- `image_to_3d` — Generate .glb/.gltf from images or text prompt using Hunyuan3D, Trellis, or Hunyuan-World

### Installation

```bash
git clone https://github.com/Flux159/mcp-game-asset-gen
cd mcp-game-asset-gen
npm install
npm run build
```

Requires API keys: `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, and/or `FAL_KEY` depending on which tools you use.

### Limitations

- Requires paid API keys (OpenAI, Google, Fal.ai)
- Manual build required (no npm package)
- Video and audio generation listed as "coming soon"
- Active but small project (14 stars)

### Assessment

**Recommended for asset generation use cases.** Different category from the other servers — this is a generative pipeline, not a converter or doc lookup tool. If your agent needs to create new 3D assets from text or image inputs (not just convert existing GLTF files), this is the most capable option available. Would pair well with `mcp-three` (generate assets with this, then convert to R3F with `mcp-three`).

---

## Server 5: MCP_Game by TonyBro (Alternative)

**GitHub:** https://github.com/TonyBro/MCP_Game
**LobeHub:** https://lobehub.com/mcp/tonybro-mcp_game

### Status

| Field | Value |
|---|---|
| Stars | 1 |
| Forks | 0 |
| Created | 2025-06-25 |
| Last commit | 2025-06-25 |

### What It Does

Scaffolds React Three Fiber game projects with templates (platformer, puzzle, endless runner, physics-based, arcade). Integrates with Linear for project management. Uses Rapier for physics, GSAP for animations.

### Assessment

**Avoid.** Single-day repo, 1 star, no documentation. More of a project template generator than an MCP server for Three.js work.

---

## Comparison Table

| Server | Stars | Last Commit | npm | Tools | Verdict |
|---|---|---|---|---|---|
| basementstudio/mcp-three | 23 | 2025-08-13 | Yes (v0.1.4) | `gltfjsx`, `get-model-structure` | **Recommended** |
| deya-0x/ThreeJSMCP | 1 | 2026-01-11 | No | 6 doc lookup tools | **Use with caution** |
| locchung/three-js-mcp | 22 | 2025-03-23 | No | Unknown | **Avoid** |
| Flux159/mcp-game-asset-gen | 14 | 2025-12-06 | No | 10 asset gen tools | **Recommended (different use case)** |
| TonyBro/MCP_Game | 1 | 2025-06-25 | No | Unknown | **Avoid** |

---

## Recommended Installation Configs

### mcp-three (basementstudio) — Add to claude_desktop_config.json

```json
{
  "mcpServers": {
    "mcp-three": {
      "command": "npx",
      "args": ["mcp-three"]
    }
  }
}
```

No environment variables needed. Works on any machine with Node.js >= 20.

### ThreeJSMCP (deya-0x) — If you choose to include it

After cloning and building:

```json
{
  "mcpServers": {
    "threejs-docs": {
      "command": "node",
      "args": ["/Users/you/ThreeJSMCP/dist/index.js"]
    }
  }
}
```

Path must be updated per installation.

---

## Recommendation for Three.js Agent Integration

For a Three.js / R3F agent toolkit, integrate **mcp-three** (basementstudio) as the primary tool. It is the only server that:

1. Has a published npm package (installable via `npx`, no clone required)
2. Actively maintained with bug fixes post-launch
3. Wraps a well-tested ecosystem library (`gltfjsx`)
4. Has zero configuration requirements beyond the `npx` invocation
5. Solves a real gap: converting binary/JSON GLTF assets into agent-usable R3F code

If the agent also needs to generate new 3D assets from scratch, pair it with **mcp-game-asset-gen** (Flux159) for the full pipeline: generate 3D model → convert to R3F JSX.

Skip the doc lookup servers (ThreeJSMCP, locchung). Modern LLMs have Three.js in their training data and doc lookup tools add latency without meaningfully improving accuracy.

---

## Sources

- [basementstudio/mcp-three — GitHub](https://github.com/basementstudio/mcp-three)
- [mcp-three — npm registry](https://www.npmjs.com/package/mcp-three)
- [deya-0x/ThreeJSMCP — GitHub](https://github.com/deya-0x/ThreeJSMCP)
- [locchung/three-js-mcp — GitHub](https://github.com/locchung/three-js-mcp)
- [locchung/three-js-mcp — PulseMCP](https://www.pulsemcp.com/servers/locchung-three-js)
- [locchung/three-js-mcp — mcp.so](https://mcp.so/server/three-js-mcp/locchung)
- [Flux159/mcp-game-asset-gen — GitHub](https://github.com/Flux159/mcp-game-asset-gen)
- [TonyBro/MCP_Game — GitHub](https://github.com/TonyBro/MCP_Game)
- [mcp-three — LobeHub listing](https://lobehub.com/mcp/basementstudio-mcp-three)
- [Three.js MCP servers — Glama](https://glama.ai/mcp/servers/integrations/threejs)
- [three-js-mcp — Skywork deep dive article](https://skywork.ai/skypage/en/3d-worlds-ai-threejs-mcp-server/1980470680631943168)
- [buryhuang/mcp-server-threejs — Docker Hub](https://hub.docker.com/r/buryhuang/mcp-server-threejs)
