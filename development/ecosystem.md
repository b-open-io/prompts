---
name: bsv-ecosystem
version: 1.0.0
description: Comprehensive Bitcoin SV ecosystem reference with applications, tools, and resources
tags: [bitcoin, bsv, ecosystem, applications, tools, documentation]
---

# Bitcoin SV Ecosystem Reference

A comprehensive guide to the Bitcoin SV ecosystem including applications, tools, protocols, and developer resources.

## Mission

Provide a complete reference to the Bitcoin SV ecosystem for developers, users, and businesses building on the blockchain.

## Core Applications

### Token & NFT Platforms

#### 1Sat Ordinals Ecosystem
- **1sat.market** - Primary marketplace for 1Sat Ordinals NFTs and tokens
  - Trading platform for BSV-based digital assets
  - Support for various token protocols
  - Integration with major BSV wallets
  
- **1satordinals.com** - Official 1Sat Ordinals platform
  - Create and manage ordinal inscriptions
  - Collection management and discovery
  - Developer tools and APIs
  
- **1sat.name** (Coming Soon) - OPNS naming service
  - Link ordinal ownership to payment handles
  - Human-readable addresses for BSV transactions
  - DNS-like system for the BSV blockchain

#### MNEE Token Platform
- **https://p2pmnee.atx.systems** - Peer-to-peer MNEE token exchange
  - Decentralized token trading
  - Direct wallet-to-wallet transactions
  - No intermediary required

### Certification & Identity

- **https://coolcert.babbage.systems/** - Certificate management system
  - Digital certificate issuance
  - Verifiable credentials on BSV
  - Integration with identity protocols
  
- **https://socialcert.net/** - Social certification platform
  - Social proof certificates
  - Community-verified credentials
  - Reputation system on blockchain

### Gaming & Entertainment

- **https://coinflip.babbage.systems/** - Provably fair coin flip game
  - On-chain randomness
  - Transparent betting mechanics
  - Instant settlement
  
- **https://pollr.gg/** - Polling and voting platform
  - Decentralized polls
  - Transparent vote counting
  - Community governance tools

### Marketplace & Commerce

- **https://metamarket.bapp.dev/** - Metanet marketplace
  - Digital goods and services
  - Smart contract-based transactions
  - Decentralized commerce platform
  
- **https://locksmith.babbage.systems** - Key management service
  - Secure key storage
  - Multi-signature support
  - Enterprise key management

### Developer Tools & Infrastructure

- **https://uhrp-ui.bapp.dev/** - UHRP (Universal Hash Resolution Protocol) interface
  - Content addressing system
  - Decentralized data storage
  - Hash-based content retrieval

## Documentation & Resources

### Project Babbage
- **https://docs.projectbabbage.com/** - Comprehensive developer documentation
  - SDK documentation
  - API references
  - Integration guides
  - Tutorial resources
  - Best practices

## Key Protocols & Standards

### 1Sat Ordinals
- NFT and token standard on BSV
- Inscription-based digital assets
- Compatible with ordinal theory
- Efficient micro-transactions

### MNEE Protocol
- Fungible token standard
- Peer-to-peer exchange capability
- Smart contract integration
- DeFi applications

### BAP (Bitcoin Attestation Protocol)
- Identity management
- Key derivation paths
- Hierarchical deterministic wallets
- Privacy-preserving attestations

### MAP (Magic Attribute Protocol)
- Metadata standard
- On-chain data structure
- Searchable blockchain data
- Application interoperability

## Wallet Ecosystem

### Desktop Wallets
- HandCash
- ElectrumSV
- Simply Cash
- Exodus (BSV support)

### Mobile Wallets
- HandCash (iOS/Android)
- RelayX
- DotWallet
- Volt Wallet

### Web Wallets
- Money Button
- Yours Wallet
- HandCash Connect
- RelayX Web

## Development SDKs

### JavaScript/TypeScript
- **@bsv/sdk** - Official BSV SDK
- **js-1sat-ord** - 1Sat Ordinals library
- **bsv-bap** - BAP implementation
- **bitcoin-auth** - Authentication library

### Go
- **go-sdk** - Comprehensive Go SDK for BSV
- **go-bt** - Bitcoin transaction library
- **go-paymail** - Paymail implementation

### Python
- **py-bsv** - Python BSV library
- **bitcoinx** - Bitcoin utilities
- **polyglot** - Multi-language support

## Infrastructure Services

### Node Providers
- WhatsOnChain - Block explorer and APIs
- GorillaPool - Mining and node services
- TAAL - Enterprise blockchain infrastructure
- BitBus - Real-time blockchain data

### Indexing Services
- Planaria - Bitcoin database system
- BitQuery - Blockchain query language
- JungleBus - Event streaming
- BitSocket - WebSocket connections

### Storage Solutions
- BitFS - File storage on BSV
- B:// Protocol - Data storage protocol
- C:// Protocol - Content protocol
- D:// Protocol - Dynamic data

## Community Resources

### Educational Platforms
- Bitcoin SV Academy
- BSV Developer Documentation
- CoinGeek Education
- nChain Learning

### Forums & Communities
- BitcoinSV Subreddit
- BSV Discord Servers
- Telegram Groups
- Twitter/X Communities

### News & Media
- CoinGeek
- BitcoinSV.com
- BSV Weekly
- Bitcoin Association

## Enterprise Solutions

### Blockchain-as-a-Service
- nChain solutions
- TAAL Console
- Fabriik services
- Tokenized platform

### Compliance & Legal
- Legal contract storage
- Regulatory compliance tools
- Audit trail systems
- KYC/AML integration

## Integration Patterns

### Payment Processing
```javascript
// HandCash Connect example
const { HandCashConnect } = require('@handcash/handcash-connect');
const handcash = new HandCashConnect({
  appId: 'your-app-id',
  appSecret: 'your-app-secret'
});
```

### Token Creation
```javascript
// 1Sat Ordinals inscription
import { createOrdinal } from 'js-1sat-ord';
const ordinal = await createOrdinal({
  data: Buffer.from('Hello BSV'),
  contentType: 'text/plain'
});
```

### Identity Verification
```javascript
// BAP identity attestation
import { BapClient } from 'bsv-bap';
const bap = new BapClient();
const identity = await bap.createIdentity();
```

## Best Practices

### Security
- Always validate transactions before broadcasting
- Use HD wallets for key management
- Implement proper backup strategies
- Follow UTXO best practices

### Performance
- Batch transactions when possible
- Use SPV for lightweight clients
- Implement proper caching strategies
- Optimize UTXO selection

### Compliance
- Implement proper KYC/AML when required
- Maintain audit trails
- Follow local regulations
- Use compliant service providers

## Getting Started

### For Developers
1. Choose appropriate SDK for your language
2. Set up development environment
3. Connect to testnet first
4. Review documentation and examples
5. Join developer communities

### For Businesses
1. Identify use case alignment
2. Evaluate infrastructure needs
3. Consider compliance requirements
4. Engage with service providers
5. Plan integration strategy

### For Users
1. Choose appropriate wallet
2. Understand transaction fees
3. Learn about key management
4. Explore available applications
5. Join community channels

## Future Developments

### Upcoming Features
- Enhanced smart contract capabilities
- Improved scaling solutions
- Cross-chain interoperability
- Advanced privacy features
- Enterprise integration tools

### Ecosystem Growth
- More DeFi applications
- Gaming and metaverse projects
- Supply chain solutions
- IoT integrations
- Government adoption

## Resources

- **Official BSV Documentation**: https://bitcoinsv.com/
- **Developer Portal**: https://bitcoinsv.io/
- **Bitcoin Association**: https://bitcoinassociation.net/
- **Technical Standards**: https://tsc.bitcoinassociation.net/

---

*This ecosystem reference is regularly updated. For the latest information, check the official project websites and documentation.*