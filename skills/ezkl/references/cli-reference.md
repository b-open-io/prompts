# EZKL CLI Reference

Complete CLI command reference including GPU acceleration and Lilith cloud proving.

## Installation

```bash
# Recommended — curl installer (Rust binary)
curl https://raw.githubusercontent.com/zkonduit/ezkl/main/install_ezkl_cli.sh | bash

# Via Python (includes CLI + Python bindings)
pip install ezkl

# From source (requires Rust toolchain)
cargo install --locked --path .
```

## Core Commands

### Generate Settings

Configure circuit parameters from ONNX model.

```bash
ezkl gen-settings \
    --model model.onnx \
    --output settings.json
```

### Calibrate Settings

Optimize settings for accuracy or resource usage.

```bash
ezkl calibrate-settings \
    --data input.json \
    --model model.onnx \
    --settings settings.json \
    --target accuracy          # "accuracy" or "resources"
```

`--target accuracy` maximizes precision (higher logrows, more memory).
`--target resources` minimizes circuit size and proving time.

### Compile Circuit

Convert ONNX model to ZK circuit.

```bash
ezkl compile-circuit \
    --model model.onnx \
    --compiled-circuit network.ezkl \
    --settings-path settings.json
```

### Get SRS

Download Structured Reference String for KZG commitments.

```bash
ezkl get-srs \
    --settings-path settings.json \
    --srs-path kzg.srs
```

SRS size depends on `logrows` in settings. Fetched from EZKL-maintained servers.

### Generate SRS (Self-Hosted)

```bash
ezkl gen-srs --srs-path kzg.srs --logrows 17
```

### Setup (Key Generation)

Generate proving and verification keys.

```bash
ezkl setup \
    --model network.ezkl \
    --vk-path vk.key \
    --pk-path pk.key \
    --srs-path kzg.srs
```

### Generate Witness

Record all intermediate computation values.

```bash
ezkl gen-witness \
    --data input.json \
    --model network.ezkl \
    --output witness.json
```

### Mock (Sanity Check)

Fast dry-run verification without full proof generation.

```bash
ezkl mock --witness witness.json --model network.ezkl
```

### Prove

Generate the ZK proof.

```bash
ezkl prove \
    --witness witness.json \
    --model network.ezkl \
    --pk-path pk.key \
    --proof-path proof.json \
    --srs-path kzg.srs
```

### Verify

Check proof validity.

```bash
ezkl verify \
    --proof-path proof.json \
    --settings-path settings.json \
    --vk-path vk.key \
    --srs-path kzg.srs
```

### Table (Describe Circuit)

Print circuit structure and supported operations.

```bash
ezkl table --model model.onnx
```

## EVM Commands

### Create Verifier Contract

```bash
ezkl create-evm-verifier \
    --vk-path vk.key \
    --settings-path settings.json \
    --sol-code-path verifier.sol \
    --abi-path verifier.abi \
    --reusable                    # optional: shared verifier for multiple models
```

### Deploy Verifier

```bash
ezkl deploy-evm \
    --sol-code-path verifier.sol \
    --rpc-url https://rpc.ethereum.org \
    --private-key $PRIVATE_KEY \
    --optimizer-runs 200
```

### Verify On-Chain

```bash
ezkl verify-evm \
    --addr-verifier 0x1234...abcd \
    --proof-path proof.json \
    --rpc-url https://rpc.ethereum.org
```

### Data Attestation

```bash
ezkl create-evm-data-attestation \
    --input-data input.json \
    --settings-path settings.json \
    --sol-code-path attestation.sol \
    --abi-path attestation.abi
```

## GPU Acceleration

NVIDIA GPU support via Icicle framework:

```bash
export ENABLE_ICICLE_GPU=true
export ICICLE_SMALL_K=8          # Minimum k value to use GPU (default: 8)
```

GPU acceleration applies to proving and SRS-related operations. Requires NVIDIA GPU with CUDA support.

## Lilith Cloud Proving

Managed proving cluster for production workloads (200+ workers, <1ms dispatch, 200k+ proofs/day).

### Lilith CLI

```bash
# Submit witness generation job
lilith job gen-witness

# Submit proof generation job
lilith job prove

# Check job status
lilith get -i <JOB_ID>
```

### Lilith REST API

```bash
# Submit a proving recipe
curl -X POST "http://<LILITH_URL>/recipe?callback_url=<CALLBACK_URL>" \
    -H "Content-Type: application/json" \
    -d '{
      "commands": ["GenWitness", "Prove"],
      "input_data": [[1.0, 2.0, 3.0, 4.0]]
    }'
```

## Complete CLI Workflow

```bash
# 1. Start with ONNX model and sample input
ls model.onnx input.json

# 2. Generate and calibrate settings
ezkl gen-settings --model model.onnx --output settings.json
ezkl calibrate-settings --data input.json --model model.onnx \
    --settings settings.json --target accuracy

# 3. Compile circuit
ezkl compile-circuit --model model.onnx \
    --compiled-circuit network.ezkl --settings-path settings.json

# 4. Get SRS and generate keys
ezkl get-srs --settings-path settings.json --srs-path kzg.srs
ezkl setup --model network.ezkl --vk-path vk.key --pk-path pk.key --srs-path kzg.srs

# 5. Quick sanity check
ezkl gen-witness --data input.json --model network.ezkl --output witness.json
ezkl mock --witness witness.json --model network.ezkl

# 6. Generate and verify proof
ezkl prove --witness witness.json --model network.ezkl \
    --pk-path pk.key --proof-path proof.json --srs-path kzg.srs
ezkl verify --proof-path proof.json --settings-path settings.json \
    --vk-path vk.key --srs-path kzg.srs

# 7. (Optional) Deploy on-chain verifier
ezkl create-evm-verifier --vk-path vk.key --settings-path settings.json \
    --sol-code-path verifier.sol --abi-path verifier.abi
ezkl deploy-evm --sol-code-path verifier.sol --rpc-url $RPC_URL --private-key $KEY
ezkl verify-evm --addr-verifier $ADDR --proof-path proof.json --rpc-url $RPC_URL
```

## Input File Format

```json
{
  "input_data": [[1.0, 2.0, 3.0, 4.0]]
}
```

Nested arrays for batch inputs:
```json
{
  "input_data": [
    [1.0, 2.0, 3.0, 4.0],
    [5.0, 6.0, 7.0, 8.0]
  ]
}
```

## Sources

- [EZKL docs — Getting Started](https://docs.ezkl.xyz/getting-started/)
- [EZKL docs — Products (Lilith)](https://docs.ezkl.xyz/products/)
- [GitHub — zkonduit/ezkl](https://github.com/zkonduit/ezkl)
