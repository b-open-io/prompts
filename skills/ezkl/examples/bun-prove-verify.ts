/**
 * EZKL Proof Generation and Verification with Bun
 *
 * Prerequisites:
 *   bun add @ezkljs/engine
 *
 * Required artifacts (generated via CLI or Python):
 *   - network.ezkl  (compiled circuit from ONNX model)
 *   - pk.key        (proving key)
 *   - vk.key        (verification key)
 *   - kzg.srs       (structured reference string)
 *
 * Generate artifacts:
 *   ezkl gen-settings --model model.onnx --output settings.json
 *   ezkl calibrate-settings --data input.json --model model.onnx --settings settings.json --target accuracy
 *   ezkl compile-circuit --model model.onnx --compiled-circuit network.ezkl --settings-path settings.json
 *   ezkl get-srs --settings-path settings.json --srs-path kzg.srs
 *   ezkl setup --model network.ezkl --vk-path vk.key --pk-path pk.key --srs-path kzg.srs
 */

import { readFileSync } from "fs";
import {
	genWitness,
	prove,
	verify,
	serialize,
	deserialize,
} from "@ezkljs/engine/nodejs";

// Load pre-generated artifacts as Uint8Array buffers
const compiledModel = readFileSync("./network.ezkl");
const pk = readFileSync("./pk.key");
const vk = readFileSync("./vk.key");
const srs = readFileSync("./kzg.srs");

// Prepare input data — must match the model's expected input shape
const input = serialize({
	input_data: [[1.0, 2.0, 3.0, 4.0]],
});

// Step 1: Generate witness (records all intermediate computation values)
console.log("Generating witness...");
const witnessBuffer = genWitness(compiledModel, input);
const witness = deserialize(witnessBuffer);
console.log("Model outputs:", witness.outputs);

// Step 2: Generate ZK proof (requires proving key + SRS)
console.log("Generating proof...");
const proofBuffer = prove(witnessBuffer, pk, compiledModel, srs);
const proof = deserialize(proofBuffer);
console.log("Proof generated, size:", proofBuffer.length, "bytes");

// Step 3: Verify proof (only needs verification key — no model weights or private data)
console.log("Verifying proof...");
const isValid = verify(proofBuffer, vk);
console.log("Proof valid:", isValid);

if (!isValid) {
	throw new Error("Proof verification failed");
}
