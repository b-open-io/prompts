---
name: "BigBlocks LLMs.txt Generator"
version: "1.0.0"
description: "Generate comprehensive LLMs.txt documentation for the BigBlocks component library to enhance AI assistant understanding"
category: "bigblocks"
tags: ["documentation", "ai-optimization", "components", "bigblocks", "llms"]
author: "BSV Development Team"
requirements:
  tools: ["Claude Code", "BigBlocks CLI", "TypeScript compiler"]
  environment: ["BigBlocks source code", "Component registry", "Type definitions"]
  dependencies: ["bigblocks@latest"]
metadata:
  llm_provider: ["claude"]
  complexity: "intermediate"
  estimated_tokens: 8000
  time_estimate: "20-30 minutes"
  bigblocks_version: "latest"
---

# BigBlocks LLMs.txt Generator

**Empowering AI assistants to leverage the full power of 96+ Bitcoin UI components**

## 🎯 Mission

Generate a comprehensive LLMs.txt file for BigBlocks that enables AI coding assistants to:
- Understand all 96+ components and their capabilities
- Generate correct component usage with proper props
- Leverage Bitcoin blockchain integration features
- Handle framework-specific implementations correctly
- Provide accurate examples and best practices

## 📋 BigBlocks LLMs.txt Implementation

### Navigation File (llms.txt)
```markdown
# BigBlocks

> 96+ enterprise-ready Bitcoin UI components for React applications with zero TypeScript errors

Production-ready component library with Type 42 Master Keys, BAP Profile Sync, and full Vite compatibility. Framework-agnostic with modular adapters for Next.js, Express, and Astro.

## Main Documentation
- [Quick Start](https://bigblocks.dev/docs/quick-start): Get started with BigBlocks in minutes
- [Installation](https://bigblocks.dev/docs/installation): Setup and framework integration
- [Component Overview](https://bigblocks.dev/docs/components): Browse all 96+ components
- [Bitcoin Integration](https://bigblocks.dev/docs/bitcoin): Connect to Bitcoin blockchain

## Component Categories
- [Authentication](https://bigblocks.dev/components/auth): WalletConnect, LoginModal, IdentityProfile
- [Transactions](https://bigblocks.dev/components/transactions): TransactionHistory, PaymentFlow
- [Social](https://bigblocks.dev/components/social): PostCard, FriendsDialog, LikeButton
- [Data Display](https://bigblocks.dev/components/data): DataTable, CodeBlock, Card

## API Reference
- [React Hooks](https://bigblocks.dev/api/hooks): useAuth, useFetchLikes, useTransaction
- [Framework Adapters](https://bigblocks.dev/api/adapters): Next.js, Express, Astro setup
- [TypeScript Types](https://bigblocks.dev/api/types): Complete type definitions

## Guides & Examples
- [Bitcoin Authentication](https://bigblocks.dev/guides/auth): Implement Bitcoin-based auth
- [Social Features](https://bigblocks.dev/guides/social): Add blockchain social features
- [Migration Guide](https://bigblocks.dev/guides/migration): Upgrade to latest version

## Optional
- [Storybook](https://bigblocks.dev/storybook): Interactive component playground
- [GitHub](https://github.com/BitcoinSchema/BigBlocks): Source code and issues
- [NPM Package](https://www.npmjs.com/package/bigblocks): Package details
```

### Full Content File (llms-full.txt)
```markdown
# BigBlocks

> 96+ enterprise-ready Bitcoin UI components for React applications with zero TypeScript errors

[Navigation content from above...]

---

# Full Content

## PROJECT OVERVIEW
BigBlocks is a production-ready React component library featuring 96+ enterprise Bitcoin UI components. 
- Zero TypeScript compilation errors
- Framework-agnostic with modular adapters (Next.js, Express, Astro)
- Full Vite compatibility (v0.0.15+)
- Real Bitcoin blockchain integration
- Type 42 Master Keys, BAP Profile Sync, Transaction Fetcher

Repository: https://github.com/BitcoinSchema/BigBlocks
NPM: https://www.npmjs.com/package/bigblocks
Version: v0.0.16+ (latest with framework adapter fixes)
Features: TypeScript compilation fixes, enhanced ESM resolution, removed postinstall hacks

## KEY CONCEPTS

### Bitcoin Integration
- **Type 42 Master Keys**: Advanced hierarchical deterministic key management
- **BAP (Bitcoin Attestation Protocol)**: Identity and profile management on Bitcoin
- **BSM (Bitcoin Signed Messages)**: Cryptographic authentication without passwords
- **Transaction Fetcher**: Real-time blockchain transaction monitoring
- **1Sat Ordinals**: NFT and token support on Bitcoin SV

### Framework Adapters (v0.0.15+)
- Modular imports prevent build hanging issues
- Separate entry points for each framework
- Tree-shaking optimized
- SSR-safe implementations

### Component Categories
1. **Authentication**: WalletConnect, LoginModal, IdentityProfile
2. **Transactions**: TransactionHistory, PaymentFlow, TransactionDetails
3. **Social**: PostCard, FriendsDialog, LikeButton, FollowButton
4. **Data Display**: DataTable, CodeBlock, Card, List
5. **Forms**: Input, Select, Checkbox, RadioGroup
6. **Feedback**: Alert, Toast, Skeleton, Spinner
7. **Navigation**: Tabs, Breadcrumb, Pagination
8. **Overlays**: Dialog, Popover, Tooltip, ContextMenu

## INSTALLATION & SETUP

### Package Installation
\```bash
# Install BigBlocks
npm install bigblocks@latest

# Or create new project with init-prism
npm install -g init-prism@latest
init-prism create my-app --bigblocks --vite-compatible
\```

### Framework-Specific Setup (v0.0.15+)

#### Next.js
\```typescript
// app/providers.tsx
import { createNextJSBigBlocks } from 'bigblocks/nextjs'

const BigBlocksProvider = createNextJSBigBlocks({
  theme: 'light',
  primaryColor: 'blue',
  network: 'mainnet'
})

export function Providers({ children }) {
  return <BigBlocksProvider>{children}</BigBlocksProvider>
}
\```

#### Express
\```typescript
// server.ts
import { createExpressBigBlocks } from 'bigblocks/express'

const bigblocks = createExpressBigBlocks({
  apiKey: process.env.BIGBLOCKS_API_KEY,
  network: 'mainnet'
})

app.use('/api/bigblocks', bigblocks.middleware())
\```

#### Astro
\```typescript
// src/components/BigBlocks.astro
import { createAstroBigBlocks } from 'bigblocks/astro'

const BigBlocks = createAstroBigBlocks({
  theme: 'light',
  ssr: true
})
\```

## COMPONENT REFERENCE

### WalletConnect
Purpose: Connect and manage Bitcoin wallets with advanced key management
Category: Authentication
\```tsx
import { WalletConnect } from 'bigblocks'

<WalletConnect
  onConnect={(wallet) => console.log('Connected:', wallet.address)}
  onDisconnect={() => console.log('Disconnected')}
  network="mainnet"
  showBalance={true}
  theme="light"
/>
\```
Props:
- onConnect (function): Callback when wallet connects [required]
- onDisconnect (function): Callback when wallet disconnects
- network ("mainnet" | "testnet"): Bitcoin network
- showBalance (boolean): Display wallet balance
- theme ("light" | "dark" | "auto"): Component theme

### TransactionHistory
Purpose: Display paginated Bitcoin transaction history with real-time updates
Category: Transactions
\```tsx
import { TransactionHistory } from 'bigblocks'

<TransactionHistory
  address="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
  limit={20}
  showPending={true}
  onTransactionClick={(tx) => console.log('Transaction:', tx)}
/>
\```
Props:
- address (string): Bitcoin address to show history for [required]
- limit (number): Transactions per page (default: 20)
- showPending (boolean): Show pending transactions
- onTransactionClick (function): Transaction click handler
- autoRefresh (number): Refresh interval in seconds

### PostCard
Purpose: Social media post with blockchain likes and comments
Category: Social
\```tsx
import { PostCard } from 'bigblocks'
import { useFetchLikes } from 'bigblocks/hooks'

function SocialFeed() {
  const { likes, loading } = useFetchLikes(postId)
  
  return (
    <PostCard
      author={{
        name: "Satoshi Nakamoto",
        avatar: "/satoshi.jpg",
        verified: true
      }}
      content="Bitcoin: A Peer-to-Peer Electronic Cash System"
      timestamp={new Date()}
      likes={likes}
      onLike={async () => {
        // Triggers Bitcoin transaction
        const tx = await likePost(postId)
        return tx
      }}
    />
  )
}
\```

### FriendsDialog
Purpose: Manage blockchain-based friend connections
Category: Social
\```tsx
import { FriendsDialog } from 'bigblocks'

<FriendsDialog
  userId={currentUser.id}
  onFriendRequest={async (friendId) => {
    // Creates on-chain friend request
    const tx = await sendFriendRequest(friendId)
    return tx
  }}
  onAcceptRequest={async (requestId) => {
    // Accepts request on blockchain
    const tx = await acceptFriendRequest(requestId)
    return tx
  }}
/>
\```

## HOOKS REFERENCE

### useFetchLikes
Fetch real-time like data from blockchain
\```typescript
const { likes, loading, error, refetch } = useFetchLikes(contentId)
\```

### useAuth
Bitcoin authentication management
\```typescript
const { 
  isAuthenticated, 
  user, 
  signIn, 
  signOut, 
  signMessage 
} = useAuth()
\```

### useTransaction
Transaction creation and monitoring
\```typescript
const { 
  createTransaction, 
  broadcastTransaction, 
  txStatus 
} = useTransaction()
\```

## COMMON PATTERNS

### Implementing Bitcoin Authentication
\```typescript
import { WalletConnect, useAuth } from 'bigblocks'

function App() {
  const { signIn, isAuthenticated, user } = useAuth()
  
  const handleConnect = async (wallet) => {
    // Sign authentication message
    const signature = await wallet.signMessage('Login to MyApp')
    
    // Authenticate with backend
    const result = await signIn({
      address: wallet.address,
      signature,
      publicKey: wallet.publicKey
    })
    
    if (result.success) {
      console.log('Authenticated:', user)
    }
  }
  
  return (
    <WalletConnect onConnect={handleConnect} />
  )
}
\```

### Creating Social Features with Blockchain
\```typescript
import { PostCard, LikeButton, useFetchLikes } from 'bigblocks'
import { createLikeTransaction } from './blockchain'

function SocialPost({ post }) {
  const { likes, refetch } = useFetchLikes(post.id)
  
  const handleLike = async () => {
    try {
      // Create and broadcast like transaction
      const tx = await createLikeTransaction(post.id)
      
      // Update UI optimistically
      await refetch()
      
      return { success: true, txid: tx.id }
    } catch (error) {
      console.error('Like failed:', error)
      return { success: false, error }
    }
  }
  
  return (
    <PostCard {...post}>
      <LikeButton 
        count={likes.length}
        onLike={handleLike}
        isLiked={likes.some(l => l.author === currentUser.address)}
      />
    </PostCard>
  )
}
\```

### Transaction Monitoring
\```typescript
import { TransactionHistory, useTransaction } from 'bigblocks'

function WalletDashboard({ address }) {
  const { txStatus, monitorTransaction } = useTransaction()
  
  const handleTransactionClick = async (tx) => {
    // Monitor transaction confirmations
    await monitorTransaction(tx.txid, {
      onConfirmation: (confirmations) => {
        console.log(`${confirmations} confirmations`)
      },
      onComplete: () => {
        console.log('Transaction confirmed!')
      }
    })
  }
  
  return (
    <TransactionHistory
      address={address}
      onTransactionClick={handleTransactionClick}
    />
  )
}
\```

## CLI USAGE

### Add Components
\```bash
# Add single component
npx bigblocks add WalletConnect

# Add multiple components
npx bigblocks add PostCard FriendsDialog LikeButton

# Add with framework specification
npx bigblocks add TransactionHistory --framework=nextjs
\```

### List Available Components
\```bash
# Show all components
npx bigblocks list

# Filter by category
npx bigblocks list --category=social
npx bigblocks list --category=authentication
\```

### Update Components
\```bash
# Update all components
npx bigblocks update

# Update specific component
npx bigblocks update WalletConnect
\```

## ERROR HANDLING

### Common Errors and Solutions

#### Framework Adapter Import Error
Error: Cannot find module 'bigblocks/nextjs'
Solution: Ensure you're using bigblocks@0.0.15 or later

#### Build Hanging Issue
Error: Build process hangs with older versions
Solution: Update to v0.0.15+ which fixes Vite compatibility

#### TypeScript Errors
Error: Type errors in components
Solution: BigBlocks has zero TypeScript errors - ensure tsconfig is configured correctly

#### Blockchain Connection
Error: Failed to connect to blockchain
Solution: Check network configuration and API endpoints

## BEST PRACTICES

1. **Always use latest version** for production features and bug fixes
2. **Import from framework-specific entry points** (v0.0.15+) to avoid build issues
3. **Handle blockchain errors gracefully** - transactions can fail
4. **Use TypeScript** for better type safety and autocomplete
5. **Implement proper loading states** for blockchain operations
6. **Cache blockchain data** appropriately to reduce API calls
7. **Test with both mainnet and testnet** configurations
8. **Use the built-in hooks** instead of reimplementing blockchain logic

## MIGRATION GUIDE

### From v0.0.14 to v0.0.15+
\```typescript
// Old import (pre-v0.0.15)
import { createNextJSBigBlocks } from 'bigblocks'

// New import (v0.0.15+)
import { createNextJSBigBlocks } from 'bigblocks/nextjs'
\```

### From Custom Components to BigBlocks
1. Identify equivalent BigBlocks components
2. Map props to BigBlocks prop interface
3. Replace custom blockchain logic with BigBlocks hooks
4. Test thoroughly with real blockchain data

## RESOURCES

- GitHub: https://github.com/BitcoinSchema/BigBlocks
- NPM: https://www.npmjs.com/package/bigblocks
- Storybook: https://bigblocks.app/storybook
- Discord: https://discord.gg/bigblocks
- Examples: https://github.com/BitcoinSchema/BigBlocks/tree/main/examples

## VERSION HISTORY

- v0.0.15: Modular imports, Vite fixes, Type 42 keys
- v0.0.14: Astro compatibility, ESM fixes
- v0.0.13: Enhanced social components
- v0.0.12: Blockchain integration, social hooks
```

## 🤖 Auto-Generation Implementation

### BigBlocks-Specific Generator

```javascript
// scripts/generate-bigblocks-llms.js
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');
const { parse } = require('@typescript-eslint/parser');

class BigBlocksLLMsGenerator {
  constructor() {
    this.componentsPath = './src/components';
    this.hooksPath = './src/hooks';
    this.docsPath = './docs';
  }

  async generate() {
    console.log('🎨 Generating BigBlocks LLMs.txt...');
    
    // Analyze components
    const components = await this.analyzeComponents();
    const hooks = await this.analyzeHooks();
    const examples = await this.findExamples();
    
    // Generate navigation file
    const navigation = this.generateNavigation(components, hooks);
    await fs.writeFile('llms.txt', navigation);
    
    // Generate full content
    const fullContent = await this.generateFullContent(components, hooks, examples);
    await fs.writeFile('llms-full.txt', fullContent);
    
    console.log('✅ Generated BigBlocks LLMs.txt files');
  }

  async analyzeComponents() {
    const componentFiles = glob.sync(`${this.componentsPath}/**/*.tsx`);
    const components = {};
    
    for (const file of componentFiles) {
      const content = await fs.readFile(file, 'utf8');
      const componentInfo = this.extractComponentInfo(content, file);
      
      if (componentInfo) {
        const category = this.categorizeComponent(componentInfo.name);
        if (!components[category]) components[category] = [];
        components[category].push(componentInfo);
      }
    }
    
    return components;
  }

  extractComponentInfo(content, filePath) {
    // Extract component name, props, and description
    const nameMatch = content.match(/export (?:default )?(?:function|const) (\w+)/);
    if (!nameMatch) return null;
    
    const name = nameMatch[1];
    const props = this.extractProps(content);
    const description = this.extractDescription(content);
    
    return {
      name,
      props,
      description,
      path: filePath,
      category: this.categorizeComponent(name)
    };
  }

  categorizeComponent(name) {
    const categories = {
      auth: ['WalletConnect', 'LoginModal', 'IdentityProfile'],
      transactions: ['TransactionHistory', 'PaymentFlow', 'TransactionDetails'],
      social: ['PostCard', 'FriendsDialog', 'LikeButton', 'FollowButton'],
      data: ['DataTable', 'CodeBlock', 'Card', 'List'],
      forms: ['Input', 'Select', 'Checkbox', 'RadioGroup'],
      feedback: ['Alert', 'Toast', 'Skeleton', 'Spinner']
    };
    
    for (const [category, components] of Object.entries(categories)) {
      if (components.includes(name)) return category;
    }
    
    return 'other';
  }

  generateNavigation(components, hooks) {
    let nav = `# BigBlocks\n\n`;
    nav += `> 96+ enterprise-ready Bitcoin UI components for React applications\n\n`;
    nav += `Production-ready with Type 42 Master Keys, BAP Profile Sync, and full Vite compatibility.\n\n`;
    
    // Main sections with actual URLs
    nav += `## Main Documentation\n`;
    nav += `- [Quick Start](/docs/quick-start): Get started in minutes\n`;
    nav += `- [Installation](/docs/installation): Setup and integration\n`;
    nav += `- [Components](/docs/components): Browse all components\n`;
    nav += `- [Bitcoin Integration](/docs/bitcoin): Blockchain features\n\n`;
    
    // Component categories
    nav += `## Components by Category\n`;
    Object.entries(components).forEach(([category, items]) => {
      if (items.length > 0) {
        nav += `- [${this.capitalize(category)}](/components/${category}): ${items.slice(0, 3).map(c => c.name).join(', ')}...\n`;
      }
    });
    
    nav += `\n## Hooks & APIs\n`;
    hooks.slice(0, 5).forEach(hook => {
      nav += `- [${hook.name}](/api/hooks/${hook.name}): ${hook.description}\n`;
    });
    
    return nav;
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Run generator
new BigBlocksLLMsGenerator().generate().catch(console.error);
```

### Package.json Integration

```json
{
  "scripts": {
    "build:llms": "node scripts/generate-bigblocks-llms.js",
    "prebuild": "npm run build:llms",
    "postversion": "npm run build:llms && git add llms.txt llms-full.txt"
  }
}
```

## 🎯 Testing & Validation

### Automated Testing Script

```javascript
// scripts/test-llms.js
const fs = require('fs').promises;

class LLMsTextTester {
  async runTests() {
    console.log('🧪 Testing BigBlocks LLMs.txt...');
    
    const navigation = await fs.readFile('llms.txt', 'utf8');
    const full = await fs.readFile('llms-full.txt', 'utf8');
    
    // Test 1: Size constraints
    this.testSize(navigation, full);
    
    // Test 2: Required sections
    this.testRequiredSections(navigation);
    
    // Test 3: Component coverage
    await this.testComponentCoverage(navigation, full);
    
    // Test 4: Example validity
    this.testExamples(full);
    
    console.log('✅ All tests passed!');
  }

  testSize(nav, full) {
    const navSize = Buffer.byteLength(nav, 'utf8');
    if (navSize > 5000) {
      console.warn(`⚠️ Navigation file too large: ${navSize} bytes (max 5KB)`);
    }
    console.log(`✅ Navigation size: ${(navSize/1024).toFixed(2)}KB`);
  }

  testRequiredSections(nav) {
    const required = [
      '## Main Documentation',
      '## Component',
      '## API Reference',
      'WalletConnect',
      'useAuth'
    ];
    
    required.forEach(section => {
      if (!nav.includes(section)) {
        throw new Error(`Missing required section: ${section}`);
      }
    });
  }

  async testComponentCoverage(nav, full) {
    // Read actual components
    const components = await this.getActualComponents();
    let covered = 0;
    
    components.forEach(comp => {
      if (full.includes(comp)) covered++;
    });
    
    const coverage = (covered / components.length) * 100;
    console.log(`✅ Component coverage: ${coverage.toFixed(1)}%`);
    
    if (coverage < 80) {
      console.warn(`⚠️ Low component coverage: ${coverage.toFixed(1)}%`);
    }
  }

  testExamples(full) {
    const codeBlocks = full.match(/```[\s\S]*?```/g) || [];
    console.log(`✅ Found ${codeBlocks.length} code examples`);
    
    if (codeBlocks.length < 10) {
      console.warn(`⚠️ Limited examples: only ${codeBlocks.length} found`);
    }
  }

  async getActualComponents() {
    // In real implementation, scan component directory
    return [
      'WalletConnect', 'TransactionHistory', 'PostCard',
      'FriendsDialog', 'LikeButton', 'DataTable', 'CodeBlock'
    ];
  }
}

// Run tests
new LLMsTextTester().runTests().catch(console.error);
```

### Manual Testing Checklist

Ask an AI assistant these questions to validate LLMs.txt:

1. **Component Usage**
   - "How do I add Bitcoin authentication to my Next.js app using BigBlocks?"
   - "Show me how to implement the WalletConnect component"

2. **Framework Integration**
   - "What's the correct import for BigBlocks in Astro?"
   - "How do I set up BigBlocks with Express?"

3. **Feature Implementation**
   - "Create a social feed with blockchain likes using BigBlocks"
   - "How do I handle failed blockchain transactions?"

4. **API Understanding**
   - "What hooks does BigBlocks provide for Bitcoin integration?"
   - "How does the useFetchLikes hook work?"

The AI should provide accurate, working code based on the LLMs.txt documentation.

---

**This specialized BigBlocks LLMs.txt generator ensures AI assistants can effectively help developers leverage all 96+ Bitcoin UI components with proper blockchain integration, following the official LLMs.txt specification for optimal AI comprehension.**