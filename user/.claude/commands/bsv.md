---
allowed-tools: Read, Write, Edit, Bash
description: Access BSV SDK documentation and code examples
argument-hint: [topic] - e.g., keys, transactions, scripts, wallet, auth
---

## Help Check
!`[[ "$ARGUMENTS" == *"--help"* ]] && echo "HELP_REQUESTED" || echo "CONTINUE"`

$IF_HELP_REQUESTED:
**bsv** - Access BSV SDK documentation and code examples

**Usage:** `/bsv [topic]`

**Description:**
Access comprehensive documentation and code examples for the @bsv/sdk TypeScript library. Get quick access to common BSV development patterns, key management, transaction construction, and more.

**Arguments:**
- `keys`         : Private/public key management
- `transactions` : Transaction construction and handling
- `scripts`      : Script templates and operations
- `wallet`       : BRC-100 wallet integration
- `auth`         : Authentication and certificates
- `--help`       : Show this help message

**Examples:**
- `/bsv`              : Overview of BSV SDK features
- `/bsv keys`         : Key generation and management
- `/bsv transactions` : Building and signing transactions

$STOP_EXECUTION_IF_HELP

# BSV TypeScript SDK Documentation

Access comprehensive documentation for the @bsv/sdk library.

## Quick Reference

### BSV SDK Overview
@/Users/satchmo/code/prompts/development/bsv-sdk.md

### Full Cookbook (39K+ tokens)
The complete BSV SDK cookbook is available at:
`~/code/ts-sdk/llms.txt`

Use specific topics to access relevant sections:
- `/bsv keys` - Private/public key management
- `/bsv transactions` - Transaction construction
- `/bsv scripts` - Script templates and operations
- `/bsv wallet` - BRC-100 wallet integration
- `/bsv auth` - Authentication and certificates

## Quick Start

### Installation
```bash
npm install @bsv/sdk
```

### Basic Transaction
```typescript
import { Transaction, PrivateKey, P2PKH } from '@bsv/sdk'

const privateKey = PrivateKey.fromWif('L5EYT...')
const tx = new Transaction()
  .from(utxos)
  .to(recipientAddress, satoshis)
  .change(changeAddress)
  .sign(privateKey)
```

### Key Generation
```typescript
import { PrivateKey } from '@bsv/sdk'

const key = PrivateKey.fromRandom()
const wif = key.toWif()
const address = key.toAddress()
```

## Common Tasks

### 1. Generate New Wallet
```typescript
const privateKey = PrivateKey.fromRandom()
const publicKey = privateKey.toPublicKey()
const address = publicKey.toAddress()
```

### 2. Sign a Message
```typescript
const message = 'Hello, BSV!'
const signature = privateKey.sign(message)
const isValid = publicKey.verify(message, signature)
```

### 3. Create P2PKH Script
```typescript
import { P2PKH } from '@bsv/sdk'

const lockingScript = new P2PKH().lock(address)
const unlockingScript = new P2PKH().unlock(privateKey, 'all')
```

### 4. Parse Transaction
```typescript
const tx = Transaction.fromHex(hexString)
console.log('Inputs:', tx.inputs.length)
console.log('Outputs:', tx.outputs.length)
console.log('Fee:', tx.getFee())
```

## Advanced Features

### Shamir Secret Sharing
Split private keys into multiple shares for secure backup:
```typescript
// Create 5 shares, need 3 to reconstruct
const shares = privateKey.toBackupShares(3, 5)
```

### Custom Scripts
Build complex smart contracts:
```typescript
const script = new Script()
  .writeOpCode(OpCode.OP_IF)
  .writeBuffer(condition)
  .writeOpCode(OpCode.OP_ELSE)
  // ... custom logic
```

### SPV Verification
Lightweight client verification without full blockchain.

### Token Support
Create and manage tokens on BSV.

## Resources
- Full Cookbook: `~/code/ts-sdk/llms.txt`
- GitHub: https://github.com/bitcoin-sv/ts-sdk
- BRC Standards: https://brc.dev

What aspect of the BSV SDK would you like to explore?