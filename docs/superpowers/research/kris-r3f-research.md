# React Three Fiber (R3F) Ecosystem — Research Reference

**Compiled:** 2026-03-10
**Purpose:** Verified, current API patterns for building 3D web experiences with R3F. Every pattern traces to a primary source.

---

## Table of Contents

1. [R3F Core API](#1-r3f-core-api)
   - [Canvas Props](#canvas-props)
   - [useFrame](#useframe)
   - [useThree](#usethree)
   - [useLoader](#useloader)
   - [Events System](#events-system)
2. [Drei Helpers](#2-drei-helpers)
   - [Controls](#controls)
   - [Staging](#staging)
   - [Shapes & Content](#shapes--content)
   - [Loaders](#loaders)
   - [Performance](#performance)
   - [Materials & Abstractions](#materials--abstractions)
3. [@react-three/rapier](#3-react-threeraphier)
   - [Physics Component](#physics-component)
   - [RigidBody Types](#rigidbody-types)
   - [Collider Types](#collider-types)
   - [Collision Events](#collision-events)
   - [Sensors](#sensors)
   - [Joints](#joints)
   - [Forces & Impulses](#forces--impulses)
   - [Instanced Rigid Bodies](#instanced-rigid-bodies)
4. [Three.js Recent Changes (r160+)](#4-threejs-recent-changes-r160)
5. [pmndrs Ecosystem Tools](#5-pmndrs-ecosystem-tools)
   - [zustand](#zustand)
   - [leva](#leva)
   - [gltfjsx](#gltfjsx)
6. [Performance Pitfalls](#6-performance-pitfalls)
7. [GLTF Loading Patterns](#7-gltf-loading-patterns)
8. [Version Compatibility Matrix](#8-version-compatibility-matrix)

---

## 1. R3F Core API

**Source:** https://r3f.docs.pmnd.rs/
**Current version:** @react-three/fiber v9 (React 19 compatible). v8 remains for React 18.

### Canvas Props

The `Canvas` component is the entry point for all R3F scenes.

```tsx
import { Canvas } from '@react-three/fiber'

export default function App() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 5] }}
      shadows="soft"
      dpr={[1, 2]}
      frameloop="always"
      flat={false}
    >
      {/* scene */}
    </Canvas>
  )
}
```

**Full prop table:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | — | Three.js JSX elements |
| `fallback` | ReactNode | — | Shown when WebGL is not supported |
| `gl` | object \| `(defaults) => Renderer \| Promise<Renderer>` | `{}` | Props for `THREE.WebGLRenderer`, or a sync/async factory callback |
| `camera` | object \| `THREE.Camera` | `{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 5] }` | Props for the default camera, or a custom camera instance |
| `scene` | object \| `THREE.Scene` | `{}` | Props for the default scene |
| `shadows` | `boolean \| 'basic' \| 'percentage' \| 'soft' \| 'variance'` | `false` | Enable shadow maps. `true` → PCFSoft |
| `raycaster` | object | `{}` | Props for the default raycaster |
| `frameloop` | `'always' \| 'demand' \| 'never'` | `'always'` | Render mode. `demand` renders only on invalidate; `never` requires `advance()` |
| `resize` | object | `{ scroll: true, debounce: { scroll: 50, resize: 0 } }` | react-use-measure resize config |
| `orthographic` | boolean | `false` | Use `THREE.OrthographicCamera` instead of perspective |
| `dpr` | `number \| [min, max]` | `[1, 2]` | Device pixel ratio. Array form auto-clamps between min/max |
| `legacy` | boolean | `false` | Disable `THREE.ColorManagement` (not recommended for new projects) |
| `linear` | boolean | `false` | Disable automatic sRGB color space and gamma correction |
| `flat` | boolean | `false` | Use `THREE.NoToneMapping` instead of `THREE.ACESFilmicToneMapping` |
| `events` | function | `import { events } from '@react-three/fiber'` | Event manager factory as a function of state |
| `eventSource` | `HTMLElement \| RefObject<HTMLElement>` | `gl.domElement.parentNode` | DOM element to subscribe pointer events to |
| `eventPrefix` | `'offset' \| 'client' \| 'page' \| 'layer' \| 'screen'` | `'offset'` | Which coordinate to read from pointer events |
| `onCreated` | `(state) => void` | — | Callback fired after canvas render (before commit) |
| `onPointerMissed` | `(event) => void` | — | Fired when a pointer click misses all meshes |

**Canvas defaults (applied automatically):**
- Renderer: `antialias: true`, `alpha: true`, `powerPreference: "high-performance"`
- Renderer props: `outputColorSpace = THREE.SRGBColorSpace`, `toneMapping = THREE.ACESFilmicToneMapping`
- `THREE.ColorManagement.enabled = true`

**WebGPU support (v9, async gl prop):**

```tsx
import * as THREE from 'three/webgpu'
import { Canvas, extend } from '@react-three/fiber'
import type { ThreeToJSXElements } from '@react-three/fiber'

declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

extend(THREE as any)

export default function App() {
  return (
    <Canvas
      gl={async (props) => {
        const renderer = new THREE.WebGPURenderer(props as any)
        await renderer.init()
        return renderer
      }}
    >
      <mesh>
        <meshBasicNodeMaterial />
        <boxGeometry />
      </mesh>
    </Canvas>
  )
}
```

---

### useFrame

Executes a callback every rendered frame. Your per-component render loop.

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

function RotatingBox() {
  const meshRef = useRef<Mesh>(null)

  useFrame((state, delta) => {
    // state: same shape as useThree — gl, scene, camera, clock, etc.
    // delta: seconds elapsed since last frame (frame-rate independent!)
    if (meshRef.current) {
      meshRef.current.rotation.y += delta
    }
  })

  return <mesh ref={meshRef}><boxGeometry /></mesh>
}
```

**Signature:** `useFrame(callback: (state: RootState, delta: number, xrFrame?: XRFrame) => void, renderPriority?: number)`

**Priority / render control:**
- Default priority `0`: R3F renders automatically.
- Positive priority: disables automatic rendering. You must call `gl.render(scene, camera)` manually. Higher priorities execute last. Useful for postprocessing or multi-pass rendering.
- Negative priority: does not disable auto-rendering, but lets you order callbacks. Negative callbacks run before the render, lowest (most negative) first.

```tsx
// Takes over the render loop (priority > 0)
function Composer() {
  useFrame(({ gl, scene, camera }) => {
    gl.render(scene, camera)
  }, 1)
  return null
}

// Runs after all priority-1 callbacks
function HUD() {
  useFrame(({ gl }) => {
    // render HUD on top
    gl.render(hudScene, hudCamera)
  }, 2)
  return null
}

// Negative: order without taking over render loop
function EarlyUpdate() {
  useFrame(() => { /* runs first */ }, -2)
  return null
}
function LateUpdate() {
  useFrame(() => { /* runs second */ }, -1)
  return null
}
```

**Important:** Never call `setState` inside `useFrame`. Mutate refs directly instead.

---

### useThree

Access the R3F state model: renderer, scene, camera, viewport size, etc.

```tsx
import { useThree } from '@react-three/fiber'

function Inspector() {
  // Full state — re-renders on any state change
  const state = useThree()

  // Selector — only re-renders when selected value changes
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)

  // Non-reactive: read state from event handlers / imperative code
  const get = useThree((state) => state.get)
  const freshState = get()

  return null
}
```

**State properties:**

| Property | Type | Description |
|----------|------|-------------|
| `gl` | `THREE.WebGLRenderer` | The renderer |
| `scene` | `THREE.Scene` | The root scene |
| `camera` | `THREE.PerspectiveCamera` | The active camera |
| `raycaster` | `THREE.Raycaster` | Default raycaster |
| `pointer` | `THREE.Vector2` | Normalized, centered pointer coords (replaces deprecated `mouse`) |
| `clock` | `THREE.Clock` | Running system clock |
| `linear` | boolean | True when colorspace is linear |
| `flat` | boolean | True when tone mapping is disabled |
| `legacy` | boolean | True when ColorManagement is disabled |
| `frameloop` | `'always' \| 'demand' \| 'never'` | Current render mode |
| `performance` | `{ current, min, max, debounce, regress: () => void }` | Adaptive performance system |
| `size` | `{ width, height, top, left }` | Canvas size in pixels |
| `viewport` | `{ width, height, initialDpr, dpr, factor, distance, aspect, getCurrentViewport }` | Canvas viewport in Three.js units |
| `xr` | `{ connect, disconnect }` | WebXR interface |
| `set` | `(state) => void` | Update any state property |
| `get` | `() => RootState` | Get fresh state non-reactively |
| `invalidate` | `() => void` | Request a frame (when `frameloop === 'demand'`) |
| `advance` | `(timestamp, runGlobalEffects?) => void` | Advance one tick (when `frameloop === 'never'`) |
| `setSize` | `(w, h, top?, left?) => void` | Resize the canvas |
| `setDpr` | `(dpr) => void` | Set pixel ratio |
| `setFrameloop` | `(frameloop) => void` | Change render mode |
| `events` | `{ connected, handlers, connect, disconnect }` | Pointer event management |

**Reactivity caveat:** Reactivity does not include Three.js internals deeper than the state object.

```tsx
// Reactive — re-renders when camera is swapped
const camera = useThree((state) => state.camera)

// Not reactive — Three.js internals change without R3F knowing
const zoom = useThree((state) => state.camera.zoom) // does NOT re-render on zoom change
```

**Swapping the default camera:**

```tsx
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

function OrthoCamera() {
  const set = useThree((state) => state.set)
  useEffect(() => {
    set({ camera: new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000) })
  }, [set])
  return null
}
```

---

### useLoader

Load assets with automatic caching and Suspense integration.

```tsx
import { Suspense } from 'react'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { TextureLoader } from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

// Single asset
function Model() {
  const result = useLoader(GLTFLoader, '/model.glb')
  return <primitive object={result.scene} />
}

// Multiple assets in parallel
function MultiTexture() {
  const [baseMap, normalMap] = useLoader(TextureLoader, ['/base.jpg', '/normal.jpg'])
  return (
    <mesh>
      <meshStandardMaterial map={baseMap} normalMap={normalMap} />
    </mesh>
  )
}

// With loader extensions (e.g., Draco compression)
function DracoModel() {
  const gltf = useLoader(GLTFLoader, '/compressed.glb', (loader) => {
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/')
    loader.setDRACOLoader(dracoLoader)
  })
  return <primitive object={gltf.scene} />
}

// Preload outside component tree (call in module scope or useEffect)
useLoader.preload(GLTFLoader, '/model.glb')

// Wrap consumers in Suspense
function App() {
  return (
    <Canvas>
      <Suspense fallback={null}>
        <Model />
      </Suspense>
    </Canvas>
  )
}
```

**Automatic graph extraction:** When the loaded result has a `.scene` property (GLTF etc.), `useLoader` automatically extracts `{ nodes, materials }`:

```tsx
const { nodes, materials } = useLoader(GLTFLoader, '/model.glb')
// nodes.MyMesh → THREE.Mesh
// materials.Metal → THREE.MeshStandardMaterial
```

**v9 change:** `useLoader` now accepts a loader instance directly, enabling controlled pooling:

```tsx
const loader = new GLTFLoader()
const gltf = useLoader(loader, '/model.glb')
```

---

### Events System

R3F implements a 3D raycast-based event system that mirrors DOM pointer events.

**All supported events:**

```tsx
<mesh
  onClick={(e) => {}}
  onContextMenu={(e) => {}}
  onDoubleClick={(e) => {}}
  onWheel={(e) => {}}
  onPointerUp={(e) => {}}
  onPointerDown={(e) => {}}
  onPointerOver={(e) => {}}
  onPointerOut={(e) => {}}
  onPointerEnter={(e) => {}} // same behavior as pointerover
  onPointerLeave={(e) => {}} // same behavior as pointerout
  onPointerMove={(e) => {}}
  onPointerMissed={() => {}} // fires when pointer clicks miss this mesh
  onUpdate={(self) => {}}    // fires when props change (self = the mesh)
/>
```

**Event object shape:**

```tsx
interface R3FEvent extends THREE.Intersection {
  // All original DOM event data
  nativeEvent: PointerEvent | MouseEvent | WheelEvent
  // All Three.js intersection data (object, point, face, uv, distance, etc.)
  intersections: THREE.Intersection[]  // first intersection of each intersected object
  object: THREE.Object3D               // the object that was actually hit
  eventObject: THREE.Object3D          // the object that registered the handler
  unprojectedPoint: THREE.Vector3      // camera-unprojected 3D point
  ray: THREE.Ray                       // the ray used for raycasting
  camera: THREE.Camera                 // camera used for raycasting
  delta: number                        // pixels between pointerdown and pointerup
  // Standard DOM methods:
  stopPropagation: () => void
  target: EventTarget & {
    setPointerCapture: (id: number) => void
    releasePointerCapture: (id: number) => void
  }
}
```

**Propagation:** Events hit all intersected objects, nearest first, then bubble up through ancestors — unlike the DOM where only one element receives the hit. Use `e.stopPropagation()` to block farther objects.

```tsx
// Block events from reaching objects behind this one
<mesh onPointerOver={(e) => { e.stopPropagation() }}>
```

**Pointer capture:**

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

**Raycast on camera move (no user interaction):**

```tsx
function RaycastWhenCameraMoves() {
  const matrix = new THREE.Matrix4()
  useFrame((state) => {
    if (!matrix.equals(state.camera.matrixWorld)) {
      state.events.update() // triggers onPointerMove with last-known coords
      matrix.copy(state.camera.matrixWorld)
    }
  })
  return null
}
```

**Custom event manager (advanced):**

```tsx
import { Canvas, events } from '@react-three/fiber'

<Canvas events={(state) => ({
  ...events(state),
  enabled: true,
  priority: 1,
  filter: (items, state) => items,  // re-order intersections
  compute: (event, state) => {
    state.pointer.set(
      (event.offsetX / state.size.width) * 2 - 1,
      -(event.offsetY / state.size.height) * 2 + 1
    )
    state.raycaster.setFromCamera(state.pointer, state.camera)
  },
})}>
```

**Canvas-level miss handler:**

```tsx
<Canvas onPointerMissed={(event) => console.log('clicked empty space', event)}>
```

---

## 2. Drei Helpers

**Package:** `@react-three/drei`
**Install:** `bun add @react-three/drei`
**Source:** https://github.com/pmndrs/drei | https://pmndrs.github.io/drei/

All imports follow the pattern: `import { Helper } from '@react-three/drei'`

---

### Controls

#### OrbitControls

Rotate, zoom, pan around a target point.

```tsx
import { OrbitControls } from '@react-three/drei'

<Canvas>
  <OrbitControls
    enableZoom={true}
    enablePan={true}
    enableRotate={true}
    autoRotate={false}
    autoRotateSpeed={2}
    minDistance={1}
    maxDistance={100}
    minPolarAngle={0}
    maxPolarAngle={Math.PI}
    target={[0, 0, 0]}
    makeDefault  // sets this as the default controls in useThree state
  />
</Canvas>
```

Note: OrbitControls in Drei wraps Three.js OrbitControls. Use `makeDefault` to expose it via `useThree((s) => s.controls)`.

#### ScrollControls

Scroll-driven 3D scenes. Wraps content in a scrollable HTML container.

```tsx
import { ScrollControls, Scroll, useScroll } from '@react-three/drei'

<Canvas>
  <ScrollControls pages={3} damping={0.1}>
    {/* HTML overlay content */}
    <Scroll html>
      <div style={{ position: 'absolute', top: '100vh' }}>Page 2</div>
    </Scroll>
    {/* 3D content */}
    <Scroll>
      <AnimatedModel />
    </Scroll>
  </ScrollControls>
</Canvas>

function AnimatedModel() {
  const scroll = useScroll()
  useFrame(() => {
    // scroll.offset: 0–1, scroll.delta: frame delta of scroll
    const offset = scroll.offset
  })
  return <mesh />
}
```

Key props: `pages` (scroll length multiplier), `damping` (scroll inertia), `distance` (pixel distance per page), `horizontal`, `infinite`.

#### PresentationControls

Touch/mouse drag controls without needing a DOM element. Polar-limited, spring-animated. No need for OrbitControls.

```tsx
import { PresentationControls } from '@react-three/drei'

<PresentationControls
  global={false}
  zoom={0.8}
  rotation={[0, -Math.PI / 4, 0]}
  polar={[-Math.PI / 4, Math.PI / 4]}
  azimuth={[-Math.PI / 4, Math.PI / 4]}
  config={{ mass: 2, tension: 400 }}
  snap={{ mass: 4, tension: 400 }}
>
  <Model />
</PresentationControls>
```

#### KeyboardControls

Provides keyboard input state via context.

```tsx
import { KeyboardControls, useKeyboardControls } from '@react-three/drei'

const map = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'jump', keys: ['Space'] },
]

// Wrap at app level (outside Canvas)
<KeyboardControls map={map}>
  <Canvas>
    <Player />
  </Canvas>
</KeyboardControls>

function Player() {
  const [sub, get] = useKeyboardControls()

  useFrame(() => {
    const { forward, backward } = get()
    // imperative read — no re-render
  })

  // Or subscribe reactively
  const forward = useKeyboardControls((state) => state.forward)
  return null
}
```

---

### Staging

#### Environment

Add image-based lighting (IBL) and background from HDR/EXR presets or custom files.

```tsx
import { Environment } from '@react-three/drei'

// Preset environments (built-in): 'sunset'|'dawn'|'night'|'warehouse'|'forest'|
//   'apartment'|'studio'|'city'|'park'|'lobby'
<Environment preset="sunset" />

// Custom HDR
<Environment files="/path/to/env.hdr" />

// As background
<Environment preset="warehouse" background backgroundBlurriness={0.5} />

// Ground projection
<Environment preset="park" ground={{ height: 15, radius: 60 }} />

// Custom scene inside Environment
<Environment>
  <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -9]} />
</Environment>
```

Key props: `preset`, `files`, `background`, `backgroundBlurriness`, `backgroundIntensity`, `environmentIntensity`, `ground`.

#### Sky

Procedural sky shader (based on three.js `Sky`).

```tsx
import { Sky } from '@react-three/drei'

<Sky
  distance={450000}
  sunPosition={[0, 1, 0]}
  inclination={0.6}
  azimuth={0.25}
  turbidity={8}
  rayleigh={6}
  mieCoefficient={0.005}
  mieDirectionalG={0.8}
/>
```

#### Stars

Randomized star field.

```tsx
import { Stars } from '@react-three/drei'

<Stars
  radius={100}
  depth={50}
  count={5000}
  factor={4}
  saturation={0}
  fade
  speed={1}
/>
```

#### Cloud

Volumetric-style cloud objects.

```tsx
import { Cloud, Clouds } from '@react-three/drei'

<Clouds material={THREE.MeshLambertMaterial}>
  <Cloud seed={1} scale={2} volume={5} color="white" speed={0.4} />
  <Cloud seed={2} scale={3} volume={4} color="hotpink" speed={0.2} />
</Clouds>
```

#### Stage

Complete scene staging: camera placement, lighting, and shadow setup with one component.

```tsx
import { Stage } from '@react-three/drei'

<Stage
  intensity={0.5}
  preset="rembrandt"          // 'rembrandt'|'portrait'|'upfront'|'soft'
  shadows={{ type: 'contact', opacity: 0.2, blur: 3 }}
  environment="city"
  adjustCamera                // auto-fits camera to bounding box
>
  <Model />
</Stage>
```

#### ContactShadows

Fake soft shadow projected onto a plane beneath the scene. Performant alternative to real shadow maps.

```tsx
import { ContactShadows } from '@react-three/drei'

<ContactShadows
  position={[0, -0.5, 0]}
  opacity={0.75}
  scale={10}
  blur={2.5}
  far={4}
  resolution={256}
  color="#000000"
/>
```

#### AccumulativeShadows

High-quality soft shadows through temporal accumulation. Use for static scenes.

```tsx
import { AccumulativeShadows, RandomizedLight } from '@react-three/drei'

<AccumulativeShadows
  temporal
  frames={100}
  scale={12}
  alphaTest={0.85}
  opacity={1}
>
  <RandomizedLight
    amount={8}
    radius={10}
    ambient={0.5}
    position={[5, 5, -10]}
    bias={0.001}
  />
</AccumulativeShadows>
```

#### Float

Applies a floating/bobbing idle animation to children.

```tsx
import { Float } from '@react-three/drei'

<Float speed={2} rotationIntensity={1} floatIntensity={2} floatingRange={[-0.1, 0.1]}>
  <mesh>
    <sphereGeometry />
    <meshStandardMaterial />
  </mesh>
</Float>
```

---

### Shapes & Content

#### RoundedBox

Box geometry with configurable corner radius.

```tsx
import { RoundedBox } from '@react-three/drei'

<RoundedBox
  args={[1, 1, 1]}     // width, height, depth
  radius={0.05}         // corner radius
  smoothness={4}        // subdivisions per curve
  bevelSegments={4}
  creaseAngle={0.4}
>
  <meshPhongMaterial color="hotpink" />
</RoundedBox>
```

#### Text

3D text using SDF fonts (troika-three-text under the hood). Renders text as a mesh, supports line wrapping, alignment, and font loading.

```tsx
import { Text } from '@react-three/drei'

<Text
  font="/fonts/Inter-Regular.woff"
  fontSize={0.5}
  color="white"
  anchorX="center"
  anchorY="middle"
  maxWidth={2}
  lineHeight={1.2}
  letterSpacing={0.05}
  textAlign="center"
  outlineWidth={0.02}
  outlineColor="#000000"
>
  Hello World
</Text>
```

#### Text3D

Extruded 3D text using JSON typeface fonts.

```tsx
import { Text3D, Center } from '@react-three/drei'

<Center>
  <Text3D
    font="/fonts/helvetiker_regular.typeface.json"
    size={0.5}
    height={0.1}
    curveSegments={12}
    bevelEnabled
    bevelThickness={0.02}
    bevelSize={0.02}
    bevelOffset={0}
    bevelSegments={5}
  >
    Hello
    <meshNormalMaterial />
  </Text3D>
</Center>
```

#### Html

Embed HTML content inside a 3D scene, with optional occlusion.

```tsx
import { Html } from '@react-three/drei'

<mesh>
  <Html
    position={[0, 1, 0]}
    transform                      // scale/rotate HTML with the 3D object
    occlude                        // hide when occluded by other meshes
    distanceFactor={10}            // scale by camera distance when transform is false
    style={{ background: 'white', padding: '10px', borderRadius: '8px' }}
    wrapperClass="html-wrapper"
    center                         // center the HTML element
    zIndexRange={[100, 0]}
    portal={domElement}            // render into a specific DOM element
  >
    <div>Any HTML content here</div>
  </Html>
</mesh>
```

#### Billboard

Always faces the camera.

```tsx
import { Billboard } from '@react-three/drei'

<Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
  <Text fontSize={0.5}>Label</Text>
</Billboard>
```

---

### Loaders

#### useGLTF

Loads and caches GLTF/GLB files. Auto-configures Draco decoder (CDN).

```tsx
import { useGLTF } from '@react-three/drei'

function Model(props) {
  const { nodes, materials, animations, scene } = useGLTF('/model.glb')

  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Body.geometry}
        material={materials.Metal}
        castShadow
        receiveShadow
      />
    </group>
  )
}

// Preload for faster initial render
useGLTF.preload('/model.glb')

// Custom Draco decoder path (local instead of CDN)
useGLTF('/model.glb', '/draco/')
```

**With animations:**

```tsx
import { useGLTF, useAnimations } from '@react-three/drei'
import { useRef, useEffect } from 'react'

function AnimatedModel() {
  const group = useRef()
  const { animations, scene } = useGLTF('/model.glb')
  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    actions['Walk']?.play()
  }, [actions])

  return <primitive ref={group} object={scene} />
}
```

#### useTexture

Load and cache textures with automatic sRGB handling.

```tsx
import { useTexture } from '@react-three/drei'

// Single texture
function TexturedMesh() {
  const texture = useTexture('/texture.jpg')
  return <mesh><meshStandardMaterial map={texture} /></mesh>
}

// Multiple textures as object
function PBRMesh() {
  const props = useTexture({
    map: '/color.jpg',
    normalMap: '/normal.jpg',
    roughnessMap: '/roughness.jpg',
    metalnessMap: '/metalness.jpg',
    aoMap: '/ao.jpg',
  })
  return <mesh><meshStandardMaterial {...props} /></mesh>
}

useTexture.preload('/texture.jpg')
```

#### useVideoTexture

Create a texture from an HTML video element.

```tsx
import { useVideoTexture } from '@react-three/drei'

function VideoScreen() {
  const texture = useVideoTexture('/video.mp4', {
    loop: true,
    muted: true,
    playsInline: true,
  })
  return (
    <mesh>
      <planeGeometry args={[16, 9]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}
```

---

### Performance

#### Instances

Efficient abstraction over `THREE.InstancedMesh` with a simpler component API.

```tsx
import { Instances, Instance } from '@react-three/drei'

<Instances limit={1000} range={1000}>
  <boxGeometry />
  <meshStandardMaterial color="hotpink" />
  {positions.map((pos, i) => (
    <Instance key={i} position={pos} rotation={[0, Math.random() * Math.PI, 0]} />
  ))}
</Instances>
```

#### Merged

Merges multiple geometries into a single draw call using `BufferGeometryUtils.mergeBufferGeometries`.

```tsx
import { Merged } from '@react-three/drei'

<Merged meshes={[meshA, meshB, meshC]}>
  {(MeshA, MeshB, MeshC) => (
    <>
      <MeshA position={[0, 0, 0]} />
      <MeshB position={[1, 0, 0]} />
    </>
  )}
</Merged>
```

#### Detailed (LOD)

Level-of-detail component. Shows different meshes based on camera distance.

```tsx
import { Detailed } from '@react-three/drei'

<Detailed distances={[0, 10, 30]}>
  <HighPolyModel />   {/* shown 0–10 units from camera */}
  <MedPolyModel />    {/* shown 10–30 units */}
  <LowPolyModel />    {/* shown 30+ units */}
</Detailed>
```

#### BakeShadows

Freezes shadow maps to avoid re-rendering them every frame. Use for static scenes.

```tsx
import { BakeShadows } from '@react-three/drei'

<Canvas shadows>
  <BakeShadows />
  {/* Static scene with lights and shadow-casting meshes */}
</Canvas>
```

#### AdaptiveDpr

Lowers the device pixel ratio when the scene is under load (calls `performance.regress()`).

```tsx
import { AdaptiveDpr } from '@react-three/drei'

<Canvas dpr={[1, 2]}>
  <AdaptiveDpr pixelated />
</Canvas>
```

#### AdaptiveEvents

Disables pointer events while the scene is regressing.

```tsx
import { AdaptiveEvents } from '@react-three/drei'

<Canvas>
  <AdaptiveEvents />
</Canvas>
```

#### PerformanceMonitor

Monitors FPS and triggers callbacks when thresholds are crossed.

```tsx
import { PerformanceMonitor } from '@react-three/drei'

<Canvas>
  <PerformanceMonitor
    onIncline={() => console.log('fps rising')}
    onDecline={() => console.log('fps falling')}
    onChange={({ factor }) => {
      // factor: 0–1, current performance level
    }}
    flipflops={3}    // number of direction changes before settling
    factor={1}
    threshold={0.1}
    step={0.1}
  />
</Canvas>
```

#### Bvh

Wraps children with a BVH (Bounding Volume Hierarchy) for dramatically faster raycasting with many meshes.

```tsx
import { Bvh } from '@react-three/drei'

<Bvh firstHitOnly>
  <Scene />
</Bvh>
```

---

### Materials & Abstractions

#### MeshWobbleMaterial

Animated wobbling material.

```tsx
import { MeshWobbleMaterial } from '@react-three/drei'

<mesh>
  <sphereGeometry />
  <MeshWobbleMaterial factor={0.4} speed={2} color="hotpink" />
</mesh>
```

#### MeshDistortMaterial

Distorts geometry using noise.

```tsx
import { MeshDistortMaterial } from '@react-three/drei'

<mesh>
  <sphereGeometry args={[1, 64, 64]} />
  <MeshDistortMaterial distort={0.5} speed={2} color="#ff0080" />
</mesh>
```

#### MeshTransmissionMaterial

Physically-based glass/crystal material with refraction, chromatic aberration, and frosting.

```tsx
import { MeshTransmissionMaterial } from '@react-three/drei'

<mesh>
  <sphereGeometry />
  <MeshTransmissionMaterial
    backside
    samples={10}
    thickness={0.2}
    roughness={0}
    anisotropy={0.1}
    chromaticAberration={0.04}
    transmission={1}
    distortion={0.1}
    distortionScale={0.5}
    temporalDistortion={0.4}
    iridescence={1}
    iridescenceIOR={1}
    iridescenceThicknessRange={[0, 1400]}
  />
</mesh>
```

#### GradientTexture

Creates a canvas-based gradient texture.

```tsx
import { GradientTexture } from '@react-three/drei'

<mesh>
  <planeGeometry />
  <meshBasicMaterial>
    <GradientTexture
      stops={[0, 0.5, 1]}
      colors={['#e63946', '#457b9d', '#1d3557']}
      size={1024}
    />
  </meshBasicMaterial>
</mesh>
```

#### MeshReflectorMaterial

Real-time reflective floor.

```tsx
import { MeshReflectorMaterial } from '@react-three/drei'

<mesh rotation={[-Math.PI / 2, 0, 0]}>
  <planeGeometry args={[10, 10]} />
  <MeshReflectorMaterial
    blur={[300, 100]}
    resolution={2048}
    mixBlur={1}
    mixStrength={40}
    roughness={1}
    depthScale={1.2}
    minDepthThreshold={0.4}
    maxDepthThreshold={1.4}
    color="#101010"
    metalness={0.5}
  />
</mesh>
```

---

## 3. @react-three/rapier

**Package:** `@react-three/rapier`
**Install:** `bun add @react-three/rapier`
**Current version:** v2 (requires @react-three/fiber v9 + React 19). Use v1 with fiber v8 + React 18.
**Source:** https://github.com/pmndrs/react-three-rapier | https://pmndrs.github.io/react-three-rapier/

Rapier is a WASM-based physics engine. The provider requires Suspense because it loads the WASM lazily.

---

### Physics Component

```tsx
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'

function Scene() {
  return (
    <Canvas>
      <Suspense>
        <Physics
          gravity={[0, -9.81, 0]}         // default
          debug                            // show collider wireframes
          colliders="cuboid"              // default auto-collider for all RigidBodies
          timeStep={1 / 60}               // fixed timestep (default: 1/60)
          interpolation={true}            // smooth between physics frames
          paused={false}
          maxStabilizationIterations={4}
          maxVelocityIterations={4}
          maxVelocityFrictionIterations={8}
        >
          {/* physics scene content */}
        </Physics>
      </Suspense>
    </Canvas>
  )
}
```

Key `timeStep` values:
- `1/60` — fixed 60 Hz physics (default, most stable)
- `1/30` — fixed 30 Hz (lighter)
- `"vary"` — matches frame delta (variable, non-deterministic, use with care)

---

### RigidBody Types

Set via the `type` prop on `<RigidBody>`.

| Type | Description | Use Case |
|------|-------------|----------|
| `"dynamic"` | Affected by forces and collisions (default) | Characters, projectiles, debris |
| `"fixed"` | Completely immovable | Floors, walls, terrain |
| `"kinematicPosition"` | Moved by setting position directly, not by forces | Platforms, doors, animated objects |
| `"kinematicVelocity"` | Moved by setting velocity, not by forces | Controlled vehicles |

```tsx
import { RigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'

// Dynamic (default)
<RigidBody type="dynamic" restitution={0.5} friction={1} mass={1}>
  <mesh><boxGeometry /></mesh>
</RigidBody>

// Fixed
<RigidBody type="fixed">
  <mesh><planeGeometry args={[20, 20]} /></mesh>
</RigidBody>

// Kinematic — controlled by direct position setting
function KinematicPlatform() {
  const rb = useRef<RapierRigidBody>(null)

  useFrame(({ clock }) => {
    const y = Math.sin(clock.elapsedTime)
    rb.current?.setNextKinematicTranslation({ x: 0, y, z: 0 })
  })

  return (
    <RigidBody ref={rb} type="kinematicPosition">
      <mesh><boxGeometry args={[4, 0.5, 4]} /></mesh>
    </RigidBody>
  )
}
```

---

### Collider Types

**Automatic colliders** (set via `colliders` prop on `<RigidBody>` or `<Physics>`):

| Value | Shape | Description |
|-------|-------|-------------|
| `"cuboid"` | Box | Bounding box of the mesh |
| `"ball"` | Sphere | Bounding sphere of the mesh |
| `"trimesh"` | Triangle mesh | Exact mesh geometry. Fast for concave shapes but can be slow. Recommended for static bodies only. |
| `"hull"` | Convex hull | Wraps mesh in a convex hull. Good for dynamic rigid bodies. |
| `false` | — | Disable auto-generation |

**Manual collider components:**

```tsx
import {
  RigidBody,
  CuboidCollider,
  BallCollider,
  CapsuleCollider,
  CylinderCollider,
  ConeCollider,
  ConvexHullCollider,
  TrimeshCollider,
  HeightfieldCollider,
  RoundCuboidCollider,
  MeshCollider,
} from '@react-three/rapier'

// Compound collider (multiple shapes for one body)
<RigidBody colliders={false}>
  <CuboidCollider args={[0.5, 0.5, 0.5]} />
  <BallCollider args={[0.3]} position={[0, 1, 0]} />
</RigidBody>

// Capsule (common for character controllers)
<RigidBody colliders={false}>
  <CapsuleCollider args={[0.5, 0.4]} /> {/* half-height, radius */}
</RigidBody>

// MeshCollider — selectively apply collider type to a specific mesh
<RigidBody colliders="ball">
  <MeshCollider type="trimesh">
    <mesh geometry={complexMesh} />
  </MeshCollider>
  <mesh geometry={simpleMesh} /> {/* uses 'ball' from RigidBody */}
</RigidBody>

// Heightfield
<RigidBody type="fixed" colliders={false}>
  <HeightfieldCollider
    args={[widthSegments, heightSegments, heightData, { x: 10, y: 1, z: 10 }]}
  />
</RigidBody>
```

---

### Collision Events

```tsx
import { RigidBody, CuboidCollider, interactionGroups } from '@react-three/rapier'

function CollidingBall() {
  return (
    <RigidBody
      colliders="ball"
      onCollisionEnter={({ manifold, target, other }) => {
        // manifold: contact points, normals
        // target: the RigidBody firing this event
        // other: the other RigidBody in the collision
        const contactPoint = manifold.solverContactPoint(0)
        console.log('Contact at:', contactPoint)
        console.log('Hit:', other.rigidBodyObject?.name)
      }}
      onCollisionExit={({ target, other }) => {
        console.log('Separation')
      }}
      onSleep={() => console.log('body went to sleep')}
      onWake={() => console.log('body woke up')}
    >
      <mesh><sphereGeometry /></mesh>
    </RigidBody>
  )
}

// Per-collider events
<CuboidCollider
  args={[1, 1, 1]}
  onCollisionEnter={(payload) => {}}
  onCollisionExit={(payload) => {}}
/>
```

**Contact force events:**

```tsx
<RigidBody
  colliders="ball"
  onContactForce={({ totalForce, totalForceMagnitude, maxForceDirection, maxForceMagnitude }) => {
    if (totalForceMagnitude > 100) {
      // something hit hard
    }
  }}
>
  <mesh><sphereGeometry /></mesh>
</RigidBody>
```

**Collision groups (bitmask-based filtering):**

```tsx
import { interactionGroups } from '@react-three/rapier'

// Body is in group 0, interacts only with groups 1 and 2
<CapsuleCollider
  collisionGroups={interactionGroups(0, [1, 2])}
  solverGroups={interactionGroups(0, [1, 2])}
/>
```

Both colliders must match for an event to fire.

---

### Sensors

Sensors detect intersection without producing forces.

```tsx
<RigidBody type="fixed">
  <mesh>{/* visible goal posts */}</mesh>

  <CuboidCollider
    args={[3, 2, 0.1]}
    sensor
    onIntersectionEnter={({ other }) => {
      console.log('Goal! Scored by:', other.rigidBodyObject?.name)
    }}
    onIntersectionExit={({ other }) => {
      console.log('Left trigger zone')
    }}
  />
</RigidBody>
```

---

### Joints

All joints are React hooks that return a `RefObject<JointData>`.

```tsx
import {
  useFixedJoint,
  useSphericalJoint,
  useRevoluteJoint,
  usePrismaticJoint,
  useRopeJoint,
  useSpringJoint,
} from '@react-three/rapier'
```

**Revolute (hinge) — wheels, doors:**

```tsx
function Wheel({ chassisRef, wheelRef }) {
  const joint = useRevoluteJoint(chassisRef, wheelRef, [
    [0, 0, 0],   // anchor in bodyA local space
    [0, 0, 0],   // anchor in bodyB local space
    [0, 0, 1],   // rotation axis (cannot be [0,0,0])
  ])

  useFrame(() => {
    joint.current?.configureMotorVelocity(20, 1) // speed, damping
  })

  return null
}
```

**Fixed — lock two bodies together:**

```tsx
function LockedParts({ bodyA, bodyB }) {
  useFixedJoint(bodyA, bodyB, [
    [0, 0, 0],       // position in bodyA
    [0, 0, 0, 1],    // rotation quaternion in bodyA
    [0, 0, 0],       // position in bodyB
    [0, 0, 0, 1],    // rotation quaternion in bodyB
  ])
  return null
}
```

**Spherical — ball-and-socket (chain links, ragdolls):**

```tsx
function ChainLink({ bodyA, bodyB }) {
  useSphericalJoint(bodyA, bodyB, [
    [0, -0.5, 0],  // anchor in bodyA
    [0, 0.5, 0],   // anchor in bodyB
  ])
  return null
}
```

**Prismatic — slider:**

```tsx
function Slider({ bodyA, bodyB }) {
  usePrismaticJoint(bodyA, bodyB, [
    [0, 0, 0],
    [0, 0, 0],
    [1, 0, 0],  // slide axis
  ])
  return null
}
```

**Spring:**

```tsx
function SpringJoint({ bodyA, bodyB }) {
  useSpringJoint(bodyA, bodyB, [
    [0, 0, 0],   // anchor in bodyA
    [0, 0, 0],   // anchor in bodyB
    1,           // rest length
    100,         // stiffness
    1,           // damping
  ])
  return null
}
```

**Rope:**

```tsx
function RopeJoint({ bodyA, bodyB }) {
  useRopeJoint(bodyA, bodyB, [
    [0, 0, 0],   // anchor in bodyA
    [0, 0, 0],   // anchor in bodyB
    2,           // max length
  ])
  return null
}
```

---

### Forces & Impulses

Access the raw `RapierRigidBody` API via ref.

```tsx
import { RigidBody, RapierRigidBody, vec3, quat, euler } from '@react-three/rapier'
import { useRef, useEffect } from 'react'

function PhysicsObject() {
  const rb = useRef<RapierRigidBody>(null)

  useEffect(() => {
    if (!rb.current) return

    rb.current.applyImpulse({ x: 0, y: 10, z: 0 }, true)          // instant push
    rb.current.addForce({ x: 0, y: 5, z: 0 }, true)               // continuous force
    rb.current.applyTorqueImpulse({ x: 0, y: Math.PI, z: 0 }, true) // instant spin
    rb.current.addTorque({ x: 0, y: 1, z: 0 }, true)              // continuous torque

    // Read position/rotation (returns Rapier types, use helpers to convert)
    const pos = vec3(rb.current.translation())
    const rot = quat(rb.current.rotation())
    const angles = euler().setFromQuaternion(rot)

    // Set position/velocity directly
    rb.current.setTranslation({ x: 0, y: 5, z: 0 }, true)
    rb.current.setLinvel({ x: 5, y: 0, z: 0 }, true)
    rb.current.setAngvel({ x: 0, y: 2, z: 0 }, true)
  }, [])

  return (
    <RigidBody ref={rb}>
      <mesh><boxGeometry /></mesh>
    </RigidBody>
  )
}
```

---

### Instanced Rigid Bodies

Apply physics to thousands of instances.

```tsx
import { InstancedRigidBodies, InstancedRigidBodyProps, RapierRigidBody } from '@react-three/rapier'
import { useMemo, useRef } from 'react'

const COUNT = 500

function PhysicsParticles() {
  const rbs = useRef<RapierRigidBody[]>(null)

  const instances = useMemo<InstancedRigidBodyProps[]>(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      key: `particle-${i}`,
      position: [
        (Math.random() - 0.5) * 10,
        Math.random() * 10,
        (Math.random() - 0.5) * 10,
      ],
      rotation: [Math.random(), Math.random(), Math.random()],
    })),
  [])

  return (
    <InstancedRigidBodies ref={rbs} instances={instances} colliders="ball">
      <instancedMesh args={[undefined, undefined, COUNT]} count={COUNT}>
        <sphereGeometry args={[0.1]} />
        <meshStandardMaterial color="orange" />
      </instancedMesh>
    </InstancedRigidBodies>
  )
}
```

---

## 4. Three.js Recent Changes (r160+)

**Source:** https://github.com/mrdoob/three.js/releases

### TSL (Three.js Shading Language) — r166+

TSL is a node-based, renderer-agnostic shading language that works on both WebGL and WebGPU. It was introduced in r166 as a major addition.

- Write shaders once; they compile to GLSL or WGSL automatically
- Works with WebGPU's `WebGPURenderer` and traditional `WebGLRenderer`
- Import from `three/tsl`
- Replaces `ShaderMaterial` / `RawShaderMaterial` for forward-compatible shaders

```tsx
import * as THREE from 'three/webgpu'
import { color, mix, normalWorld, positionLocal, time } from 'three/tsl'

// TSL node material
const mat = new THREE.MeshBasicNodeMaterial()
mat.colorNode = mix(color('#ff0000'), color('#0000ff'), normalWorld.y.saturate())
```

**Breaking change:** RawShaderMaterial with GLSL does not work in WebGPU. Migrate to TSL for full cross-renderer support.

### WebGPU Production Ready — r171+

Starting with r171 (September 2025):
- `WebGPURenderer` requires zero configuration or polyfills
- Automatic fallback to WebGL 2 on unsupported browsers
- Safari 26 added WebGPU support, enabling universal deployment
- Import from `three/webgpu`

```tsx
// Modern way to use WebGPU with R3F v9
import * as THREE from 'three/webgpu'

<Canvas
  gl={async (props) => {
    const renderer = new THREE.WebGPURenderer(props as any)
    await renderer.init()
    return renderer
  }}
>
```

### Color Management — r139+

`THREE.ColorManagement.enabled = true` is the default in all recent versions. R3F enables it automatically. v9 fixes: automatic sRGB conversion of texture props was removed to align with vanilla Three.js behavior.

**v9 texture migration:**

```tsx
// v8 — R3F auto-converted textures
const texture = useTexture('/color.jpg')

// v9 — for custom materials, annotate color textures explicitly
texture.colorSpace = THREE.SRGBColorSpace
// Or in JSX:
<texture colorSpace={THREE.SRGBColorSpace} />
// Data textures (normal, displacement) should NOT be sRGB — no annotation needed
```

### R3F v9 Migration Highlights

**Source:** https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide

- React 19 compatible (fiber v9 = React 19, fiber v8 = React 18)
- `Props` type renamed to `CanvasProps`
- `MeshProps` and similar hardcoded exports removed; use `ThreeElements['mesh']`
- `Object3DNode`, `BufferGeometryNode`, `MaterialNode`, `LightNode` removed; use `ThreeElement<T>`
- `gl` prop callback now receives constructor params (not canvas ref)
- `useLoader` accepts loader instances directly (v9 only)

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

---

## 5. pmndrs Ecosystem Tools

### zustand

**Package:** `zustand`
**Install:** `bun add zustand`
**Source:** https://github.com/pmndrs/zustand
**Stars:** 57k+

R3F internally uses zustand. The critical insight for 3D apps: zustand's `getState()` enables reading state imperatively inside `useFrame` without triggering re-renders.

```tsx
import { create } from 'zustand'

// 1. Define store
const useGameStore = create<{
  score: number
  lives: number
  addScore: (n: number) => void
  loseLife: () => void
}>((set) => ({
  score: 0,
  lives: 3,
  addScore: (n) => set((s) => ({ score: s.score + n })),
  loseLife: () => set((s) => ({ lives: s.lives - 1 })),
}))

// 2. Reactive binding in components (re-renders on change)
function HUD() {
  const score = useGameStore((s) => s.score)
  return <div>{score}</div>
}

// 3. Critical R3F pattern: imperative access inside useFrame (NO re-render)
function SpeedBoost() {
  useFrame(() => {
    const { score } = useGameStore.getState()  // getState() is imperative, safe in useFrame
    // Use score to drive 3D logic without React re-renders
  })
  return null
}

// 4. Subscribe outside React (for audio, analytics, etc.)
const unsub = useGameStore.subscribe(
  (state) => state.lives,
  (lives) => {
    if (lives === 0) gameOver()
  }
)
```

**Multiple state slices (avoid re-render on unrelated changes):**

```tsx
import { useShallow } from 'zustand/react/shallow'

const { score, lives } = useGameStore(
  useShallow((s) => ({ score: s.score, lives: s.lives }))
)
```

---

### leva

**Package:** `leva`
**Install:** `bun add leva`
**Source:** https://github.com/pmndrs/leva
**Stars:** 5.9k

Debug GUI that auto-generates controls from a plain object schema.

```tsx
import { useControls, button, folder, Leva } from 'leva'

function DebugMesh() {
  const {
    color,
    scale,
    wireframe,
    position,
    speed,
  } = useControls('mesh', {
    color: '#ff0080',
    scale: { value: 1, min: 0.1, max: 3, step: 0.1 },
    wireframe: false,
    position: { value: [0, 0, 0], step: 0.1 },
    speed: { value: 1, min: 0, max: 10 },
    reset: button(() => console.log('reset!')),
    advanced: folder({
      roughness: { value: 0.5, min: 0, max: 1 },
      metalness: { value: 0, min: 0, max: 1 },
    }, { collapsed: true }),
  })

  return (
    <mesh scale={scale} position={position}>
      <boxGeometry />
      <meshStandardMaterial color={color} wireframe={wireframe} roughness={roughness} />
    </mesh>
  )
}

// Hide in production
function App() {
  return (
    <>
      <Leva hidden={process.env.NODE_ENV === 'production'} />
      <Canvas><DebugMesh /></Canvas>
    </>
  )
}
```

**Input types:** number, string, boolean, color (hex/rgb/hsl/hsv), vector (2D/3D), select, file, button, image, monitor.

---

### gltfjsx

**Package:** `gltfjsx` (CLI)
**Run:** `npx gltfjsx model.glb [options]`
**Source:** https://github.com/pmndrs/gltfjsx
**Stars:** 5.7k

Converts a GLTF/GLB file into a declarative, reusable React component.

**Basic usage:**

```bash
# Generate component + compress model (recommended)
npx gltfjsx model.glb --transform

# With TypeScript types
npx gltfjsx model.glb --transform --types

# Output file name
npx gltfjsx model.glb --transform -o src/components/Model.tsx
```

**Key flags:**

| Flag | Description |
|------|-------------|
| `--transform` | Compress with Draco, resize textures to 1024px, convert to WebP. Reduces size 70–90%. |
| `--types` | Generate TypeScript type definitions |
| `--draco <path>` | Use local Draco binaries instead of CDN |
| `--instance` | Re-use instanced geometry for repeated meshes |
| `--instanceall` | Instance every geometry (maximally cheap re-use) |
| `--shadows` | Add `castShadow` and `receiveShadow` to all meshes |
| `--keepnames` | Keep original mesh/material names |
| `--bones` | Lay out bones declaratively |

**Generated output example:**

```tsx
import { useGLTF, useAnimations } from '@react-three/drei'
import type { GLTF } from 'three-stdlib'

type GLTFResult = GLTF & {
  nodes: { Body: THREE.Mesh; Wheel: THREE.Mesh }
  materials: { Metal: THREE.MeshStandardMaterial }
}

export function Car(props: JSX.IntrinsicElements['group']) {
  const group = useRef<THREE.Group>()
  const { nodes, materials, animations } = useGLTF('/car-transformed.glb') as GLTFResult
  const { actions } = useAnimations(animations, group)

  return (
    <group ref={group} {...props} dispose={null}>
      <mesh geometry={nodes.Body.geometry} material={materials.Metal} />
      <mesh geometry={nodes.Wheel.geometry} material={materials.Metal} castShadow />
    </group>
  )
}

useGLTF.preload('/car-transformed.glb')
```

**Full pipeline for web-ready models:**

```bash
# 1. Transform + compress
npx gltfjsx car.glb --transform

# This creates:
#   car-transformed.glb  (Draco compressed, textures resized, WebP)
#   Car.jsx              (React component)

# 2. Move GLB to public folder
mv car-transformed.glb public/

# 3. Import and use
```

---

## 6. Performance Pitfalls

**Source:** https://r3f.docs.pmnd.rs/advanced/pitfalls

### Never setState in useFrame

```tsx
// BAD: causes React re-renders at 60fps
const [x, setX] = useState(0)
useFrame(() => setX(prev => prev + 0.1))

// GOOD: mutate the ref directly
const meshRef = useRef()
useFrame((state, delta) => {
  meshRef.current.position.x += delta
})
```

### Always use delta for time-based animation

```tsx
// BAD: speed varies with frame rate
useFrame(() => { mesh.current.rotation.y += 0.01 })

// GOOD: frame-rate independent
useFrame((state, delta) => { mesh.current.rotation.y += delta })
```

### Never setState in fast pointer events

```tsx
// BAD: re-renders every move event
<mesh onPointerMove={(e) => setPosition(e.point)} />

// GOOD: mutate ref directly
<mesh onPointerMove={(e) => { ref.current.position.copy(e.point) }} />
```

### Never read reactive state in useFrame

```tsx
// BAD: subscribes to Redux/Zustand reactively then uses in render loop
const x = useSelector(state => state.x) // triggers re-render on change
return <mesh position-x={x} />

// GOOD: read store imperatively inside useFrame
useFrame(() => {
  ref.current.position.x = useMyStore.getState().x
})
```

### Do not re-mount components indiscriminately

Three.js recompiles shaders and reinitializes buffers on mount. Avoid conditional mounting in the render loop.

```tsx
// BAD: unmounts/remounts, causing shader recompilation
{ stage === 1 && <Stage1 /> }

// GOOD: hide with visibility, keep mounted
<Stage1 visible={stage === 1} />
```

### Do not create objects inside useFrame

Every `new THREE.Vector3()` in a hot loop forces GC.

```tsx
// BAD: allocates 60 Vector3s per second
useFrame(() => {
  ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1)
})

// GOOD: reuse objects declared outside the callback
const target = new THREE.Vector3()
useFrame(() => {
  ref.current.position.lerp(target.set(x, y, z), 0.1)
})
```

### Share geometries and materials

```tsx
// BAD: creates 1000 separate geometry instances
items.map(i => (
  <mesh key={i}>
    <boxGeometry />
    <meshStandardMaterial />
  </mesh>
))

// GOOD: share with useMemo
const geom = useMemo(() => new BoxGeometry(), [])
const mat = useMemo(() => new MeshStandardMaterial(), [])
items.map(i => <mesh key={i} geometry={geom} material={mat} />)

// BETTER: use instancing for many identical objects
<Instances>
  <boxGeometry />
  <meshStandardMaterial />
  {items.map(i => <Instance key={i} position={i.pos} />)}
</Instances>
```

### Use useLoader instead of plain loaders

`useLoader` caches by URL. Plain loaders re-fetch and re-parse for every component instance.

```tsx
// BAD: re-fetches per component instance
useEffect(() => {
  new TextureLoader().load(url, (t) => setTexture(t))
}, [])

// GOOD: cached and shared
const texture = useLoader(TextureLoader, url)
// Or use useTexture from drei
const texture = useTexture(url)
```

### Use startTransition for expensive operations

```tsx
import { useTransition } from 'react'

const [isPending, startTransition] = useTransition()

// Wrapping expensive state updates defers them
startTransition(() => {
  setHeavyComputedValue(calculateExpensivePositions())
})
```

---

## 7. GLTF Loading Patterns

**Sources:** https://github.com/pmndrs/gltfjsx | https://r3f.docs.pmnd.rs/api/hooks#useloader

### Basic useGLTF

```tsx
import { useGLTF } from '@react-three/drei'
import { Suspense } from 'react'

function Model() {
  const { nodes, materials, scene } = useGLTF('/model.glb')
  return <primitive object={scene} />
}

function App() {
  return (
    <Canvas>
      <Suspense fallback={null}>
        <Model />
      </Suspense>
    </Canvas>
  )
}

// Preload before component mounts (put in module scope or route entry)
useGLTF.preload('/model.glb')
```

### Draco Compression

Draco is handled automatically by `useGLTF` via a CDN decoder. For local decoders:

```tsx
// Option 1: Pass draco path to useGLTF (drei)
const gltf = useGLTF('/model.glb', '/draco/')

// Option 2: Configure DRACOLoader manually via useLoader
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

const gltf = useLoader(GLTFLoader, '/model.glb', (loader) => {
  const draco = new DRACOLoader()
  draco.setDecoderPath('/draco/')
  loader.setDRACOLoader(draco)
})
```

Copy Draco binaries to `/public/draco/` from:
`node_modules/three/examples/jsm/libs/draco/gltf/`

### KTX2 Textures

KTX2 with Basis Universal compression requires the `KTX2Loader`:

```tsx
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module'

const gltf = useLoader(GLTFLoader, '/model.glb', (loader) => {
  const ktx2Loader = new KTX2Loader()
  ktx2Loader.setTranscoderPath('/basis/')
  ktx2Loader.detectSupport(gl)
  loader.setKTX2Loader(ktx2Loader)
  loader.setMeshoptDecoder(MeshoptDecoder)
})
```

### Lazy Loading (on demand)

Use dynamic component loading + Suspense to defer loading until the model is needed:

```tsx
import { lazy, Suspense } from 'react'
import { useInView } from '@react-three/drei'
import { useRef } from 'react'

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

### Multiple Models / Parallel Preloading

Preload multiple models in parallel before they are needed:

```tsx
// In route or page entry point
useGLTF.preload('/models/character.glb')
useGLTF.preload('/models/environment.glb')
useGLTF.preload('/models/props.glb')
```

### Clone Pattern (re-use a model multiple times)

When using `<primitive object={scene} />`, a scene can only be mounted once in Three.js. To place the same model at multiple positions:

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

Or use gltfjsx to generate a component with explicit geometry/material references that can be re-used directly (preferred).

### gltfjsx Full Web Pipeline

```bash
# Step 1: Convert and compress
npx gltfjsx character.glb --transform --types --shadows

# Step 2: Outputs
#   character-transformed.glb  → place in /public
#   Character.tsx              → place in /src/components

# Step 3: Use in scene
```

```tsx
// src/components/Character.tsx (gltfjsx output)
import { useGLTF } from '@react-three/drei'

export function Character(props) {
  const { nodes, materials } = useGLTF('/character-transformed.glb')
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Body.geometry} material={materials.Skin} castShadow />
    </group>
  )
}

useGLTF.preload('/character-transformed.glb')
```

---

## 8. Version Compatibility Matrix

| @react-three/fiber | React | @react-three/rapier | @react-three/drei |
|-------------------|-------|---------------------|------------------|
| v9.x | 19.x | v2.x | v9.x+ |
| v8.x | 18.x | v1.x | v9.x |
| v7.x | 17–18 | — | v8.x |

**Peer dependencies for a new project (React 19):**

```bash
bun add three @react-three/fiber @react-three/drei @react-three/rapier
bun add -d @types/three
```

**Package versions as of March 2026:**
- `three`: r171+ (WebGPU production ready)
- `@react-three/fiber`: v9.x (React 19)
- `@react-three/drei`: v9.x+
- `@react-three/rapier`: v2.x

---

## Sources

- [R3F Canvas API](https://r3f.docs.pmnd.rs/api/canvas) — Accessed 2026-03-10
- [R3F Hooks API](https://r3f.docs.pmnd.rs/api/hooks) — Accessed 2026-03-10
- [R3F Events API](https://r3f.docs.pmnd.rs/api/events) — Accessed 2026-03-10
- [R3F Performance Pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) — Accessed 2026-03-10
- [R3F v9 Migration Guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide) — Accessed 2026-03-10
- [drei README / Docs](https://pmndrs.github.io/drei/) — Accessed 2026-03-10
- [react-three-rapier README](https://github.com/pmndrs/react-three-rapier) — Accessed 2026-03-10
- [react-three-rapier API Docs](https://pmndrs.github.io/react-three-rapier/) — Accessed 2026-03-10
- [gltfjsx README](https://github.com/pmndrs/gltfjsx) — Accessed 2026-03-10
- [zustand README](https://github.com/pmndrs/zustand) — Accessed 2026-03-10
- [leva README](https://github.com/pmndrs/leva) — Accessed 2026-03-10
- [Three.js releases](https://github.com/mrdoob/three.js/releases) — Accessed 2026-03-10
- [TSL + WebGPU field guide](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/) — Accessed 2026-03-10
- [Three.js 2026 changes overview](https://www.utsubo.com/blog/threejs-2026-what-changed) — Accessed 2026-03-10
