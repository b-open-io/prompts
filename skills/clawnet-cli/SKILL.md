---
name: clawnet-cli
version: 0.0.33
description: Reference for ClawNet CLI internals, architecture, and recent changes. Use this skill when working on clawnet, clawnet-paperclip-plugin, or any code that interacts with the ClawNet registry, vault, ORDFS content fetching, or agent/organization publishing.
---

# ClawNet CLI

## Vault Architecture (v0.0.33)

ClawNet CLI uses `@1sat/vault@0.0.6` and `@1sat/wallet-mac` for key management. The old `configureVault()` helper and built-in `se-helper` binary have been removed.

The vault is composed from three pieces:

1. **`SecureEnclaveProvider`** from `@1sat/wallet-mac` — platform-specific Secure Enclave operations. Instantiated with `SecureEnclaveProvider({ name: "ClawNet" })`.
2. **`FileVaultStorage`** from `@1sat/vault` — file-based vault entry storage.
3. **`createVault(provider, storage)`** from `@1sat/vault` — creates the vault instance from a provider and storage backend.

```ts
import { SecureEnclaveProvider } from "@1sat/wallet-mac";
import { FileVaultStorage, createVault } from "@1sat/vault";

const provider = new SecureEnclaveProvider({ name: "ClawNet" });
const storage = new FileVaultStorage();
const vault = createVault(provider, storage);
```

## ORDFS Directory Traversal (v0.0.32)

`clawnet add` fetches files via `/content/{manifest}/{path}` directory paths. ORDFS resolves `_N` refs and nested directories natively, so the CLI no longer needs to parse them manually. The old `downloadDirectoryEntries` function with manual `_N` parsing was removed.

Example fetch path:

```
https://ordfs.network/content/{manifestTxid}/src/index.ts
```

ORDFS handles the directory tree resolution server-side.

## Organization Publishing

`clawnet publish ORGANIZATION.md` publishes organization packages with an agent hierarchy (roles, reporting structure).

The `ORGANIZATION.md` format uses YAML frontmatter with an `agents:` array:

```yaml
---
name: my-org
agents:
  - slug: lead-agent
    role: lead
  - slug: worker-agent
    role: worker
    reportsTo: lead-agent
---
```

Each agent entry supports:

- **`slug`** — agent identifier (must match a published agent)
- **`role`** — the agent's role within the organization
- **`reportsTo`** — slug of the agent this one reports to (establishes hierarchy)

## Agent Publish with Icons

Agent `.md` files support an `icon:` field in YAML frontmatter. The icon URL points to an avatar image that is stored in the registry and served via the API.

```yaml
---
name: my-agent
icon: https://example.com/avatar.png
---
```
