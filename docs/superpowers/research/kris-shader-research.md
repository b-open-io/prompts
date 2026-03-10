# Three.js Shader Development — Research Reference

> Compiled: 2026-03-10
> Purpose: Reference for AI agent skill file on Three.js shader development
> Coverage: TSL, ShaderMaterial, pmndrs/postprocessing, Book of Shaders, LYGIA, Inigo Quilez, Three.js examples

---

## 1. TSL — Three.js Shading Language

### What It Is

TSL is a node-based shader abstraction written in JavaScript. It compiles to both GLSL (WebGL backend) and WGSL (WebGPU backend) automatically, making shaders renderer-agnostic. The system eliminates raw shader string manipulation and infers uniform/varying declarations.

**Status (as of 2026-03-10):** Production-ready and actively maintained. The official wiki was last updated February 28, 2026. TSL is the recommended path for new shader work in Three.js r163+.

**Import path:** `three/tsl` (also re-exported from `three/webgpu`)

**Renderer requirement:** `WebGPURenderer` (automatically falls back to WebGL2 if WebGPU is unavailable)

```javascript
import WebGPU from 'three/addons/capabilities/WebGPU.js';
import { WebGPURenderer } from 'three/webgpu';

const renderer = new WebGPURenderer({ antialias: true });
```

### Core Node Types

```javascript
// Scalars
float(node | number)         // float
int(node | number)           // int
uint(node | number)          // uint
bool(node | value)           // bool

// Vectors
vec2(node | Vector2 | x, y)
vec3(node | Vector3 | x, y, z)
vec4(node | Vector4 | x, y, z, w)
ivec2/3/4(...)               // integer vectors
uvec2/3/4(...)               // unsigned integer vectors
bvec2/3/4(...)               // boolean vectors

// Color (treated as vec3 internally)
color(node | hexInt | r, g, b)

// Matrices
mat2(node | Matrix2 | ...)
mat3(node | Matrix3 | ...)
mat4(node | Matrix4 | ...)
```

### Texture Nodes

```javascript
texture(textureNode, uv = uv(), level = null)        // sampled texture → vec4
textureLoad(texture, uv, level = null)               // uninterpolated fetch
cubeTexture(texture, uvw = reflectVector, level)     // cube map
texture3D(texture, uvw, level)                       // 3D texture
textureStore(storageTexture, coord, value)           // write to storage texture
textureSize(map, 0)                                  // → ivec2
textureBicubic(map, strength)                        // bicubic filtering
triplanarTexture(texX, texY, texZ, scale, position, normal)
```

### Uniform Nodes

```javascript
import { uniform, uniformArray } from 'three/tsl';

// Scalar/object uniforms
const myColor = uniform(new THREE.Color(0x0066ff));
const myValue = uniform(0.5);

// Read/write value
myColor.value = new THREE.Color(0xff0000);   // update
myValue.value = 0.9;

// Update callbacks
myColor.onFrameUpdate(({ frame }) => { /* once per frame */ });
myColor.onRenderUpdate(({ renderer }) => { /* once per render call */ });
myColor.onObjectUpdate(({ object }) => { /* per object */ });

// Array uniforms
const tintColors = uniformArray([
  new THREE.Color(1, 0, 0),
  new THREE.Color(0, 1, 0)
], 'color');
```

### Built-in Nodes

```javascript
// --- UV ---
uv(index = 0)                // vec2 — accesses uv attribute

// --- Time ---
time                         // float, seconds since renderer start
deltaTime                    // float, frame delta seconds

// --- Position ---
positionGeometry             // unmodified attribute
positionLocal                // after morphing/skinning
positionWorld                // world-space
positionWorldDirection       // normalized world direction
positionView                 // view-space
positionViewDirection        // normalized view direction

// --- Normals ---
normalGeometry               // raw attribute
normalLocal                  // local space
normalView                   // view-space (normalized)
normalWorld                  // world-space (normalized)

// --- Camera ---
cameraPosition               // world camera position (vec3)
cameraViewMatrix             // mat4
cameraProjectionMatrix       // mat4
cameraNear                   // float
cameraFar                    // float

// --- Screen ---
screenUV                     // normalized framebuffer coord (vec2)
screenCoordinate             // pixel units (vec2)
screenSize                   // framebuffer size (vec2)
viewportUV                   // normalized viewport coord
viewportSharedTexture(uv)    // already-rendered content (for refraction etc.)
viewportLinearDepth          // orthographic depth value
```

### Node Composition Operators

All operators return nodes and support chaining:

```javascript
a.add(b)          // a + b
a.sub(b)          // a - b
a.mul(b)          // a * b
a.div(b)          // a / b
a.mod(b)          // a % b
mix(x, y, a)      // linear interpolation
step(edge, x)     // step function
smoothstep(e0, e1, x)    // Hermite interpolation
clamp(x, min, max)
saturate(x)       // clamp to [0, 1]

// Comparison (return bool node)
a.equal(b)
a.notEqual(b)
a.lessThan(b)
a.greaterThan(b)
a.lessThanEqual(b)
a.greaterThanEqual(b)

// Logical
a.and(b)
a.or(b)
a.not()
```

### Math Library

```javascript
abs(), sin(), cos(), tan(), asin(), acos(), atan()
exp(), exp2(), log(), log2()
sqrt(), inverseSqrt(), cbrt()
pow(), pow2(), pow3(), pow4()
floor(), ceil(), round(), trunc()
min(), max(), clamp(), mix()
length(), distance(), normalize()
dot(), cross()
reflect(), refract()
fract(), sign()
degrees(), radians()
```

### Swizzle

```javascript
const v = vec3(1, 2, 3);
v.zyx     // → vec3(3, 2, 1)
v.xy      // → vec2(1, 2)
v.r       // component access via rgba, xyzw, or stpq
```

### Custom Function Nodes

```javascript
import { Fn } from 'three/tsl';

// Basic: receives array of input nodes
const average = Fn(([a, b]) => {
  return a.add(b).mul(0.5);
});

// Usage
material.colorNode = average(colorA, colorB);

// With material/object access (deferred function)
const adaptiveColor = Fn(({ material, object }) => {
  if (material.userData.isSpecial) {
    return vec3(1, 0, 0);
  }
  return vec3(0.5);
});
material.colorNode = adaptiveColor();
```

> **Note:** `tslFn` is the legacy alias for `Fn`. Use `Fn` in all new code — `tslFn` is deprecated.

### Variables, Constants, Properties

```javascript
// Reusable mutable variable (GLSL var)
const uvScaled = uv().mul(10).toVar();
uvScaled.addAssign(0.1);   // mutate in place

// Inline constant (GLSL const)
const uvScaled = uv().mul(10).toConst();

// Property without initial value
const prop = property('vec3');

// Explicit
const myVar = Var(value, 'optionalName');
const myConst = Const(value);
```

### Control Flow

```javascript
import { If, Loop, Break, Continue, select, Switch } from 'three/tsl';

// If / ElseIf / Else
const result = vec3();
If(value.greaterThan(0.5), () => {
  result.assign(vec3(1, 0, 0));
}).ElseIf(value.greaterThan(0.25), () => {
  result.assign(vec3(0, 1, 0));
}).Else(() => {
  result.assign(vec3(0, 0, 1));
});

// Ternary
const clamped = select(value.greaterThan(1.0), 1.0, value);

// Loop
Loop(10, ({ i }) => {
  // i: 0–9
});

Loop({ start: int(0), end: int(count), type: 'int' }, ({ i }) => {
  // custom range
});

// Nested
Loop(10, 5, ({ i, j }) => { /* ... */ });

// While-style
const v = float(0);
Loop(v.lessThan(10), () => {
  v.addAssign(1);
});

Break();
Continue();
```

### Varying (Vertex → Fragment)

```javascript
import { vertexStage, varying } from 'three/tsl';

// Compute in vertex stage, interpolate to fragment
const worldNormal = vertexStage(modelNormalMatrix.mul(normalLocal));
material.colorNode = worldNormal.normalize().mul(0.5).add(0.5);

// Explicit named varying
const myVarying = varying(nodeValue, 'vMyValue');
```

### Noise Nodes (MaterialX)

```javascript
import { mx_noise_float, mx_noise_vec3 } from 'three/tsl';

// Float noise: returns float Perlin noise
// Signature: mx_noise_float(position: vec3, amplitude?: float, pivot?: float) → float
const n = mx_noise_float(positionWorld.mul(2.0));

// Vec3 noise: returns vec3 Perlin noise
// Signature: mx_noise_vec3(position: vec3, amplitude?: float, pivot?: float) → vec3
const n3 = mx_noise_vec3(positionWorld.mul(0.5).add(vec3(0, time, 0)));

// Water-like effect example
const p = uv().toVec3().mul(3.0);
const raw = mx_noise_vec3(vec3(p.x, p.y, time.mul(0.5))).x;
const adjusted = raw.add(0.5).mul(0.5);  // remap [-0.5,0.5] to [0,1]
material.colorNode = mix(color(0x001e5f), color(0x00b4d8), adjusted);
```

### Oscillators

```javascript
import { oscSine, oscSquare, oscTriangle, oscSawtooth } from 'three/tsl';

oscSine(time)       // float in [-0.5, 0.5]
oscSquare(time)     // float, square wave
oscTriangle(time)   // float, triangle wave
oscSawtooth(time)   // float in [0, 1]
```

### Hash / Random

```javascript
import { hash, range } from 'three/tsl';

hash(seed)           // float in [0, 1] from seed node
range(minColor, maxColor)   // per-instance range (useful with InstancedMesh)
```

### NodeMaterial Setup

```javascript
import * as THREE from 'three/webgpu';
import { texture, uv, normalMap, color, float, time, mx_noise_float } from 'three/tsl';

// MeshStandardNodeMaterial — the standard PBR NodeMaterial
const material = new THREE.MeshStandardNodeMaterial();

material.colorNode      = texture(colorMap, uv());        // vec3
material.normalNode     = normalMap(texture(normalMap));  // vec3
material.roughnessNode  = float(0.5);                     // float
material.metalnessNode  = texture(metalMap).r;            // float
material.emissiveNode   = color(0xff0000);                // vec3
material.opacityNode    = float(0.8);                     // float
material.positionNode   = positionLocal.add(             // vertex displacement
  normalLocal.mul(mx_noise_float(positionWorld.mul(2)).mul(0.1))
);

// Physical material extras
material.clearcoatNode    = float(0.5);
material.transmissionNode = float(0.9);
material.iridescenceNode  = float(0.5);

// Full custom fragment (bypasses standard PBR)
material.fragmentNode = myCustomFn();
// Full custom vertex
material.vertexNode = myVertexFn();
```

### NodeMaterial in R3F (React Three Fiber)

```jsx
import { extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { color, float, time, mix, mx_noise_float, positionWorld } from 'three/tsl';

// Option A: declarative via attach
function MyMesh() {
  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial
        colorNode={color(0x00aaff)}
        roughnessNode={float(0.3)}
      />
    </mesh>
  );
}

// Option B: imperative ref + useFrame for dynamic nodes
function MyMesh() {
  const matRef = useRef();
  const noiseUniform = uniform(0);

  useFrame(({ clock }) => {
    noiseUniform.value = clock.elapsedTime;
  });

  const dynamicColor = mix(color(0x001eff), color(0xff6600), noiseUniform);

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial ref={matRef} colorNode={dynamicColor} />
    </mesh>
  );
}
```

### Minimal Working TSL Example (Vanilla)

```javascript
import * as THREE from 'three/webgpu';
import { color, float, mx_noise_float, positionWorld, time, mix } from 'three/tsl';

const renderer = new THREE.WebGPURenderer({ antialias: true });
await renderer.init();
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.z = 3;

const material = new THREE.MeshStandardNodeMaterial();

// Animated noise color
const noise = mx_noise_float(
  positionWorld.mul(1.5).add(time.mul(0.3))
);
material.colorNode = mix(color(0x1a0533), color(0x00eaff), noise);
material.roughnessNode = float(0.4);

const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), material);
scene.add(mesh);
scene.add(new THREE.DirectionalLight(0xffffff, 2));

renderer.setAnimationLoop(() => renderer.render(scene, camera));
```

---

## 2. ShaderMaterial — Classic GLSL API

### Constructor Properties

```javascript
const mat = new THREE.ShaderMaterial({
  vertexShader:   string,       // GLSL vertex shader source
  fragmentShader: string,       // GLSL fragment shader source
  uniforms: {
    uTime:       { value: 0.0 },
    uResolution: { value: new THREE.Vector2() },
    uTexture:    { value: null },
    uColor:      { value: new THREE.Color(0xff0000) },
    uMatrix:     { value: new THREE.Matrix4() },
  },
  defines: {                    // #define NAME value
    NUM_LIGHTS: 4,
    USE_FOG: '',               // presence-only define (empty = defined)
  },
  glslVersion: THREE.GLSL3,    // or THREE.GLSL1 (default null = GLSL1)
  transparent: false,
  side: THREE.FrontSide,       // DoubleSide, BackSide
  depthWrite: true,
  depthTest: true,
  wireframe: false,
  fog: false,                  // integrate with scene fog (requires uniforms merge)
  lights: false,               // integrate with scene lights
  clipping: false,
  extensions: {
    derivatives: false,        // dFdx, dFdy, fwidth
    fragDepth: false,          // gl_FragDepth
    drawBuffers: false,        // gl_FragData[]
    shaderTextureLOD: false    // texture2DLodEXT etc
  }
});
```

### Uniform Types Reference

| JS Value | GLSL Type |
|---|---|
| `Number` (float) | `float` |
| `Number` (int) | `int` |
| `THREE.Vector2` | `vec2` |
| `THREE.Vector3` | `vec3` |
| `THREE.Vector4` | `vec4` |
| `THREE.Color` | `vec3` (rgb) |
| `THREE.Matrix3` | `mat3` |
| `THREE.Matrix4` | `mat4` |
| `THREE.Texture` | `sampler2D` |
| `THREE.CubeTexture` | `samplerCube` |
| `Float32Array` | `float[]` |
| `[Vector3, Vector3, ...]` | `vec3[]` |
| `Boolean` | `bool` |

### Built-in Uniforms (ShaderMaterial only, not Raw)

Three.js automatically injects these when using `ShaderMaterial`:

```glsl
// Vertex shader built-ins
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;

// Attribute built-ins
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
// Also: color, tangent, uv1, morphTarget0..N
```

### Updating Uniforms

```javascript
// Direct value update (most common)
material.uniforms.uTime.value = clock.elapsedTime;
material.uniforms.uColor.value.set(0x00ff00);          // Color method
material.uniforms.uResolution.value.set(w, h);         // Vector2 method
material.uniforms.uTexture.value = newTexture;

// Force update if Three.js misses the change
material.uniformsNeedUpdate = true;
```

### Varying Variables

```glsl
// --- Vertex Shader ---
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// --- Fragment Shader ---
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  gl_FragColor = vec4(vUv, 0.0, 1.0);
}
```

### ShaderMaterial vs RawShaderMaterial

| Feature | ShaderMaterial | RawShaderMaterial |
|---|---|---|
| Built-in uniforms | Injected automatically | None — must declare all |
| Built-in attributes | Injected automatically | None — must declare all |
| `#version` directive | Managed by Three.js | You must include it |
| Use case | Most use cases | Full manual control |
| GLSL version | Controlled via `glslVersion` | Include `#version 300 es` manually |

```glsl
/* RawShaderMaterial — must include precision and version */
#version 300 es
precision highp float;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

in vec3 position;
in vec2 uv;
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

### R3F Usage with useFrame

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

  // Memoize uniforms to avoid re-allocation on re-render
  const uniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uColor: { value: new THREE.Color(0x00aaff) }
  }), []);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
```

### Drei shaderMaterial Helper (R3F)

```jsx
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Define once outside component
const WaveMaterial = shaderMaterial(
  // Uniform defaults
  { uTime: 0, uColor: new THREE.Color(0x00aaff) },
  // Vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float uTime;
    uniform vec3 uColor;
    varying vec2 vUv;
    void main() {
      gl_FragColor = vec4(uColor * sin(vUv.x * 10.0 + uTime), 1.0);
    }
  `
);

extend({ WaveMaterial });

function WaveMesh() {
  const ref = useRef();
  useFrame(({ clock }) => {
    ref.current.uTime = clock.elapsedTime;  // direct property, not .uniforms.X.value
  });
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <waveMaterial ref={ref} uColor={new THREE.Color(0xff6600)} />
    </mesh>
  );
}
```

### Loop Unrolling Pragma

```glsl
#pragma unroll_loop_start
for (int i = 0; i < 4; i++) {
  // UNROLLED_LOOP_INDEX is substituted with literal i value
  color += texture2D(uTextures[UNROLLED_LOOP_INDEX], vUv);
}
#pragma unroll_loop_end
```

---

## 3. pmndrs/postprocessing — Effect Pipeline

### Packages

```bash
# Vanilla Three.js
bun add postprocessing

# React Three Fiber
bun add @react-three/postprocessing
```

### Vanilla EffectComposer Setup

```javascript
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, SMAAEffect, ToneMappingEffect
} from 'postprocessing';
import { HalfFloatType } from 'three';

// Renderer config for postprocessing
const renderer = new THREE.WebGLRenderer({
  powerPreference: 'high-performance',
  antialias: false,   // let postprocessing handle AA
  stencil: false,
  depth: false,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;  // let postprocessing handle tone mapping

// HDR frame buffer — prevents banding in dark scenes
const composer = new EffectComposer(renderer, {
  frameBufferType: HalfFloatType
});

composer.addPass(new RenderPass(scene, camera));

const bloom = new BloomEffect({ luminanceThreshold: 0.9, intensity: 2.0 });
const smaa  = new SMAAEffect();
const toneMap = new ToneMappingEffect({ mode: ToneMappingMode.AGX });

// One EffectPass merges multiple effects — reduces draw calls
composer.addPass(new EffectPass(camera, bloom, smaa, toneMap));

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  composer.render();   // replaces renderer.render(scene, camera)
}
```

### R3F EffectComposer Setup

```jsx
import {
  EffectComposer,
  Bloom, DepthOfField, SSAO,
  ChromaticAberration, Vignette,
  ToneMapping, Noise, Outline
} from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';

function PostFX() {
  return (
    <EffectComposer>
      {/* Depth-based first */}
      <SSAO radius={20} intensity={30} bias={0.5} />
      <DepthOfField focusDistance={0.01} focalLength={0.02} bokehScale={3} />

      {/* Color / glow */}
      <Bloom
        luminanceThreshold={0.9}
        luminanceSmoothing={0.025}
        mipmapBlur
        intensity={1.5}
      />
      <ToneMapping mode={ToneMappingMode.AGX} />

      {/* Full-screen overlays last */}
      <ChromaticAberration offset={[0.002, 0.002]} />
      <Vignette offset={0.15} darkness={0.9} eskil={false} />
      <Noise opacity={0.02} premultiply />
    </EffectComposer>
  );
}
```

### Available Effects — Key Parameters

#### Bloom
```jsx
<Bloom
  luminanceThreshold={0.9}  // brightness cutoff (0 = everything blooms)
  luminanceSmoothing={0.025} // knee falloff width
  mipmapBlur={false}        // true = higher quality, GPU-intensive
  intensity={1.0}            // glow strength
  radius={0.85}              // spread (with mipmapBlur)
  height={300}               // render resolution hint
/>
```

#### DepthOfField
```jsx
<DepthOfField
  focusDistance={0.0}  // normalized camera distance to focus plane
  focalLength={0.02}   // range of acceptable focus
  bokehScale={2.0}     // blur kernel size
  height={480}
/>
```

#### SSAO
```jsx
<SSAO
  radius={20}         // sample hemisphere radius (screen px)
  intensity={30}      // shadow darkness multiplier
  bias={0.5}          // depth bias to reduce self-occlusion artifacts
  rings={7}           // sample rings
  distanceThreshold={1.0}
  distanceFalloff={0.0}
/>
```

#### ChromaticAberration
```jsx
<ChromaticAberration
  offset={[0.002, 0.002]}  // Vector2 — RGB channel displacement
  radialModulation={false} // increase toward edges
  modulationOffset={0.5}
/>
```

#### Vignette
```jsx
<Vignette
  offset={0.1}      // inner radius of vignette
  darkness={1.1}    // edge darkness strength
  eskil={false}     // smooth falloff mode
/>
```

#### ToneMapping
```jsx
import { ToneMappingMode } from 'postprocessing';

<ToneMapping
  mode={ToneMappingMode.AGX}   // recommended default
  // Other modes: REINHARD, REINHARD2, REINHARD2_ADAPTIVE,
  //              OPTIMIZED_CINEON, CINEON, ACES_FILMIC, LINEAR
/>
```

#### Noise (Film Grain)
```jsx
<Noise
  opacity={0.02}
  premultiply={true}    // multiply by input alpha before blending
/>
```

#### Outline
```jsx
<Outline
  selection={selectedObjects}   // Set or Array of Object3D
  edgeStrength={2.5}
  pulseSpeed={0.0}
  visibleEdgeColor={0xffffff}
  hiddenEdgeColor={0x22090a}
  blur={false}
  xRay={true}            // show outline through other objects
/>
```

#### GodRays
```jsx
// Requires a light mesh as source
import { GodRays } from '@react-three/postprocessing';

const sunRef = useRef();
<mesh ref={sunRef}>
  <sphereGeometry args={[1]} />
  <meshBasicMaterial color={[10, 6, 1]} toneMapped={false} />
</mesh>

{sunRef.current && (
  <GodRays
    sun={sunRef.current}
    exposure={0.34}
    decay={0.9}
    blur
  />
)}
```

### Effect Ordering Rules

Order matters because each effect operates on the output of the previous:

```
1. SSAO           — needs depth buffer, must be early
2. DepthOfField   — needs depth, must be before color grading
3. Bloom          — operates on scene luminance before tone mapping
4. ToneMapping    — convert HDR → LDR, must come after bloom
5. ChromaticAberration — full-screen warp, near end
6. Vignette       — full-screen overlay, near end
7. Noise          — full-screen overlay, last
```

> One `EffectPass(camera, ...effects)` is better than multiple `EffectPass` instances — it merges shader code into one draw call.

### Performance Cost Estimates (relative)

| Effect | Cost | Notes |
|---|---|---|
| Bloom (no mipmapBlur) | Low | |
| Bloom (mipmapBlur) | Medium | Higher quality |
| DepthOfField | Medium–High | Bokeh is expensive |
| SSAO | Medium–High | Many samples = expensive |
| ChromaticAberration | Very Low | |
| Vignette | Very Low | |
| Noise | Very Low | |
| Outline | Medium | Selection pass overhead |
| GodRays | Medium | Radial blur |
| ToneMapping | Very Low | |
| SMAA (AA) | Low | Cheaper than MSAA |

### Custom Effect Authoring

```javascript
import { Uniform, Vector3 } from 'three';
import { BlendFunction, Effect } from 'postprocessing';

// shader.frag
const fragmentShader = /* glsl */ `
  uniform vec3 uWeights;

  void mainImage(
    const in vec4 inputColor,
    const in vec2 uv,
    out vec4 outputColor
  ) {
    outputColor = vec4(inputColor.rgb * uWeights, inputColor.a);
  }
`;

export class ColorWeightsEffect extends Effect {
  constructor({ weights = new Vector3(1, 1, 1) } = {}) {
    super('ColorWeightsEffect', fragmentShader, {
      blendFunction: BlendFunction.SRC,   // replace output
      uniforms: new Map([
        ['uWeights', new Uniform(weights)]
      ])
    });
  }

  set weights(v) { this.uniforms.get('uWeights').value = v; }
  get weights()  { return this.uniforms.get('uWeights').value; }
}
```

**Depth-aware variant:**
```glsl
void mainImage(
  const in vec4 inputColor,
  const in vec2 uv,
  const in float depth,          // linearized depth [0,1]
  out vec4 outputColor
) {
  float fogAmount = smoothstep(0.0, 1.0, depth);
  outputColor = mix(inputColor, vec4(uFogColor, 1.0), fogAmount);
}
```

**UV manipulation variant (warps input coordinates):**
```glsl
void mainUv(inout vec2 uv) {
  uv.x += sin(uv.y * 10.0 + time) * 0.01;
}
```

**Auto-provided uniforms in fragment shader:**
```glsl
// Always available (no need to declare):
uniform sampler2D inputBuffer;
uniform sampler2D depthBuffer;
uniform vec2 resolution;
uniform vec2 texelSize;
uniform float cameraNear;
uniform float cameraFar;
uniform float aspect;
uniform float time;
```

---

## 4. Book of Shaders — Key Concepts

Source: https://thebookofshaders.com (Patricio Gonzalez Vivo & Jen Lowe)

### Chapter Map

| Chapter | URL | Topic |
|---|---|---|
| 05 | /05/ | Shaping functions |
| 06 | /06/ | Colors |
| 07 | /07/ | Shapes / SDF basics |
| 08 | /08/ | Matrices |
| 09 | /09/ | Patterns |
| 10 | /10/ | Random |
| 11 | /11/ | Noise (Value, Perlin) |
| 12 | /12/ | Cellular noise (Worley) |
| 13 | /13/ | Fractal Brownian Motion |

### Noise Functions

**Value Noise** — interpolate random values at integer lattice points:
```glsl
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Value noise with smoothstep interpolation
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  vec2 u = f * f * (3.0 - 2.0 * f);  // smoothstep

  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
```

**Gradient (Perlin) Noise** — gradient vectors at lattice points, smooth interpolation with quintic curve:
```glsl
// Improved Perlin uses: u = f^3 * (f * (f * 6 - 15) + 10)
// Eliminates directional artifacts present in cubic Perlin
```

Reference implementation: [Ian McEwan / Stefan Gustavson webgl-noise](https://github.com/stegu/webgl-noise)

**Simplex Noise** — improvements over Perlin:
- Uses simplex (triangle/tetrahedron) grid instead of square grid
- O(n²) instead of O(2ⁿ) for n dimensions
- No directional artifacts
- Well-defined continuous gradients

```glsl
// From stegu/webgl-noise (GLSL implementation by Ian McEwan & Stefan Gustavson)
// github.com/stegu/webgl-noise

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  // ... (full implementation: github.com/ashima/webgl-noise)
}
```

**Worley (Cellular) Noise** — distance to nearest feature point:
```glsl
// Chapter 12: thebookofshaders.com/12/
vec2 random2(vec2 st) {
  st = vec2(dot(st, vec2(127.1, 311.7)),
            dot(st, vec2(269.5, 183.3)));
  return fract(sin(st) * 43758.5453123);
}

float worley(vec2 st) {
  float minDist = 1.0;
  vec2 i_st = floor(st);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = random2(i_st + neighbor);
      point = 0.5 + 0.5 * sin(6.2831 * point);  // animate
      vec2 diff = neighbor + point - fract(st);
      float dist = length(diff);
      minDist = min(minDist, dist);
    }
  }
  return minDist;
}
```

**Fractal Brownian Motion (fBM)** — layered noise octaves:
```glsl
float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 0.0;

  for (int i = 0; i < 6; i++) {  // 6 octaves
    value += amplitude * noise(st);
    st *= 2.0;           // lacunarity
    amplitude *= 0.5;    // persistence / gain
  }
  return value;
}
```

### Signed Distance Functions (SDF) Basics

SDF returns the signed distance from a point to a shape's surface (negative inside, positive outside, zero on boundary):

```glsl
// Circle SDF
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

// Box SDF (2D)
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Using SDF for crisp shapes with anti-aliasing
float shape = sdCircle(vUv - 0.5, 0.3);
float col = smoothstep(0.005, -0.005, shape);  // AA via smoothstep

// Combining SDFs
float sdfUnion(float d1, float d2)        { return min(d1, d2); }
float sdfSubtract(float d1, float d2)     { return max(-d1, d2); }
float sdfIntersect(float d1, float d2)    { return max(d1, d2); }
```

### Shaping Functions

```glsl
// Smoothstep (cubic Hermite)
float x = smoothstep(0.0, 1.0, t);

// Quintic (Improved Perlin)
float quintic(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Power curves for easing
float y = pow(x, 3.0);      // ease in
float y = 1.0 - pow(1.0-x, 3.0);  // ease out

// Sine-based smooth oscillation
float y = sin(x * 3.14159);

// Triangle wave
float y = abs(fract(x) * 2.0 - 1.0);

// Sawtooth
float y = fract(x);
```

### Color Mixing

```glsl
// Linear interpolation
vec3 result = mix(colorA, colorB, t);

// HSB to RGB (for hue rotation tricks)
vec3 hsb2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

// Blend modes
vec3 screen(vec3 a, vec3 b)   { return 1.0 - (1.0 - a) * (1.0 - b); }
vec3 overlay(vec3 a, vec3 b)  {
  return mix(2.0*a*b, 1.0 - 2.0*(1.0-a)*(1.0-b), step(0.5, a));
}
```

---

## 5. LYGIA Shader Library

**Source:** https://lygia.xyz / https://github.com/patriciogonzalezvivo/lygia

### What It Is

A granular, cross-language shader library (GLSL, HLSL, WGSL, Metal, CUDA). The largest open shader library, designed for reuse and portability. Modules are included via `#include` preprocessor directives.

### Module Categories

| Category | Description | Example modules |
|---|---|---|
| `math/` | Constants, operations | `PI`, `SqrtLength`, `decimate` |
| `space/` | Transforms | `ratio`, `rotate`, `scale` |
| `color/` | Color space conversions | `rgb2oklab`, `srgb2lch`, `blend/*` |
| `noise/` | Noise functions | `fbm`, `voronoi`, `curl` |
| `filter/` | Image filters | `blur/gaussian`, `median`, `mean` |
| `sdf/` | Signed distance fields | `circle`, `box`, `line`, `torus` |
| `draw/` | Drawing primitives | `stroke`, `fill`, `digits` |
| `lighting/` | Lighting models | `pbr`, `iridescence`, `specular` |

### Usage Patterns

**Option A: CDN (online resolver)**
```glsl
// In your GLSL source
#include "lygia/noise/fbm.glsl"
#include "lygia/sdf/circle.glsl"
```

```javascript
// In your JavaScript (build-time)
import { resolveLygiaAsync } from 'https://lygia.xyz/resolve.esm.js';

let fragSource = `
  #include "lygia/noise/fbm.glsl"
  void main() {
    vec2 st = gl_FragCoord.xy / iResolution.xy;
    gl_FragColor = vec4(fbm(st), 0.0, 0.0, 1.0);
  }
`;
fragSource = await resolveLygiaAsync(fragSource);
// fragSource now has includes inlined — pass to ShaderMaterial
```

**Option B: npm package + bundler plugin**
```bash
bun add lygia
# Then use vite-plugin-glsl or esbuild-plugin-glsl to resolve #include
```

```javascript
// vite.config.js
import glsl from 'vite-plugin-glsl';
export default { plugins: [glsl({ include: ['**/*.glsl'] })] };
```

**Option C: Local clone**
```bash
git clone https://github.com/patriciogonzalezvivo/lygia.git public/lygia
```
```glsl
#include "/lygia/noise/fbm.glsl"
```

### Three.js Integration Example

```javascript
import { resolveLygiaAsync } from 'https://lygia.xyz/resolve.esm.js';

const fragTemplate = /* glsl */ `
  #include "lygia/noise/fbm.glsl"
  #include "lygia/color/palette/spectral.glsl"

  uniform float uTime;
  varying vec2 vUv;

  void main() {
    float n = fbm(vUv * 3.0 + uTime * 0.1);
    vec3 col = spectral_color(n);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const fragmentShader = await resolveLygiaAsync(fragTemplate);

const material = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader
});
```

---

## 6. Inigo Quilez Articles — Key Reference

**Source:** https://iquilezles.org/articles/

### Noise

| Article | URL | Summary |
|---|---|---|
| Value Noise Derivatives | https://iquilezles.org/www/articles/morenoise/morenoise.htm | Analytic derivatives of value noise for lighting normals |
| Gradient Noise Derivatives | https://iquilezles.org/articles/gradientnoise/ | Gradient noise with analytic derivatives |
| Voronoise | https://iquilezles.org/articles/voronoise/ | Unified noise/Voronoi via parameter blending |
| Smooth Voronoi | https://iquilezles.org/articles/smoothvoronoi/ | Smooth min applied to Voronoi |
| Voronoi Edges | https://iquilezles.org/articles/voronoilines/ | Distance to Voronoi cell edges |
| FBM + SDF | https://iquilezles.org/articles/fbmsdf/ | Adding fBM to SDFs without breaking distance property |

### SDF Primitives

| Article | URL | Summary |
|---|---|---|
| 3D Distance Functions | https://iquilezles.org/articles/distfunctions/ | Sphere, box, capsule, torus, cylinder, cone, and all 3D SDF ops |
| 2D Distance Functions | https://iquilezles.org/articles/distfunctions2d/ | Circle, box, segment, polygon, all 2D primitives |
| 2D Distance + Gradients | https://iquilezles.org/articles/distgradfunctions2d/ | 2D SDFs with analytic gradients |
| SDF Bounding Volumes | https://iquilezles.org/articles/sdfbounding/ | Avoiding expensive SDF eval with bounding volumes |
| Raymarching SDFs | https://iquilezles.org/articles/raymarchingdf/ | Full raymarching + smooth min + noise displacement |

### SDF Operations (from distfunctions article)

```glsl
// Boolean operations
float opUnion(float d1, float d2)        { return min(d1, d2); }
float opSubtraction(float d1, float d2)  { return max(-d1, d2); }
float opIntersection(float d1, float d2) { return max(d1, d2); }

// Smooth minimum (from smin article)
// https://iquilezles.org/www/articles/smin/smin.htm
float smin(float a, float b, float k) {
  float h = max(k - abs(a-b), 0.0) / k;
  return min(a, b) - h*h*k*(1.0/4.0);
}

// Basic 3D SDFs
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p-a, ba = b-a;
  float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
  return length(pa - ba*h) - r;
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz)-t.x, p.y);
  return length(q) - t.y;
}
```

### Color

| Article | URL | Summary |
|---|---|---|
| Procedural Palettes | https://iquilezles.org/articles/palettes/ | Cosine palette: `a + b*cos(2π*(c*t+d))` |
| Smoothstep functions | https://iquilezles.org/articles/smoothsteps/ | Comparison of smoothstep variants |
| Inverse smoothstep | https://iquilezles.org/articles/ismoothstep/ | Invert a smoothstep curve |

**Cosine palette GLSL implementation:**
```glsl
// From https://iquilezles.org/articles/palettes/
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

// Example presets
// Warm sunset
vec3 col = palette(t,
  vec3(0.5, 0.5, 0.5),  // a: offset (brightness)
  vec3(0.5, 0.5, 0.5),  // b: amplitude (contrast)
  vec3(1.0, 1.0, 1.0),  // c: frequency (color speed)
  vec3(0.00, 0.33, 0.67) // d: phase (color shift)
);

// Rainbow
vec3 col = palette(t,
  vec3(0.5, 0.5, 0.5),
  vec3(0.5, 0.5, 0.5),
  vec3(1.0, 1.0, 1.0),
  vec3(0.0, 0.10, 0.20)
);
```

### Raymarching

| Article | URL |
|---|---|
| Raymarching Distance Fields | https://iquilezles.org/articles/raymarchingdf/ |

```glsl
// Minimal raymarcher
float map(vec3 p) {
  return sdSphere(p - vec3(0, 0.5, 0), 0.5);
}

vec3 calcNormal(vec3 p) {
  const float eps = 0.001;
  return normalize(vec3(
    map(p + vec3(eps, 0, 0)) - map(p - vec3(eps, 0, 0)),
    map(p + vec3(0, eps, 0)) - map(p - vec3(0, eps, 0)),
    map(p + vec3(0, 0, eps)) - map(p - vec3(0, 0, eps))
  ));
}

vec3 render(vec3 ro, vec3 rd) {
  float t = 0.0;
  for (int i = 0; i < 100; i++) {
    float d = map(ro + rd * t);
    if (d < 0.001) break;
    t += d;
    if (t > 20.0) return vec3(0.1);  // miss
  }
  vec3 pos = ro + rd * t;
  vec3 nor = calcNormal(pos);
  return nor * 0.5 + 0.5;  // normal visualization
}
```

---

## 7. Three.js Official Shader Examples

Browse at: https://threejs.org/examples/?q=shader and https://threejs.org/examples/?q=webgpu

### TSL / WebGPU Examples

| Example name | Description |
|---|---|
| `webgpu_tsl_editor` | Interactive TSL node editor in-browser |
| `webgpu_tsl_wood` | Procedural wood material via TSL (by Logan Seeley) |
| `webgpu_tsl_interoperability` | Mix TSL and raw WGSL — CRT shader |
| `webgpu_materials` | Showcase of TSL built-ins: positionLocal, positionWorld, normalLocal, normalWorld, normalView, oscSine, triplanarTexture, screenUV, Loop, etc. |
| `webgpu_particles` | GPU particle system using TSL compute |
| `webgpu_caustics` | Real-time caustics rendering |
| `webgpu_compute_texture` | Compute shader writing to texture |
| `webgpu_skinning` | Skinned mesh animation with WebGPU |
| `webgpu_postprocessing` | TSL-native post-processing pipeline |
| `webgpu_postprocessing_bloom` | Bloom via TSL pipeline |

### WebGL ShaderMaterial Examples

| Example name | Description |
|---|---|
| `webgl_shader` | Basic custom ShaderMaterial with animated uniforms |
| `webgl_shader_lava` | Lava effect — noise + texture blending |
| `webgl_shader_ocean` | Ocean waves with normal maps |
| `webgl_shader_sky` | Preetham sky model |
| `webgl_shaders_ocean` | FFT ocean simulation |
| `webgl_materials_wireframe` | Custom wireframe via barycentrics |
| `webgl_postprocessing` | Classic EffectComposer with passes |
| `webgl_postprocessing_bloom` | Bloom pass |
| `webgl_postprocessing_dof` | Depth of field pass |
| `webgl_postprocessing_ssao` | SSAO pass |
| `webgl_postprocessing_outline` | Outline pass |
| `webgl_materials_displacementmap` | Displacement via ShaderMaterial |

### Notable Patterns in Examples

**`webgpu_materials` shows all major TSL built-in nodes in use.** Source at:
https://github.com/mrdoob/three.js/blob/master/examples/webgpu_materials.html

Key pattern from that example:
```javascript
// colorNode variants
material.colorNode = positionLocal;           // visualize position
material.colorNode = normalLocal;             // visualize normals
material.colorNode = texture(map, uv());      // standard texture
material.colorNode = oscSine(time).mul(color(0xffffff));  // animated
material.colorNode = triplanarTexture(map);   // triplanar
material.colorNode = screenUV.toVec3();       // screen-space UV
```

---

## Quick-Reference: Import Cheatsheet

```javascript
// TSL core nodes
import {
  // Types
  float, int, uint, bool,
  vec2, vec3, vec4,
  mat2, mat3, mat4,
  color,

  // Built-ins
  uv, time, deltaTime,
  positionLocal, positionWorld, positionView,
  normalLocal, normalWorld, normalView,
  cameraPosition,
  screenUV, viewportUV,

  // Texture
  texture, textureLoad, cubeTexture,
  textureBicubic, triplanarTexture,

  // Uniforms
  uniform, uniformArray,

  // Math
  mix, step, smoothstep, clamp, saturate,
  sin, cos, abs, pow, sqrt, floor, ceil, fract,
  dot, cross, normalize, length, reflect, refract,

  // Oscillators
  oscSine, oscSquare, oscTriangle, oscSawtooth,

  // Noise
  hash, mx_noise_float, mx_noise_vec3,

  // Functions
  Fn,

  // Control flow
  If, Loop, Break, Continue, select, Switch,

  // Variables
  Var, Const, varying, vertexStage,

  // Post-processing (built into TSL)
  bloom, gaussianBlur, fxaa, smaa
} from 'three/tsl';

// Materials
import {
  MeshStandardNodeMaterial,
  MeshPhysicalNodeMaterial,
  MeshBasicNodeMaterial,
  PointsNodeMaterial,
  LineBasicNodeMaterial,
  SpriteNodeMaterial
} from 'three/webgpu';
```

---

## Sources

- [Three.js Shading Language Wiki](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language) — Primary TSL reference, updated 2026-02-28
- [TSL Docs (threejs.org)](https://threejs.org/docs/pages/TSL.html) — Official API reference
- [Field Guide to TSL and WebGPU (Maxime Heckel)](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/) — Deep tutorial
- [TSL: A Better Way to Write Shaders (Three.js Roadmap)](https://threejsroadmap.com/blog/tsl-a-better-way-to-write-shaders-in-threejs) — Overview
- [10 Noise Functions for TSL (Three.js Roadmap)](https://threejsroadmap.com/blog/10-noise-functions-for-threejs-tsl-shaders) — mx_noise_float, mx_noise_vec3
- [ShaderMaterial Docs (threejs.org)](https://threejs.org/docs/pages/ShaderMaterial.html) — Official API
- [Study of Shaders with R3F (Maxime Heckel)](https://blog.maximeheckel.com/posts/the-study-of-shaders-with-react-three-fiber/) — R3F ShaderMaterial patterns
- [pmndrs/postprocessing GitHub](https://github.com/pmndrs/postprocessing) — Source and README
- [pmndrs/react-postprocessing GitHub](https://github.com/pmndrs/react-postprocessing) — R3F wrapper
- [react-postprocessing Docs](https://react-postprocessing.docs.pmnd.rs/) — Component API
- [postprocessing Custom Effects Wiki](https://github.com/pmndrs/postprocessing/wiki/Custom-Effects) — Effect class guide
- [The Book of Shaders](https://thebookofshaders.com/) — Chapters 05–13
  - [Ch.11: Noise](https://thebookofshaders.com/11/)
  - [Ch.12: Cellular](https://thebookofshaders.com/12/)
  - [Ch.13: FBM](https://thebookofshaders.com/13/)
  - [Ch.07: Shapes](https://thebookofshaders.com/07/)
  - [Ch.05: Shaping](https://thebookofshaders.com/05/)
- [LYGIA Shader Library](https://lygia.xyz/) — Cross-language shader modules
- [LYGIA GitHub](https://github.com/patriciogonzalezvivo/lygia) — Source
- [LYGIA Three.js Examples](https://github.com/guidoschmidt/examples.lygia-threejs) — Integration examples
- [Inigo Quilez Articles](https://iquilezles.org/articles/) — All shader articles
  - [3D SDF Functions](https://iquilezles.org/articles/distfunctions/)
  - [2D SDF Functions](https://iquilezles.org/articles/distfunctions2d/)
  - [Procedural Palettes](https://iquilezles.org/articles/palettes/)
  - [Gradient Noise Derivatives](https://iquilezles.org/articles/gradientnoise/)
  - [Value Noise Derivatives](https://iquilezles.org/www/articles/morenoise/morenoise.htm)
  - [Voronoise](https://iquilezles.org/articles/voronoise/)
  - [Smooth Voronoi](https://iquilezles.org/articles/smoothvoronoi/)
  - [smin (smooth minimum)](https://iquilezles.org/www/articles/smin/smin.htm)
  - [Smoothstep variants](https://iquilezles.org/articles/smoothsteps/)
  - [Raymarching SDF](https://iquilezles.org/articles/raymarchingdf/)
  - [FBM + SDF](https://iquilezles.org/articles/fbmsdf/)
- [Three.js Examples](https://threejs.org/examples/) — Interactive examples browser
- [webgl-noise (stegu)](https://github.com/stegu/webgl-noise) — GLSL Simplex/Perlin/Worley implementations
- [GLSL Noise Algorithms Gist](https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83) — Quick reference implementations
- [tslfx library](https://github.com/verekia/tslfx) — Community VFX/SDF collection for TSL
