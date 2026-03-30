# EZKL Python API Reference

Complete function signatures from the canonical `ezkl.pyi` type stub.

## Installation

```bash
pip install ezkl
```

## Settings & Compilation

```python
ezkl.gen_settings(model, output, py_run_args=None) -> bool
ezkl.calibrate_settings(data, model, settings, target, lookup_safety_margin,
                        scales=None, scale_rebase_multiplier=None,
                        max_logrows=None) -> Any
ezkl.compile_circuit(model, compiled_circuit, settings_path) -> bool
ezkl.setup(model, vk_path, pk_path, srs_path=None, witness_path=None,
           disable_selector_compression=False) -> bool
```

## Witness & Proof

```python
ezkl.gen_witness(data, model, output, vk_path=None, srs_path=None) -> Any
ezkl.mock(witness, model) -> bool          # dry-run without full setup
ezkl.prove(witness, model, pk_path, proof_path=None, srs_path=None) -> Any
ezkl.verify(proof_path, settings_path, vk_path, srs_path=None,
            reduced_srs=False) -> bool
```

## EVM Integration

```python
ezkl.create_evm_verifier(vk_path, settings_path, sol_code_path, abi_path,
                         srs_path=None, reusable=False) -> Any
ezkl.create_evm_vka(vk_path, settings_path, vka_path, srs_path=None) -> Any
ezkl.deploy_evm(addr_path, sol_code_path, rpc_url=None, contract_type=None,
                optimizer_runs=None, private_key=None) -> Any
ezkl.encode_evm_calldata(proof, calldata, addr_vk=None) -> list[int]
ezkl.verify_evm(addr_verifier, proof_path, rpc_url=None, vka_path=None) -> Any
```

## Aggregation (Combining Multiple Proofs)

```python
ezkl.setup_aggregate(sample_snarks, vk_path, pk_path, logrows,
                     split_proofs=False, srs_path=None,
                     disable_selector_compression=False,
                     commitment=None) -> bool
ezkl.mock_aggregate(aggregation_snarks, logrows, split_proofs=False) -> bool
ezkl.aggregate(aggregation_snarks, proof_path, vk_path, transcript, logrows,
               check_mode=None, split_proofs=False, srs_path=None,
               commitment=None) -> bool
```

## Data Attestation

```python
ezkl.create_evm_data_attestation(input_data, settings_path, sol_code_path,
                                  abi_path, witness_path=None) -> bool
ezkl.deploy_da_evm(addr_path, input_data, settings_path, sol_code_path,
                    rpc_url=None, optimizer_runs=None, private_key=None)
```

## Key Management

```python
ezkl.gen_vk_from_pk_single(path_to_pk, circuit_settings_path,
                            vk_output_path) -> bool
ezkl.gen_vk_from_pk_aggr(path_to_pk, vk_output_path) -> bool
```

## SRS (Structured Reference String)

```python
ezkl.gen_srs(srs_path, logrows) -> None
ezkl.get_srs(settings_path=None, logrows=None, srs_path=None,
             commitment=None) -> Any
```

## Cryptographic Utilities

```python
ezkl.kzg_commit(message, vk_path, settings_path, srs_path=None) -> list[PyG1Affine]
ezkl.ipa_commit(message, vk_path, settings_path, srs_path=None) -> list[PyG1Affine]
ezkl.poseidon_hash(message) -> list[str]
```

## Field Element Conversions

```python
ezkl.float_to_felt(input, scale, input_type) -> str
ezkl.felt_to_float(felt, scale) -> float
ezkl.felt_to_int(felt) -> str
ezkl.felt_to_big_endian(felt) -> str
ezkl.buffer_to_felts(buffer) -> list[str]
```

## Utility

```python
ezkl.table(model, py_run_args=None) -> str   # describe circuit structure
ezkl.swap_proof_commitments(proof_path, witness_path)
```

## PyRunArgs Configuration

```python
class PyRunArgs:
    input_visibility: str    # "public" | "private" | "fixed" | "hashed/public" | "hashed/private" | "polycommit"
    output_visibility: str   # same options
    param_visibility: str    # same options
    logrows: int             # log2 of circuit row count
    input_scale: int         # quantization denominator for inputs
    param_scale: int         # quantization denominator for model params
    tolerance: float         # output error tolerance
    commitment: str          # "kzg" | "ipa"
    check_mode: str          # "safe" | "unsafe"
    lookup_range: list[int]  # [min, max] bounds for lookup tables
    bounded_log_lookup: bool
    decomp_base: int
    decomp_legs: int
    num_inner_cols: int
    scale_rebase_multiplier: int
    rebase_frac_zero_constants: bool
    variables: list[tuple[str, int]]  # e.g., [("batch_size", 1)]
```

## Complete Python Workflow Example

```python
import ezkl
import json

# Paths
model_path = "model.onnx"
input_path = "input.json"
settings_path = "settings.json"
compiled_path = "network.ezkl"
srs_path = "kzg.srs"
vk_path = "vk.key"
pk_path = "pk.key"
witness_path = "witness.json"
proof_path = "proof.json"

# 1. Generate settings
py_run_args = ezkl.PyRunArgs()
py_run_args.input_visibility = "public"
py_run_args.output_visibility = "public"
py_run_args.param_visibility = "fixed"
ezkl.gen_settings(model_path, settings_path, py_run_args)

# 2. Calibrate (optional but recommended)
ezkl.calibrate_settings(input_path, model_path, settings_path, target="accuracy")

# 3. Compile
ezkl.compile_circuit(model_path, compiled_path, settings_path)

# 4. Get SRS
ezkl.get_srs(settings_path=settings_path, srs_path=srs_path)

# 5. Setup (key generation)
ezkl.setup(compiled_path, vk_path, pk_path, srs_path)

# 6. Generate witness
witness = ezkl.gen_witness(input_path, compiled_path, witness_path)

# 7. Prove
proof = ezkl.prove(witness_path, compiled_path, pk_path, proof_path, srs_path)

# 8. Verify
is_valid = ezkl.verify(proof_path, settings_path, vk_path, srs_path)
print(f"Proof valid: {is_valid}")
```

## Sources

- [ezkl.pyi type stub](https://github.com/zkonduit/ezkl/blob/main/ezkl.pyi)
- [Python Bindings docs](https://docs.ezkl.xyz/advanced/python-bindings/)
