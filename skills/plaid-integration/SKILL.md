---
name: plaid-integration
version: 1.0.1
description: This skill should be used when the user wants to integrate Plaid API for bank account connections and transaction syncing. Use when implementing financial data access, bank linking, or transaction imports in TypeScript/Bun applications.
---

# Plaid API Integration

Integrate Plaid for connecting bank accounts and syncing transactions in TypeScript applications using Bun.

## Installation

```bash
bun add plaid
```

## Client Initialization

```typescript
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const plaidClient = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    }
  }
}));
```

## Link Token Creation

Omit `redirect_uri` to use popup mode — required for local HTTP development:

```typescript
const response = await plaidClient.linkTokenCreate({
  user: { client_user_id: `user-${Date.now()}` },
  client_name: 'My App',
  products: ['transactions'],
  country_codes: ['US'],
  language: 'en',
  // No redirect_uri = popup mode, works with HTTP localhost
});
const linkToken = response.data.link_token;
```

## Token Exchange

After the user completes Link, exchange the temporary `public_token` for a permanent `access_token`:

```typescript
const response = await plaidClient.itemPublicTokenExchange({ public_token });
const { access_token, item_id } = response.data;
// Store access_token securely — never expose to clients
```

## Transaction Sync

Plaid returns a maximum of 500 transactions per request. Always paginate:

```typescript
let offset = 0;
const count = 500;

while (true) {
  const response = await plaidClient.transactionsGet({
    access_token,
    start_date: '2023-01-01',
    end_date: '2024-12-31',
    options: { count, offset },
  });

  // Process response.data.transactions
  offset += response.data.transactions.length;
  if (offset >= response.data.total_transactions) break;
}
```

For ongoing incremental updates, prefer `transactionsSync` with a cursor — see `references/api-reference.md`.

## Error Handling

Catch Plaid errors from `error.response?.data`:

```typescript
try {
  await plaidClient.transactionsGet({ ... });
} catch (error: any) {
  const plaidError = error.response?.data;
  if (!plaidError) throw error;

  switch (plaidError.error_code) {
    case 'ITEM_LOGIN_REQUIRED':
      // Re-initialize Link in update mode
      break;
    case 'INVALID_ACCESS_TOKEN':
      // Token revoked — delete item, prompt re-link
      break;
    case 'PRODUCT_NOT_READY':
      // Data still processing — retry after delay
      break;
    default:
      throw new Error(`Plaid error: ${plaidError.error_code} — ${plaidError.error_message}`);
  }
}
```

## Database Setup

Use Bun SQLite with `items → accounts → transactions` hierarchy. For the complete schema with indexes, prepared statements, and TypeScript types, see `references/code-examples.md`.

## Reference Files

- `references/code-examples.md` — Full working implementations: bank connection flow with Elysia server, transaction sync with pagination, complete Bun SQLite database module, CLI integration
- `references/api-reference.md` — All API endpoints with request/response shapes, sandbox test credentials, webhook events, rate limits
