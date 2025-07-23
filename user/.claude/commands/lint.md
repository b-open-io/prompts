---
allowed-tools: Read, Write, Edit, Bash
description: Set up and achieve 100% clean linting with Ultracite/Biome
argument-hint: [setup|clean|check] - Initialize linting or clean up existing issues
---

# Achieving 100% Clean Linting with Ultracite

This guide helps you set up Ultracite (powered by Biome) and achieve 100% clean linting without using `any` types or special rule configurations.

## Quick Reference

### Ultracite Documentation
@/Users/satchmo/code/prompts/design/ultracite.md

### Biome Documentation
@/Users/satchmo/code/prompts/design/biome.md

## Setup Instructions

### 1. Initialize Ultracite
```bash
npx ultracite init
```

### 2. Configure to Exclude shadcn/ui Components
Create or update `biome.jsonc`:
```json
{
  "extends": ["ultracite"],
  "files": {
    "ignore": [
      "**/components/ui/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**"
    ]
  }
}
```

### 3. Enable Strict TypeScript
Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

## Achieving 100% Clean Linting

### Core Principles
1. **No `any` types** - Always use specific types
2. **No rule exceptions** - Fix issues, don't disable rules
3. **No custom configurations** - Use Ultracite defaults
4. **Fix, don't suppress** - Address root causes

### Step-by-Step Process

#### 1. Initial Check
```bash
# See all current issues
npx ultracite lint

# Get a count of issues
npx ultracite lint | grep -c "error"
```

#### 2. Auto-fix What's Possible
```bash
# Auto-fix formatting and simple issues
npx ultracite format

# Check what remains
npx ultracite lint
```

#### 3. Common Fixes for 100% Clean Code

##### Replace `any` Types
```typescript
// ❌ Bad
const data: any = fetchData();
function process(input: any): any { }

// ✅ Good
const data: UserData = fetchData();
function process(input: string): ProcessedResult { }

// For truly dynamic data, use `unknown` and type guards
const response: unknown = await fetch(url);
if (isUserData(response)) {
  // response is now typed as UserData
}
```

##### Fix Equality Checks
```typescript
// ❌ Bad
if (value == null) { }

// ✅ Good
if (value === null || value === undefined) { }
// Or use optional chaining
if (value?.property) { }
```

##### Handle Async/Await Properly
```typescript
// ❌ Bad
async function getData() {
  return fetch(url); // Missing await
}

// ✅ Good
async function getData() {
  return await fetch(url);
}
```

##### Use Const Assertions
```typescript
// ❌ Bad
let config = { readonly: true };

// ✅ Good
const config = { readonly: true } as const;
```

### 4. Type Definition Strategies

#### For External Libraries
```typescript
// If types don't exist, create a declarations file
// types/external-lib.d.ts
declare module 'external-lib' {
  export function doSomething(input: string): Promise<Result>;
  export interface Result {
    success: boolean;
    data?: unknown;
  }
}
```

#### For API Responses
```typescript
// Define interfaces for all API responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

// Use with fetch
const response = await fetch('/api/user');
const result: ApiResponse<User> = await response.json();
```

#### For Event Handlers
```typescript
// ❌ Bad
const handleClick = (e: any) => { };

// ✅ Good
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { };
// Or for general HTML elements
const handleInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  console.log(target.value);
};
```

### 5. Progressive Migration

If you have many issues, fix them progressively:

```bash
# Fix imports first
npx ultracite format

# Then fix one type of issue at a time
# Example: Fix all equality checks
npx ultracite lint | grep "eqeqeq"
# Fix those files

# Then move to the next issue type
npx ultracite lint | grep "noExplicitAny"
# Fix those files
```

### 6. Verification

```bash
# Final check - should show 0 errors
npx ultracite lint

# Run TypeScript compiler check too
npx tsc --noEmit
```

## Maintaining 100% Clean Code

### Pre-commit Hook
Ensure code stays clean:
```bash
#!/bin/sh
npx ultracite format
npx ultracite lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Fix issues before committing."
  exit 1
fi
```

### CI Integration
```yaml
# .github/workflows/lint.yml
name: Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx ultracite lint
      - run: npx tsc --noEmit
```

## Quick Commands

```bash
# Setup from scratch
/lint setup

# Check current status
/lint check

# Clean all issues interactively
/lint clean
```

## Tips for Success

1. **Start Fresh**: If migrating, consider starting with a clean setup
2. **Type Everything**: Every variable, parameter, and return value
3. **Use Strict Mode**: TypeScript strict mode catches more issues
4. **No Shortcuts**: Don't use `// biome-ignore` comments
5. **Regular Checks**: Run linting before every commit

Remember: The goal is maintainable, type-safe code. Initial setup effort pays off with fewer bugs and better developer experience.