# BSV TypeScript SDK (@bsv/sdk)

## Overview
The BSV TypeScript SDK is a zero-dependency library for building Bitcoin SV blockchain applications. It provides cryptographic primitives, transaction management, wallet integration (BRC-100), P2P authentication, and distributed storage capabilities.

## Installation
```bash
npm install @bsv/sdk
```

## Complete Documentation
The BSV SDK maintains comprehensive documentation in their llms.txt file:
- **Full Cookbook**: [~/code/ts-sdk/llms.txt](file:///Users/satchmo/code/ts-sdk/llms.txt)
- **GitHub**: https://github.com/bitcoin-sv/ts-sdk

## Core Features

### 1. Primitives & Cryptography
- **BigNumber Operations**: Arbitrary precision arithmetic
- **Private Key Management**: Key generation, WIF format, Shamir secret sharing
- **Public Key Operations**: Key derivation, verification
- **Signature Operations**: ECDSA signing and verification
- **Hash Functions**: SHA-256, RIPEMD-160, double hashing
- **Symmetric Encryption**: AES encryption with various modes

### 2. Transactions
- **Construction**: Build complex transactions with multiple inputs/outputs
- **Script Templates**: P2PKH, RPuzzle, custom scripts
- **Fee Calculation**: Automatic fee estimation
- **Broadcasting**: Network integration for transaction submission

### 3. Wallet Integration (BRC-100)
- **Standards Compliant**: Full BRC-100 implementation
- **Key Management**: HD key derivation
- **Transaction History**: Query and parse transaction data
- **Balance Tracking**: UTXO management

### 4. Authentication & Certificates
- **BRC-52**: Portable identity certificates
- **BRC-53**: Anonymous credentials
- **Digital Signatures**: Message signing and verification
- **Identity Management**: Decentralized identity solutions

### 5. Storage & Networking
- **Distributed Storage**: Content-addressable storage
- **P2P Communication**: Peer discovery and messaging
- **Data Persistence**: On-chain and off-chain storage strategies

## Common Patterns

### Creating a Basic Transaction
```typescript
import { Transaction, PrivateKey, P2PKH } from '@bsv/sdk'

const privateKey = PrivateKey.fromWif('L5EYT...')
const tx = new Transaction()
  .from(utxos)
  .to(recipientAddress, satoshis)
  .change(changeAddress)
  .sign(privateKey)

const rawTx = tx.toHex()
```

### Key Management with Shamir Secret Sharing
```typescript
import { PrivateKey } from '@bsv/sdk'

// Split key into 5 shares, requiring 3 to reconstruct
const key = PrivateKey.fromRandom()
const shares = key.toBackupShares(3, 5)

// Reconstruct from any 3 shares
const restored = PrivateKey.fromBackupShares(shares.slice(0, 3))
```

### Creating Custom Scripts
```typescript
import { Script, OpCode } from '@bsv/sdk'

const customScript = new Script()
  .writeOpCode(OpCode.OP_DUP)
  .writeOpCode(OpCode.OP_HASH160)
  .writeBuffer(pubKeyHash)
  .writeOpCode(OpCode.OP_EQUALVERIFY)
  .writeOpCode(OpCode.OP_CHECKSIG)
```

## Integration with Other Tools

### With BigBlocks Components
```typescript
import { Transaction } from '@bsv/sdk'
import { TransactionViewer } from '@/components/bigblocks'

// Use SDK to create transaction
const tx = new Transaction()...

// Display with BigBlocks component
<TransactionViewer transaction={tx.toHex()} />
```

### With Wallet Providers
The SDK integrates with various BSV wallets through the BRC-100 standard, providing a consistent interface for transaction signing and broadcasting.

## Best Practices

1. **Key Security**: Never expose private keys in client-side code
2. **Fee Management**: Always calculate fees based on transaction size
3. **Error Handling**: Implement proper error handling for network operations
4. **Testing**: Use testnet for development and testing
5. **Standards Compliance**: Follow BRC standards for interoperability

## Advanced Topics

### SPV (Simplified Payment Verification)
The SDK includes SPV capabilities for lightweight clients that don't need the full blockchain.

### Token Protocols
Support for various token protocols built on BSV, including fungible and non-fungible tokens.

### Data Protocols
Integration with BSV data protocols for on-chain data storage and retrieval.

## Resources
- [Full Documentation](file:///Users/satchmo/code/ts-sdk/llms.txt)
- [API Reference](https://docs.bsvblockchain.org/sdk)
- [Example Applications](https://github.com/bitcoin-sv/ts-sdk/tree/master/examples)
- [BRC Standards](https://brc.dev)

## Common Issues & Solutions

### Issue: Transaction Not Broadcasting
- Check network connectivity
- Verify sufficient funds for fees
- Ensure proper script construction

### Issue: Key Import Errors
- Verify WIF format is correct
- Check network type (mainnet vs testnet)
- Ensure proper encoding

### Issue: Script Validation Failures
- Debug script execution step by step
- Verify all required signatures
- Check script size limits