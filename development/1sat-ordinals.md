# 1Sat Ordinals JavaScript Library (js-1sat-ord)

## Overview
A JavaScript library for creating and managing 1Sat Ordinal inscriptions and transactions on the Bitcoin SV blockchain. Built on top of `@bsv/sdk`, it provides high-level functions for working with Ordinals, BSV21 tokens, and marketplace operations.

## Installation
```bash
# Recommended
bun add js-1sat-ord @bsv/sdk

# Alternatives
yarn add js-1sat-ord @bsv/sdk
npm i js-1sat-ord @bsv/sdk
```

## Key Features
- **Ordinal Inscriptions**: Create and send inscriptions on-chain
- **BSV21 Tokens**: Deploy and transfer tokens
- **Marketplace**: List, purchase, and cancel Ordinal listings
- **UTXO Management**: Helpers for fetching payment, NFT, and token UTXOs
- **Base64 Encoding**: Efficient script encoding for large data

## Core Concepts

### UTXO Types
```typescript
import type { Utxo, NftUtxo, TokenUtxo } from "js-1sat-ord"

// Basic UTXO with base64 encoded script
const utxo: Utxo = {
  satoshis: 269114,
  txid: "61fd6e240610a9e9e071c34fc87569ef871760ea1492fe1225d668de4d76407e",
  script: "<base64 encoded script>",
  vout: 1,
  pk?: PrivateKey // Optional: specify key for multi-key transactions
}
```

### Key Management
Always use separate keys for payments and ordinals:
```typescript
import { PrivateKey } from "@bsv/sdk"

const paymentPk = PrivateKey.fromWif(paymentWif)
const ordPk = PrivateKey.fromWif(ordWif)
```

## Main Functions

### Create Ordinals
```typescript
import { createOrdinals, type CreateOrdinalsConfig } from "js-1sat-ord"

const inscription = {
  dataB64: Buffer.from("# Hello World!").toString('base64'),
  contentType: "text/markdown"
}

const config: CreateOrdinalsConfig = {
  utxos: [paymentUtxo],
  destinations: [{
    address: ordinalAddress,
    inscription
  }],
  paymentPk
}

const { tx } = await createOrdinals(config)
```

### Send Ordinals
```typescript
import { sendOrdinals, type SendOrdinalsConfig } from "js-1sat-ord"

const config: SendOrdinalsConfig = {
  paymentUtxos: [paymentUtxo],
  ordinals: [ordinalUtxo],
  paymentPk,
  ordPk,
  destinations: [{
    address: destinationAddress,
    inscription: ordinalUtxo.inscription
  }]
}

const { tx } = await sendOrdinals(config)
```

### Deploy BSV21 Token
```typescript
import { deployBsv21Token, type DeployBsv21TokenConfig } from "js-1sat-ord"

const config: DeployBsv21TokenConfig = {
  symbol: "MYTICKER",
  icon: "<icon_outpoint>", // Optional
  utxos: [paymentUtxo],
  initialDistribution: { 
    address: destinationAddress, 
    tokens: 1000000 // Total supply
  },
  paymentPk,
  destinationAddress
}

const { tx, tokenId } = await deployBsv21Token(config)
```

### Transfer BSV21 Tokens
```typescript
import { transferOrdToken, type TransferBsv21TokenConfig, TokenType } from "js-1sat-ord"

const config: TransferBsv21TokenConfig = {
  protocol: TokenType.BSV21,
  tokenID: tokenId,
  utxos: [paymentUtxo],
  inputTokens: [tokenUtxo],
  distributions: [{ 
    address: recipientAddress, 
    tokens: 100 
  }],
  paymentPk,
  ordPk,
  burn?: false, // Optional: burn tokens
  splitConfig?: { // Optional: configure change outputs
    minTokens: 1,
    maxOutputs: 10
  }
}

const { tx } = await transferOrdToken(config)
```

## Marketplace Operations

### Create Listing
```typescript
import { createOrdListings, type CreateOrdListingsConfig } from "js-1sat-ord"

const listings = [{
  payAddress: sellerAddress,     // Where payment goes
  price: 100000,                 // Price in satoshis
  listingUtxo: ordinalUtxo,      // Ordinal to list
  ordAddress: returnAddress      // Return address if cancelled
}]

const config: CreateOrdListingsConfig = {
  utxos: [paymentUtxo],
  listings,
  paymentPk,
  ordPk
}

const { tx } = await createOrdListings(config)
```

### Purchase Listing
```typescript
import { purchaseOrdListing, type PurchaseOrdListingConfig } from "js-1sat-ord"

const config: PurchaseOrdListingConfig = {
  utxos: [paymentUtxo],
  paymentPk,
  listingUtxo,  // The listed ordinal
  ordAddress    // Where to receive the ordinal
}

const { tx } = await purchaseOrdListing(config)
```

### Cancel Listing
```typescript
import { cancelOrdListings, type CancelOrdListingsConfig } from "js-1sat-ord"

const config: CancelOrdListingsConfig = { 
  utxos: [paymentUtxo], 
  listingUtxos: [listingUtxo], 
  ordPk, 
  paymentPk 
}

const { tx } = await cancelOrdListings(config)
```

## UTXO Helpers

### Fetch Payment UTXOs
```typescript
import { fetchPayUtxos } from "js-1sat-ord"

const utxos = await fetchPayUtxos(paymentAddress)
// Returns UTXOs with base64 encoded scripts
```

### Fetch NFT UTXOs
```typescript
import { fetchNftUtxos } from "js-1sat-ord"

// All NFTs for address
const nftUtxos = await fetchNftUtxos(ordinalAddress)

// Specific collection
const collectionId = "1611d956f397caa80b56bc148b4bce87b54f39b234aeca4668b4d5a7785eb9fa_0"
const collectionNfts = await fetchNftUtxos(ordinalAddress, collectionId)
```

### Fetch Token UTXOs
```typescript
import { fetchTokenUtxos, TokenType } from "js-1sat-ord"

const protocol = TokenType.BSV21
const tokenId = "e6d40ba206340aa94ed40fe1a8adcd722c08c9438b2c1dd16b4527d561e848a2_0"
const tokenUtxos = await fetchTokenUtxos(protocol, tokenId, ordinalAddress)
```

## Broadcasting

```typescript
import { oneSatBroadcaster } from "js-1sat-ord"

// After creating any transaction
const { status, txid, message } = await tx.broadcast(oneSatBroadcaster())

if (status === 'success') {
  console.log('Transaction broadcast:', txid)
} else {
  console.error('Broadcast failed:', message)
}
```

## Advanced Configuration

### Additional Options
Most functions accept additional configuration:
- `changeAddress`: Custom change address (defaults to payment address)
- `satsPerKb`: Fee rate (default varies by function)
- `metaData`: MAP (Magic Attribute Protocol) metadata
- `signer`: Custom transaction signer
- `additionalPayments`: Extra outputs to include

### Script Encoding
By default, scripts use base64 encoding. You can specify encoding when fetching:
```typescript
// Specify hex encoding
const hexUtxos = await fetchPayUtxos(address, 'hex')

// Specify asm encoding
const asmUtxos = await fetchPayUtxos(address, 'asm')
```

## Best Practices

1. **Key Separation**: Always use different keys for payments and ordinals
2. **UTXO Management**: Fetch fresh UTXOs before transactions
3. **Error Handling**: Wrap operations in try-catch blocks
4. **Fee Calculation**: Use appropriate `satsPerKb` for network conditions
5. **Testing**: Use testnet for development

## Common Patterns

### Inscribe and List
```typescript
// 1. Create inscription
const { tx: createTx } = await createOrdinals({
  utxos: payUtxos,
  destinations: [{ address: ordAddress, inscription }],
  paymentPk
})

// 2. Wait for confirmation
await createTx.broadcast(oneSatBroadcaster())

// 3. Fetch new ordinal UTXO
const ordUtxos = await fetchNftUtxos(ordAddress)

// 4. Create listing
const { tx: listTx } = await createOrdListings({
  utxos: payUtxos,
  listings: [{
    payAddress,
    price: 50000,
    listingUtxo: ordUtxos[0],
    ordAddress
  }],
  paymentPk,
  ordPk
})
```

## Resources
- [GitHub Repository](https://github.com/BitcoinSchema/js-1sat-ord)
- [1Sat API Documentation](https://ordinals.gorillapool.io/api/docs)
- [BSV SDK Documentation](@bsv/sdk)
- [Ordinals Explorer](https://1satordinals.com)