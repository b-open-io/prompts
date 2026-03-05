# E2E Testing Reference

## Playwright Configuration

```typescript
export default {
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
};
```

## Page Object Model

```typescript
export class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid=email]', email);
    await this.page.fill('[data-testid=password]', password);
    await this.page.click('[data-testid=submit]');
    await this.page.waitForURL('/dashboard');
  }

  async expectLoginError(message: string) {
    await expect(this.page.locator('[data-testid=error]')).toContainText(message);
  }
}
```

## Quick E2E with agent-browser

For rapid manual verification without writing Playwright tests:

```bash
# Start local dev server first, then:
agent-browser open http://localhost:3000

# Get interactive elements with refs
agent-browser snapshot -i
# Output: textbox "Email" [ref=e1], textbox "Password" [ref=e2], button "Login" [ref=e3]

# Test login flow
agent-browser fill @e1 "test@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
agent-browser wait --load networkidle

# Verify navigation
agent-browser get url  # Should be /dashboard

# Screenshot for visual verification
agent-browser screenshot login-result.png

# Close when done
agent-browser close
```

## agent-browser Advanced Patterns

**Console/error monitoring** (for debugging test failures):
```bash
agent-browser console        # See browser console logs
agent-browser errors         # See JS errors on page
```

**Visual regression diff** (before/after comparison):
```bash
agent-browser screenshot before.png
# ... make changes ...
agent-browser screenshot after.png
agent-browser diff screenshot before.png after.png  # highlight differences
```

**Network request monitoring** (verify API calls happen):
```bash
agent-browser request list   # See all requests made
agent-browser route add "**/api/submit" --block  # block specific request to test error state
```

**Frame/iframe handling**:
```bash
agent-browser frame list     # see iframes on page
agent-browser frame @e3      # switch into iframe
agent-browser snapshot -i    # snapshot iframe content
```

**Video recording for CI evidence**:
```bash
agent-browser record start test-run.webm
# ... run test flow ...
agent-browser record stop
```

## When to Use Each Tool

| Tool | When |
|------|------|
| **agent-browser** | Quick manual verification, exploratory testing, debugging UI issues |
| **Playwright** | Automated test suites, CI/CD pipelines, cross-browser testing |
