---
name: shaders
version: 1.0.0
description: >-
  This skill should be used when writing custom shaders for Three.js, creating visual
  effects with GLSL or TSL (Three Shader Language) for WebGL and WebGPU, debugging shader issues, building
  post-processing pipelines, implementing noise functions, procedural textures, or
  custom materials. Covers shader workflow, TSL node system, GLSL patterns, debugging,
  performance optimization, and post-processing with pmndrs/postprocessing.
metadata:
  tags: shaders, glsl, tsl, webgl, webgpu, postprocessing, three.js
---

# Three.js Shader Development

Custom shaders for Three.js — from simple material overrides to full WebGPU node graphs. Covers the complete workflow: choosing an approach, writing code, debugging, and shipping.

## When to Use This Skill

- Custom materials that go beyond built-in Three.js materials
- Visual effects: noise, dissolve, Fresnel, hologram, water, cel shading, chromatic aberration
- Post-processing pipelines with pmndrs/postprocessing
- Procedural textures and geometry displacement
- Raymarching and SDF-based scenes
- Porting GLSL shaders into TSL for WebGPU compatibility

## TSL vs GLSL — Choose Before Writing Anything

| | TSL (Three Shader Language) | GLSL (ShaderMaterial) |
|---|---|---|
| **WebGPU** | Yes (compiles to WGSL automatically) | No |
| **WebGL fallback** | Yes (automatic) | Yes |
| **Syntax** | JavaScript / node graph | Raw GLSL strings |
| **Built-in uniforms** | Auto-inferred | Manual declarations |
| **Best for** | New projects, r163+, R3F | Legacy code, full manual control |

**Default choice: TSL.** Production-ready since r163. Use GLSL only when targeting legacy environments or when `RawShaderMaterial` manual control is specifically required.

Read `references/tsl-guide.md` for the full TSL API including all node types, built-ins, control flow, and material setup.

## TSL Quick Start (R3F)

```jsx
import { extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { color, float, time, mix, mx_noise_float, positionWorld, uniform } from 'three/tsl';

function NoiseSphere() {
  const noiseUniform = uniform(0);

  useFrame(({ clock }) => {
    noiseUniform.value = clock.elapsedTime;
  });

  const noise = mx_noise_float(positionWorld.mul(1.5).add(time.mul(0.3)));
  const dynamicColor = mix(color(0x1a0533), color(0x00eaff), noise);

  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardNodeMaterial
        colorNode={dynamicColor}
        roughnessNode={float(0.4)}
      />
    </mesh>
  );
}
```

**Renderer requirement:** `WebGPURenderer` from `three/webgpu` — it automatically falls back to WebGL2 when WebGPU is unavailable. Import materials from `three/webgpu`, nodes from `three/tsl`.

## GLSL Quick Start (R3F)

```jsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float n = sin(vUv.x * 10.0 + uTime) * 0.5 + 0.5;
    gl_FragColor = vec4(uColor * n, 1.0);
  }
`;

function ShaderMesh() {
  const matRef = useRef();
  const uniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uColor: { value: new THREE.Color(0x00aaff) }
  }), []);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={matRef} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  );
}
```

**Memoize uniforms** with `useMemo` — without it, a new object is created every render and the material recompiles. Update `.uniforms.uTime.value` inside `useFrame`, never the object reference.

Read `references/glsl-patterns.md` for complete recipes: noise, Fresnel, dissolve, hologram, water, matcap, toon shading, particles, and more.

## Debugging Shaders

Shader errors are silent: the mesh renders black, pink, or nothing. Debug systematically:

### Visual debugging (most effective)

Output intermediate values as colors to inspect them directly:

```glsl
// Is my UV correct?
gl_FragColor = vec4(vUv, 0.0, 1.0);

// Is my normal correct?
gl_FragColor = vec4(normalize(vNormal) * 0.5 + 0.5, 1.0);

// Is my noise in range?
gl_FragColor = vec4(vec3(noiseValue), 1.0);
```

In TSL, assign any node directly to `colorNode`:

```javascript
material.colorNode = normalWorld.mul(0.5).add(0.5);  // visualize normals
material.colorNode = positionLocal;                    // visualize position
```

### Common failure patterns

| Symptom | Likely cause |
|---|---|
| Solid black | Missing lights, normals inverted, or NaN from division by zero |
| Pink / magenta | Texture not loaded, sampler2D binding missing |
| Flickering | Uniform not updated every frame, or `uniformsNeedUpdate` needed |
| No visible change | Wrong material reference, or effect not connected to `colorNode` |
| NaN propagation | Division by zero, `sqrt` of negative, `atan` of zero vector — check all math |

### Tools

- **Spector.js** (browser extension): captures WebGL draw calls and shader state
- **Chrome GPU profiler** (`chrome://tracing`): GPU timeline and overdraw analysis
- **Three.js `renderer.info`**: draw calls, triangles, textures in flight

## Performance Rules

Apply these unconditionally on every shader:

1. **Avoid dynamic branching in fragment shaders** — `if/else` on GPU creates divergent execution across warps. Prefer `step()`, `mix()`, or `select()` (TSL).
2. **Precompute in vertex shader** — values constant across a triangle (world position, normal transforms) belong in the vertex stage, not the fragment.
3. **Minimize texture lookups** — each `texture2D` / `texture()` call is a memory fetch. Cache results in a variable; never sample the same texture twice.
4. **Use `mediump` where possible** — in fragment shaders, declare `precision mediump float;` unless high precision is required. Saves bandwidth on mobile GPUs.
5. **Limit overdraw** — transparent materials with complex fragment shaders on overlapping geometry are multiplicatively expensive. Use `depthWrite: true` where possible.
6. **Noise is expensive** — FBM with 6+ octaves can cost 5–10ms per frame. Profile before adding octaves.

## Post-Processing

Install pmndrs/postprocessing:

```bash
bun add postprocessing              # vanilla
bun add @react-three/postprocessing # R3F wrapper
```

**Effect ordering** (wrong order produces incorrect results):

```
1. SSAO           → needs depth buffer, must come first
2. DepthOfField   → needs depth, before color grading
3. Bloom          → operates on HDR scene before tone mapping
4. ToneMapping    → converts HDR → LDR; must follow Bloom
5. ChromaticAberration → full-screen warp, near end
6. Vignette       → full-screen overlay
7. Noise          → full-screen overlay, last
```

**Performance cost at a glance:**

| Effect | Cost |
|---|---|
| ChromaticAberration, Vignette, Noise, ToneMapping | Very Low |
| Bloom (no mipmapBlur), SMAA, GodRays | Low–Medium |
| SSAO, DepthOfField, Bloom (mipmapBlur) | Medium–High |

**Mobile:** Skip SSAO and DepthOfField entirely. Use Bloom without `mipmapBlur`. Keep Vignette + Noise for polish at near-zero cost.

**One EffectPass merges multiple effects into one draw call** — always prefer `<EffectPass camera={...} effects={[bloom, smaa, toneMap]} />` over separate passes.

Read `references/postprocessing.md` for full R3F setup, all effect parameters, custom effect authoring, and the selective bloom pattern.

## Reference Files

- **`references/tsl-guide.md`** — Complete TSL API: node types, uniforms, built-ins, control flow, varyings, NodeMaterial setup, GLSL→TSL migration
- **`references/glsl-patterns.md`** — Common GLSL shader recipes with complete vertex + fragment code
- **`references/postprocessing.md`** — Full pmndrs/postprocessing guide: R3F setup, all effects, custom effect authoring
