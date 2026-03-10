# TSL (Three Shader Language) — Complete Reference

TSL is a node-based shader abstraction written in JavaScript. It compiles to GLSL (WebGL2) and WGSL (WebGPU) automatically, making shaders renderer-agnostic. **Production-ready since Three.js r163. Default choice for new projects.**

Import path: `three/tsl` (also re-exported from `three/webgpu`)
Renderer: `WebGPURenderer` from `three/webgpu` — auto-falls back to WebGL2.

---

## Node Types

### Scalars

```javascript
float(node | number)     // float
int(node | number)       // int
uint(node | number)      // uint
bool(node | value)       // bool
```

### Vectors

```javascript
vec2(node | Vector2 | x, y)
vec3(node | Vector3 | x, y, z)
vec4(node | Vector4 | x, y, z, w)
ivec2/3/4(...)           // integer vectors
uvec2/3/4(...)           // unsigned integer vectors
bvec2/3/4(...)           // boolean vectors
color(node | hexInt | r, g, b)  // treated as vec3 internally
```

### Matrices

```javascript
mat2(node | Matrix2 | ...)
mat3(node | Matrix3 | ...)
mat4(node | Matrix4 | ...)
```

### Swizzle

```javascript
const v = vec3(1, 2, 3);
v.zyx     // → vec3(3, 2, 1)
v.xy      // → vec2(1, 2)
v.r       // component access via rgba, xyzw, or stpq
```

---

## Uniform Nodes

```javascript
import { uniform, uniformArray } from 'three/tsl';

// Scalar / object uniforms
const myColor = uniform(new THREE.Color(0x0066ff));
const myValue = uniform(0.5);

// Update value
myColor.value = new THREE.Color(0xff0000);
myValue.value = 0.9;

// Update callbacks (avoid manual useFrame for simple cases)
myColor.onFrameUpdate(({ frame }) => { /* once per frame */ });
myColor.onRenderUpdate(({ renderer }) => { /* once per render call */ });
myColor.onObjectUpdate(({ object }) => { /* per object in scene */ });

// Array uniforms
const tintColors = uniformArray([
  new THREE.Color(1, 0, 0),
  new THREE.Color(0, 1, 0)
], 'color');
```

---

## Built-in Nodes

```javascript
// UV
uv(index = 0)                // vec2 — accesses uv attribute

// Time
time                         // float, seconds since renderer start
deltaTime                    // float, frame delta seconds

// Position
positionGeometry             // unmodified attribute
positionLocal                // after morphing/skinning
positionWorld                // world-space
positionWorldDirection       // normalized world direction
positionView                 // view-space
positionViewDirection        // normalized view direction

// Normals
normalGeometry               // raw attribute
normalLocal                  // local space
normalView                   // view-space (normalized)
normalWorld                  // world-space (normalized)

// Camera
cameraPosition               // world camera position (vec3)
cameraViewMatrix             // mat4
cameraProjectionMatrix       // mat4
cameraNear                   // float
cameraFar                    // float

// Screen
screenUV                     // normalized framebuffer coord (vec2)
screenCoordinate             // pixel units (vec2)
screenSize                   // framebuffer size (vec2)
viewportUV                   // normalized viewport coord
viewportSharedTexture(uv)    // already-rendered content (for refraction)
viewportLinearDepth          // orthographic depth value
```

---

## Texture Nodes

```javascript
texture(textureNode, uv = uv(), level = null)        // sampled → vec4
textureLoad(texture, uv, level = null)               // uninterpolated fetch
cubeTexture(texture, uvw = reflectVector, level)     // cube map
texture3D(texture, uvw, level)                       // 3D texture
textureStore(storageTexture, coord, value)           // write to storage texture
textureSize(map, 0)                                  // → ivec2
textureBicubic(map, strength)                        // bicubic filtering
triplanarTexture(texX, texY, texZ, scale, position, normal)
```

---

## Composition Operators

All operators return nodes and support chaining:

```javascript
a.add(b)                    // a + b
a.sub(b)                    // a - b
a.mul(b)                    // a * b
a.div(b)                    // a / b
a.mod(b)                    // a % b
mix(x, y, a)                // linear interpolation
step(edge, x)               // step function
smoothstep(e0, e1, x)       // Hermite interpolation
clamp(x, min, max)
saturate(x)                 // clamp to [0, 1]

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

---

## Math Library

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

---

## Noise Nodes (MaterialX)

```javascript
import { mx_noise_float, mx_noise_vec3 } from 'three/tsl';

// Float noise
// Signature: mx_noise_float(position: vec3, amplitude?: float, pivot?: float) → float
const n = mx_noise_float(positionWorld.mul(2.0));

// Vec3 noise
// Signature: mx_noise_vec3(position: vec3, amplitude?: float, pivot?: float) → vec3
const n3 = mx_noise_vec3(positionWorld.mul(0.5).add(vec3(0, time, 0)));

// Water-like color effect
const p = uv().toVec3().mul(3.0);
const raw = mx_noise_vec3(vec3(p.x, p.y, time.mul(0.5))).x;
const adjusted = raw.add(0.5).mul(0.5);  // remap [-0.5, 0.5] → [0, 1]
material.colorNode = mix(color(0x001e5f), color(0x00b4d8), adjusted);
```

---

## Oscillators

```javascript
import { oscSine, oscSquare, oscTriangle, oscSawtooth } from 'three/tsl';

oscSine(time)       // float in [-0.5, 0.5]
oscSquare(time)     // float, square wave
oscTriangle(time)   // float, triangle wave
oscSawtooth(time)   // float in [0, 1]
```

---

## Hash / Random

```javascript
import { hash, range } from 'three/tsl';

hash(seed)                    // float in [0, 1] from seed node
range(minColor, maxColor)     // per-instance range (useful with InstancedMesh)
```

---

## Custom Function Nodes

```javascript
import { Fn } from 'three/tsl';

// Basic: receives array of input nodes
const average = Fn(([a, b]) => {
  return a.add(b).mul(0.5);
});
material.colorNode = average(colorA, colorB);

// With material/object context (deferred)
const adaptiveColor = Fn(({ material, object }) => {
  if (material.userData.isSpecial) {
    return vec3(1, 0, 0);
  }
  return vec3(0.5);
});
material.colorNode = adaptiveColor();
```

> **Note:** `tslFn` is the legacy alias for `Fn`. Use `Fn` in all new code — `tslFn` is deprecated.

---

## Variables, Constants, Properties

```javascript
// Reusable mutable variable
const uvScaled = uv().mul(10).toVar();
uvScaled.addAssign(0.1);

// Inline constant
const uvScaled = uv().mul(10).toConst();

// Property without initial value
const prop = property('vec3');

// Explicit
const myVar = Var(value, 'optionalName');
const myConst = Const(value);
```

---

## Control Flow

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

// Loop (fixed count)
Loop(10, ({ i }) => { /* i: 0–9 */ });

// Loop (custom range)
Loop({ start: int(0), end: int(count), type: 'int' }, ({ i }) => { /* ... */ });

// Nested loops
Loop(10, 5, ({ i, j }) => { /* ... */ });

// While-style
const v = float(0);
Loop(v.lessThan(10), () => { v.addAssign(1); });

Break();
Continue();
```

---

## Varying (Vertex → Fragment)

```javascript
import { vertexStage, varying } from 'three/tsl';

// Compute in vertex stage, interpolate to fragment
const worldNormal = vertexStage(modelNormalMatrix.mul(normalLocal));
material.colorNode = worldNormal.normalize().mul(0.5).add(0.5);

// Explicit named varying
const myVarying = varying(nodeValue, 'vMyValue');
```

---

## NodeMaterial Setup (Vanilla Three.js)

```javascript
import * as THREE from 'three/webgpu';
import { texture, uv, normalMap, color, float, mx_noise_float, positionWorld } from 'three/tsl';

const material = new THREE.MeshStandardNodeMaterial();

// Standard PBR slots
material.colorNode      = texture(colorMap, uv());           // vec3
const normalMapTex      = texture(normalMapTexture, uv());
material.normalNode     = normalMap(normalMapTex);           // vec3
material.roughnessNode  = float(0.5);                     // float
material.metalnessNode  = texture(metalMap).r;            // float
material.emissiveNode   = color(0xff0000);                // vec3
material.opacityNode    = float(0.8);                     // float

// Vertex displacement
material.positionNode = positionLocal.add(
  normalLocal.mul(mx_noise_float(positionWorld.mul(2)).mul(0.1))
);

// Physical material extras
material.clearcoatNode    = float(0.5);
material.transmissionNode = float(0.9);
material.iridescenceNode  = float(0.5);

// Full custom fragment (bypasses PBR entirely)
material.fragmentNode = myCustomFn();

// Full custom vertex
material.vertexNode = myVertexFn();
```

### Available NodeMaterial classes

```javascript
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

## NodeMaterial in R3F

```jsx
import { extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { color, float, time, mix, mx_noise_float, positionWorld, uniform } from 'three/tsl';

// Option A: fully declarative
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

// Option B: imperative ref + useFrame for dynamic uniforms
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

---

## Complete Import Reference

```javascript
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

  // Post-processing (TSL-native)
  bloom, gaussianBlur, fxaa, smaa
} from 'three/tsl';
```

---

## GLSL → TSL Migration Patterns

| GLSL | TSL equivalent |
|---|---|
| `uniform float uTime;` | `const uTime = uniform(0.0)` |
| `varying vec2 vUv;` | `varying(uv(), 'vUv')` or just use `uv()` |
| `mix(a, b, t)` | `mix(a, b, t)` |
| `smoothstep(e0, e1, x)` | `smoothstep(e0, e1, x)` |
| `gl_FragColor = vec4(...)` | `material.colorNode = ...` |
| `gl_Position = ...` | `material.positionNode = ...` |
| `if (x > 0.5) { ... }` | `If(x.greaterThan(0.5), () => { ... })` or `select(x.greaterThan(0.5), a, b)` |
| `for (int i = 0; i < 10; i++)` | `Loop(10, ({ i }) => { ... })` |
| Custom function | `Fn(([a, b]) => { ... })` |

---

## Sources

- [Three.js Shading Language Wiki](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language) — Primary reference, updated 2026-02-28
- [TSL Docs (threejs.org)](https://threejs.org/docs/pages/TSL.html) — Official API reference
- [Field Guide to TSL and WebGPU (Maxime Heckel)](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/)
- [Three.js examples: webgpu_materials](https://threejs.org/examples/?q=webgpu) — All built-in nodes in use
