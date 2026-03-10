# R3F Patterns Reference

Core API patterns for React Three Fiber v9.

---

## Canvas Configuration

Full Canvas prop table:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `gl` | `object \| (defaults) => Renderer \| Promise<Renderer>` | `{}` | WebGLRenderer props or async factory (use factory for WebGPU) |
| `camera` | `object \| THREE.Camera` | `{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 5] }` | Perspective camera defaults or a custom camera instance |
| `shadows` | `boolean \| 'basic' \| 'percentage' \| 'soft' \| 'variance'` | `false` | Shadow maps. `true` → PCFSoft |
| `frameloop` | `'always' \| 'demand' \| 'never'` | `'always'` | `demand` renders only on `invalidate()`; `never` requires `advance()` |
| `dpr` | `number \| [min, max]` | `[1, 2]` | Device pixel ratio — array form clamps automatically |
| `orthographic` | `boolean` | `false` | Use OrthographicCamera |
| `flat` | `boolean` | `false` | Disable ACESFilmic tone mapping |
| `legacy` | `boolean` | `false` | Disable ColorManagement (not recommended) |
| `eventPrefix` | `'offset' \| 'client' \| 'page' \| 'layer' \| 'screen'` | `'offset'` | Coordinate source for pointer events |
| `onCreated` | `(state) => void` | — | Fires after first render |
| `onPointerMissed` | `(event) => void` | — | Fires on click that hits no mesh |

**Canvas defaults applied automatically:**
- `antialias: true`, `alpha: true`, `powerPreference: "high-performance"`
- `outputColorSpace = THREE.SRGBColorSpace`
- `toneMapping = THREE.ACESFilmicToneMapping`
- `THREE.ColorManagement.enabled = true`

---

## useFrame

Per-component render loop. Executes a callback every frame.

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

function RotatingBox() {
  const meshRef = useRef<Mesh>(null)

  useFrame((state, delta) => {
    // state: { gl, scene, camera, clock, pointer, viewport, ... }
    // delta: seconds since last frame — always use delta for frame-rate independence
    if (meshRef.current) {
      meshRef.current.rotation.y += delta
    }
  })

  return <mesh ref={meshRef}><boxGeometry /></mesh>
}
```

**Priority / render control:**
- Default priority `0` — R3F renders automatically
- Positive priority — disables auto-render; you must call `gl.render(scene, camera)` manually. Higher priority executes last. Use for postprocessing.
- Negative priority — orders callbacks without taking over the render loop. Lowest (most negative) executes first.

```tsx
// Takes over the render loop
function Composer() {
  useFrame(({ gl, scene, camera }) => {
    gl.render(scene, camera)
  }, 1)
  return null
}

// Runs before the frame without taking over
function EarlyUpdate() {
  useFrame(() => { /* first */ }, -2)
  return null
}
```

**Never `setState` inside `useFrame`.** Mutate refs directly.

---

## useThree

Access the R3F state model: renderer, scene, camera, viewport, etc.

```tsx
import { useThree } from '@react-three/fiber'

function Inspector() {
  // Selector — re-renders only when selected value changes
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)

  // Non-reactive — read state imperatively from event handlers or useFrame
  const get = useThree((state) => state.get)
  const freshState = get()

  return null
}
```

**State properties:**

| Property | Type | Description |
|----------|------|-------------|
| `gl` | `THREE.WebGLRenderer` | The renderer |
| `scene` | `THREE.Scene` | Root scene |
| `camera` | `THREE.PerspectiveCamera` | Active camera |
| `pointer` | `THREE.Vector2` | Normalized, centered pointer (-1 to 1) |
| `clock` | `THREE.Clock` | Running clock |
| `viewport` | `{ width, height, dpr, factor, aspect, getCurrentViewport }` | Canvas in Three.js units |
| `size` | `{ width, height, top, left }` | Canvas in pixels |
| `performance` | `{ current, min, max, regress: () => void }` | Adaptive performance |
| `invalidate` | `() => void` | Request a frame (demand mode) |
| `set` | `(state) => void` | Update state |
| `get` | `() => RootState` | Read state non-reactively |
| `controls` | `any` | Default controls (when `makeDefault` is set) |

**Reactivity caveat:** Three.js internals deeper than the state object do not trigger re-renders.

```tsx
// Reactive — re-renders when camera is swapped
const camera = useThree((state) => state.camera)

// Not reactive — zoom change does NOT trigger re-render
const zoom = useThree((state) => state.camera.zoom)
```

---

## useLoader

Low-level loader hook. Use when a specific loader type is needed that Drei doesn't wrap.

```tsx
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { TextureLoader } from 'three'

// Basic usage — result is cached by URL automatically
const gltf = useLoader(GLTFLoader, '/model.glb')

// Single texture via TextureLoader
const texture = useLoader(TextureLoader, '/texture.jpg')

// v9 change: accepts loader instances directly, not loader classes in some paths
// Extension callback — configure the loader before it runs (e.g. Draco, KTX2)
const gltf = useLoader(GLTFLoader, '/model.glb', (loader) => {
  loader.setDRACOLoader(dracoLoader)
})

// KTX2 extension callback
const gltf = useLoader(GLTFLoader, '/model.glb', (loader) => {
  const ktx2Loader = new KTX2Loader()
  ktx2Loader.setTranscoderPath('/basis/')
  ktx2Loader.detectSupport(gl)
  loader.setKTX2Loader(ktx2Loader)
})

// Preload — triggers the load before the component mounts
useLoader.preload(GLTFLoader, '/model.glb')

// Array form — load multiple assets in parallel, returns array
const [modelA, modelB] = useLoader(GLTFLoader, ['/a.glb', '/b.glb'])
```

**Caching:** Results are cached by URL. Calling `useLoader` twice with the same URL and loader class returns the cached result with no additional network request.

**Prefer Drei wrappers** (`useGLTF`, `useTexture`) when available — they add Draco auto-configuration, preload helpers, and a cleaner API. Use `useLoader` directly for loaders that have no Drei counterpart.

---

## Event System

R3F implements raycast-based pointer events mirroring DOM events.

```tsx
<mesh
  onClick={(e) => {}}
  onContextMenu={(e) => {}}
  onDoubleClick={(e) => {}}
  onPointerUp={(e) => {}}
  onPointerDown={(e) => {}}
  onPointerOver={(e) => { e.stopPropagation() }} // block meshes behind
  onPointerOut={(e) => {}}
  onPointerMove={(e) => {}}
  onPointerMissed={() => {}} // fires when pointer clicks miss this mesh
/>
```

**Event propagation:** Hits all intersected objects nearest-first, then bubbles through ancestors. Unlike the DOM, multiple objects can receive the same event. Use `e.stopPropagation()` to block.

**Pointer capture pattern:**

```tsx
<mesh
  onPointerDown={(e) => {
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
  }}
  onPointerUp={(e) => {
    e.stopPropagation()
    e.target.releasePointerCapture(e.pointerId)
  }}
/>
```

**Canvas-level miss handler:**

```tsx
<Canvas onPointerMissed={(event) => console.log('clicked empty space')}>
```

---

## Scroll-Driven Scenes

Use `ScrollControls` from Drei to tie scroll position to 3D animation.

```tsx
import { ScrollControls, Scroll, useScroll } from '@react-three/drei'

<Canvas>
  <ScrollControls pages={3} damping={0.1}>
    {/* 3D content driven by scroll */}
    <Scroll>
      <AnimatedModel />
    </Scroll>
    {/* HTML overlay */}
    <Scroll html>
      <div style={{ position: 'absolute', top: '100vh' }}>Page 2 content</div>
    </Scroll>
  </ScrollControls>
</Canvas>

function AnimatedModel() {
  const scroll = useScroll()
  useFrame(() => {
    // scroll.offset: 0–1 normalized scroll position
    // scroll.delta: per-frame scroll delta
    const t = scroll.offset
    meshRef.current.rotation.y = t * Math.PI * 2
  })
  return <mesh ref={meshRef}><boxGeometry /></mesh>
}
```

Key props: `pages` (scroll length multiplier), `damping` (scroll inertia 0–1), `horizontal`, `infinite`.

---

## Zustand — Imperative Pattern

Reading state inside `useFrame` without triggering re-renders.

```tsx
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

const useGameStore = create((set) => ({
  score: 0,
  lives: 3,
  addScore: (n) => set((s) => ({ score: s.score + n })),
  loseLife: () => set((s) => ({ lives: s.lives - 1 })),
}))

// Reactive — re-renders on score change
function HUD() {
  const score = useGameStore((s) => s.score)
  return <div>{score}</div>
}

// Multiple slices — re-renders only when score OR lives changes
function StatusBar() {
  const { score, lives } = useGameStore(
    useShallow((s) => ({ score: s.score, lives: s.lives }))
  )
  return <div>{score} / {lives}</div>
}

// Imperative — no re-render — safe in useFrame
function SpeedBoost() {
  useFrame(() => {
    const { score } = useGameStore.getState()
    speedRef.current = Math.min(score * 0.01, 2)
  })
  return null
}

// Outside React — for audio, analytics, side effects
const unsub = useGameStore.subscribe(
  (state) => state.lives,
  (lives) => { if (lives === 0) gameOver() }
)
```

---

## GLTF Clone Pattern

`<primitive object={scene} />` can only mount a scene once. To place the same model at multiple positions:

```tsx
import { useGLTF, Clone } from '@react-three/drei'

function Tree() {
  const { scene } = useGLTF('/tree.glb')
  return <Clone object={scene} />
}

// Render 50 trees
{positions.map((pos, i) => (
  <Tree key={i} position={pos} />
))}
```

Alternatively, use `gltfjsx` to generate a component with explicit `geometry`/`material` references — those can be re-used without cloning.

---

## KTX2 Textures

KTX2 with Basis Universal is the highest-quality texture compression format.

```tsx
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module'
import { useThree, useLoader } from '@react-three/fiber'

function KTX2Model() {
  const { gl } = useThree()
  const gltf = useLoader(GLTFLoader, '/model.glb', (loader) => {
    const ktx2Loader = new KTX2Loader()
    ktx2Loader.setTranscoderPath('/basis/')
    ktx2Loader.detectSupport(gl)
    loader.setKTX2Loader(ktx2Loader)
    loader.setMeshoptDecoder(MeshoptDecoder)
  })
  return <primitive object={gltf.scene} />
}
```

Copy basis transcoder to `/public/basis/` from `node_modules/three/examples/jsm/libs/basis/`.

---

## Lazy Loading (on demand)

Defer model loading until the object is in view:

```tsx
import { useInView } from '@react-three/drei'
import { Suspense, useRef } from 'react'

function LazyModel() {
  const ref = useRef()
  const inView = useInView(ref)

  return (
    <group ref={ref}>
      {inView && (
        <Suspense fallback={null}>
          <Model />
        </Suspense>
      )}
    </group>
  )
}
```

---

## Parallel Preloading

Preload multiple models at route/page entry before components mount:

```tsx
// At module scope — runs immediately
useGLTF.preload('/models/character.glb')
useGLTF.preload('/models/environment.glb')
useGLTF.preload('/models/props.glb')
```

---

## v9 Type Migration

```tsx
// v8
import type { MeshProps } from '@react-three/fiber'

// v9
import type { ThreeElements } from '@react-three/fiber'
type MyMeshProps = ThreeElements['mesh']
```

```tsx
// v8 type extension
import { Object3DNode } from '@react-three/fiber'
declare module '@react-three/fiber' {
  interface ThreeElements {
    myObject: Object3DNode<MyObject, typeof MyObject>
  }
}

// v9
import { ThreeElement } from '@react-three/fiber'
declare module '@react-three/fiber' {
  interface ThreeElements {
    myObject: ThreeElement<typeof MyObject>
  }
}
```

v9 color space change — for custom materials, annotate color textures explicitly:

```tsx
// v9 — color textures must be annotated when used in custom materials
texture.colorSpace = THREE.SRGBColorSpace
// Data textures (normal, displacement) — do NOT annotate
```

---

## TSL (Three Shader Language)

Brief overview for R3F. See the dedicated `shaders` skill for the complete TSL API and patterns.

```tsx
import { extend } from '@react-three/fiber'
import * as THREE from 'three/webgpu'
import { color, float, mx_noise_float, positionWorld, time, mix } from 'three/tsl'

// NodeMaterial slots are set as JSX props
function NoiseMesh() {
  const noiseColor = mix(
    color(0x1a0533),
    color(0x00eaff),
    mx_noise_float(positionWorld.mul(2.0).add(time.mul(0.3)))
  )

  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardNodeMaterial colorNode={noiseColor} roughnessNode={float(0.4)} />
    </mesh>
  )
}
```

**Renderer requirement:** The Canvas `gl` prop must use `WebGPURenderer` from `three/webgpu` (see the WebGPU section in the main SKILL.md). TSL compiles to GLSL when WebGPU is unavailable, so it works on all browsers.

**Key benefit:** `RawShaderMaterial` GLSL does not work in WebGPU mode. TSL is the cross-renderer path for custom shaders.

For the full TSL API — all node types, uniforms, noise, control flow, varyings, GLSL migration — read `references/tsl-guide.md` in the `shaders` skill.
