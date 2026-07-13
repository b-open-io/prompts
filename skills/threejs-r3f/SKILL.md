---
name: threejs-r3f
version: 1.0.1
description: >-
  This skill should be used when the user asks to "build a Three.js scene",
  "set up React Three Fiber", "animate a mesh with useFrame",
  "load a GLTF or GLB model", or "add physics with react-three/rapier". Covers
  scene setup, Drei helpers, the asset pipeline, responsive canvas, and
  performance budgets for Three.js and React Three Fiber projects.
metadata:
  tags:
    - three.js
    - react-three-fiber
    - r3f
    - drei
    - 3d
    - webgl
    - webgpu
---

# Three.js / React Three Fiber

Guide for building 3D web experiences with R3F v9 (React 19) and the pmndrs ecosystem.

## Version Constraints

| Package | Version | React |
|---------|---------|-------|
| `@react-three/fiber` | v9.x | 19.x |
| `@react-three/drei` | v9.x+ | 19.x |
| `@react-three/rapier` | v2.x | 19.x |
| `three` | r171+ | — |

Use fiber v8 + rapier v1 for React 18 projects. Never mix version lines.

---

## Installation

### Standalone Vite + R3F app

```bash
bun create vite my-scene -- --template react-ts
cd my-scene
bun add three @react-three/fiber @react-three/drei
bun add -d @types/three
bun dev
```

### Into an existing React 19 project

```bash
bun add three @react-three/fiber @react-three/drei
bun add -d @types/three
```

Optional packages: `bun add @react-three/rapier` (physics), `bun add zustand` (state), `bun add leva` (debug GUI).

---

## Scene Setup

For the minimal scene template, Canvas prop table, frameloop values, responsive canvas, and WebGPU renderer bootstrap, read **`references/scene-setup.md`**.

Key facts to keep in mind without reading the reference:
- `Canvas` defaults: `antialias: true`, `outputColorSpace = SRGBColorSpace`, `toneMapping = ACESFilmicToneMapping`, `ColorManagement.enabled = true`
- Always set `dpr={[1, 2]}` to clamp device pixel ratio
- Use `shadows="soft"` for shadow maps; add `castShadow`/`receiveShadow` to meshes
- `frameloop="demand"` for static scenes that only need to re-render on interaction

---

## Drei Helpers — Top 15

All import from `@react-three/drei`. Read **`references/drei-helpers.md`** for full inventory, props, and examples.

**Controls**
- `OrbitControls` — rotate/zoom/pan; add `makeDefault` to expose via `useThree`
- `ScrollControls` — scroll-driven scenes; pair with `useScroll` inside `useFrame`
- `PresentationControls` — spring-animated drag; no OrbitControls needed
- `KeyboardControls` — typed key state context; read imperatively via `get()` in `useFrame`

**Staging**
- `Environment` — IBL from preset (`'sunset' | 'warehouse' | 'city' | ...`) or custom HDR
- `Stage` — one-component scene staging: lighting, camera fit, shadows
- `ContactShadows` — fake soft shadow on a plane; cheaper than shadow maps
- `Float` — floating/bobbing idle animation for hero objects

**Shapes / Content**
- `Text` — SDF 3D text with font loading, line wrapping, outlines
- `Html` — embed DOM content in 3D; supports `occlude` and `transform`

**Loaders**
- `useGLTF` — load and cache GLTF/GLB; auto-configures Draco CDN decoder
- `useTexture` — load and cache textures; object form for PBR maps

**Performance**
- `Instances` / `Instance` — instanced meshes with simple component API
- `Detailed` — LOD: show different meshes by camera distance
- `PerformanceMonitor` — FPS callbacks; pair with `AdaptiveDpr`

**Materials**
- `MeshTransmissionMaterial` — physically-based glass with refraction and chromatic aberration

---

## Asset Pipeline

### GLTF Loading

```tsx
import { useGLTF } from '@react-three/drei'
import { Suspense } from 'react'

function Model(props) {
  const { nodes, materials } = useGLTF('/model.glb')
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Body.geometry} material={materials.Metal} castShadow />
    </group>
  )
}

useGLTF.preload('/model.glb')

// Wrap in Suspense
<Canvas>
  <Suspense fallback={null}>
    <Model />
  </Suspense>
</Canvas>
```

### gltfjsx CLI

```bash
# Generate TypeScript component + Draco-compress the GLB
npx gltfjsx model.glb --transform --types --shadows
# Outputs: model-transformed.glb (move to /public) + Model.tsx (move to /src/components)
```

`--transform` shrinks most models 70–90% via Draco geometry compression, 1024px texture resize, and WebP conversion.

For clone pattern, KTX2 textures, lazy loading, and parallel preloading, read **`references/r3f-patterns.md`**.

---

## Performance Rules

**Draw call budgets:**
- Mobile: < 100 draw calls
- Desktop: < 300 draw calls

**The 7 anti-patterns — never do these:**

1. Never `setState` inside `useFrame` — mutate refs directly
2. Always use `delta` for animation — never fixed increments
3. Never `setState` in `onPointerMove` — mutate refs directly
4. Never read reactive store state in `useFrame` — use `store.getState()` imperative form
5. Never conditionally mount/unmount in render loop — use `visible` prop instead
6. Never create `new THREE.Vector3()` inside `useFrame` — allocate outside, reuse with `.set()`
7. Never create duplicate geometries/materials for identical meshes — share via `useMemo` or `Instances`

**Disposal:** Always call `geometry.dispose()` and `material.dispose()` in `useEffect` cleanup for dynamically created Three.js objects.

Read **`references/performance.md`** for all 7 anti-patterns with wrong/correct code pairs, texture optimization, frustum culling, stats tooling, and mobile rules.

---

## State, Physics, Debug GUI, and WebGPU

For these topics, read **`references/extras.md`**:
- Zustand imperative pattern (required for `useFrame` correctness)
- Leva debug GUI setup
- Rapier physics quick start
- WebGPU renderer bootstrap

For the full Rapier v2 API (all collider types, collision events, sensors, joints, forces, `InstancedRigidBodies`), read **`references/physics.md`**.

---

## Reference Files

- **`references/scene-setup.md`** — Minimal scene template, Canvas defaults, frameloop, responsive canvas, WebGPU renderer
- **`references/r3f-patterns.md`** — Canvas props, `useFrame`, `useThree`, event system, scroll-driven scenes, GLTF clone pattern, KTX2, lazy loading
- **`references/drei-helpers.md`** — Full Drei inventory by category: every helper with import, key props, and example
- **`references/performance.md`** — All 7 anti-patterns with wrong/correct code, instancing, LOD, texture compression, disposal checklist, mobile rules
- **`references/physics.md`** — Full Rapier v2: colliders, collision events, sensors, 6 joints, forces/impulses, InstancedRigidBodies
- **`references/extras.md`** — Zustand imperative pattern, Leva debug GUI, Rapier quick start, WebGPU bootstrap
