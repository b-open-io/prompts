---
name: threejs-r3f
version: 1.0.0
description: >-
  This skill should be used when building Three.js or React Three Fiber (R3F) projects,
  creating 3D scenes, animating meshes with useFrame, loading GLTF/GLB models, setting up physics with @react-three/rapier, using WebGPU with R3F,
  optimizing 3D performance, scaffolding Vite+R3F projects, or exporting R3F components.
  Covers scene setup, Drei helpers, asset pipeline, responsive canvas, and performance budgets.
metadata:
  tags: three.js, react-three-fiber, r3f, drei, 3d, webgl, webgpu
---

# Three.js / React Three Fiber

Guide for building 3D web experiences with R3F v9 (React 19) and the pmndrs ecosystem.

## Version Matrix

| Package | Version | React |
|---------|---------|-------|
| `@react-three/fiber` | v9.x | 19.x |
| `@react-three/drei` | v9.x+ | 19.x |
| `@react-three/rapier` | v2.x | 19.x |
| `three` | r171+ | — |

Use fiber v8 + rapier v1 for React 18 projects.

---

## Project Scaffolding

Two modes depending on the goal.

### Standalone Vite + R3F app

```bash
bun create vite my-scene -- --template react-ts
cd my-scene
bun add three @react-three/fiber @react-three/drei
bun add -d @types/three
bun dev
```

Add optional packages as needed:

```bash
bun add @react-three/rapier        # physics
bun add zustand                    # state
bun add leva                       # debug GUI
```

### Exportable R3F component (inside an existing project)

Install into an existing React 19 project without scaffolding a new app:

```bash
bun add three @react-three/fiber @react-three/drei
bun add -d @types/three
```

Import `Canvas` where needed. No entry-point changes required.

---

## Scene Setup

Minimal working scene with perspective camera, ambient + directional lighting, and orbit controls:

```tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function App() {
  return (
    <Canvas
      camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 2, 5] }}
      shadows="soft"
      dpr={[1, 2]}
      frameloop="always"
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <OrbitControls makeDefault />
      <mesh castShadow>
        <boxGeometry />
        <meshStandardMaterial color="hotpink" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#555" />
      </mesh>
    </Canvas>
  )
}
```

**Canvas defaults applied automatically:** `antialias: true`, `alpha: true`, `outputColorSpace = SRGBColorSpace`, `toneMapping = ACESFilmicToneMapping`, `ColorManagement.enabled = true`.

Key `frameloop` values: `"always"` (default), `"demand"` (render only on invalidate — use for static scenes), `"never"` (manual advance).

---

## Drei Helpers — Top 15

All import from `@react-three/drei`. Read `references/drei-helpers.md` for full inventory, props, and examples.

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

### gltfjsx CLI — Convert models to components

```bash
# Generate TypeScript component + Draco-compress the GLB
npx gltfjsx model.glb --transform --types --shadows

# Outputs:
#   model-transformed.glb  → move to /public
#   Model.tsx              → move to /src/components
```

`--transform` shrinks most models 70–90% via Draco geometry compression, 1024px texture resize, and WebP conversion.

Read `references/r3f-patterns.md` for clone pattern, KTX2 textures, lazy loading, and parallel preloading.

---

## Performance Rules

**Draw call budgets:**
- Mobile: < 100 draw calls
- Desktop: < 300 draw calls

**The 7 anti-patterns to avoid (with correct alternatives):**

1. Never `setState` inside `useFrame` — mutate refs directly
2. Always use `delta` for animation — never fixed increments
3. Never `setState` in `onPointerMove` — mutate refs directly
4. Never read reactive store state in `useFrame` — use `store.getState()` imperative form
5. Never conditionally mount/unmount in render loop — use `visible` prop instead
6. Never create `new THREE.Vector3()` inside `useFrame` — allocate outside, reuse with `.set()`
7. Never create duplicate geometries/materials for identical meshes — share via `useMemo` or `Instances`

**Disposal:** Always call `geometry.dispose()` and `material.dispose()` in `useEffect` cleanup for dynamically created Three.js objects.

Read `references/performance.md` for the full guide with wrong/correct code pairs, texture optimization (KTX2 > WebP > PNG), frustum culling, stats tooling, and mobile-specific rules.

---

## Physics Quick Start

`@react-three/rapier` requires Suspense because it loads WASM lazily.

```tsx
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody } from '@react-three/rapier'

function Scene() {
  return (
    <Canvas>
      <Suspense>
        <Physics gravity={[0, -9.81, 0]}>
          {/* Falling ball */}
          <RigidBody type="dynamic" restitution={0.5}>
            <mesh castShadow>
              <sphereGeometry />
              <meshStandardMaterial color="orange" />
            </mesh>
          </RigidBody>

          {/* Static floor */}
          <RigidBody type="fixed">
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[20, 20]} />
              <meshStandardMaterial color="#888" />
            </mesh>
          </RigidBody>
        </Physics>
      </Suspense>
    </Canvas>
  )
}
```

Add `debug` prop to `<Physics>` to show collider wireframes during development.

RigidBody types: `"dynamic"` (default), `"fixed"`, `"kinematicPosition"`, `"kinematicVelocity"`.

Read `references/physics.md` for all collider types, collision events, sensors, all 6 joint hooks (Fixed, Spherical, Revolute, Prismatic, Rope, Spring), forces/impulses API, and `InstancedRigidBodies` for mass physics.

---

## State Management

For game state or shared 3D state, use zustand. The key pattern: read store imperatively inside `useFrame` to avoid triggering re-renders at 60 fps.

```tsx
import { create } from 'zustand'

const useGameStore = create((set) => ({
  score: 0,
  addScore: (n) => set((s) => ({ score: s.score + n })),
}))

// In a useFrame callback — imperative, no re-render
useFrame(() => {
  const { score } = useGameStore.getState()
  // drive 3D logic with score
})
```

---

## Debug GUI

Add `leva` for live parameter tweaking during development:

```tsx
import { useControls, Leva } from 'leva'

function DebugMesh() {
  const { color, scale } = useControls({ color: '#ff0080', scale: { value: 1, min: 0.1, max: 3 } })
  return <mesh scale={scale}><boxGeometry /><meshStandardMaterial color={color} /></mesh>
}

// Hide in production
<Leva hidden={process.env.NODE_ENV === 'production'} />
```

---

## WebGPU (Three.js r171+)

WebGPU is production-ready as of r171 (September 2025). Safari 26 added WebGPU, enabling universal deployment with automatic WebGL 2 fallback.

```tsx
import * as THREE from 'three/webgpu'
import { Canvas, extend } from '@react-three/fiber'
import type { ThreeToJSXElements } from '@react-three/fiber'

declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

extend(THREE as any)

<Canvas
  gl={async (props) => {
    const renderer = new THREE.WebGPURenderer(props as any)
    await renderer.init()
    return renderer
  }}
>
```

Note: `RawShaderMaterial` GLSL does not work in WebGPU. Use TSL (`three/tsl`) for cross-renderer shaders.

---

## Reference Files

- **`references/r3f-patterns.md`** — Canvas props, useFrame, useThree, event system, scroll-driven scenes, zustand imperative pattern, GLTF clone pattern, KTX2 textures, lazy loading, parallel preloading
- **`references/drei-helpers.md`** — Full Drei inventory by category: every helper with import, key props, and working example
- **`references/performance.md`** — All 7 anti-patterns with wrong/correct code, draw call budgets, instancing, LOD, texture compression, disposal checklist, frustum culling, r3f-perf, mobile rules
- **`references/physics.md`** — Full Rapier v2 reference: all collider types, MeshCollider, collision events, contact forces, sensors, all 6 joints, forces/impulses, InstancedRigidBodies
