---
name: bitcoin-backup
description: Encrypt and decrypt private key backups using AES-256-GCM. Use when creating encrypted .bep backups, decrypting BAP identity files, or upgrading legacy backup iterations.
---

# bitcoin-backup - Key Encryption CLI

Secure backup encryption for WIF keys, BAP identities, and wallet data using AES-256-GCM with PBKDF2.

## Installation

```bash
bun add -g bitcoin-backup @bsv/sdk
```

## CLI Commands

### Encrypt

```bash
# Encrypt JSON to .bep
bbackup enc wallet.json -p "passphrase" -o wallet.bep

# Custom iterations (default: 600,000)
bbackup enc wallet.json -p "passphrase" -t 1000000
```

### Decrypt

```bash
# Decrypt .bep to JSON
bbackup dec wallet.bep -p "passphrase" -o wallet.json

# Output to stdout
bbackup dec wallet.bep -p "passphrase"
```

### Upgrade Iterations

```bash
# Upgrade legacy backups (100k → 600k iterations)
bbackup upg old.bep -p "passphrase" -o upgraded.bep
```

## Options

| Option | Description |
|--------|-------------|
| `-p`, `--password` | Encryption passphrase (required, min 8 chars) |
| `-o`, `--output` | Output file path |
| `-t`, `--iterations` | PBKDF2 iterations (enc only) |

## Supported Backup Types

| Type | Key Fields |
|------|------------|
| `BapMasterBackup` | `ids`, `rootPk` (Type 42) or `xprv`/`mnemonic` (legacy) |
| `BapMemberBackup` | Individual member keys |
| `WifBackup` | `wif` - Single private key |
| `OneSatBackup` | `ordPk`, `payPk`, `identityPk` |
| `VaultBackup` | Generic encrypted vault |

## Library Usage

```typescript
import { encryptBackup, decryptBackup } from "bitcoin-backup";

const backup = { wif: "L1uyy..." };
const encrypted = await encryptBackup(backup, "passphrase");
const decrypted = await decryptBackup(encrypted, "passphrase");
```

## Security

- **AES-256-GCM**: Authenticated encryption
- **PBKDF2**: 600,000 SHA-256 iterations (configurable)
- **Random salt**: 16 bytes per encryption
- **Random IV**: 12 bytes per encryption
