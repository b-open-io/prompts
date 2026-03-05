# CI/CD Testing Reference

## Comprehensive GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Comprehensive Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-matrix:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        language: [typescript, go]
        shard: [1, 2, 3, 4]

    steps:
      - uses: actions/checkout@v4

      # TypeScript Testing
      - name: Setup Bun (TypeScript)
        if: matrix.language == 'typescript'
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies (TypeScript)
        if: matrix.language == 'typescript'
        run: bun install

      - name: Run Bun tests with sharding
        if: matrix.language == 'typescript'
        run: bun test --shard=${{ matrix.shard }}/4

      # Go Testing
      - name: Setup Go
        if: matrix.language == 'go'
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Run Go tests with race detection
        if: matrix.language == 'go'
        run: go test -race -coverprofile=coverage.out ./...

      - name: Run Go fuzzing
        if: matrix.language == 'go'
        run: go test -fuzz=. -fuzztime=30s ./...

      # E2E Testing (TypeScript only)
      - name: Run Playwright E2E
        if: matrix.language == 'typescript'
        run: bunx playwright test --shard=${{ matrix.shard }}/4

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.out

  mutation-testing:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - name: Run mutation tests
        run: bunx stryker run

  performance-testing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run k6 performance tests
        run: |
          docker run --rm -v $PWD:/app grafana/k6 run /app/performance/api-test.js
```

## Contract Testing Pipeline

```yaml
# .github/workflows/contract-tests.yml
name: Contract Testing

on: [push, pull_request]

jobs:
  consumer-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run consumer contract tests
        run: bun test:contracts:consumer
      - name: Publish contracts
        run: bunx pact-broker publish --consumer-app-version=${{ github.sha }}

  provider-tests:
    needs: consumer-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify provider contracts
        run: bunx pact-broker verify --provider-app-version=${{ github.sha }}
```

## Custom Test Reporter (Slack)

```typescript
export class SlackReporter {
  onRunComplete(contexts: Set<Context>, results: AggregatedResult) {
    const { numTotalTests, numPassedTests, numFailedTests } = results;

    const message = {
      text: `Test Results: ${numPassedTests}/${numTotalTests} passed`,
      color: numFailedTests > 0 ? 'danger' : 'good',
      fields: [
        { title: 'Passed', value: numPassedTests, short: true },
        { title: 'Failed', value: numFailedTests, short: true }
      ]
    };

    this.sendToSlack(message);
  }
}
```
