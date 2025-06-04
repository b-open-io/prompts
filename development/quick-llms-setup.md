---
name: "Quick LLMs.txt Setup Guide"
version: "1.0.0"
description: "Fast-track guide to add LLMs.txt generation to any project"
category: "development"
tags: ["llms", "setup", "quick-start"]
---

# Quick LLMs.txt Setup Guide

## For New Projects (with init-prism)

```bash
# 1. Create project with init-prism
npm install -g init-prism@latest
init-prism create my-awesome-project --bigblocks

# 2. Navigate to project
cd my-awesome-project

# 3. Add LLMs.txt generation
claude -p ~/code/prompts/development/llms-txt-generator.md \
  --instruction="Set up LLMs.txt generation for this project"
```

## For Existing Projects

```bash
# 1. Navigate to your project
cd ~/code/your-project

# 2. Run the LLMs.txt setup
claude -p ~/code/prompts/development/llms-txt-generator.md \
  --instruction="Add LLMs.txt generation to this existing project"
```

## What Gets Added

The prompt will:
1. ✅ Install dependencies (puppeteer, turndown, gray-matter)
2. ✅ Create `scripts/generate-llms-txt.js`
3. ✅ Add npm scripts to package.json
4. ✅ Create `llms.config.js` template
5. ✅ Generate initial `llms.txt` and `llms-full.txt`
6. ✅ Add CI/CD workflow (optional)

## Configuration

Edit `llms.config.js`:

```javascript
module.exports = {
  name: "Your Project Name",
  description: "Brief project description",
  baseUrl: "https://your-docs-site.com",
  
  sources: {
    docs: "./docs",      // Local markdown files
    src: "./src",        // Source code for component extraction
    examples: "./examples"
  },
  
  // Optional: crawl deployed docs
  crawl: {
    enabled: false,
    baseUrl: "https://your-docs-site.com",
    maxDepth: 3
  },
  
  output: {
    path: "./"  // Where to save llms.txt files
  }
};
```

## Commands

After setup, you'll have:

```bash
# Generate/update LLMs.txt files
npm run build:llms

# Watch mode during development
npm run watch:llms

# Validate files
npm run validate:llms
```

## For BigBlocks Projects

Use the specialized BigBlocks generator:

```bash
claude -p ~/code/prompts/bigblocks/llms-txt-bigblocks.md \
  --instruction="Generate BigBlocks-specific LLMs.txt"
```

## Advanced Features

For multi-version support, AI optimization, etc:

```bash
claude -p ~/code/prompts/development/llms-txt-advanced-features.md \
  --instruction="Add advanced LLMs.txt features"
```

---

That's it! Your project now has AI-optimized documentation that helps LLMs understand your codebase better.