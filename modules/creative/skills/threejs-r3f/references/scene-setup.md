# Scene Setup Reference

Minimal and extended scene templates for React Three Fiber v9.

---

## Minimal Working Scene

Perspective camera, ambient + directional lighting, orbit controls, shadow-casting mesh:

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

---

## frameloop Values

| Value | Behavior |
|-------|----------|
| `"always"` | Render every frame (default) |
| `"demand"` | Render only when `invalidate()` is called — use for static/interactive scenes |
| `"never"` | Manual advance with `advance()` — use for step-by-frame control |

---

## Responsive Canvas

Fill container and respond to resize automatically:

```tsx
<Canvas
  style={{ width: '100%', height: '100%' }}
  camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 2, 5] }}
  onCreated={({ camera, size }) => {
    camera.aspect = size.width / size.height
    camera.updateProjectionMatrix()
  }}
>
```

R3F handles resize automatically — no manual resize listener needed.

---

## WebGPU Renderer Setup (Three.js r171+)

WebGPU is production-ready as of r171 (September 2025). Safari 26 added WebGPU, enabling universal deployment with automatic WebGL 2 fallback.

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
      {/* scene */}
    </Canvas>
  )
}
```

Note: `RawShaderMaterial` GLSL does not work in WebGPU mode. Use TSL (`three/tsl`) for cross-renderer shaders.

---

## Exportable Component (Inside Existing Project)

Install into an existing React 19 project without scaffolding a new app:

```bash
bun add three @react-three/fiber @react-three/drei
bun add -d @types/three
```

Import `Canvas` where needed. No entry-point changes required.

---

## Standalone Vite + R3F App

```bash
bun create vite my-scene -- --template react-ts
cd my-scene
bun add three @react-three/fiber @react-three/drei
bun add -d @types/three
bun dev
```

Optional additions:

```bash
bun add @react-three/rapier        # physics
bun add zustand                    # state
bun add leva                       # debug GUI
```
