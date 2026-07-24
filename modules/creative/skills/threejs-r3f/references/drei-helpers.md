# Drei Helpers Reference

Full inventory of `@react-three/drei` helpers organized by category.

All imports: `import { Helper } from '@react-three/drei'`

---

## Controls

### OrbitControls

Rotate, zoom, and pan around a target point.

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
    makeDefault  // exposes via useThree((s) => s.controls)
  />
</Canvas>
```

### ScrollControls

Scroll-driven 3D scenes. Wraps content in a scrollable HTML container.

```tsx
import { ScrollControls, Scroll, useScroll } from '@react-three/drei'

<Canvas>
  <ScrollControls pages={3} damping={0.1}>
    <Scroll html>
      <div style={{ position: 'absolute', top: '100vh' }}>Page 2</div>
    </Scroll>
    <Scroll>
      <AnimatedModel />
    </Scroll>
  </ScrollControls>
</Canvas>

function AnimatedModel() {
  const scroll = useScroll()
  const meshRef = useRef()
  useFrame(() => {
    meshRef.current.rotation.y = scroll.offset * Math.PI * 2
  })
  return <mesh ref={meshRef}><boxGeometry /></mesh>
}
```

Key props: `pages` (scroll length multiplier), `damping` (0–1 inertia), `distance` (pixels per page), `horizontal`, `infinite`.

### PresentationControls

Touch/mouse drag with spring-animated return. No DOM element required.

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

### KeyboardControls

Typed key state via context. Read imperatively in `useFrame` to avoid re-renders.

```tsx
import { KeyboardControls, useKeyboardControls } from '@react-three/drei'

const map = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
  { name: 'jump', keys: ['Space'] },
]

// Wrap outside Canvas
<KeyboardControls map={map}>
  <Canvas>
    <Player />
  </Canvas>
</KeyboardControls>

function Player() {
  const [sub, get] = useKeyboardControls()

  useFrame(() => {
    const { forward, backward, left, right, jump } = get()
    // imperatively read — no re-render
    if (forward) rb.current?.applyImpulse({ x: 0, y: 0, z: -1 }, true)
    if (jump) rb.current?.applyImpulse({ x: 0, y: 5, z: 0 }, true)
  })

  // Reactive subscription (triggers re-render)
  const jumping = useKeyboardControls((state) => state.jump)
  return null
}
```

---

## Staging

### Environment

Image-based lighting (IBL) from preset HDRs or custom files.

```tsx
import { Environment } from '@react-three/drei'

// Presets: 'sunset'|'dawn'|'night'|'warehouse'|'forest'|'apartment'|'studio'|'city'|'park'|'lobby'
<Environment preset="sunset" />

// Custom HDR file
<Environment files="/env.hdr" />

// As background
<Environment preset="warehouse" background backgroundBlurriness={0.5} />

// Ground projection
<Environment preset="park" ground={{ height: 15, radius: 60 }} />

// Custom light formers
<Environment>
  <Lightformer intensity={2} rotation-x={Math.PI / 2} position={[0, 4, -9]} />
</Environment>
```

Key props: `preset`, `files`, `background`, `backgroundBlurriness`, `backgroundIntensity`, `environmentIntensity`, `ground`.

### Sky

Procedural sky shader (Three.js `Sky` under the hood).

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

### Stars

Randomized star field.

```tsx
import { Stars } from '@react-three/drei'

<Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade={true} speed={1} />
```

### Cloud

Volumetric-style cloud objects.

```tsx
import { Cloud, Clouds } from '@react-three/drei'
import * as THREE from 'three'

<Clouds material={THREE.MeshLambertMaterial}>
  <Cloud seed={1} scale={2} volume={5} color="white" speed={0.4} />
  <Cloud seed={2} scale={3} volume={4} color="hotpink" speed={0.2} />
</Clouds>
```

### Stage

Complete scene staging: camera placement, lighting, and shadows in one component.

```tsx
import { Stage } from '@react-three/drei'

<Stage
  intensity={0.5}
  preset="rembrandt"     // 'rembrandt'|'portrait'|'upfront'|'soft'
  shadows={{ type: 'contact', opacity: 0.2, blur: 3 }}
  environment="city"
  adjustCamera           // auto-fits camera to model bounding box
>
  <Model />
</Stage>
```

### ContactShadows

Fake soft shadow on a plane beneath the scene. Cheaper than real shadow maps.

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

### AccumulativeShadows

High-quality soft shadows via temporal accumulation. Use for static scenes.

```tsx
import { AccumulativeShadows, RandomizedLight } from '@react-three/drei'

<AccumulativeShadows temporal frames={100} scale={12} alphaTest={0.85} opacity={1}>
  <RandomizedLight amount={8} radius={10} ambient={0.5} position={[5, 5, -10]} bias={0.001} />
</AccumulativeShadows>
```

### Float

Floating/bobbing idle animation.

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

## Shapes & Content

### RoundedBox

Box geometry with configurable corner radius.

```tsx
import { RoundedBox } from '@react-three/drei'

<RoundedBox args={[1, 1, 1]} radius={0.05} smoothness={4} bevelSegments={4} creaseAngle={0.4}>
  <meshPhongMaterial color="hotpink" />
</RoundedBox>
```

### Text

SDF 3D text (troika-three-text). Renders as a mesh; supports line wrapping and font loading.

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

### Text3D

Extruded 3D text from JSON typeface fonts.

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

### Html

Embed DOM content in a 3D scene, with optional occlusion.

```tsx
import { Html } from '@react-three/drei'

<mesh>
  <Html
    position={[0, 1, 0]}
    transform           // scale/rotate HTML with the 3D object
    occlude             // hide when occluded by other meshes
    distanceFactor={10} // scale by camera distance (when transform is false)
    style={{ background: 'white', padding: '10px', borderRadius: '8px' }}
    center              // center the HTML element
    zIndexRange={[100, 0]}
  >
    <div>Any HTML content</div>
  </Html>
</mesh>
```

### Billboard

Always faces the camera.

```tsx
import { Billboard } from '@react-three/drei'

<Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
  <Text fontSize={0.5}>Label</Text>
</Billboard>
```

---

## Loaders

### useGLTF

Load and cache GLTF/GLB. Auto-configures Draco CDN decoder.

```tsx
import { useGLTF, useAnimations } from '@react-three/drei'
import { useRef, useEffect } from 'react'

function Model(props) {
  const { nodes, materials } = useGLTF('/model.glb')
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Body.geometry} material={materials.Metal} castShadow />
    </group>
  )
}

useGLTF.preload('/model.glb')

// With animations
function AnimatedModel() {
  const group = useRef()
  const { animations, scene } = useGLTF('/model.glb')
  const { actions } = useAnimations(animations, group)

  useEffect(() => { actions['Walk']?.play() }, [actions])

  return <primitive ref={group} object={scene} />
}

// Local Draco decoder instead of CDN
const gltf = useGLTF('/model.glb', '/draco/')
```

### useTexture

Load and cache textures. Object form returns named properties for PBR maps.

```tsx
import { useTexture } from '@react-three/drei'

// Single texture
function TexturedMesh() {
  const texture = useTexture('/texture.jpg')
  return <mesh><meshStandardMaterial map={texture} /></mesh>
}

// PBR maps as object
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

### useVideoTexture

Create a texture from an HTML video element.

```tsx
import { useVideoTexture } from '@react-three/drei'

function VideoScreen() {
  const texture = useVideoTexture('/video.mp4', { loop: true, muted: true, playsInline: true })
  return (
    <mesh>
      <planeGeometry args={[16, 9]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}
```

---

## Performance

### Instances / Instance

Instanced meshes with a simpler component API than raw `THREE.InstancedMesh`.

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

### Merged

Merge multiple geometries into one draw call.

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

### Detailed (LOD)

Show different meshes based on camera distance.

```tsx
import { Detailed } from '@react-three/drei'

<Detailed distances={[0, 10, 30]}>
  <HighPolyModel />   {/* 0–10 units */}
  <MedPolyModel />    {/* 10–30 units */}
  <LowPolyModel />    {/* 30+ units */}
</Detailed>
```

### BakeShadows

Freeze shadow maps for static scenes.

```tsx
import { BakeShadows } from '@react-three/drei'

<Canvas shadows>
  <BakeShadows />
  {/* static scene */}
</Canvas>
```

### AdaptiveDpr

Lower pixel ratio when the scene is under load.

```tsx
import { AdaptiveDpr } from '@react-three/drei'

<Canvas dpr={[1, 2]}>
  <AdaptiveDpr pixelated />
</Canvas>
```

### AdaptiveEvents

Disable pointer events while the scene is regressing.

```tsx
import { AdaptiveEvents } from '@react-three/drei'

<Canvas>
  <AdaptiveEvents />
</Canvas>
```

### PerformanceMonitor

Monitor FPS and trigger callbacks when thresholds are crossed.

```tsx
import { PerformanceMonitor } from '@react-three/drei'

<Canvas>
  <PerformanceMonitor
    onIncline={() => setDpr(2)}
    onDecline={() => setDpr(1)}
    onChange={({ factor }) => {
      // factor: 0–1, current performance level
    }}
    flipflops={3}
    threshold={0.1}
  />
</Canvas>
```

### Bvh

BVH acceleration for dramatically faster raycasting with many meshes.

```tsx
import { Bvh } from '@react-three/drei'

<Bvh firstHitOnly>
  <Scene />
</Bvh>
```

---

## Materials & Abstractions

### MeshWobbleMaterial

Animated wobbling material.

```tsx
import { MeshWobbleMaterial } from '@react-three/drei'

<mesh>
  <sphereGeometry />
  <MeshWobbleMaterial factor={0.4} speed={2} color="hotpink" />
</mesh>
```

### MeshDistortMaterial

Distorts geometry using noise.

```tsx
import { MeshDistortMaterial } from '@react-three/drei'

<mesh>
  <sphereGeometry args={[1, 64, 64]} />
  <MeshDistortMaterial distort={0.5} speed={2} color="#ff0080" />
</mesh>
```

### MeshTransmissionMaterial

Physically-based glass/crystal with refraction, chromatic aberration, and frosting.

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

### GradientTexture

Canvas-based gradient texture.

```tsx
import { GradientTexture } from '@react-three/drei'

<mesh>
  <planeGeometry />
  <meshBasicMaterial>
    <GradientTexture stops={[0, 0.5, 1]} colors={['#e63946', '#457b9d', '#1d3557']} size={1024} />
  </meshBasicMaterial>
</mesh>
```

### MeshReflectorMaterial

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
