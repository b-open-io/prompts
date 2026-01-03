# Playwright and Bun Runtime Compatibility Guide

## Executive Summary

**Bun-First Approach**: This guide demonstrates how to use Playwright with Bun's runtime using the `--bun` flag. We prefer leveraging Bun's superior performance and modern JavaScript support for all testing scenarios, including E2E tests with Playwright.

## Current State (January 2025)

### Using Playwright with Bun

Playwright can be successfully run with Bun's runtime using the `--bun` flag. This approach allows you to maintain a consistent runtime environment across your entire testing stack.

### The Bun-First Approach

```bash
# Preferred: Use Bun runtime with --bun flag
bun --bun test e2e/

# Run specific Playwright tests with Bun
bun --bun x playwright test

# Use Bun for all Playwright operations
bun --bun x playwright install
bun --bun x playwright test --ui
```

## Configuration for Bun + Playwright

### 1. Package.json Scripts

Configure your scripts to always use the `--bun` flag:

```json
{
  "scripts": {
    "test": "bun --bun test",
    "test:unit": "bun --bun test src/",
    "test:e2e": "bun --bun x playwright test",
    "test:ui": "bun --bun x playwright test --ui",
    "playwright:install": "bun --bun x playwright install",
    "test:all": "bun --bun run test:unit && bun --bun run test:e2e"
  }
}
```

### 2. Playwright Configuration

Create a `playwright.config.ts` that works well with Bun:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    // Use Bun to start your dev server
    command: 'bun --bun run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3. Test Structure

Organize your tests to leverage Bun's capabilities:

```
project/
├── src/
│   └── **/*.test.ts    # Unit tests (Bun native)
├── e2e/
│   └── **/*.spec.ts    # E2E tests (Playwright with --bun)
├── tests/
│   └── integration/    # Integration tests (Bun native)
└── playwright.config.ts
```

## Writing Tests That Work with Bun

### E2E Test Example

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome');
  });
});
```

### Using Bun-specific Features in Test Helpers

```typescript
// e2e/helpers/test-utils.ts
// You can use Bun APIs in your test utilities
import { file } from 'bun';

export async function loadTestData(filename: string) {
  const data = await file(`./fixtures/${filename}`).text();
  return JSON.parse(data);
}

export async function setupTestUser() {
  // Use Bun's fast crypto APIs
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update('test-user-data');
  const hash = hasher.digest('hex');
  
  return {
    id: hash.slice(0, 8),
    email: 'test@example.com',
    password: 'hashed-password'
  };
}
```

## CI/CD Configuration

### GitHub Actions with Bun

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      # Install dependencies with Bun
      - run: bun install
      
      # Install Playwright browsers with Bun
      - run: bun --bun x playwright install --with-deps
      
      # Run all tests with Bun
      - run: bun --bun test:all
      
      # Upload Playwright report
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Environment Variables and Configuration

### Using .env with Bun

```bash
# .env.test
BASE_URL=http://localhost:3000
API_URL=http://localhost:3001
TEST_TIMEOUT=30000
```

### Loading in Tests

```typescript
// playwright.config.ts
// Bun automatically loads .env files
export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  timeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
});
```

## Performance Benefits

Using Bun with the `--bun` flag provides several advantages:

1. **Faster Installation**: `bun install` is significantly faster than npm/yarn
2. **Quicker Test Startup**: Bun's runtime starts faster than Node.js
3. **Better Memory Usage**: Bun's efficient runtime uses less memory
4. **Modern JavaScript**: Full support for latest JS/TS features without transpilation
5. **Built-in TypeScript**: No need for separate TypeScript compilation

## Debugging with Bun + Playwright

### Debug Mode

```bash
# Run tests in debug mode with Bun
bun --bun x playwright test --debug

# Run specific test file in debug mode
bun --bun x playwright test e2e/auth.spec.ts --debug
```

### Using Playwright Inspector

```bash
# Launch Playwright Inspector with Bun
PWDEBUG=1 bun --bun x playwright test
```

### Console Debugging

```typescript
test('debug example', async ({ page }) => {
  // Bun's console methods work normally
  console.log('Starting test...');
  
  await page.goto('/');
  
  // Use Bun's inspect for detailed object logging
  console.log(Bun.inspect(await page.title()));
});
```

## Common Patterns and Best Practices

### 1. Global Setup with Bun

```typescript
// global-setup.ts
import { chromium } from '@playwright/test';

async function globalSetup() {
  // Use Bun's file APIs for test data
  const testData = await Bun.file('./fixtures/users.json').json();
  
  // Set up test database using Bun's subprocess
  const proc = Bun.spawn(['bun', 'run', 'db:seed']);
  await proc.exited;
  
  return async () => {
    // Cleanup
    const cleanup = Bun.spawn(['bun', 'run', 'db:clean']);
    await cleanup.exited;
  };
}

export default globalSetup;
```

### 2. Custom Test Fixtures

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  // Use Bun's APIs in fixtures
  testUser: async ({}, use) => {
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(Date.now().toString());
    const id = hasher.digest('hex').slice(0, 8);
    
    await use({
      id,
      email: `test-${id}@example.com`,
      password: 'test-password'
    });
  },
});
```

### 3. API Testing with Bun

```typescript
// e2e/api.spec.ts
import { test, expect } from '@playwright/test';

test('API endpoints', async ({ request }) => {
  // Playwright's request context works with Bun
  const response = await request.post('/api/users', {
    data: {
      name: 'Test User',
      email: 'test@example.com'
    }
  });
  
  expect(response.ok()).toBeTruthy();
  
  // Use Bun's APIs for response processing
  const data = await response.json();
  expect(data.id).toBeDefined();
});
```

## Troubleshooting

### Issue: Tests Not Running with Bun

**Solution**: Always use the `--bun` flag:
```bash
# ✅ Correct
bun --bun x playwright test

# ❌ Incorrect (might fall back to Node)
bun x playwright test
```

### Issue: Module Resolution Problems

**Solution**: Configure TypeScript for Bun:
```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["bun-types"],
    "module": "esnext",
    "target": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "strict": true,
    "jsx": "react-jsx"
  }
}
```

### Issue: Environment Variables Not Loading

**Solution**: Bun automatically loads `.env` files, but you can be explicit:
```typescript
// Load specific env file
await Bun.env.load('.env.test');
```

## Example Project Setup

Here's a complete example of setting up a project with Bun + Playwright:

```bash
# Initialize project
mkdir my-app && cd my-app
bun init

# Add dependencies
bun add -d @playwright/test
bun add -d @types/bun

# Install Playwright browsers with Bun
bun --bun x playwright install

# Create test structure
mkdir -p e2e src/tests

# Run tests
bun --bun test       # All tests
bun --bun test:e2e   # E2E tests only
```

## Conclusion

By using the `--bun` flag, you can successfully run Playwright tests with Bun's runtime, maintaining a consistent and performant development environment. This approach leverages Bun's speed and modern JavaScript support while still utilizing Playwright's powerful E2E testing capabilities.

Remember: **We prefer Bun**. Use the `--bun` flag to ensure your entire testing stack runs on Bun's superior runtime.

## Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [Playwright Documentation](https://playwright.dev)
- [Bun + Playwright Examples](https://github.com/oven-sh/bun/tree/main/examples/playwright)