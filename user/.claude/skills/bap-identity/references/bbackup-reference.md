# bbackup Command Reference

## Overview

`bbackup` is a CLI tool for encrypting and decrypting Bitcoin-related backup files. It provides lower-level encryption/decryption operations compared to bap-cli, which focuses on BAP identity management.

## Installation

Global installation (required for CLI usage):

```bash
git clone https://github.com/rohenaz/bitcoin-backup.git
cd bitcoin-backup
bun install
bun run build
bun link
```

Verify installation:

```bash
bbackup --version
```

## Commands

### enc - Encrypt a JSON file

Encrypts a JSON backup file into an encrypted .bep format.

**Syntax:**
```bash
bbackup enc <inputFile> -p <password> [-o <outputFile>] [-t <iterations>]
```

**Options:**
- `<inputFile>` (required): Path to JSON file to encrypt
- `-p, --password <password>` (required): Passphrase for encryption
- `-o, --output <outputFile>` (optional): Output file path (default: `<input>_encrypted.bep`)
- `-t, --iterations <count>` (optional): PBKDF2 iterations (default: 600,000)

**Examples:**
```bash
# Encrypt with default settings
bbackup enc wallet.json -p "mypassword123" -o wallet.bep

# Encrypt with custom iterations
bbackup enc identity.json -p "strongpass" -t 1000000 -o identity.bep

# Encrypt using default output filename
bbackup enc data.json -p "password"
# Creates: data_encrypted.bep
```

**Input Format:**
The JSON input can be any valid backup structure:
- `BapMasterBackup` (Type42 or Legacy)
- `BapMemberBackup`
- `WifBackup`
- `OneSatBackup`
- `VaultBackup`

**Security:**
- Uses AES-256-GCM encryption
- PBKDF2 key derivation with SHA-256
- Default 600,000 iterations (NIST recommended)
- Minimum 8 character password enforced

### dec - Decrypt an encrypted file

Decrypts an encrypted .bep file to JSON format.

**Syntax:**
```bash
bbackup dec <inputFile> -p <password> [-o <outputFile>]
```

**Options:**
- `<inputFile>` (required): Path to encrypted .bep file
- `-p, --password <password>` (required): Passphrase for decryption
- `-o, --output <outputFile>` (optional): Output file path (default: `<input>.json`)

**Examples:**
```bash
# Decrypt to default filename
bbackup dec wallet.bep -p "mypassword123"
# Creates: wallet.json

# Decrypt to custom filename
bbackup dec identity.bep -p "strongpass" -o my-identity.json

# Decrypt and pipe to stdout (no -o flag, redirect stdout)
bbackup dec backup.bep -p "pass" > output.json
```

**Output:**
Outputs the decrypted JSON structure to the specified file or default location.

**Error Handling:**
- Wrong password: Decryption will fail with authentication error
- Corrupted file: Invalid format error
- Legacy backups: Automatically tries both 600k and 100k iterations

### upg - Upgrade encrypted file

Upgrades an encrypted backup file to use the recommended PBKDF2 iterations (600,000).

**Syntax:**
```bash
bbackup upg <inputFile> -p <password> [-o <outputFile>]
```

**Options:**
- `<inputFile>` (required): Path to encrypted .bep file to upgrade
- `-p, --password <password>` (required): Passphrase for decryption/encryption
- `-o, --output <outputFile>` (optional): Output file path (default: `<input>_upgraded.bep`)

**Examples:**
```bash
# Upgrade legacy backup
bbackup upg old-wallet.bep -p "password" -o wallet-upgraded.bep

# Upgrade with default output
bbackup upg legacy.bep -p "pass"
# Creates: legacy_upgraded.bep
```

**Use Cases:**
- Migrating from 100k to 600k iterations
- Strengthening security of existing backups
- Preparing backups for long-term storage

**Note:** The original file is not modified. A new upgraded file is created.

## Security Features

### Encryption Specifications

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: PBKDF2-SHA256
- **Salt**: 16 bytes, cryptographically random (per encryption)
- **IV**: 12 bytes, cryptographically random (per encryption)
- **Iterations**: 600,000 (recommended) or 100,000 (legacy support)

### Password Requirements

- Minimum length: 8 characters
- Recommended: 12+ characters for high-value secrets
- No maximum length
- Supports all Unicode characters

### File Format

Encrypted files use base64 encoding with structure:
```
<version><salt><iv><ciphertext><authTag>
```

All components are base64-encoded in a single string.

## Integration with bap-cli

bbackup and bap-cli work together for complete BAP identity management:

**Separation of Concerns:**
- **bap-cli**: High-level BAP identity operations (create, list, extract)
- **bbackup**: Low-level encryption/decryption of any JSON data

**Common Workflows:**

1. **Inspect BAP identity without bap-cli**:
```bash
# Decrypt .bep file
bbackup dec identity.bep -p "pass" -o identity.json

# View contents
cat identity.json

# Re-encrypt
bbackup enc identity.json -p "pass" -o identity-new.bep
```

2. **Convert between formats**:
```bash
# Export from bap-cli
bap export master.bep --password pass --output master-decrypted.json

# Encrypt with bbackup
bbackup enc master-decrypted.json -p "newpass" -o master-new.bep
```

3. **Upgrade security on existing backups**:
```bash
# Use bbackup to upgrade any .bep file to stronger encryption
bbackup upg old-backup.bep -p "password" -o upgraded-backup.bep
```

## Troubleshooting

### Common Errors

**"Decryption failed"**
- Verify correct password
- Check file is not corrupted
- Ensure file is actually encrypted (not plain JSON)

**"Invalid backup format"**
- Input file for `enc` must be valid JSON
- Use `dec` command for .bep files, not `enc`

**"Password too short"**
- Minimum 8 characters required
- Use stronger password for better security

### Verification Steps

1. Test encryption/decryption cycle:
```bash
echo '{"test":"data"}' > test.json
bbackup enc test.json -p "testpass" -o test.bep
bbackup dec test.bep -p "testpass" -o test-out.json
diff test.json test-out.json  # Should be identical
```

2. Verify file format:
```bash
# .bep files should be base64-encoded
head -c 100 backup.bep
# Should show base64 characters (A-Z, a-z, 0-9, +, /, =)
```

## Programmatic Usage

While bbackup is primarily a CLI tool, the underlying library can be used programmatically:

```typescript
import { encryptBackup, decryptBackup } from 'bitcoin-backup';

// Encrypt any backup object
const backup = { wif: "L1uyy5..." };
const encrypted = await encryptBackup(backup, "password");

// Decrypt
const decrypted = await decryptBackup(encrypted, "password");
```

See bitcoin-backup library documentation for full API details.

## File Extensions

- `.json` - Unencrypted JSON backup data
- `.bep` - Bitcoin Encrypted Payload (encrypted backup)
- `_encrypted.bep` - Default encrypted output suffix
- `_upgraded.bep` - Default upgraded output suffix

## Best Practices

1. **Always backup before upgrading**: Keep original files when using `upg`
2. **Use strong passwords**: 12+ characters recommended
3. **Verify decryption**: Test password immediately after encryption
4. **Secure password storage**: Use password manager for passphrases
5. **Regular upgrades**: Periodically upgrade to latest iteration counts
6. **Test recovery**: Verify backups can be decrypted before deleting originals
