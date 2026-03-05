# Advanced Testing Techniques Reference

## Property-Based Testing (fast-check)

```typescript
import fc from 'fast-check';

describe('User validation', () => {
  test('should always validate email format', () => {
    fc.assert(fc.property(
      fc.emailAddress(),
      (email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
      }
    ));
  });

  test('reverse function is idempotent', () => {
    fc.assert(fc.property(fc.string(), (str) => {
      expect(reverse(reverse(str))).toBe(str);
    }));
  });
});
```

## Mutation Testing (Stryker)

```json
// stryker.conf.json
{
  "packageManager": "bun",
  "testRunner": "command",
  "commandRunner": {
    "command": "bun test"
  },
  "reporters": ["html", "clear-text", "progress"],
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.test.ts"
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

Run: `bunx stryker run`

## Performance/Load Testing (k6)

```typescript
import { check } from 'k6'
import http from 'k6/http'

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
}

export default function () {
  const response = http.get('https://api.example.com/products')

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  })
}
```

Run: `docker run --rm -v $PWD:/app grafana/k6 run /app/performance/api-test.js`

## Go Benchmark Testing (TypeScript equivalent)

```typescript
import Benchmark from 'benchmark';

const suite = new Benchmark.Suite();
suite
  .add('Array.forEach', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);
    let sum = 0;
    arr.forEach(n => sum += n);
  })
  .add('for loop', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += arr[i];
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run();
```
