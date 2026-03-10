# Rapier Physics Reference

Full `@react-three/rapier` v2 reference. Requires `@react-three/fiber` v9 + React 19.
For fiber v8 + React 18, use rapier v1.

**Install:** `bun add @react-three/rapier`
**Source:** https://github.com/pmndrs/react-three-rapier | https://pmndrs.github.io/react-three-rapier/

Rapier is WASM-based. The `<Physics>` provider requires `<Suspense>` because it loads the WASM lazily.

---

## Physics Provider

```tsx
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'

function Scene() {
  return (
    <Canvas>
      <Suspense>
        <Physics
          gravity={[0, -9.81, 0]}        // default
          debug                           // show collider wireframes
          colliders="cuboid"             // default auto-collider for all RigidBodies
          timeStep={1 / 60}              // fixed timestep (default: 1/60)
          interpolation={true}           // smooth between physics frames
          paused={false}
          maxStabilizationIterations={4}
          maxVelocityIterations={4}
          maxVelocityFrictionIterations={8}
        >
          {/* physics scene */}
        </Physics>
      </Suspense>
    </Canvas>
  )
}
```

`timeStep` values:
- `1/60` — fixed 60 Hz physics (default, most stable)
- `1/30` — fixed 30 Hz (lighter compute)
- `"vary"` — matches frame delta (variable, non-deterministic — avoid for gameplay)

---

## RigidBody Types

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

// Dynamic (default) — affected by gravity and collisions
<RigidBody type="dynamic" restitution={0.5} friction={1} mass={1}>
  <mesh castShadow><sphereGeometry /></mesh>
</RigidBody>

// Fixed — immovable
<RigidBody type="fixed">
  <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
    <planeGeometry args={[20, 20]} />
  </mesh>
</RigidBody>

// Kinematic — move by setting position directly
function MovingPlatform() {
  const rb = useRef<RapierRigidBody>(null)

  useFrame(({ clock }) => {
    const y = Math.sin(clock.elapsedTime)
    rb.current?.setNextKinematicTranslation({ x: 0, y, z: 0 })
  })

  return (
    <RigidBody ref={rb} type="kinematicPosition">
      <mesh castShadow>
        <boxGeometry args={[4, 0.5, 4]} />
        <meshStandardMaterial color="steelblue" />
      </mesh>
    </RigidBody>
  )
}
```

---

## Collider Types

### Automatic Colliders

Set via `colliders` prop on `<RigidBody>` or globally on `<Physics>`.

| Value | Shape | Notes |
|-------|-------|-------|
| `"cuboid"` | Box | Bounding box of the mesh |
| `"ball"` | Sphere | Bounding sphere of the mesh |
| `"trimesh"` | Triangle mesh | Exact geometry; slow for dynamic bodies — static only |
| `"hull"` | Convex hull | Good for dynamic bodies |
| `false` | None | Disable auto-generation; add manual colliders |

### Manual Collider Components

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

// Compound collider — multiple shapes on one body
<RigidBody colliders={false}>
  <CuboidCollider args={[0.5, 0.5, 0.5]} />
  <BallCollider args={[0.3]} position={[0, 1, 0]} />
</RigidBody>

// Capsule — common for character controllers
<RigidBody colliders={false}>
  <CapsuleCollider args={[0.5, 0.4]} /> {/* half-height, radius */}
</RigidBody>

// MeshCollider — override collider type for a specific mesh
<RigidBody colliders="ball">
  <MeshCollider type="trimesh">
    <mesh geometry={complexMesh} />
  </MeshCollider>
  <mesh geometry={simpleMesh} /> {/* uses 'ball' from RigidBody */}
</RigidBody>

// Heightfield — terrain
<RigidBody type="fixed" colliders={false}>
  <HeightfieldCollider
    args={[widthSegments, heightSegments, heightData, { x: 10, y: 1, z: 10 }]}
  />
</RigidBody>
```

---

## Collision Events

```tsx
import { RigidBody } from '@react-three/rapier'

<RigidBody
  colliders="ball"
  onCollisionEnter={({ manifold, target, other }) => {
    // manifold: contact points and normals
    // target: the RigidBody that fired this event
    // other: the other RigidBody
    const contactPoint = manifold.solverContactPoint(0)
    console.log('Contact at:', contactPoint)
    console.log('Hit:', other.rigidBodyObject?.name)
  }}
  onCollisionExit={({ target, other }) => {
    console.log('Separated from:', other.rigidBodyObject?.name)
  }}
  onSleep={() => console.log('body went to sleep')}
  onWake={() => console.log('body woke up')}
>
  <mesh><sphereGeometry /></mesh>
</RigidBody>
```

### Contact Force Events

```tsx
<RigidBody
  colliders="ball"
  onContactForce={({ totalForce, totalForceMagnitude, maxForceDirection, maxForceMagnitude }) => {
    if (totalForceMagnitude > 100) {
      // something hit hard — play sound, trigger effect
    }
  }}
>
  <mesh><sphereGeometry /></mesh>
</RigidBody>
```

### Per-Collider Events

```tsx
import { CuboidCollider } from '@react-three/rapier'

<CuboidCollider
  args={[1, 1, 1]}
  onCollisionEnter={(payload) => {}}
  onCollisionExit={(payload) => {}}
/>
```

### Collision Groups (Bitmask Filtering)

```tsx
import { interactionGroups } from '@react-three/rapier'

// Body is in group 0, interacts only with groups 1 and 2
<CapsuleCollider
  collisionGroups={interactionGroups(0, [1, 2])}
  solverGroups={interactionGroups(0, [1, 2])}
/>
```

Both colliders must declare matching groups for an event to fire.

---

## Sensors

Detect intersection without producing forces. Use for trigger zones, checkpoints, power-ups.

```tsx
import { RigidBody, CuboidCollider } from '@react-three/rapier'

<RigidBody type="fixed">
  <mesh>{/* visible goal post geometry */}</mesh>

  <CuboidCollider
    args={[3, 2, 0.1]}
    sensor
    onIntersectionEnter={({ other }) => {
      console.log('Triggered by:', other.rigidBodyObject?.name)
    }}
    onIntersectionExit={({ other }) => {
      console.log('Left zone:', other.rigidBodyObject?.name)
    }}
  />
</RigidBody>
```

---

## Joints

All joints are React hooks returning a `RefObject<JointData>`. Both bodies must be refs to `RapierRigidBody`.

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

### Revolute (Hinge) — wheels, doors

```tsx
function Wheel({ chassisRef, wheelRef }) {
  const joint = useRevoluteJoint(chassisRef, wheelRef, [
    [0, 0, 0],   // anchor in chassisRef local space
    [0, 0, 0],   // anchor in wheelRef local space
    [0, 0, 1],   // rotation axis (must not be [0,0,0])
  ])

  useFrame(() => {
    joint.current?.configureMotorVelocity(20, 1) // speed, damping
  })

  return null
}
```

### Fixed — lock two bodies together

```tsx
function LockedParts({ bodyA, bodyB }) {
  useFixedJoint(bodyA, bodyB, [
    [0, 0, 0],       // position in bodyA local space
    [0, 0, 0, 1],    // rotation quaternion in bodyA
    [0, 0, 0],       // position in bodyB local space
    [0, 0, 0, 1],    // rotation quaternion in bodyB
  ])
  return null
}
```

### Spherical — ball-and-socket (chain links, ragdolls)

```tsx
function ChainLink({ bodyA, bodyB }) {
  useSphericalJoint(bodyA, bodyB, [
    [0, -0.5, 0],  // anchor at bottom of bodyA
    [0, 0.5, 0],   // anchor at top of bodyB
  ])
  return null
}
```

### Prismatic — linear slider

```tsx
function Slider({ bodyA, bodyB }) {
  usePrismaticJoint(bodyA, bodyB, [
    [0, 0, 0],
    [0, 0, 0],
    [1, 0, 0],  // slide along X axis
  ])
  return null
}
```

### Spring

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

### Rope

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

## Forces & Impulses

Access the raw `RapierRigidBody` API via ref.

```tsx
import { RigidBody } from '@react-three/rapier'
import { vec3, quat, euler } from '@react-three/rapier'
import { useRef, useEffect } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'

function PhysicsObject() {
  const rb = useRef<RapierRigidBody>(null)

  useEffect(() => {
    if (!rb.current) return

    // Impulses (instant change in velocity)
    rb.current.applyImpulse({ x: 0, y: 10, z: 0 }, true)
    rb.current.applyTorqueImpulse({ x: 0, y: Math.PI, z: 0 }, true)

    // Continuous forces (applied each step)
    rb.current.addForce({ x: 0, y: 5, z: 0 }, true)
    rb.current.addTorque({ x: 0, y: 1, z: 0 }, true)

    // Read position and rotation (convert from Rapier types with helpers)
    const pos = vec3(rb.current.translation())    // THREE.Vector3
    const rot = quat(rb.current.rotation())        // THREE.Quaternion
    const angles = euler().setFromQuaternion(rot)  // THREE.Euler

    // Set position / velocity directly
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

The second argument (`true`) to impulse/force methods wakes the body if sleeping.

---

## InstancedRigidBodies

Apply physics to thousands of instances in a single component.

```tsx
import { InstancedRigidBodies, RapierRigidBody } from '@react-three/rapier'
import type { InstancedRigidBodyProps } from '@react-three/rapier'
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

## Character Controller Pattern

A typical first-person or third-person character controller combining kinematic rigid body + capsule collider + keyboard controls:

```tsx
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import { KeyboardControls, useKeyboardControls } from '@react-three/drei'
import { useRef } from 'react'
import type { RapierRigidBody } from '@react-three/rapier'

const controls = [
  { name: 'forward', keys: ['w', 'W', 'ArrowUp'] },
  { name: 'backward', keys: ['s', 'S', 'ArrowDown'] },
  { name: 'jump', keys: ['Space'] },
]

function Character() {
  const rb = useRef<RapierRigidBody>(null)
  const [sub, get] = useKeyboardControls()
  const onGround = useRef(true)

  useFrame((state, delta) => {
    const { forward, backward, jump } = get()
    const vel = rb.current?.linvel()
    if (!vel) return

    const speed = 5
    let vx = 0
    let vz = 0

    if (forward) vz = -speed
    if (backward) vz = speed

    rb.current?.setLinvel({ x: vx, y: vel.y, z: vz }, true)

    if (jump && onGround.current) {
      rb.current?.applyImpulse({ x: 0, y: 8, z: 0 }, true)
      onGround.current = false
    }
  })

  return (
    <RigidBody
      ref={rb}
      type="dynamic"
      colliders={false}
      lockRotations
      onCollisionEnter={() => { onGround.current = true }}
    >
      <CapsuleCollider args={[0.5, 0.4]} />
      <mesh castShadow>
        <capsuleGeometry args={[0.4, 1]} />
        <meshStandardMaterial color="royalblue" />
      </mesh>
    </RigidBody>
  )
}
```

---

## Debug Visualization

Add `debug` to `<Physics>` to see collider wireframes:

```tsx
<Physics debug gravity={[0, -9.81, 0]}>
  {/* scene */}
</Physics>
```

Remove or set `debug={process.env.NODE_ENV === 'development'}` before shipping to production.
