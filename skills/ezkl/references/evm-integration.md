# EZKL EVM Integration Reference

Deploy and verify ML proof contracts on any EVM-compatible chain.

## Workflow

1. Generate verifier contract from verification key
2. Deploy contract to EVM chain
3. Encode proof as calldata
4. Call contract to verify proofs on-chain

## Generate Verifier Contract

### CLI

```bash
ezkl create-evm-verifier \
    --vk-path vk.key \
    --settings-path settings.json \
    --sol-code-path verifier.sol \
    --abi-path verifier.abi
```

### Python

```python
ezkl.create_evm_verifier(
    vk_path="vk.key",
    settings_path="settings.json",
    sol_code_path="verifier.sol",
    abi_path="verifier.abi",
    srs_path="kzg.srs",    # optional
    reusable=False           # True for shared verifier across models
)
```

### Reusable Verifiers

Generate a Verification Key Artifact (VKA) contract to share a single verifier across multiple models:

```bash
ezkl create-evm-vka --vk-path vk.key --settings-path settings.json --vka-path vka.sol
```

```python
ezkl.create_evm_vka(
    vk_path="vk.key",
    settings_path="settings.json",
    vka_path="vka.sol",
    srs_path="kzg.srs"  # optional
)
```

## Deploy Verifier

### CLI

```bash
ezkl deploy-evm \
    --sol-code-path verifier.sol \
    --rpc-url https://rpc.ethereum.org \
    --private-key $PRIVATE_KEY \
    --optimizer-runs 200
```

### Python

```python
ezkl.deploy_evm(
    addr_path="addr.txt",          # output: deployed contract address
    sol_code_path="verifier.sol",
    rpc_url="https://rpc.ethereum.org",
    contract_type=None,            # optional
    optimizer_runs=200,
    private_key="0x..."
)
```

## Verify On-Chain

### CLI

```bash
ezkl verify-evm \
    --addr-verifier 0x1234...abcd \
    --proof-path proof.json \
    --rpc-url https://rpc.ethereum.org
```

### Python

```python
is_valid = ezkl.verify_evm(
    addr_verifier="0x1234...abcd",
    proof_path="proof.json",
    rpc_url="https://rpc.ethereum.org",
    vka_path="vka.sol"  # optional, for reusable verifiers
)
```

## Encode Calldata

Convert proof to EVM calldata for manual contract interaction:

```python
calldata = ezkl.encode_evm_calldata(
    proof="proof.json",
    calldata="calldata.json",
    addr_vk=None  # optional VKA address for reusable verifiers
)
# Returns list[int] — the encoded calldata
```

## Solidity Integration Patterns

### Basic Verifier Interface

```solidity
interface IEZKLVerifier {
    function verify(
        bytes calldata proof,
        uint256[] calldata instances
    ) external view returns (bool);
}
```

### Consumer Contract

```solidity
contract MLVerifiedAction {
    IEZKLVerifier public verifier;

    constructor(address _verifier) {
        verifier = IEZKLVerifier(_verifier);
    }

    function executeWithProof(
        bytes calldata proof,
        uint256[] calldata instances
    ) external {
        require(verifier.verify(proof, instances), "Invalid ML proof");
        // React to verified ML result
        // instances contains public inputs/outputs
    }
}
```

### Access Control with ML Verification

```solidity
contract MLGatedAccess {
    IEZKLVerifier public verifier;
    mapping(address => bool) public verified;

    function verifyAndGrant(
        bytes calldata proof,
        uint256[] calldata instances
    ) external {
        require(verifier.verify(proof, instances), "Proof invalid");
        verified[msg.sender] = true;
    }

    modifier onlyVerified() {
        require(verified[msg.sender], "Not verified");
        _;
    }
}
```

## Data Attestation

Generate contracts that attest to on-chain data sources being used as model inputs:

### CLI

```bash
ezkl create-evm-data-attestation \
    --input-data input.json \
    --settings-path settings.json \
    --sol-code-path attestation.sol \
    --abi-path attestation.abi
```

### Python

```python
ezkl.create_evm_data_attestation(
    input_data="input.json",
    settings_path="settings.json",
    sol_code_path="attestation.sol",
    abi_path="attestation.abi",
    witness_path="witness.json"  # optional
)

ezkl.deploy_da_evm(
    addr_path="da_addr.txt",
    input_data="input.json",
    settings_path="settings.json",
    sol_code_path="attestation.sol",
    rpc_url="https://rpc.ethereum.org",
    optimizer_runs=200,
    private_key="0x..."
)
```

## Supported EVM Chains

Any EVM-compatible chain works:
- Ethereum (mainnet, Sepolia, Goerli)
- Polygon (PoS, zkEVM)
- Arbitrum, Optimism, Base
- Avalanche C-Chain
- BNB Smart Chain

Set `--rpc-url` to the target chain's RPC endpoint.

## Gas Considerations

- Verifier contract deployment: varies by circuit size (larger circuits = larger verifier)
- On-chain verification: typically 200k-500k gas per `verify()` call
- Proof size on-chain: ~16-50 KB calldata
- Reusable verifiers amortize deployment cost across multiple models

## Sources

- [EZKL docs — On-chain verification](https://docs.ezkl.xyz/getting-started/verify/)
- [ezkl.pyi — EVM functions](https://github.com/zkonduit/ezkl/blob/main/ezkl.pyi)
