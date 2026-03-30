# EZKL JavaScript/TypeScript API Reference

Complete API for `@ezkljs/engine` — the WASM-based JS/TS SDK.

## Installation

```bash
bun add @ezkljs/engine
```

## Build Targets

| Import Path | Runtime | Threading |
|------------|---------|-----------|
| `@ezkljs/engine/nodejs` | Node.js, Bun | No web workers |
| `@ezkljs/engine/web` | Browser | SharedArrayBuffer multithreading |

## Node.js / Bun API

No manual initialization needed. WASM loads automatically on first call.

```typescript
import {
  genWitness, prove, verify,
  poseidonHash,
  elgamalGenRandom, elgamalEncrypt, elgamalDecrypt,
  vecU64ToFelt, vecU64ToInt, vecU64ToFloat, floatToVecU64,
  bufferToVecOfVecU64,
  serialize, deserialize
} from '@ezkljs/engine/nodejs';
```

### Core Proof Operations

```typescript
// Generate witness from compiled model and input data
genWitness(compiledModel: Uint8Array, input: Uint8Array): Uint8Array

// Generate a ZK proof
prove(witness: Uint8Array, pk: Uint8Array, compiledModel: Uint8Array, srs: Uint8Array): Uint8Array

// Verify a proof (only needs verification key, not model or private data)
verify(proof: Uint8Array, vk: Uint8Array): boolean
```

### Cryptographic Operations

```typescript
// Poseidon hash (ZK-friendly hash function)
poseidonHash(message: Uint8Array[]): string[]

// ElGamal encryption (for encrypted inputs)
elgamalGenRandom(seed: Uint8Array): {
  r: Uint8Array,
  sk: Uint8Array,
  pk: Uint8Array,
  aux_generator: Uint8Array,
  window_size: number
}
elgamalEncrypt(pk: Uint8Array, message: Uint8Array[], randomness: Uint8Array): Uint8Array
elgamalDecrypt(ciphertext: Uint8Array, sk: Uint8Array): Uint8Array[]
```

### Field Element Conversions

EZKL uses fixed-point field elements internally. These functions convert between JS types and field elements.

```typescript
// Field element represented as 4 u64 limbs
type VecU64 = [number, number, number, number];

vecU64ToFelt(u64s: VecU64): string          // hex string representation
vecU64ToInt(u64s: VecU64): number           // integer value
vecU64ToFloat(u64s: VecU64): number         // rescaled from fixed-point
floatToVecU64(f: number): VecU64            // float to field element
bufferToVecOfVecU64(buf: Uint8Array): VecU64[]  // buffer to array of field elements
```

### Serialization

Required for converting JS objects to Uint8Array buffers before passing to engine methods.

```typescript
serialize(artifact: object): Uint8Array    // JS object -> buffer
deserialize(buffer: Uint8Array): object    // buffer -> JS object
```

### Witness Object Shape

```typescript
interface Witness {
  inputs: number[][];
  outputs: number[][];
  processed_inputs: VecU64[][];
  processed_params: VecU64[][];
  processed_outputs: VecU64[][];
  max_lookup_inputs: number;
}
```

### Debug Utilities

```typescript
init_panic_hook(): void   // Better WASM error messages (optional)
init_logger(): void       // Console debug output (optional)
```

## Browser API

Requires manual initialization with SharedArrayBuffer for multithreading.

### Required HTTP Headers

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

### Initialization

```typescript
import init, { init_panic_hook, init_logger } from '@ezkljs/engine/web/ezkl.js';
import { genWitness, prove, verify } from '@ezkljs/engine/web';

// Must be called once before any engine method
await init(undefined, new WebAssembly.Memory({
  initial: 20,
  maximum: 4096,   // iOS limit — default 65536 crashes iOS
  shared: true
}));

init_panic_hook();  // recommended
init_logger();      // optional
```

After initialization, the same core functions are available as the Node.js target.

### iOS Considerations

- Maximum WebAssembly.Memory `maximum` is 4096 pages on iOS
- Default 65536 will crash iOS WebKit
- Always set `maximum: 4096` for cross-platform browser compatibility

## `@ezkljs/hub` — Managed Proving Service SDK

Separate package for the Lilith cloud proving service.

```bash
bun add @ezkljs/hub
```

### Health

```typescript
healthCheck(url?: string): Promise<boolean>
```

### Organizations

```typescript
getOrganization(params: { id?: string, name?: string }): Promise<Organization>
```

### Artifacts (Compiled Circuits)

```typescript
getArtifact(params: { id?: string, name?: string, organizationName?: string }): Promise<Artifact>
getArtifacts(params: { skip?, limit?, organizationName?, organizationId? }): Promise<Artifact[]>
getArtifactSettings(artifactId: string): Promise<Settings>

// Upload pre-compiled artifact
uploadArtifact(params: {
  name: string,
  description: string,
  organizationId: string,
  modelFile: File | Buffer,       // .ezkl compiled circuit
  settingsFile: File | Buffer,    // settings.json
  pkFile: File | Buffer           // pk.key
}): Promise<Artifact>

// Generate artifact from ONNX model (Hub compiles for you)
genArtifact(params: {
  modelFile: File | Buffer,        // .onnx model
  inputFile: File | Buffer         // representative input.json
}): Promise<Artifact>
```

### Proofs (Cloud Generation)

```typescript
initiateProof(params: {
  artifactId: string,
  inputFile: File | Buffer
}): Promise<{ id: string, status: "PENDING" }>

getProof(taskId: string): Promise<{
  taskId: string,
  status: string,
  proof: any,
  witness: any
}>

getProofs(params: { skip?, limit?, artifactId? }): Promise<Proof[]>
deleteProof(params: { proofId: string, organizationName: string }): Promise<void>
```

## Typical File Sizes

| Artifact | Size |
|----------|------|
| `settings.json` | ~2 KB |
| `network.ezkl` | MBs (model-dependent) |
| `kzg.srs` | MBs to GBs (depends on logrows) |
| `vk.key` | Hundreds of KB to a few MB |
| `pk.key` | Larger than vk.key |
| `proof.json` | ~16-50 KB |

## Sources

- [GitHub — zkonduit/ezkljs-engine](https://github.com/zkonduit/ezkljs-engine)
- [GitHub — zkonduit/ezkljs](https://github.com/zkonduit/ezkljs)
- [@ezkljs/engine npm](https://www.npmjs.com/package/@ezkljs/engine)
- [Engine demo](https://ezkljs-engine.vercel.app/)
