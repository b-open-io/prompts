# Plaid API Reference

## Core Endpoints

### Link Token Create

Creates a short-lived token for initializing Plaid Link.

```typescript
const response = await plaidClient.linkTokenCreate({
  user: { client_user_id: 'unique-user-id' },
  client_name: 'Your App Name',
  products: ['transactions'],      // See Products below
  country_codes: ['US'],
  language: 'en',
  // Optional: redirect_uri for OAuth flow (requires HTTPS in production)
  // Omit for popup mode (works with HTTP localhost)
});

// Response
{
  link_token: 'link-sandbox-xxx',
  expiration: '2024-01-01T00:00:00Z',
  request_id: 'xxx'
}
```

**Products:**
- `transactions` - Transaction history
- `auth` - Account/routing numbers
- `identity` - Account holder info
- `investments` - Investment data
- `liabilities` - Loans/credit cards
- `assets` - Asset reports

### Public Token Exchange

Exchanges temporary public_token for permanent access_token.

```typescript
const response = await plaidClient.itemPublicTokenExchange({
  public_token: 'public-sandbox-xxx'
});

// Response
{
  access_token: 'access-sandbox-xxx',  // Store securely!
  item_id: 'item-id-xxx',
  request_id: 'xxx'
}
```

### Accounts Get

Retrieves all accounts for an Item.

```typescript
const response = await plaidClient.accountsGet({
  access_token: 'access-sandbox-xxx'
});

// Response
{
  accounts: [{
    account_id: 'xxx',
    name: 'Checking',
    official_name: 'Premium Checking',
    type: 'depository',        // depository, credit, loan, investment, other
    subtype: 'checking',
    mask: '1234',
    balances: {
      current: 1000.00,
      available: 950.00,
      iso_currency_code: 'USD'
    }
  }],
  item: { item_id: 'xxx', institution_id: 'ins_xxx' }
}
```

### Transactions Get

Retrieves transactions for a date range. **Max 500 per request - paginate!**

```typescript
const response = await plaidClient.transactionsGet({
  access_token: 'access-sandbox-xxx',
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  options: {
    count: 500,      // Max per request
    offset: 0,       // For pagination
    include_personal_finance_category: true
  }
});

// Response
{
  accounts: [...],
  transactions: [{
    transaction_id: 'xxx',
    account_id: 'xxx',
    amount: 50.00,           // Positive = debit, Negative = credit
    date: '2024-01-15',
    name: 'AMAZON',
    merchant_name: 'Amazon',
    category: ['Shopping', 'Electronics'],
    pending: false,
    payment_channel: 'online',  // online, in_store, other
    transaction_type: 'place',
    iso_currency_code: 'USD'
  }],
  total_transactions: 1500   // Use for pagination
}
```

### Transactions Sync (Alternative)

Incremental sync using cursor - more efficient for ongoing updates.

```typescript
const response = await plaidClient.transactionsSync({
  access_token: 'access-sandbox-xxx',
  cursor: '',  // Empty for initial, then use returned cursor
  count: 500
});

// Response
{
  added: [...],       // New transactions
  modified: [...],    // Updated transactions
  removed: [...],     // Deleted transactions
  next_cursor: 'xxx', // Save for next sync
  has_more: true      // Continue if true
}
```

### Item Get

Get Item metadata.

```typescript
const response = await plaidClient.itemGet({
  access_token: 'access-sandbox-xxx'
});

// Response
{
  item: {
    item_id: 'xxx',
    institution_id: 'ins_xxx',
    webhook: 'https://...',
    error: null,           // ITEM_LOGIN_REQUIRED if needs re-auth
    available_products: ['transactions', 'auth'],
    billed_products: ['transactions']
  }
}
```

### Item Remove

Disconnect an Item (revokes access_token).

```typescript
await plaidClient.itemRemove({
  access_token: 'access-sandbox-xxx'
});
```

## Error Handling

```typescript
try {
  await plaidClient.transactionsGet({ ... });
} catch (error: any) {
  const plaidError = error.response?.data;
  if (plaidError) {
    console.error({
      error_type: plaidError.error_type,
      error_code: plaidError.error_code,
      error_message: plaidError.error_message,
      display_message: plaidError.display_message,  // Show to user
    });

    // Handle specific errors
    switch (plaidError.error_code) {
      case 'ITEM_LOGIN_REQUIRED':
        // User needs to re-authenticate
        break;
      case 'INVALID_ACCESS_TOKEN':
        // Token expired/revoked
        break;
      case 'PRODUCT_NOT_READY':
        // Data still processing, retry later
        break;
    }
  }
}
```

## Common Error Codes

| Code | Type | Description |
|------|------|-------------|
| `ITEM_LOGIN_REQUIRED` | ITEM_ERROR | Bank requires re-authentication |
| `INVALID_ACCESS_TOKEN` | INVALID_REQUEST | Token is invalid/expired |
| `PRODUCT_NOT_READY` | ITEM_ERROR | Data still being fetched |
| `PRODUCTS_NOT_SUPPORTED` | INVALID_REQUEST | Institution doesn't support product |
| `INSTITUTION_NOT_RESPONDING` | INSTITUTION_ERROR | Bank is down |
| `INVALID_FIELD` | INVALID_REQUEST | Bad request parameter |

## Sandbox Testing

### Test Credentials
- Username: `user_good`
- Password: `pass_good`

### Force Errors
Use specific usernames to trigger error states:
- `user_login_required` → ITEM_LOGIN_REQUIRED
- `user_not_found` → INVALID_CREDENTIALS

### Create Sandbox Public Token (Bypass Link)

```typescript
const response = await plaidClient.sandboxPublicTokenCreate({
  institution_id: 'ins_109508',  // First Platypus Bank
  initial_products: ['transactions']
});
// Returns public_token to exchange
```

## Webhooks

For real-time updates, configure webhooks in Plaid Dashboard.

Key webhook types:
- `TRANSACTIONS_REMOVED` - Transactions deleted
- `DEFAULT_UPDATE` - New transactions available
- `INITIAL_UPDATE` - Historical transactions ready
- `HISTORICAL_UPDATE` - 2+ years of history ready
- `ITEM_ERROR` - Item needs attention

## Rate Limits

- 100 requests per minute per client_id (development)
- Higher limits in production
- Paginated endpoints count as multiple requests
