---
name: "LLMs.txt Generator for AI-Optimized Documentation"
version: "1.0.0"
description: "Generate AI-friendly documentation files that help LLMs understand and work with codebases, APIs, and component libraries"
category: "development"
tags: ["documentation", "ai-optimization", "llms", "api-docs", "bigblocks", "rest-api"]
author: "BSV Development Team"
requirements:
  tools: ["Claude Code", "TypeScript compiler", "API documentation tools"]
  environment: ["Project source code", "API endpoints", "Component registry"]
  dependencies: ["OpenAPI specs (optional)", "TypeScript definitions"]
metadata:
  llm_provider: ["claude"]
  complexity: "intermediate"
  estimated_tokens: 10000
  time_estimate: "15-30 minutes"
  output_format: "llms.txt"
---

# LLMs.txt Generator for AI-Optimized Documentation

**Empowering AI assistants to understand and work effectively with your codebase**

## 🎯 Mission

Generate comprehensive LLMs.txt files that provide AI coding assistants with deep understanding of codebases, APIs, and component libraries. This prompt creates structured documentation optimized for LLM consumption, enabling better code suggestions, API usage, and development assistance.

## 📋 What is LLMs.txt?

LLMs.txt is a specification for AI-friendly documentation consisting of two files:

1. **llms.txt**: A concise navigation guide with links to important resources
2. **llms-full.txt**: Complete documentation content in one comprehensive file

Think of it as a "robots.txt for AI assistants" - providing structured navigation and content that helps LLMs understand:
- Project architecture and purpose
- API endpoints and usage patterns
- Component libraries and their capabilities
- Domain-specific concepts and terminology
- Common tasks and workflows
- Best practices and conventions

The format follows a simple markdown structure optimized for LLM consumption while remaining human-readable.

## 🏗️ LLMs.txt Structure

### Navigation File (llms.txt)

```markdown
# Project Name

> Brief project summary describing the main purpose

Additional context about the project, key features, or important notes

## Main Documentation
- [Quick Start](url): Getting started with the project
- [Installation](url): Setup and installation guide
- [Core Concepts](url): Understanding the fundamentals

## API Reference
- [REST API](url): HTTP endpoints documentation
- [SDK Reference](url): Library methods and classes
- [GraphQL Schema](url): GraphQL types and queries

## Guides & Tutorials
- [Examples](url): Code examples and recipes
- [Best Practices](url): Recommended patterns
- [Troubleshooting](url): Common issues and solutions

## Optional
- [Contributing](url): How to contribute
- [Changelog](url): Version history
- [License](url): Licensing information
```

### Full Content File (llms-full.txt)

```markdown
# Project Name

> Brief project summary

[Navigation content from llms.txt]

---

# Full Content

## Quick Start
[Complete content from quick start page]

## Installation
[Complete installation guide content]

## API Reference
[Full API documentation]

[... all documentation content in one file ...]
```

## 🚀 Generation Strategies

### 1. **BigBlocks Component Library LLMs.txt**

```markdown
# LLMs.txt - BigBlocks Component Library

## PROJECT OVERVIEW
BigBlocks is a comprehensive React component library with 96+ enterprise-ready Bitcoin UI components. 
Framework-agnostic with adapters for Next.js, Express, and Astro. Full TypeScript support with zero compilation errors.

## KEY CONCEPTS
- **Type 42 Master Keys**: Advanced Bitcoin key management system
- **BAP Profile Sync**: Bitcoin Attestation Protocol profile synchronization
- **Transaction Fetcher**: Real-time blockchain transaction monitoring
- **Framework Adapters**: Modular imports for different frameworks (v0.0.15+)

## COMPONENT LIBRARY

### Installation
```bash
npm install bigblocks@latest
# or with init-prism
npm install -g init-prism@latest
init-prism create my-app --bigblocks
```

### Core Components

#### WalletConnect
Purpose: Connect and manage Bitcoin wallets with Type 42 Master Keys
```typescript
import { WalletConnect } from 'bigblocks'
// Props: onConnect, onDisconnect, networkType, theme
```

#### TransactionHistory
Purpose: Display Bitcoin transaction history with BAP Profile Sync
```typescript
import { TransactionHistory } from 'bigblocks'
// Props: address, limit, onTransactionClick, showPending
```

#### PostCard
Purpose: Social media post component with blockchain likes
```typescript
import { PostCard } from 'bigblocks'
// Hooks: useFetchLikes for real blockchain data
```

### Framework-Specific Usage (v0.0.15+)
```typescript
// Next.js
import { createNextJSBigBlocks } from 'bigblocks/nextjs'

// Express
import { createExpressBigBlocks } from 'bigblocks/express'

// Astro
import { createAstroBigBlocks } from 'bigblocks/astro'
```

## COMMON TASKS

### Add a Component
```bash
npx bigblocks add WalletConnect
```

### Implement Bitcoin Authentication
1. Add WalletConnect component
2. Use useAuth hook for authentication flow
3. Handle onConnect callback with Bitcoin signatures

### Create Social Features
1. Add PostCard, LikeButton, FriendsDialog
2. Use social hooks: useFetchLikes, useFetchPosts
3. Implement Bitcoin transaction callbacks

## INTEGRATION PATTERNS

### Bitcoin Transaction Flow
1. User initiates action (like, post, follow)
2. Component triggers Bitcoin transaction
3. Transaction broadcasts to BSV network
4. Callback updates UI with transaction result

### Authentication Pattern
- Private keys as identity (no passwords)
- BSM (Bitcoin Signed Messages) for auth
- JWT sessions with Bitcoin validation

## BEST PRACTICES
- Always use latest version for production features
- Import framework adapters from specific entry points
- Handle Bitcoin transaction errors gracefully
- Use TypeScript for better component prop validation

## DEPENDENCIES
- React 18+
- Bitcoin SV SDK (@bsv/sdk)
- Radix UI primitives
- TypeScript 5+
```

### 2. **REST API Documentation Pattern**

```markdown
# LLMs.txt - REST API Documentation

## PROJECT OVERVIEW
[API Name] - [Brief description of API purpose and capabilities]

## API REFERENCE

### Base URL
```
https://api.example.com/v1
```

### Authentication
```
Authorization: Bearer <token>
X-API-Key: <api-key>
```

### Endpoints

#### GET /users
Purpose: Retrieve user list with pagination
Parameters:
- page (number): Page number (default: 1)
- limit (number): Items per page (default: 20)
- sort (string): Sort field (name, created_at)

Response:
```json
{
  "users": [...],
  "pagination": {
    "page": 1,
    "total": 100,
    "hasNext": true
  }
}
```

#### POST /users
Purpose: Create new user
Body:
```json
{
  "name": "string",
  "email": "string",
  "role": "admin|user"
}
```

### Error Handling
- 400: Bad Request - Invalid parameters
- 401: Unauthorized - Missing/invalid auth
- 404: Not Found - Resource doesn't exist
- 500: Server Error - Internal issue

## COMMON TASKS

### Paginate Through Results
```javascript
async function getAllUsers() {
  let page = 1;
  let hasMore = true;
  const allUsers = [];
  
  while (hasMore) {
    const response = await fetch(`/api/users?page=${page}`);
    const data = await response.json();
    allUsers.push(...data.users);
    hasMore = data.pagination.hasNext;
    page++;
  }
  
  return allUsers;
}
```

## RATE LIMITING
- 100 requests per minute per API key
- 429 status code when exceeded
- Retry-After header indicates wait time
```

## 🧠 Advanced Generation Implementation

### Web Crawler Component

```javascript
const puppeteer = require('puppeteer');
const TurndownService = require('turndown');
const glob = require('glob');
const matter = require('gray-matter');

class LLMsTextCrawler {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.docsPath = config.docsPath;
    this.maxDepth = config.maxDepth || 3;
    this.visitedUrls = new Set();
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
  }

  async crawlSite() {
    const browser = await puppeteer.launch();
    const pages = [];
    
    await this.crawlPage(browser, this.baseUrl, 0, pages);
    await browser.close();
    
    return this.categorizeContent(pages);
  }

  async crawlPage(browser, url, depth, pages) {
    if (depth > this.maxDepth || this.visitedUrls.has(url)) return;
    
    this.visitedUrls.add(url);
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      const pageData = await page.evaluate(() => {
        return {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || '',
          headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
            level: h.tagName,
            text: h.textContent.trim()
          })),
          content: document.body.innerHTML,
          links: Array.from(document.querySelectorAll('a[href]')).map(a => a.href)
        };
      });
      
      pages.push({
        url,
        title: pageData.title,
        description: pageData.description,
        headings: pageData.headings,
        content: this.turndown.turndown(pageData.content),
        markdown: true
      });
      
      // Crawl internal links
      const internalLinks = pageData.links.filter(link => 
        link.startsWith(this.baseUrl) && !link.includes('#')
      );
      
      for (const link of internalLinks.slice(0, 10)) {
        await this.crawlPage(browser, link, depth + 1, pages);
      }
    } catch (error) {
      console.error(`Error crawling ${url}:`, error.message);
    } finally {
      await page.close();
    }
  }

  categorizeContent(pages) {
    const categories = {
      main: [],
      documentation: [],
      api: [],
      guides: [],
      optional: []
    };

    pages.forEach(page => {
      const lowerUrl = page.url.toLowerCase();
      const lowerTitle = page.title.toLowerCase();
      
      if (lowerUrl.includes('/api') || lowerTitle.includes('api')) {
        categories.api.push(page);
      } else if (lowerUrl.includes('/docs') || lowerUrl.includes('/documentation')) {
        categories.documentation.push(page);
      } else if (lowerUrl.includes('/guide') || lowerUrl.includes('/tutorial')) {
        categories.guides.push(page);
      } else if (lowerUrl === this.baseUrl || lowerUrl.includes('/about')) {
        categories.main.push(page);
      } else {
        categories.optional.push(page);
      }
    });

    return categories;
  }
}
```

### Documentation Parser for Local Files

```javascript
class DocumentationParser {
  constructor(docsPath) {
    this.docsPath = docsPath;
  }

  async parseLocalDocs() {
    const files = await this.findMarkdownFiles();
    const pages = [];
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const { data, content: markdown } = matter(content);
      
      pages.push({
        url: this.fileToUrl(file),
        title: data.title || this.extractTitle(markdown),
        description: data.description || this.extractDescription(markdown),
        content: markdown,
        headings: this.extractHeadings(markdown),
        category: this.categorizeByPath(file)
      });
    }
    
    return this.organizeBySections(pages);
  }

  async findMarkdownFiles() {
    return new Promise((resolve, reject) => {
      glob(path.join(this.docsPath, '**/*.{md,mdx}'), (err, files) => {
        if (err) reject(err);
        else resolve(files);
      });
    });
  }

  extractDescription(markdown) {
    const paragraphs = markdown.split('\n\n').filter(p => 
      p.trim().length > 50 && !p.startsWith('#')
    );
    return paragraphs[0]?.substring(0, 200) + '...' || '';
  }

  categorizeByPath(filePath) {
    const relative = path.relative(this.docsPath, filePath).toLowerCase();
    if (relative.includes('api')) return 'api';
    if (relative.includes('guide') || relative.includes('tutorial')) return 'guides';
    if (relative.includes('example')) return 'examples';
    return 'documentation';
  }
}
```

### LLMs.txt Generator Class

```javascript
class LLMsTextGenerator {
  constructor(config) {
    this.projectName = config.name;
    this.description = config.description;
    this.baseUrl = config.baseUrl;
    this.categories = config.categories || {};
  }

  generateNavigationFile() {
    let content = `# ${this.projectName}\n\n`;
    content += `> ${this.description}\n\n`;
    
    // Add additional context
    if (this.categories.main?.length > 0) {
      const mainPage = this.categories.main[0];
      content += this.extractKeyFeatures(mainPage.content) + '\n\n';
    }

    // Main documentation section
    if (this.categories.documentation?.length > 0) {
      content += '## Main Documentation\n';
      this.categories.documentation.slice(0, 5).forEach(page => {
        content += `- [${page.title}](${page.url}): ${this.summarize(page.description || page.content, 80)}\n`;
      });
      content += '\n';
    }

    // API Reference
    if (this.categories.api?.length > 0) {
      content += '## API Reference\n';
      this.categories.api.forEach(page => {
        content += `- [${page.title}](${page.url}): ${this.summarize(page.description || page.content, 80)}\n`;
      });
      content += '\n';
    }

    // Guides
    if (this.categories.guides?.length > 0) {
      content += '## Guides & Tutorials\n';
      this.categories.guides.forEach(page => {
        content += `- [${page.title}](${page.url}): ${this.summarize(page.description || page.content, 80)}\n`;
      });
      content += '\n';
    }

    // Optional resources
    if (this.categories.optional?.length > 0) {
      content += '## Optional\n';
      this.categories.optional.slice(0, 10).forEach(page => {
        content += `- [${page.title}](${page.url}): ${this.summarize(page.description || page.content, 60)}\n`;
      });
    }

    return content;
  }

  generateFullContentFile() {
    let content = this.generateNavigationFile();
    content += '\n---\n\n# Full Content\n\n';

    // Add all content organized by sections
    const sections = ['documentation', 'api', 'guides', 'optional'];
    
    sections.forEach(section => {
      if (this.categories[section]?.length > 0) {
        content += `\n## ${this.capitalize(section)}\n\n`;
        
        this.categories[section].forEach(page => {
          content += `### ${page.title}\n`;
          content += `URL: ${page.url}\n\n`;
          content += page.content;
          content += '\n\n---\n\n';
        });
      }
    });

    return content;
  }

  extractKeyFeatures(content) {
    // Extract key features from content
    const features = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      if (line.match(/^##?\s+(Features?|Key Features?|Capabilities)/i)) {
        // Found features section
        const idx = lines.indexOf(line);
        for (let i = idx + 1; i < lines.length && i < idx + 10; i++) {
          if (lines[i].match(/^##?\s+/)) break; // Next section
          if (lines[i].match(/^[-*]\s+(.+)/)) {
            features.push(RegExp.$1);
          }
        }
      }
    });

    if (features.length > 0) {
      return `Key features: ${features.slice(0, 3).join(', ')}`;
    }
    return 'Comprehensive documentation and resources for developers';
  }

  summarize(text, maxLength) {
    if (!text) return '';
    const clean = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLength) return clean;
    return clean.substring(0, maxLength - 3) + '...';
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
```

### Integration with InitPRISM

```javascript
// InitPRISM template configuration
module.exports = {
  llms_txt: {
    enabled: true,
    generator: 'auto', // 'auto' | 'manual' | 'hybrid'
    
    // Auto-generation settings
    auto: {
      sources: [
        { type: 'markdown', path: 'docs/**/*.md' },
        { type: 'typescript', path: 'src/**/*.ts' },
        { type: 'openapi', path: 'api/openapi.yaml' },
        { type: 'package', path: 'package.json' }
      ],
      
      crawl: {
        enabled: false, // Enable for deployed docs sites
        baseUrl: 'https://docs.example.com',
        maxDepth: 3
      }
    },
    
    // Output configuration
    output: {
      navigation: 'llms.txt',
      full: 'llms-full.txt',
      location: 'root', // 'root' | 'docs' | 'public'
      updateOnBuild: true
    },
    
    // Content organization
    sections: {
      main: ['README.md', 'index.md'],
      documentation: ['docs/**/*.md'],
      api: ['api/**/*.md', 'reference/**/*.md'],
      guides: ['guides/**/*.md', 'tutorials/**/*.md'],
      examples: ['examples/**/*.md']
    }
  }
};
```

## 📝 Template Patterns

### Component Library Pattern
```markdown
## COMPONENT: [ComponentName]
Purpose: [What it does]
Category: [UI category]
Props:
  - propName (type): Description
  - [required] propName (type): Description
Usage:
  \```jsx
  <ComponentName prop={value} />
  \```
Notes: [Special considerations]
```

### API Endpoint Pattern
```markdown
## ENDPOINT: [METHOD] /path/to/endpoint
Purpose: [What it does]
Auth: [Required auth method]
Params:
  - paramName (type): Description [required/optional]
Body: [Request body structure]
Response: [Response structure]
Errors: [Common error codes]
Example:
  \```javascript
  // Example request
  \```
```

### Workflow Pattern
```markdown
## WORKFLOW: [Workflow Name]
Purpose: [What it accomplishes]
Steps:
  1. [Step description]
     \```code
     // Implementation
     \```
  2. [Next step]
Prerequisites: [What's needed]
Output: [What's produced]
```

## 🔧 Build Script Integration

### Package.json Scripts

```json
{
  "scripts": {
    "build:llms": "node scripts/generate-llms-txt.js",
    "build": "npm run build:docs && npm run build:llms",
    "watch:llms": "nodemon --watch docs --watch src -e md,ts,js --exec npm run build:llms"
  },
  "devDependencies": {
    "puppeteer": "^21.0.0",
    "turndown": "^7.1.2",
    "gray-matter": "^4.0.3",
    "glob": "^10.3.0"
  }
}
```

### Build Script Implementation

```javascript
// scripts/generate-llms-txt.js
const fs = require('fs').promises;
const path = require('path');
const { DocumentationParser } = require('../lib/docs-parser');
const { LLMsTextGenerator } = require('../lib/llms-generator');
const { LLMsTextCrawler } = require('../lib/llms-crawler');

async function generate() {
  console.log('🤖 Generating LLMs.txt files...');
  
  const config = await loadConfig();
  let categories = {};
  
  // Parse local documentation
  if (config.sources.docs) {
    console.log('📚 Parsing documentation files...');
    const parser = new DocumentationParser(config.sources.docs);
    categories = await parser.parseLocalDocs();
  }
  
  // Crawl deployed site if configured
  if (config.crawl?.enabled) {
    console.log('🕷️ Crawling deployed documentation...');
    const crawler = new LLMsTextCrawler(config.crawl);
    const crawledCategories = await crawler.crawlSite();
    categories = mergeCategories(categories, crawledCategories);
  }
  
  // Generate files
  const generator = new LLMsTextGenerator({
    name: config.name,
    description: config.description,
    baseUrl: config.baseUrl,
    categories
  });
  
  const navigation = generator.generateNavigationFile();
  const full = generator.generateFullContentFile();
  
  // Write files
  await fs.writeFile(path.join(config.output.path, 'llms.txt'), navigation);
  await fs.writeFile(path.join(config.output.path, 'llms-full.txt'), full);
  
  console.log('✅ Generated llms.txt');
  console.log('✅ Generated llms-full.txt');
  console.log(`📁 Files saved to: ${config.output.path}`);
  
  // Generate stats
  const stats = {
    pages: Object.values(categories).flat().length,
    sections: Object.keys(categories).length,
    navigationSize: (navigation.length / 1024).toFixed(2) + ' KB',
    fullSize: (full.length / 1024).toFixed(2) + ' KB'
  };
  
  console.log('\n📊 Generation Stats:');
  console.log(`   Pages processed: ${stats.pages}`);
  console.log(`   Sections: ${stats.sections}`);
  console.log(`   Navigation file: ${stats.navigationSize}`);
  console.log(`   Full content file: ${stats.fullSize}`);
}

async function loadConfig() {
  // Try to load from multiple sources
  const configPaths = [
    'llms.config.js',
    'llms.config.json',
    '.llmsrc.json'
  ];
  
  for (const configPath of configPaths) {
    try {
      if (configPath.endsWith('.js')) {
        return require(path.join(process.cwd(), configPath));
      } else {
        const content = await fs.readFile(configPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (e) {
      // Continue to next config option
    }
  }
  
  // Default config from package.json
  const pkg = JSON.parse(await fs.readFile('package.json', 'utf8'));
  return {
    name: pkg.name,
    description: pkg.description,
    baseUrl: pkg.homepage || '',
    sources: {
      docs: './docs'
    },
    output: {
      path: './'
    }
  };
}

generate().catch(console.error);
```

## 🎯 Usage Examples

### 1. Simple Configuration File
```javascript
// llms.config.js
module.exports = {
  name: "BigBlocks",
  description: "96+ enterprise-ready Bitcoin UI components for React applications",
  baseUrl: "https://bigblocks.dev",
  
  sources: {
    docs: "./docs",
    examples: "./examples"
  },
  
  crawl: {
    enabled: true,
    baseUrl: "https://bigblocks.dev/docs",
    maxDepth: 3
  },
  
  output: {
    path: "./"
  }
};
```

### 2. Generate via Command Line
```bash
# Install dependencies
npm install --save-dev puppeteer turndown gray-matter glob

# Run generation
npm run build:llms

# Watch mode for development
npm run watch:llms
```

### 3. Programmatic Usage
```javascript
const { generateLLMsText } = require('llms-txt-generator');

async function buildDocs() {
  await generateLLMsText({
    name: "My Project",
    description: "Amazing project description",
    sources: {
      docs: "./docs",
      api: "./api-docs"
    }
  });
}
```

### 4. InitPRISM Integration
```bash
# Create project with LLMs.txt generation
init-prism create my-project --bigblocks --llms-txt

# Project will include:
# - Automatic LLMs.txt generation on build
# - Pre-configured llms.config.js
# - Build scripts in package.json
```

## 📊 Success Metrics

### Quality Indicators
- **Completeness**: All public APIs documented
- **Accuracy**: Examples actually work
- **Clarity**: AI can understand without ambiguity
- **Maintainability**: Easy to update with changes
- **Discoverability**: AI finds relevant info quickly

### Testing LLMs.txt
1. **AI Comprehension Test**: Ask AI to explain the project
2. **Task Completion**: AI can complete common tasks
3. **API Usage**: AI generates correct API calls
4. **Component Usage**: AI uses components properly
5. **Error Handling**: AI knows about edge cases

## 🔄 Maintenance & Best Practices

### Best Practices
1. **Keep Navigation Concise**: llms.txt should be under 5KB
2. **Prioritize Important Content**: Most relevant docs in main sections
3. **Update Automatically**: Integrate into build process
4. **Version Control**: Track changes to monitor evolution
5. **Test with LLMs**: Validate AI understanding regularly
6. **Host at Root**: Place files at `/llms.txt` and `/llms-full.txt`

### CI/CD Integration
```yaml
# GitHub Actions
name: Update LLMs.txt
on:
  push:
    paths:
      - 'docs/**'
      - 'src/**'
      - 'package.json'

jobs:
  update-llms:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate LLMs.txt
        run: npm run build:llms
        
      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add llms.txt llms-full.txt
          git diff --staged --quiet || git commit -m "Update LLMs.txt documentation"
          
      - name: Push changes
        uses: ad-m/github-push-action@master
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Validation Script
```javascript
// scripts/validate-llms.js
async function validateLLMsText() {
  const navigation = await fs.readFile('llms.txt', 'utf8');
  const full = await fs.readFile('llms-full.txt', 'utf8');
  
  // Check size constraints
  if (navigation.length > 5000) {
    console.warn('⚠️ llms.txt exceeds recommended 5KB size');
  }
  
  // Validate links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(navigation)) !== null) {
    const [, title, url] = match;
    if (!full.includes(title)) {
      console.warn(`⚠️ Missing content for: ${title}`);
    }
  }
  
  // Check structure
  const requiredSections = ['Main Documentation', 'API Reference'];
  requiredSections.forEach(section => {
    if (!navigation.includes(`## ${section}`)) {
      console.warn(`⚠️ Missing required section: ${section}`);
    }
  });
  
  console.log('✅ LLMs.txt validation complete');
}
```

---

**LLMs.txt bridges the gap between your codebase and AI assistants. Following the specification and implementing automatic generation ensures AI tools can effectively understand and work with your projects.**