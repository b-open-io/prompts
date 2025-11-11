# bap-cli Command Reference

## Installation

Global installation (required for CLI usage):

```bash
git clone https://github.com/b-open-io/bap-cli.git
cd bap-cli
bun install
bun run build
bun link
```

## Commands

### new - Generate a new BAP identity

Creates a new encrypted BAP identity backup file.

**Syntax:**
```bash
bap new --type <type> --password <password> [--name <name>] [--output <file>]
```

**Options:**
- `--type` (required): Backup type - either `type42` or `legacy`
  - `type42`: Uses random root private key (simpler)
  - `legacy`: Uses HD derivation from mnemonic (BIP32)
- `--password` (required): Password for encrypting the backup
- `--name` (optional): Identity name (default: "My Identity")
- `--output` (optional): Output file path (prints to stdout if not specified)

**Examples:**
```bash
# Type42 backup
bap new --type type42 --password mypass123 --name "Alice" --output alice.bep

# Legacy (BIP32) backup
bap new --type legacy --password mypass123 --name "Bob" --output bob.bep
```

**Output:**
- For Type42: Creates backup and shows identity key
- For Legacy: Creates backup, shows identity key and mnemonic phrase

### list - List all identities in a backup

Shows all identities contained in an encrypted master backup file.

**Syntax:**
```bash
bap list <input> --password <password>
```

**Options:**
- `<input>` (required): Path to encrypted backup file (.bep)
- `--password` (required): Password to decrypt the backup

**Example:**
```bash
bap list backup.bep --password mypass123
```

**Output:**
- Lists all identity keys with their indices
- Shows backup type (Type42 or Legacy)

### member - Extract member backup

Extracts a single member identity from a master backup into a separate encrypted file.

**Syntax:**
```bash
bap member <input> --password <password> --index <index> [--output <file>]
```

**Options:**
- `<input>` (required): Path to encrypted master backup file
- `--password` (required): Password to decrypt the master backup
- `--index` (required): Zero-based index of identity to extract
- `--output` (optional): Output file for member backup

**Example:**
```bash
bap member backup.bep --password mypass123 --index 0 --output member.bep
```

**Output:**
- Creates encrypted member backup file
- Shows member identity details

### export - Decrypt and view backup

Decrypts a backup file and displays its contents in JSON format.

**Syntax:**
```bash
bap export <input> --password <password> [--output <file>]
```

**Options:**
- `<input>` (required): Path to encrypted backup file
- `--password` (required): Password to decrypt
- `--output` (optional): Re-encrypt and save to new file

**Example:**
```bash
bap export backup.bep --password mypass123
```

**Output:**
- Displays decrypted backup in JSON format
- Optionally saves re-encrypted version

## File Format

All backups use `.bep` extension (Bitcoin Encrypted Payload) and contain:
- Encrypted identity data
- For Type42: Root private key
- For Legacy: Extended private key (xprv) and identities
- Member backups: Single identity WIF and ID

## Programmatic Usage

For TypeScript/JavaScript projects:

```typescript
import { createType42Backup, createLegacyBackup } from "bap-cli";

// Generate backup with multiple identities
const backup = await createType42Backup("password", [
  { name: "Identity 1" },
  { name: "Identity 2" }
]);

await backup.saveTo("/tmp/test.bep");
const keys = await backup.getIdentityKeys();
const memberBackup = await backup.getMemberBackup(0);
await backup.cleanup();
```

## Common Workflows

### Create and extract member identity

```bash
# 1. Create master backup
bap new --type type42 --password pass123 --name "Master" --output master.bep

# 2. List identities
bap list master.bep --password pass123

# 3. Extract first identity
bap member master.bep --password pass123 --index 0 --output member.bep
```

### Inspect backup contents

```bash
# View decrypted contents
bap export backup.bep --password pass123
```
