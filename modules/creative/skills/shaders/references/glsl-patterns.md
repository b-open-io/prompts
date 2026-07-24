# GLSL Shader Patterns — Recipes for Three.js

Complete vertex + fragment shader recipes for common effects. Each recipe includes uniform declarations and R3F integration. All code is verified against the research reference.

---

## Setup: Drei shaderMaterial Helper (Recommended for R3F)

The `shaderMaterial` helper from `@react-three/drei` is the cleanest GLSL integration for R3F — no manual `extend` boilerplate, direct property access in `useFrame`:

```jsx
import { shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const WaveMaterial = shaderMaterial(
  { uTime: 0, uColor: new THREE.Color(0x00aaff) },
  // vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment shader
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

---

## Uniform Types Reference

| JS Value | GLSL Type |
|---|---|
| `Number` (float) | `float` |
| `THREE.Vector2` | `vec2` |
| `THREE.Vector3` | `vec3` |
| `THREE.Color` | `vec3` (rgb) |
| `THREE.Matrix4` | `mat4` |
| `THREE.Texture` | `sampler2D` |
| `Boolean` | `bool` |

**Built-in uniforms** (ShaderMaterial only — injected automatically, no declaration needed):

```glsl
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;

attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
```

---

## Recipe 1: Noise (Value Noise + FBM)

**Look:** Organic, cloudy surface movement. Foundation for most other effects.

```glsl
// --- Vertex ---
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// --- Fragment ---
uniform float uTime;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  vec2 u = f * f * (3.0 - 2.0 * f);  // smoothstep curve
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 6; i++) {
    value += amplitude * noise(st);
    st *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

varying vec2 vUv;
void main() {
  float n = fbm(vUv * 3.0 + uTime * 0.1);
  gl_FragColor = vec4(vec3(n), 1.0);
}
```

**Uniforms:** `{ uTime: { value: 0 } }`
**Performance:** 6 FBM octaves = ~12 noise samples per fragment. Reduce to 3–4 octaves for mobile.

---

## Recipe 2: Simplex Noise (from stegu/webgl-noise)

**Look:** Smoother than value noise, no grid artifacts. Source: https://github.com/stegu/webgl-noise

```glsl
// Simplex 2D — paste before main()
// From stegu/webgl-noise (Ian McEwan & Stefan Gustavson)
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = mod(((i.y + vec3(0.0, i1.y, 1.0)) * 34.0 + 1.0) *
               (i.y + vec3(0.0, i1.y, 1.0)), 289.0)
         + i.x + vec3(0.0, i1.x, 1.0);
  p = mod((p * 34.0 + 1.0) * p, 289.0);
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
```

**Tip:** For full implementations, prefer including from https://github.com/ashima/webgl-noise via LYGIA.

---

## Recipe 3: Fresnel / Rim Lighting

**Look:** Glowing edges that brighten at grazing angles — glass, energy shields, holograms.

```glsl
// --- Vertex ---
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vNormal  = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}

// --- Fragment ---
uniform vec3  uFresnelColor;
uniform float uFresnelPower;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), uFresnelPower);
  gl_FragColor = vec4(uFresnelColor * fresnel, fresnel);
}
```

**Uniforms:**
```javascript
{
  uFresnelColor: { value: new THREE.Color(0x00ffff) },
  uFresnelPower: { value: 3.0 }  // higher = tighter rim
}
```
**Note:** Set `transparent: true` on the material for the alpha channel to take effect.

---

## Recipe 4: Dissolve / Disintegration

**Look:** Surface erodes away based on a noise threshold — fire, teleportation, death.

```glsl
// --- Vertex ---
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// --- Fragment ---
uniform float uProgress;   // 0.0 = fully visible, 1.0 = fully dissolved
uniform vec3  uEdgeColor;
uniform sampler2D uNoiseMap;
varying vec2 vUv;

void main() {
  float n = texture2D(uNoiseMap, vUv).r;

  // Discard fragments below threshold
  if (n < uProgress) discard;

  // Glow edge near the threshold
  float edge = smoothstep(uProgress, uProgress + 0.05, n);
  vec3 col = mix(uEdgeColor, vec3(1.0), edge);

  gl_FragColor = vec4(col, 1.0);
}
```

**Uniforms:**
```javascript
{
  uProgress:  { value: 0.0 },     // animate 0→1
  uEdgeColor: { value: new THREE.Color(0xff4400) },
  uNoiseMap:  { value: noiseTexture }
}
```
**Tip:** Animate `uProgress` with `useFrame`. Using a pre-baked noise texture is cheaper than computing noise in the shader.

---

## Recipe 5: Hologram / Scan Lines

**Look:** Translucent blue mesh with horizontal scan lines moving upward.

```glsl
// --- Vertex ---
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vUv     = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}

// --- Fragment ---
uniform float uTime;
uniform vec3  uColor;
varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vViewDir;

void main() {
  // Fresnel for edge glow
  float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.0);

  // Horizontal scan lines
  float scanLine = step(0.98, fract(vUv.y * 50.0 - uTime * 0.5));

  // Flickering
  float flicker = 0.9 + 0.1 * sin(uTime * 20.0);

  float alpha = (fresnel * 0.5 + 0.3 + scanLine * 0.5) * flicker;
  gl_FragColor = vec4(uColor, alpha);
}
```

**Uniforms:**
```javascript
{
  uTime:  { value: 0 },
  uColor: { value: new THREE.Color(0x00aaff) }
}
```
**Note:** Requires `transparent: true` and `depthWrite: false` on the material. Works best with `side: THREE.DoubleSide`.

---

## Recipe 6: Water Surface

**Look:** Animated vertex displacement + Fresnel coloring. Works on a `PlaneGeometry` with high subdivision.

```glsl
// --- Vertex ---
uniform float uTime;
uniform float uWaveHeight;
uniform float uWaveFrequency;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

// Value noise for wave displacement
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(random(i), random(i + vec2(1,0)), u.x),
             mix(random(i + vec2(0,1)), random(i + vec2(1,1)), u.x), u.y);
}

void main() {
  vUv = uv;
  vec3 pos = position;

  // Displace Y axis by noise
  float wave = noise(pos.xz * uWaveFrequency + uTime * 0.5);
  pos.y += wave * uWaveHeight;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  vNormal  = normalize(normalMatrix * normal);
  vViewDir = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}

// --- Fragment ---
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.0);
  vec3 col = mix(uDeepColor, uShallowColor, fresnel);
  gl_FragColor = vec4(col, 0.85);
}
```

**Uniforms:**
```javascript
{
  uTime:          { value: 0 },
  uWaveHeight:    { value: 0.15 },
  uWaveFrequency: { value: 3.0 },
  uDeepColor:     { value: new THREE.Color(0x001e5f) },
  uShallowColor:  { value: new THREE.Color(0x00b4d8) }
}
```
**Geometry:** `<planeGeometry args={[10, 10, 128, 128]} />` — needs high subdivision for smooth waves.

---

## Recipe 7: Matcap Material

**Look:** Pre-lit sphere-mapped material. Zero lighting computation; reads color from a matcap texture.

```glsl
// --- Vertex ---
varying vec2 vMatcapUv;
void main() {
  vec3 viewNormal = normalize(normalMatrix * normal);
  vMatcapUv = viewNormal.xy * 0.5 + 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// --- Fragment ---
uniform sampler2D uMatcap;
varying vec2 vMatcapUv;
void main() {
  gl_FragColor = texture2D(uMatcap, vMatcapUv);
}
```

**Uniforms:** `{ uMatcap: { value: matcapTexture } }`
**Performance:** Very fast — no lighting calculations. Ideal for stylized characters.

---

## Recipe 8: Toon / Cel Shading

**Look:** Flat bands of color based on light angle — cartoon style.

```glsl
// --- Vertex ---
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// --- Fragment ---
uniform vec3  uColor;
uniform vec3  uLightDir;  // normalized, world space
varying vec3 vNormal;

void main() {
  float NdotL = max(dot(vNormal, uLightDir), 0.0);

  // Quantize lighting into 3 bands
  float cel = NdotL < 0.3 ? 0.1 :
              NdotL < 0.7 ? 0.5 : 1.0;

  gl_FragColor = vec4(uColor * cel, 1.0);
}
```

**Uniforms:**
```javascript
{
  uColor:    { value: new THREE.Color(0xff6622) },
  uLightDir: { value: new THREE.Vector3(1, 1, 1).normalize() }
}
```
**Tip:** Combine with an outline pass from `@react-three/postprocessing` for full cel-shaded look.

---

## Recipe 9: Custom Particle Shader

**Look:** Point sprites with size attenuation — particles that appear larger when close to camera.

```glsl
// --- Vertex ---
uniform float uSize;
uniform float uTime;
attribute float aScale;  // per-particle scale, set via BufferAttribute

void main() {
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * aScale * (300.0 / -mvPos.z);  // size attenuation
  gl_Position  = projectionMatrix * mvPos;
}

// --- Fragment ---
uniform vec3 uColor;

void main() {
  // Circular particle (discard corners)
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;

  float alpha = 1.0 - smoothstep(0.3, 0.5, d);
  gl_FragColor = vec4(uColor, alpha);
}
```

**Uniforms:**
```javascript
{
  uSize:  { value: 3.0 },
  uTime:  { value: 0 },
  uColor: { value: new THREE.Color(0xffffff) }
}
```
**Geometry:** Use `<bufferGeometry>` with `<bufferAttribute>` for positions and `aScale` per-particle attribute. Material: `<pointsMaterial>` or custom via `Points` object.

---

## Recipe 10: Chromatic Aberration (Post-process in GLSL)

**Look:** RGB channels shift slightly — lens distortion, glitch effect.

Apply as a full-screen effect reading from a texture (e.g., as a custom postprocessing Effect, or on a full-screen plane):

```glsl
// --- Fragment (full-screen pass) ---
uniform sampler2D uScene;
uniform vec2 uOffset;  // e.g., vec2(0.005, 0.0)
varying vec2 vUv;

void main() {
  float r = texture2D(uScene, vUv + uOffset).r;
  float g = texture2D(uScene, vUv).g;
  float b = texture2D(uScene, vUv - uOffset).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}
```

**Uniforms:** `{ uScene: { value: renderTarget.texture }, uOffset: { value: new THREE.Vector2(0.005, 0.0) } }`

**For R3F:** Prefer `<ChromaticAberration>` from `@react-three/postprocessing` — same effect with zero boilerplate. See `references/postprocessing.md`.

---

## Recipe 11: Raymarching

**Look:** Renders 3D scenes by stepping rays through a signed distance field — no geometry required, pure math.

```glsl
// --- Vertex ---
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// --- Fragment ---
uniform float uTime;
uniform vec2  uResolution;
varying vec2  vUv;

// Scene SDF — sphere centered at (0, 0.5, 0)
float map(vec3 p) {
  return length(p - vec3(0.0, 0.5, 0.0)) - 0.5;
}

// Central-differences normal estimation
vec3 calcNormal(vec3 p) {
  const float eps = 0.001;
  return normalize(vec3(
    map(p + vec3(eps, 0.0, 0.0)) - map(p - vec3(eps, 0.0, 0.0)),
    map(p + vec3(0.0, eps, 0.0)) - map(p - vec3(0.0, eps, 0.0)),
    map(p + vec3(0.0, 0.0, eps)) - map(p - vec3(0.0, 0.0, eps))
  ));
}

void main() {
  // Reconstruct ray from UV
  vec2 uv = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);
  vec3 ro = vec3(0.0, 0.5, 2.0);         // ray origin (camera position)
  vec3 rd = normalize(vec3(uv, -1.0));   // ray direction

  // March the ray
  float t = 0.0;
  vec3 col = vec3(0.05);                  // background
  for (int i = 0; i < 64; i++) {
    float d = map(ro + rd * t);
    if (d < 0.001) {
      vec3 pos = ro + rd * t;
      vec3 nor = calcNormal(pos);
      vec3 light = normalize(vec3(1.0, 2.0, 1.0));
      float diff = max(dot(nor, light), 0.0);
      col = vec3(0.2 + 0.8 * diff);       // simple diffuse shading
      break;
    }
    t += d;
    if (t > 20.0) break;                  // early termination — miss
  }

  gl_FragColor = vec4(col, 1.0);
}
```

**Uniforms:**
```javascript
{
  uTime:       { value: 0 },
  uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
}
```

**Geometry:** Apply to a `<planeGeometry args={[2, 2]} />` that fills the viewport, or use as a fullscreen post-process pass.

**Performance:** Expensive — limit step count on mobile (32 or fewer). Use early termination (`t > maxDist`). Each additional SDF object in `map()` adds cost. Profile with `renderer.info`.

**Reference:** Inigo Quilez — https://iquilezles.org/articles/raymarchingdf/

---

## Procedural Palette (Inigo Quilez)

A compact way to generate smooth color progressions procedurally. Source: https://iquilezles.org/articles/palettes/

```glsl
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

// Warm sunset preset
vec3 col = palette(t,
  vec3(0.5, 0.5, 0.5),   // a: brightness
  vec3(0.5, 0.5, 0.5),   // b: contrast
  vec3(1.0, 1.0, 1.0),   // c: frequency
  vec3(0.00, 0.33, 0.67) // d: phase
);

// Rainbow preset
vec3 col = palette(t,
  vec3(0.5, 0.5, 0.5),
  vec3(0.5, 0.5, 0.5),
  vec3(1.0, 1.0, 1.0),
  vec3(0.0, 0.10, 0.20)
);
```

Animate `t` with `uTime` to cycle through colors.

---

## SDF Basics

Signed Distance Functions return the signed distance to a shape (negative inside, positive outside, zero on boundary). Combine with `smoothstep` for anti-aliased edges.

```glsl
// Circle
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

// Box (2D)
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Anti-aliased circle in fragment shader
float shape = sdCircle(vUv - 0.5, 0.3);
float col = smoothstep(0.005, -0.005, shape);

// SDF boolean operations
float sdfUnion(float d1, float d2)    { return min(d1, d2); }
float sdfSubtract(float d1, float d2) { return max(-d1, d2); }
float sdfIntersect(float d1, float d2){ return max(d1, d2); }

// Smooth union (smin) — from iquilezles.org/articles/smin
float smin(float a, float b, float k) {
  float h = max(k - abs(a-b), 0.0) / k;
  return min(a, b) - h*h*k*(1.0/4.0);
}
```

For 3D SDF primitives (sphere, box, capsule, torus): https://iquilezles.org/articles/distfunctions/

---

## LYGIA Integration

LYGIA provides production-quality shader modules (noise, SDF, color, filters) via `#include`:

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

Or use the npm package with `vite-plugin-glsl`: `bun add lygia vite-plugin-glsl`

---

## Sources

- [stegu/webgl-noise](https://github.com/stegu/webgl-noise) — Simplex, Perlin, Worley GLSL implementations
- [Book of Shaders Ch.11 (Noise)](https://thebookofshaders.com/11/)
- [Book of Shaders Ch.13 (FBM)](https://thebookofshaders.com/13/)
- [Inigo Quilez — Procedural Palettes](https://iquilezles.org/articles/palettes/)
- [Inigo Quilez — 3D SDF Functions](https://iquilezles.org/articles/distfunctions/)
- [LYGIA shader library](https://lygia.xyz/)
- [Study of Shaders with R3F (Maxime Heckel)](https://blog.maximeheckel.com/posts/the-study-of-shaders-with-react-three-fiber/)
