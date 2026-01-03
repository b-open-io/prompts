# Environment Variables Strategy Guide

A comprehensive prompt for implementing a robust, type-safe environment variables pattern in TypeScript/JavaScript projects.

## Mission

Create a centralized, type-safe environment configuration system that validates all required variables at startup, provides clear error messages, and maintains consistency across the codebase. This guide emphasizes a simple pattern where export names match environment variable names exactly, making the code self-documenting and easy to maintain.

## The Prompt

Use this prompt with Claude or other AI assistants to implement this pattern in your project:

---

I need you to create a comprehensive environment variables management system for my TypeScript/JavaScript project. Please implement a typed env.ts file following these specific requirements:

### Core Requirements

1. **Type Safety**: Create a TypeScript interface that defines all environment variables
2. **Simple Naming**: Each exported constant must match its environment variable name exactly
3. **Validation**: Include a verifyEnv() function that validates all required variables at startup
4. **Clear Documentation**: Add comprehensive comments explaining each section and variable
5. **Error Messages**: Provide descriptive error messages for missing or invalid variables

### Implementation Pattern

Create an `env.ts` file with this exact structure:

```typescript
/**
 * Environment Variables Configuration
 * 
 * This file provides type-safe access to environment variables with validation.
 * All exports match their environment variable names exactly for clarity.
 */

// Define the shape of our environment variables
type EnvVariables = {
    // Authentication & API Keys
    DISCORD_APP_ID: string;
    DISCORD_TOKEN: string;
    OPENAI_API_KEY: string;
    
    // Database Configuration
    DATABASE_URL: string;
    REDIS_URL: string;
    
    // Application Settings
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: string;
    
    // Optional Variables (use ? for optional)
    SENTRY_DSN?: string;
    ANALYTICS_ID?: string;
};

// Runtime detection - adapt based on your environment
const runtime = typeof Bun !== 'undefined' ? 'bun' : 'node';

// Cast environment to our typed interface
// Use Bun.env for Bun runtime, process.env for Node.js
const env = (runtime === 'bun' ? Bun.env : process.env) as EnvVariables;

/**
 * Export each environment variable
 * The constant name MUST match the environment variable name exactly
 * This creates a self-documenting API where usage matches configuration
 */

// Authentication & API Keys
export const DISCORD_APP_ID = env.DISCORD_APP_ID;
export const DISCORD_TOKEN = env.DISCORD_TOKEN;
export const OPENAI_API_KEY = env.OPENAI_API_KEY;

// Database Configuration
export const DATABASE_URL = env.DATABASE_URL;
export const REDIS_URL = env.REDIS_URL;

// Application Settings
export const NODE_ENV = env.NODE_ENV || 'development'; // Provide defaults where appropriate
export const PORT = env.PORT || '3000';

// Optional Variables
export const SENTRY_DSN = env.SENTRY_DSN;
export const ANALYTICS_ID = env.ANALYTICS_ID;

/**
 * Verify all required environment variables are present
 * Call this function at application startup to fail fast with clear errors
 * 
 * @throws {Error} If any required environment variable is missing
 */
export const verifyEnv = (): void => {
    const requiredVars: Array<{ name: string; value: string | undefined }> = [
        { name: 'DISCORD_APP_ID', value: DISCORD_APP_ID },
        { name: 'DISCORD_TOKEN', value: DISCORD_TOKEN },
        { name: 'OPENAI_API_KEY', value: OPENAI_API_KEY },
        { name: 'DATABASE_URL', value: DATABASE_URL },
        { name: 'REDIS_URL', value: REDIS_URL },
    ];
    
    const missingVars = requiredVars
        .filter(({ value }) => !value)
        .map(({ name }) => name);
    
    if (missingVars.length > 0) {
        throw new Error(
            `Missing required environment variables:\n${missingVars
                .map(name => `  - ${name}`)
                .join('\n')}\n\n` +
            `Please ensure these variables are set in your .env file or environment.`
        );
    }
    
    // Additional validation for specific formats
    if (PORT && isNaN(parseInt(PORT))) {
        throw new Error(`PORT must be a valid number, got: ${PORT}`);
    }
    
    if (NODE_ENV && !['development', 'production', 'test'].includes(NODE_ENV)) {
        throw new Error(
            `NODE_ENV must be 'development', 'production', or 'test', got: ${NODE_ENV}`
        );
    }
    
    console.log('✅ Environment variables verified successfully');
};

/**
 * Optional: Export a function to get all non-sensitive env vars
 * Useful for debugging and logging (excludes tokens and keys)
 */
export const getSafeEnvVars = () => ({
    NODE_ENV,
    PORT,
    DISCORD_APP_ID, // ID is safe to log, token is not
    // Exclude sensitive values like tokens, keys, and database URLs
});

/**
 * Optional: Type guard functions for runtime checks
 */
export const isProduction = () => NODE_ENV === 'production';
export const isDevelopment = () => NODE_ENV === 'development';
export const isTest = () => NODE_ENV === 'test';
```

### Usage Instructions

1. **Application Entry Point** (index.ts or main.ts):
```typescript
import { verifyEnv } from './env';

// Verify environment variables before starting the application
try {
    verifyEnv();
} catch (error) {
    console.error('Environment configuration error:', error.message);
    process.exit(1);
}

// Rest of your application initialization
```

2. **Using Environment Variables**:
```typescript
import { DISCORD_TOKEN, DATABASE_URL, isProduction } from './env';

// Use the exported constants directly
const client = new DiscordClient({ token: DISCORD_TOKEN });

// Use helper functions
if (isProduction()) {
    // Production-only code
}
```

### Organization Guidelines

Group your environment variables by service or feature:

```typescript
type EnvVariables = {
    // Discord Integration
    DISCORD_APP_ID: string;
    DISCORD_TOKEN: string;
    DISCORD_GUILD_ID: string;
    
    // Database
    DATABASE_URL: string;
    DATABASE_POOL_SIZE?: string;
    
    // Redis Cache
    REDIS_URL: string;
    REDIS_TTL?: string;
    
    // External APIs
    OPENAI_API_KEY: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    
    // Application
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: string;
    LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
};
```

### Handling Optional vs Required Variables

1. **Required Variables**: No default value, must be present
```typescript
export const DATABASE_URL = env.DATABASE_URL; // Will be undefined if missing
```

2. **Optional with Defaults**: Provide sensible defaults
```typescript
export const PORT = env.PORT || '3000';
export const LOG_LEVEL = env.LOG_LEVEL || 'info';
```

3. **Truly Optional**: May or may not be present
```typescript
export const SENTRY_DSN = env.SENTRY_DSN; // Undefined is valid
```

### Security Best Practices

1. **Never log sensitive values**:
```typescript
// Bad
console.log('Config:', env);

// Good
console.log('Config:', getSafeEnvVars());
```

2. **Use .env.example**:
```bash
# .env.example - commit this file
DISCORD_APP_ID=your_app_id_here
DISCORD_TOKEN=your_token_here
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
```

3. **Add .env to .gitignore**:
```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

### Runtime-Specific Adaptations

**For Bun:**
```typescript
const env = Bun.env as EnvVariables;
```

**For Node.js:**
```typescript
const env = process.env as EnvVariables;
```

**For Deno:**
```typescript
const env = Deno.env.toObject() as EnvVariables;
```

**For Edge/Workers:**
```typescript
// Often injected differently
declare global {
    namespace NodeJS {
        interface ProcessEnv extends EnvVariables {}
    }
}
```

### Advanced Patterns

1. **Environment-Specific Configurations**:
```typescript
export const getConfig = () => {
    const baseConfig = {
        appName: 'MyApp',
        version: '1.0.0',
    };
    
    switch (NODE_ENV) {
        case 'production':
            return {
                ...baseConfig,
                apiUrl: 'https://api.myapp.com',
                enableAnalytics: true,
            };
        case 'development':
            return {
                ...baseConfig,
                apiUrl: 'http://localhost:3001',
                enableAnalytics: false,
            };
        default:
            return baseConfig;
    }
};
```

2. **Validation with Zod** (if using Zod):
```typescript
import { z } from 'zod';

const envSchema = z.object({
    DISCORD_APP_ID: z.string().min(1),
    DISCORD_TOKEN: z.string().min(1),
    PORT: z.string().regex(/^\d+$/).transform(Number),
    NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const env = envSchema.parse(process.env);
```

### Testing Considerations

Create a test-specific env configuration:

```typescript
// env.test.ts
export const createTestEnv = (overrides: Partial<EnvVariables> = {}) => {
    return {
        DISCORD_APP_ID: 'test-app-id',
        DISCORD_TOKEN: 'test-token',
        DATABASE_URL: 'sqlite::memory:',
        NODE_ENV: 'test',
        PORT: '0', // Random port for tests
        ...overrides,
    };
};
```

---

## Why This Pattern?

1. **Type Safety**: Catch configuration errors at compile time
2. **Early Validation**: Fail fast with clear error messages
3. **Self-Documenting**: Export names match env var names exactly
4. **Centralized**: Single source of truth for all configuration
5. **Maintainable**: Easy to add, remove, or modify variables
6. **Testable**: Clear structure makes mocking easy

## Common Pitfalls to Avoid

1. **Don't rename exports**:
```typescript
// Bad - confusing and harder to maintain
export const discordToken = env.DISCORD_TOKEN;

// Good - clear 1:1 mapping
export const DISCORD_TOKEN = env.DISCORD_TOKEN;
```

2. **Don't scatter env access**:
```typescript
// Bad - accessing process.env directly throughout codebase
const token = process.env.DISCORD_TOKEN;

// Good - always import from env.ts
import { DISCORD_TOKEN } from './env';
```

3. **Don't forget validation**:
```typescript
// Always call verifyEnv() at startup
verifyEnv();
```

## Integration Examples

### With Express:
```typescript
import express from 'express';
import { PORT, verifyEnv } from './env';

verifyEnv();

const app = express();
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

### With Next.js:
```typescript
// next.config.js
import { verifyEnv } from './env';

verifyEnv();

export default {
    // Next.js config
};
```

### With Discord.js:
```typescript
import { Client } from 'discord.js';
import { DISCORD_TOKEN, verifyEnv } from './env';

verifyEnv();

const client = new Client({ intents: [...] });
client.login(DISCORD_TOKEN);
```

## Conclusion

This pattern provides a robust, type-safe, and maintainable approach to environment variable management. The key is consistency: export names match environment variable names, making the code self-documenting and reducing cognitive overhead. Combined with proper validation and clear error messages, this approach catches configuration issues early and makes debugging straightforward.