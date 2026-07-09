# Testing Anti-Patterns & Best Practices Reference

## Do These Things

1. **Follow the Testing Trophy**: Heavy integration, light unit, critical E2E
2. **Test behavior, not implementation**: Focus on what the code does, not how
3. **Use descriptive test names**: `should return error when user not found`
4. **Keep tests isolated**: Each test should be independent
5. **Use table-driven tests**: Especially in Go for multiple scenarios
6. **Mock at the boundary**: Mock external services, not internal functions
7. **Test edge cases**: Empty inputs, null values, boundary conditions

## Avoid These Anti-Patterns

1. **Testing implementation details**: Don't test private methods directly
2. **Brittle selectors**: Avoid CSS selectors; use semantic queries
3. **Shared test state**: Don't rely on execution order between tests
4. **Over-mocking**: Don't mock everything; test real integrations
5. **Flaky tests**: Fix time-dependent or race condition tests immediately
6. **Large test files**: Split into focused test suites
7. **Coverage obsession**: 100% coverage doesn't mean quality tests

## Named Anti-Patterns

| Anti-Pattern | Problem |
|---|---|
| **Brittle Tests** | Over-mocking, testing implementation details |
| **Slow Tests** | Not using test doubles, heavy database operations |
| **Flaky Tests** | Time-dependent logic, async race conditions |
| **Unclear Tests** | Poor naming, missing assertions |
| **Test Pollution** | Shared state between tests |

## Tool Preferences

**TypeScript Stack** (in order of preference):
- Unit/Integration: **Bun Test** > Vitest > Jest
- E2E: **Playwright** > Cypress
- Component: **Testing Library** > Enzyme
- Property-based: **fast-check**

**Go Stack**:
- Assertions: **Built-in testing** + **Testify**
- Mocking: **GoMock**
- Integration: **Testcontainers**
- Edge cases: **Native fuzzing**

## Testing Trophy Proportions

```
    E2E Tests (few, critical paths only)
    =====================================
    Integration Tests (majority)          <- Focus here
    Unit Tests (complex logic only)
    Static Analysis (foundation)          <- TypeScript, linters
```

Integration tests catch more real bugs and are less brittle than unit tests. Static analysis (TypeScript types, Biome) catches syntax/type errors for free. Reserve unit tests for pure functions with complex logic.
