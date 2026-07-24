# Shaders Skill

Provides Claude with knowledge of GLSL, TSL (Three Shader Language), WebGL/WebGPU shader development, post-processing pipelines, and visual effects for Three.js.

## What This Skill Covers

- TSL (Three Shader Language) node graph system for WebGPU/WebGL2
- Raw GLSL shader development with ShaderMaterial / RawShaderMaterial
- Noise functions, procedural textures, and geometry displacement
- Raymarching and SDF-based rendering techniques
- Post-processing pipelines with pmndrs/postprocessing
- Shader debugging strategies
- Performance optimization rules

## Learning Resources

### Foundational

- **Book of Shaders**: https://thebookofshaders.com
  Chapters 05–13 cover shaping functions, noise, FBM, and SDFs. The definitive beginner-to-intermediate guide.

- **Shadertoy**: https://shadertoy.com
  Live GLSL examples searchable by technique. Use as inspiration and for porting existing shaders.

- **LYGIA shader library**: https://lygia.xyz
  Cross-language shader modules (noise, SDF, color, filters). Works with both GLSL and WGSL.

### SDF and Raymarching

- **Inigo Quilez articles**: https://iquilezles.org/articles/
  Authoritative reference on SDF primitives, smooth blending, noise, and raymarching. Primary source for most SDF patterns in the wild.

### TSL / WebGPU

- **Three.js TSL wiki**: https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language
  Primary TSL reference — node types, built-ins, material setup. Updated alongside Three.js releases.

- **Three.js examples**: https://threejs.org/examples/?q=webgpu
  Interactive TSL examples covering a wide range of effects.

- **tslfx library**: https://github.com/verekia/tslfx
  Community VFX and SDF collection specifically for TSL. Useful for common effects.

- **Maxime Heckel — Field Guide to TSL**: https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/
  Deep-dive article on TSL and WebGPU architecture. Good for understanding the node system conceptually.

### GLSL Noise Implementations

- **webgl-noise**: https://github.com/stegu/webgl-noise
  Reference implementations of Simplex, Perlin, and Worley noise in GLSL. Copy-paste ready.

## Reference Files

The skill bundles three reference documents in `references/`:

- **`tsl-guide.md`** — Complete TSL API: node types, uniforms, built-ins, control flow, varyings, NodeMaterial setup, GLSL-to-TSL migration
- **`glsl-patterns.md`** — Common GLSL shader recipes with complete vertex + fragment code (noise, Fresnel, dissolve, hologram, water, matcap, toon shading, particles)
- **`postprocessing.md`** — Full pmndrs/postprocessing guide: R3F setup, all effects, custom effect authoring, selective bloom pattern
