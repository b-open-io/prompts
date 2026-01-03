# Plaid Integration Code Examples

## Complete Bank Connection Flow (CLI/Desktop App)

This pattern uses a local web server for the Link flow, suitable for CLI tools or desktop apps.

### Client Setup

```typescript
// src/plaid/client.ts
import { Elysia } from 'elysia';
import open from 'open';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import type { LinkTokenCreateRequest, Products, CountryCode } from 'plaid';
import { db, queries } from '../db';

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';
const BASE_URL = 'http://localhost:8080';

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV as keyof typeof PlaidEnvironments],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID || '',
      'PLAID-SECRET': PLAID_SECRET || '',
    }
  }
});

export const plaidClient = new PlaidApi(configuration);

export async function connectBankAccount(): Promise<void> {
  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    throw new Error('Missing PLAID_CLIENT_ID or PLAID_SECRET');
  }

  return new Promise((resolve, reject) => {
    let server: ReturnType<typeof Bun.serve> | null = null;

    const stopServer = () => {
      if (server) {
        server.stop();
        server = null;
      }
    };

    // HTML page that hosts Plaid Link SDK
    const getLinkPage = (linkToken: string) => `
<!DOCTYPE html>
<html>
<head>
  <title>Connect Bank Account</title>
  <script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Connect Your Bank</h1>
    <div id="status">Initializing...</div>
  </div>
  <script>
    const handler = Plaid.create({
      token: '${linkToken}',
      onSuccess: async (public_token, metadata) => {
        document.getElementById('status').textContent = 'Linking...';
        const response = await fetch('/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token, metadata })
        });
        if (response.ok) {
          document.getElementById('status').textContent = 'Connected!';
          setTimeout(() => window.close(), 1500);
        }
      },
      onExit: () => fetch('/connection-cancelled', { method: 'POST' })
    });
    handler.open();
  </script>
</body>
</html>`;

    const app = new Elysia()
      .get('/', async () => {
        // Create link token - NO redirect_uri for popup mode
        const linkConfig: LinkTokenCreateRequest = {
          user: { client_user_id: `user-${Date.now()}` },
          client_name: 'My App',
          products: ['transactions' as Products],
          country_codes: ['US' as CountryCode],
          language: 'en',
        };

        const response = await plaidClient.linkTokenCreate(linkConfig);
        return new Response(getLinkPage(response.data.link_token), {
          headers: { 'Content-Type': 'text/html' }
        });
      })
      .post('/exchange-token', async ({ body }) => {
        const { public_token, metadata } = body as any;

        // Exchange public token for access token
        const response = await plaidClient.itemPublicTokenExchange({ public_token });
        const { access_token, item_id } = response.data;

        // Save to database
        queries.insertItem.run(
          item_id,
          access_token,
          metadata.institution?.institution_id || null,
          metadata.institution?.name || 'Unknown'
        );

        setTimeout(() => { stopServer(); resolve(); }, 500);
        return new Response(JSON.stringify({ success: true }));
      })
      .post('/connection-cancelled', () => {
        stopServer();
        reject(new Error('Connection cancelled'));
        return new Response(null, { status: 200 });
      });

    server = Bun.serve({ fetch: app.handle, port: 8080 });
    console.log('Opening browser for bank connection...');
    open(BASE_URL);
  });
}
```

## Transaction Sync with Pagination

```typescript
// src/plaid/sync.ts
import { plaidClient } from './client';
import { queries } from '../db';

interface SyncOptions {
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;
}

export async function syncTransactions(
  accessToken: string,
  itemId: string,
  options: SyncOptions = {}
): Promise<{ accounts: number; transactions: number }> {
  const endDate = options.endDate || new Date().toISOString().split('T')[0];
  const startDate = options.startDate || (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    return d.toISOString().split('T')[0];
  })();

  // Sync accounts first
  const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });

  for (const account of accountsResponse.data.accounts) {
    queries.insertAccount.run(
      account.account_id,
      itemId,
      account.name,
      account.official_name || null,
      account.type,
      account.subtype || null,
      account.mask || null,
      account.balances.current,
      account.balances.available,
      account.balances.iso_currency_code || 'USD'
    );
  }

  // Sync transactions with pagination
  let offset = 0;
  const count = 500;
  let totalSynced = 0;

  while (true) {
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count, offset },
    });

    for (const tx of response.data.transactions) {
      queries.insertTransaction.run(
        tx.transaction_id,
        tx.account_id,
        tx.amount,
        tx.date,
        tx.name,
        tx.merchant_name || null,
        tx.category?.join(' > ') || null,
        tx.pending ? 1 : 0,
        tx.payment_channel || null,
        tx.transaction_type || null,
        tx.iso_currency_code || 'USD'
      );
      totalSynced++;
    }

    offset += response.data.transactions.length;
    if (offset >= response.data.total_transactions) break;
  }

  return {
    accounts: accountsResponse.data.accounts.length,
    transactions: totalSynced,
  };
}
```

## Database Module with Bun SQLite

```typescript
// src/db/index.ts
import { Database } from "bun:sqlite";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "plaid.db");
export const db = new Database(DB_PATH);

db.run("PRAGMA foreign_keys = ON");

// Schema
db.run(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    institution_id TEXT,
    institution_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    name TEXT NOT NULL,
    official_name TEXT,
    type TEXT NOT NULL,
    subtype TEXT,
    mask TEXT,
    current_balance REAL,
    available_balance REAL,
    currency TEXT DEFAULT 'USD',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    merchant_name TEXT,
    category TEXT,
    pending INTEGER DEFAULT 0,
    payment_channel TEXT,
    transaction_type TEXT,
    iso_currency_code TEXT DEFAULT 'USD',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )
`);

// Indexes
db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_accounts_item ON accounts(item_id)`);

// Prepared statements
export const queries = {
  insertItem: db.prepare(`
    INSERT OR REPLACE INTO items (id, access_token, institution_id, institution_name, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `),

  getItems: db.prepare(`SELECT * FROM items ORDER BY created_at DESC`),

  deleteItem: db.prepare(`DELETE FROM items WHERE id = ?`),

  insertAccount: db.prepare(`
    INSERT OR REPLACE INTO accounts
    (id, item_id, name, official_name, type, subtype, mask, current_balance, available_balance, currency, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `),

  getAllAccounts: db.prepare(`
    SELECT a.*, i.institution_name
    FROM accounts a
    JOIN items i ON a.item_id = i.id
    ORDER BY i.institution_name, a.name
  `),

  insertTransaction: db.prepare(`
    INSERT OR REPLACE INTO transactions
    (id, account_id, amount, date, name, merchant_name, category, pending, payment_channel, transaction_type, iso_currency_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getTransactionsByYear: db.prepare(`
    SELECT t.*, a.name as account_name, i.institution_name
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    JOIN items i ON a.item_id = i.id
    WHERE strftime('%Y', t.date) = ?
    ORDER BY t.date DESC
  `),

  getTransactionStats: db.prepare(`
    SELECT
      COUNT(*) as total_count,
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_debits,
      SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_credits,
      MIN(date) as earliest_date,
      MAX(date) as latest_date
    FROM transactions
  `),
};

// Types
export type Item = {
  id: string;
  access_token: string;
  institution_id: string | null;
  institution_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Account = {
  id: string;
  item_id: string;
  name: string;
  type: string;
  subtype: string | null;
  current_balance: number | null;
  institution_name?: string;
};

export type Transaction = {
  id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  category: string | null;
};
```

## Environment Configuration

```bash
# .env
PLAID_CLIENT_ID='your_client_id'
PLAID_SECRET='your_secret'
PLAID_ENV='development'  # sandbox | development | production
```

**Environment differences:**
- `sandbox`: Test data, HTTP allowed, use test credentials (user_good/pass_good)
- `development`: Real data with limits (Limited Production), HTTPS required for redirects
- `production`: Full access, HTTPS required, additional compliance requirements

## CLI Integration Example

```typescript
// src/index.ts
import { parseArgs } from "node:util";
import { connectBankAccount, syncAllAccounts } from "./plaid/client";
import { queries } from "./db";

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    connect: { type: "boolean", short: "c" },
    sync: { type: "boolean", short: "s" },
    list: { type: "boolean", short: "l" },
    from: { type: "string" },
    to: { type: "string" },
  },
});

if (args.connect) {
  await connectBankAccount();
  console.log("Connected! Run --sync to fetch transactions.");
}

if (args.sync) {
  await syncAllAccounts({ startDate: args.from, endDate: args.to });
}

if (args.list) {
  const accounts = queries.getAllAccounts.all();
  for (const a of accounts) {
    console.log(`${a.institution_name}: ${a.name} ($${a.current_balance})`);
  }
}
```
