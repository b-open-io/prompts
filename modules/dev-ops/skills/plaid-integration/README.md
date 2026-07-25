# Plaid Integration Skill

Integrates Plaid API for connecting bank accounts and syncing transactions in TypeScript/Bun applications. Covers the full Link flow, token lifecycle, and transaction pagination.

## What This Skill Does

When invoked, Claude will implement Plaid bank-account linking and transaction sync in a TypeScript project. This includes setting up the Plaid client, building the Link token → public token → access token flow, persisting accounts and transactions with Bun SQLite, and handling pagination and errors correctly.

## Plaid Concepts

| Term | Meaning |
|------|---------|
| **Item** | A bank connection — one per institution per user |
| **Access Token** | Permanent credential for API calls — store securely, never expose to clients |
| **Public Token** | Temporary token returned by Link after the user authenticates — exchange immediately |
| **Link Token** | Short-lived token used to initialize the Link UI |

## Products

| Product | What it returns |
|---------|----------------|
| `transactions` | Transaction history and real-time updates |
| `auth` | Account and routing numbers |
| `identity` | Account holder information |
| `investments` | Investment account data |
| `liabilities` | Loan and credit card data |
| `assets` | Asset reports |

## Environment Setup

| Environment | Use Case | HTTPS Required | Real Data |
|-------------|----------|----------------|-----------|
| `sandbox` | Development and testing | No | No (test accounts) |
| `development` | Limited Production | Yes for redirect, No for popup | Yes (with limits) |
| `production` | Full production | Yes | Yes |

Set credentials in `.env`:

```bash
PLAID_CLIENT_ID='your_client_id'
PLAID_SECRET='your_secret'
PLAID_ENV='sandbox'   # sandbox | development | production
```

Use popup mode (no `redirect_uri`) for local development to avoid HTTPS requirements.

## Authentication Flow Overview

The Plaid Link flow has three steps:

1. **Create Link Token** (backend) — call `linkTokenCreate`, returns a short-lived token
2. **User Authenticates** (frontend) — initialize Plaid Link JS with the token; user logs into their bank
3. **Exchange Tokens** (backend) — call `itemPublicTokenExchange` with the `public_token` to get a permanent `access_token`

For a complete working implementation of this flow (including the embedded Elysia server that hosts the Link UI), see `references/code-examples.md`.

## Common Errors

| Error Code | Cause | Solution |
|------------|-------|----------|
| `INVALID_ACCESS_TOKEN` | Token expired or revoked | Re-link the account |
| `ITEM_LOGIN_REQUIRED` | Bank requires re-authentication | Use update mode Link |
| `INVALID_FIELD` + "redirect_uri must use HTTPS" | Using redirect in dev/prod without HTTPS | Use popup mode or provision HTTPS |
| `PRODUCTS_NOT_SUPPORTED` | Institution does not support product | Check institution capabilities before requesting |
| `PRODUCT_NOT_READY` | Data still processing | Retry after a delay |
| `INSTITUTION_NOT_RESPONDING` | Bank is down | Surface to user, retry later |

## Documentation Links

- [Plaid Quickstart](https://plaid.com/docs/quickstart/)
- [Link Token API](https://plaid.com/docs/api/tokens/#linktokencreate)
- [Transactions API](https://plaid.com/docs/api/products/transactions/)
- [Error Reference](https://plaid.com/docs/errors/)
- [Sandbox Test Credentials](https://plaid.com/docs/sandbox/test-credentials/)

## Reference Files

- `references/code-examples.md` — Complete implementations: bank connection flow, transaction sync, full Bun SQLite database module, CLI integration
- `references/api-reference.md` — All API endpoints with request/response shapes, sandbox testing patterns, webhooks, rate limits
