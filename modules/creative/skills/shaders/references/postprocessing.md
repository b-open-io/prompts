# pmndrs/postprocessing — Complete Guide

Full reference for `postprocessing` (vanilla) and `@react-three/postprocessing` (R3F).

## Installation

```bash
bun add postprocessing              # vanilla Three.js
bun add @react-three/postprocessing # React Three Fiber
```

---

## R3F Setup

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

Place `<PostFX />` as a sibling of your scene content inside the R3F `<Canvas>`:

```jsx
<Canvas>
  <Scene />
  <PostFX />
</Canvas>
```

---

## Vanilla EffectComposer Setup

```javascript
import {
  EffectComposer, RenderPass, EffectPass,
  BloomEffect, SMAAEffect, ToneMappingEffect, ToneMappingMode
} from 'postprocessing';
import { HalfFloatType } from 'three';

// Configure renderer for postprocessing
const renderer = new THREE.WebGLRenderer({
  powerPreference: 'high-performance',
  antialias: false,   // let postprocessing handle AA
  stencil: false,
  depth: false,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;  // postprocessing handles tone mapping

// HDR framebuffer prevents banding in dark scenes
const composer = new EffectComposer(renderer, {
  frameBufferType: HalfFloatType
});

composer.addPass(new RenderPass(scene, camera));

const bloom   = new BloomEffect({ luminanceThreshold: 0.9, intensity: 2.0 });
const smaa    = new SMAAEffect();
const toneMap = new ToneMappingEffect({ mode: ToneMappingMode.AGX });

// Merge effects into one EffectPass — one draw call for all
composer.addPass(new EffectPass(camera, bloom, smaa, toneMap));

// Animation loop — replaces renderer.render(scene, camera)
function animate() {
  requestAnimationFrame(animate);
  composer.render();
}
```

---

## Effect Ordering Rules

Order matters: each effect operates on the output of the previous.

```
1. SSAO               → needs depth buffer, must be first
2. DepthOfField       → needs depth, before color grading
3. Bloom              → operates on HDR before tone mapping
4. ToneMapping        → converts HDR → LDR; must follow Bloom
5. ChromaticAberration → full-screen warp, near end
6. Vignette           → full-screen overlay
7. Noise              → full-screen overlay, last
```

> One `EffectPass(camera, ...effects)` is always better than multiple `EffectPass` instances — it merges all shader code into a single draw call.

---

## Effect Reference

### Bloom

```jsx
<Bloom
  luminanceThreshold={0.9}   // brightness cutoff (0 = everything glows)
  luminanceSmoothing={0.025} // knee falloff width
  mipmapBlur={false}         // true = higher quality, more GPU cost
  intensity={1.0}            // glow strength multiplier
  radius={0.85}              // spread (only with mipmapBlur)
  height={300}               // render resolution hint
/>
```

**Cost:** Low without `mipmapBlur`, Medium with `mipmapBlur`.

### DepthOfField

```jsx
<DepthOfField
  focusDistance={0.0}  // normalized camera distance to focus plane
  focalLength={0.02}   // range of acceptable focus (shallower = more blur)
  bokehScale={2.0}     // blur kernel size (larger = more visible bokeh)
  height={480}
/>
```

**Cost:** Medium–High. Bokeh computation is expensive. Skip on mobile.

### SSAO (Screen-Space Ambient Occlusion)

```jsx
<SSAO
  radius={20}            // sample hemisphere radius (screen px)
  intensity={30}         // shadow darkness multiplier
  bias={0.5}             // depth bias to reduce self-occlusion artifacts
  rings={7}              // sample rings (more = higher quality, slower)
  distanceThreshold={1.0}
  distanceFalloff={0.0}
/>
```

**Cost:** Medium–High. Many samples = expensive. Skip on mobile.

### ChromaticAberration

```jsx
<ChromaticAberration
  offset={[0.002, 0.002]}  // Vector2 — RGB channel displacement
  radialModulation={false}  // increase displacement toward screen edges
  modulationOffset={0.5}
/>
```

**Cost:** Very Low. Safe to include on all platforms.

### Vignette

```jsx
<Vignette
  offset={0.1}     // inner radius of vignette
  darkness={1.1}   // edge darkness strength
  eskil={false}    // smooth exponential falloff mode
/>
```

**Cost:** Very Low.

### ToneMapping

```jsx
import { ToneMappingMode } from 'postprocessing';

<ToneMapping
  mode={ToneMappingMode.AGX}
  // Other modes:
  // REINHARD, REINHARD2, REINHARD2_ADAPTIVE,
  // OPTIMIZED_CINEON, CINEON, ACES_FILMIC, LINEAR
/>
```

**Cost:** Very Low. AGX is the recommended default — best highlight rolloff.

### Noise (Film Grain)

```jsx
<Noise
  opacity={0.02}
  premultiply={true}    // multiply by input alpha before blending
/>
```

**Cost:** Very Low.

### Outline

```jsx
<Outline
  selection={selectedObjects}   // Set or Array of Object3D
  edgeStrength={2.5}
  pulseSpeed={0.0}
  visibleEdgeColor={0xffffff}
  hiddenEdgeColor={0x22090a}
  blur={false}
  xRay={true}                   // show outline through other objects
/>
```

**Cost:** Medium. Renders a selection pass for outlined objects.

### GodRays

```jsx
import { GodRays } from '@react-three/postprocessing';

// GodRays requires a light mesh as source
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

**Cost:** Medium. Radial blur from light source.

---

## Performance Cost Summary

| Effect | Cost | Notes |
|---|---|---|
| ChromaticAberration | Very Low | Always safe |
| Vignette | Very Low | Always safe |
| Noise | Very Low | Always safe |
| ToneMapping | Very Low | Required for correct output |
| SMAA (anti-aliasing) | Low | Cheaper than MSAA |
| GodRays | Low–Medium | Radial blur cost |
| Bloom (no mipmapBlur) | Low | |
| Outline | Medium | Selection pass overhead |
| Bloom (mipmapBlur) | Medium | Higher quality |
| DepthOfField | Medium–High | Skip on mobile |
| SSAO | Medium–High | Skip on mobile |

---

## Mobile Recommendations

```jsx
// Mobile-safe composition
<EffectComposer>
  <Bloom luminanceThreshold={0.9} intensity={1.0} />
  <ToneMapping mode={ToneMappingMode.AGX} />
  <Vignette offset={0.15} darkness={0.8} />
  <Noise opacity={0.02} premultiply />
</EffectComposer>
```

- Skip SSAO and DepthOfField entirely
- Use Bloom without `mipmapBlur`
- Vignette and Noise have near-zero cost — keep them
- ChromaticAberration is safe if subtle values are used

---

## Custom Effect Authoring

Extend the `Effect` base class. Write a fragment shader with the `mainImage` entry point:

```javascript
import { Uniform, Vector3 } from 'three';
import { BlendFunction, Effect } from 'postprocessing';

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
      blendFunction: BlendFunction.SRC,
      uniforms: new Map([
        ['uWeights', new Uniform(weights)]
      ])
    });
  }

  set weights(v) { this.uniforms.get('uWeights').value = v; }
  get weights()  { return this.uniforms.get('uWeights').value; }
}
```

### Fragment shader entry points

**Standard (color only):**
```glsl
void mainImage(
  const in vec4 inputColor,
  const in vec2 uv,
  out vec4 outputColor
) { ... }
```

**Depth-aware:**
```glsl
void mainImage(
  const in vec4 inputColor,
  const in vec2 uv,
  const in float depth,   // linearized depth [0, 1]
  out vec4 outputColor
) { ... }
```

**UV manipulation (warps sampling coordinates):**
```glsl
void mainUv(inout vec2 uv) {
  uv.x += sin(uv.y * 10.0 + time) * 0.01;
}
```

### Auto-provided uniforms (no declaration needed)

```glsl
uniform sampler2D inputBuffer;
uniform sampler2D depthBuffer;
uniform vec2 resolution;
uniform vec2 texelSize;
uniform float cameraNear;
uniform float cameraFar;
uniform float aspect;
uniform float time;
```

### BlendFunction options

```javascript
import { BlendFunction } from 'postprocessing';

BlendFunction.SRC          // replace output (default for color effects)
BlendFunction.NORMAL       // standard alpha blend
BlendFunction.ADD          // additive
BlendFunction.SCREEN       // screen blend
BlendFunction.MULTIPLY     // multiply
BlendFunction.OVERLAY      // overlay
BlendFunction.SKIP         // no blending (passthrough)
```

---

## Selective Bloom Pattern

Bloom only specific objects by isolating them to a layer:

```jsx
import { EffectComposer, Bloom, SelectiveBloom } from '@react-three/postprocessing';

function Scene() {
  const glowRef = useRef();

  useEffect(() => {
    if (glowRef.current) {
      glowRef.current.layers.set(1);  // assign to layer 1
    }
  }, []);

  return (
    <>
      <mesh ref={glowRef}>
        <sphereGeometry />
        <meshBasicMaterial color={[5, 2, 0]} toneMapped={false} />
      </mesh>
      <EffectComposer>
        <SelectiveBloom
          lights={[]}
          selection={[glowRef]}
          luminanceThreshold={0}
          intensity={3}
        />
        <ToneMapping mode={ToneMappingMode.AGX} />
      </EffectComposer>
    </>
  );
}
```

**Tip:** Set material color values above 1.0 (e.g., `[5, 2, 0]`) with `toneMapped={false}` for HDR bloom source — these values exceed the display range and trigger bloom naturally.

---

## Sources

- [pmndrs/postprocessing GitHub](https://github.com/pmndrs/postprocessing)
- [pmndrs/react-postprocessing GitHub](https://github.com/pmndrs/react-postprocessing)
- [react-postprocessing Docs](https://react-postprocessing.docs.pmnd.rs/)
- [Custom Effects Wiki](https://github.com/pmndrs/postprocessing/wiki/Custom-Effects)
