# Extras Reference

State management, debug GUI, and physics quick start for React Three Fiber projects.

---

## State Management with Zustand

For game state or shared 3D state, use zustand. The key pattern: read store imperatively inside `useFrame` to avoid triggering re-renders at 60 fps.

```tsx
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

const useGameStore = create((set) => ({
  score: 0,
  lives: 3,
  addScore: (n) => set((s) => ({ score: s.score + n })),
  loseLife: () => set((s) => ({ lives: s.lives - 1 })),
}))

// Reactive — re-renders on score change (UI components)
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

// Imperative — no re-render — REQUIRED inside useFrame
function SpeedBoost() {
  useFrame(() => {
    const { score } = useGameStore.getState()  // imperative, no re-render
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

**Install:** `bun add zustand`

---

## Debug GUI with Leva

Add `leva` for live parameter tweaking during development:

```bash
bun add leva
```

```tsx
import { useControls, Leva } from 'leva'

function DebugMesh() {
  const { color, scale, metalness } = useControls({
    color: '#ff0080',
    scale: { value: 1, min: 0.1, max: 3, step: 0.1 },
    metalness: { value: 0.5, min: 0, max: 1 },
  })
  return (
    <mesh scale={scale}>
      <boxGeometry />
      <meshStandardMaterial color={color} metalness={metalness} />
    </mesh>
  )
}

// Hide in production
<Leva hidden={process.env.NODE_ENV === 'production'} />
```

Additional control types: `folder`, `button`, `image`, `color`, `vector2`, `vector3`, `select`, `monitor`.

---

## Physics Quick Start with @react-three/rapier

`@react-three/rapier` requires Suspense because it loads WASM lazily.

**Install:** `bun add @react-three/rapier`

```tsx
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics, RigidBody } from '@react-three/rapier'

function Scene() {
  return (
    <Canvas>
      <Suspense>
        <Physics gravity={[0, -9.81, 0]}>
          {/* Dynamic: affected by gravity and forces */}
          <RigidBody type="dynamic" restitution={0.5}>
            <mesh castShadow>
              <sphereGeometry />
              <meshStandardMaterial color="orange" />
            </mesh>
          </RigidBody>

          {/* Fixed: static collider, unaffected by forces */}
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

**RigidBody types:**
- `"dynamic"` — default; gravity + forces apply
- `"fixed"` — immovable static object
- `"kinematicPosition"` — moved by setting `.setNextKinematicTranslation()`
- `"kinematicVelocity"` — moved by setting `.setLinvel()`

For full Rapier reference (all collider types, collision events, sensors, joints, forces, InstancedRigidBodies), read `references/physics.md`.
