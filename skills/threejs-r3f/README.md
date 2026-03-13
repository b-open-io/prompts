# Three.js / React Three Fiber Skill

This skill guides Claude when building 3D web experiences with React Three Fiber (R3F) v9 and the pmndrs ecosystem.

## What It Does

Covers the complete R3F development workflow: project scaffolding, scene setup, model loading, physics, state management, performance optimization, and WebGPU. Claude will produce production-ready R3F code following the seven performance anti-patterns, correct disposal patterns, and draw-call budgets.

## When to Use

This skill activates automatically when you ask Claude to:

- Build a Three.js or React Three Fiber scene
- Set up a 3D canvas with lighting, camera, and orbit controls
- Load GLTF/GLB models with `useGLTF` or `gltfjsx`
- Add physics with `@react-three/rapier`
- Animate meshes with `useFrame`
- Use Drei helpers (Environment, ScrollControls, Text, Html, etc.)
- Optimize draw calls, instancing, or texture compression
- Enable WebGPU rendering with Three.js r171+

## Version Compatibility

| Package | Version | React |
|---------|---------|-------|
| `@react-three/fiber` | v9.x | 19.x |
| `@react-three/drei` | v9.x+ | 19.x |
| `@react-three/rapier` | v2.x | 19.x |
| `three` | r171+ | — |

Use fiber v8 + rapier v1 for React 18 projects.

## Learning Resources

- [R3F Documentation](https://r3f.docs.pmnd.rs/)
- [Drei Helpers](https://github.com/pmndrs/drei)
- [Rapier Physics](https://rapier.rs/docs/)
- [Three.js Manual](https://threejs.org/manual/)
- [Three.js WebGPU / TSL](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language)
- [gltfjsx](https://github.com/pmndrs/gltfjsx) — convert GLB files to React components

## Reference Files

Detailed content lives in `references/` and is loaded by Claude as needed:

- **`references/r3f-patterns.md`** — Canvas props, `useFrame`, `useThree`, event system, scroll-driven scenes, zustand imperative pattern, GLTF clone pattern, KTX2 textures, lazy loading, parallel preloading
- **`references/drei-helpers.md`** — Full Drei inventory by category: every helper with import, key props, and working example
- **`references/performance.md`** — All 7 anti-patterns with wrong/correct code, draw call budgets, instancing, LOD, texture compression, disposal checklist, frustum culling, r3f-perf, mobile rules
- **`references/physics.md`** — Full Rapier v2 reference: all collider types, MeshCollider, collision events, contact forces, sensors, all 6 joints, forces/impulses, InstancedRigidBodies
- **`references/scene-setup.md`** — Minimal scene template, frameloop values, Canvas defaults, responsive canvas, WebGPU renderer setup
- **`references/extras.md`** — State management (zustand), debug GUI (leva), physics quick start, WebGPU bootstrap
