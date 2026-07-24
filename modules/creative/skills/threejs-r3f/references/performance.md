# R3F Performance Reference

Full guide for optimizing React Three Fiber scenes.

**Source:** https://r3f.docs.pmnd.rs/advanced/pitfalls

---

## Draw Call Budgets

| Target | Budget |
|--------|--------|
| Mobile | < 100 draw calls |
| Desktop | < 300 draw calls |

One `<mesh>` = one draw call (unless instanced). Check count with `renderer.info.render.calls` or `r3f-perf`.

---

## The 7 Anti-Patterns

### 1. Never setState in useFrame

React re-renders triggered at 60 fps destroy performance.

```tsx
// WRONG — causes React re-renders at 60fps
const [x, setX] = useState(0)
useFrame(() => setX(prev => prev + 0.1))

// RIGHT — mutate the ref directly
const meshRef = useRef()
useFrame((state, delta) => {
  meshRef.current.position.x += delta
})
```

### 2. Always use delta for time-based animation

Fixed increments produce speed that varies with frame rate.

```tsx
// WRONG — speed varies with frame rate
useFrame(() => {
  mesh.current.rotation.y += 0.01
})

// RIGHT — frame-rate independent
useFrame((state, delta) => {
  mesh.current.rotation.y += delta
})
```

### 3. Never setState in fast pointer events

`onPointerMove` fires every frame while the pointer is moving.

```tsx
// WRONG — re-renders every move event
<mesh onPointerMove={(e) => setPosition(e.point)} />

// RIGHT — mutate ref directly
<mesh onPointerMove={(e) => { ref.current.position.copy(e.point) }} />
```

### 4. Never read reactive store state in useFrame

Subscribing to a store (Redux, Zustand) inside `useFrame` re-renders on every state change.

```tsx
// WRONG — subscribes reactively
const x = useSelector(state => state.x) // triggers re-render on change
return <mesh position-x={x} />

// RIGHT — read store imperatively inside useFrame
useFrame(() => {
  ref.current.position.x = useMyStore.getState().x
})
```

### 5. Do not conditionally mount/unmount in the render loop

Three.js recompiles shaders and reinitializes GPU buffers on every mount. This is expensive.

```tsx
// WRONG — unmounts/remounts, causing shader recompilation
{ stage === 1 && <Stage1 /> }

// RIGHT — hide with visibility, keep mounted
<Stage1 visible={stage === 1} />
```

### 6. Never allocate new THREE objects inside useFrame

`new THREE.Vector3()` in a hot loop triggers GC pauses.

```tsx
// WRONG — allocates 60 Vector3s per second
useFrame(() => {
  ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1)
})

// RIGHT — allocate once outside the callback, reuse with .set()
const target = new THREE.Vector3()
useFrame(() => {
  ref.current.position.lerp(target.set(x, y, z), 0.1)
})
```

### 7. Share geometries and materials

Placing multiple identical meshes each with their own `<boxGeometry />` creates separate GPU buffers per mesh.

```tsx
// WRONG — creates 1000 separate geometry + material instances
items.map(i => (
  <mesh key={i}>
    <boxGeometry />
    <meshStandardMaterial />
  </mesh>
))

// BETTER — share via useMemo
const geom = useMemo(() => new BoxGeometry(), [])
const mat = useMemo(() => new MeshStandardMaterial(), [])
items.map(i => <mesh key={i} geometry={geom} material={mat} />)

// BEST — use instancing (single draw call)
<Instances>
  <boxGeometry />
  <meshStandardMaterial />
  {items.map(i => <Instance key={i} position={i.pos} />)}
</Instances>
```

---

## Disposal Checklist

Three.js objects are not garbage-collected automatically — GPU memory must be released manually.

```tsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function DynamicMesh() {
  const geomRef = useRef(new THREE.BoxGeometry())
  const matRef = useRef(new THREE.MeshStandardMaterial())

  useEffect(() => {
    return () => {
      geomRef.current.dispose()
      matRef.current.dispose()
      // For materials with textures:
      // matRef.current.map?.dispose()
      // matRef.current.normalMap?.dispose()
    }
  }, [])

  return <mesh geometry={geomRef.current} material={matRef.current} />
}
```

When using `useGLTF` or `useTexture`, the library handles disposal automatically via its cache. Only dispose objects you create directly with `new`.

---

## Instancing

For many identical objects, instancing reduces N draw calls to 1.

### Drei Instances (recommended)

```tsx
import { Instances, Instance } from '@react-three/drei'

function Forest({ positions }) {
  return (
    <Instances limit={positions.length} range={positions.length}>
      <cylinderGeometry args={[0.1, 0.3, 2]} />
      <meshStandardMaterial color="brown" />
      {positions.map((pos, i) => (
        <Instance key={i} position={pos} rotation={[0, Math.random() * Math.PI, 0]} />
      ))}
    </Instances>
  )
}
```

### Raw InstancedMesh (maximum control)

```tsx
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

function RawInstances({ count, positions }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    positions.forEach((pos, i) => {
      dummy.position.set(...pos)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions, dummy])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry />
      <meshStandardMaterial />
    </instancedMesh>
  )
}
```

---

## LOD with Detailed

Show different mesh complexity based on camera distance.

```tsx
import { Detailed } from '@react-three/drei'

function Tree({ position }) {
  return (
    <Detailed distances={[0, 20, 60]} position={position}>
      <HighPolyTree />   {/* 0–20 units: full detail */}
      <MedPolyTree />    {/* 20–60 units: medium */}
      <BillboardTree />  {/* 60+ units: billboard sprite */}
    </Detailed>
  )
}
```

---

## Texture Optimization

Format quality vs. size (best to worst):

| Format | Compression | GPU Ready | Recommendation |
|--------|-------------|-----------|---------------|
| KTX2 (Basis) | Best | Yes | Production: complex scenes |
| WebP | Good | No (CPU decoded) | Production: general use |
| JPEG | Moderate | No | Development only |
| PNG | None | No | Only for transparency |

KTX2 textures are kept compressed on the GPU (no CPU decode overhead). Use `gltfjsx --transform` to convert automatically.

---

## useLoader vs Plain Loaders

`useLoader` caches by URL. Plain loaders re-fetch and re-parse for every component instance.

```tsx
// WRONG — re-fetches per component instance
useEffect(() => {
  new TextureLoader().load(url, (t) => setTexture(t))
}, [])

// RIGHT — cached and shared
const texture = useLoader(TextureLoader, url)
// Or use useTexture from drei (same caching)
const texture = useTexture(url)
```

---

## Frustum Culling

Three.js frustum culling is enabled by default — objects fully outside the camera view are not rendered. Ensure `mesh.frustumCulled = true` (the default) is not disabled.

For complex models with many submeshes, Drei's `Bvh` accelerates raycasting dramatically:

```tsx
import { Bvh } from '@react-three/drei'

<Bvh firstHitOnly>
  <ComplexScene />
</Bvh>
```

---

## Stats Tooling

### r3f-perf (recommended)

```bash
bun add r3f-perf
```

```tsx
import { Perf } from 'r3f-perf'

<Canvas>
  <Perf position="top-left" />
</Canvas>
```

Shows: FPS, GPU time, CPU time, draw calls, triangle count, memory.

### Three.js renderer info

```tsx
import { useThree } from '@react-three/fiber'

function Stats() {
  const { gl } = useThree()
  useFrame(() => {
    const { calls, triangles, points } = gl.info.render
    // log or display
  })
  return null
}
```

---

## Mobile-Specific Rules

1. **DPR cap at 1.5** — never let the pixel ratio exceed 1.5 on mobile:

```tsx
<Canvas dpr={[1, 1.5]}>
  <AdaptiveDpr pixelated />
</Canvas>
```

2. **Simplify shaders** — avoid heavy postprocessing (bloom, SSAO) on mobile

3. **Reduce shadow map resolution** — use 512 or 1024 instead of 2048+:

```tsx
<directionalLight
  castShadow
  shadow-mapSize={[512, 512]}
  shadow-camera-far={30}
/>
```

4. **Fewer draw calls** — stay under 100 on mobile; use instancing aggressively

5. **Texture compression** — always use KTX2 or WebP on mobile; uncompressed textures are particularly expensive on mobile GPUs

6. **Test on real hardware** — mobile GPU performance varies widely; Chrome DevTools mobile emulation does not reflect GPU behavior

---

## Adaptive Performance Pattern

Combine `PerformanceMonitor` + `AdaptiveDpr` + `AdaptiveEvents` for automatic quality scaling:

```tsx
import { PerformanceMonitor, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei'
import { useState } from 'react'

function Scene() {
  const [dpr, setDpr] = useState(1.5)

  return (
    <Canvas dpr={dpr}>
      <PerformanceMonitor
        onIncline={() => setDpr(2)}
        onDecline={() => setDpr(1)}
        flipflops={3}
      />
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      {/* scene content */}
    </Canvas>
  )
}
```

---

## startTransition for Expensive Updates

Defer expensive state updates to avoid blocking the render loop:

```tsx
import { useTransition } from 'react'

const [isPending, startTransition] = useTransition()

function onButtonClick() {
  startTransition(() => {
    setHeavyComputedValue(calculateExpensivePositions())
  })
}
```
