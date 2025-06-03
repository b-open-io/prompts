# Contributing to the Prompts Repository

Thank you for your interest in contributing to our BSV ecosystem prompts repository! This guide will help you add new prompts that maintain our quality standards and interoperability.

## 📋 Before You Begin

1. **Check Existing Prompts**: Review the registry to avoid duplicates
2. **Test Your Prompt**: Ensure it works with Claude Code or your target LLM
3. **Follow Standards**: Use our established format and structure

## 🎯 Prompt Quality Guidelines

### A Good Prompt Should Be:

- **Specific**: Clear mission and well-defined outcomes
- **Reusable**: Parameterized for different use cases
- **Self-Contained**: Includes all necessary context
- **Tested**: Verified to work as expected
- **Documented**: Clear requirements and examples

### Essential Components:

1. **Clear Mission Statement**: What does this prompt accomplish?
2. **Prerequisites**: What tools, access, or setup is required?
3. **Step-by-Step Instructions**: Logical flow of operations
4. **Error Handling**: How to handle common failure scenarios
5. **Success Metrics**: How to verify the prompt completed successfully

## 📝 Creating a New Prompt

### 1. Choose the Right Category

Place your prompt in the appropriate directory:
- `bigblocks/` - BigBlocks component management
- `development/` - Code and dependency workflows
- `blockchain/` - BSV network operations
- `analytics/` - Metrics and reporting
- `infrastructure/` - DevOps and deployment
- `server/` - System administration
- `cross-project/` - Multi-repository operations

### 2. Use the Standard Template

Create your prompt file with YAML frontmatter:

```markdown
---
name: "Your Prompt Name"
version: "1.0.0"
description: "Brief description (max 100 chars)"
category: "development"
tags: ["primary-tag", "secondary-tag"]
author: "Your Name"
requirements:
  tools: ["Claude Code", "git"]
  environment: ["GITHUB_TOKEN"]
  dependencies: ["other-prompt-id"]
metadata:
  llm_provider: ["claude", "openai"]
  complexity: "moderate"
  estimated_tokens: 5000
  time_estimate: "15-30 minutes"
---

# Your Prompt Title

## 🎯 Mission

Clear, concise statement of what this prompt accomplishes.

## 🚀 Core Capabilities

### 1. **Primary Capability**
Description of what this does and why it's valuable.

### 2. **Secondary Capability**
Another key feature or function.

## 🛠️ Technical Implementation

### Prerequisites
- Required tool: Version requirements
- Environment setup needed
- Access permissions required

### Implementation Pattern

```yaml
# If using state machines or complex flows
states:
  initial:
    actions: ["action1", "action2"]
    transitions:
      success: "next_state"
      failure: "error_handling"
```

## 📋 Usage Scenarios

### Scenario 1: Common Use Case
```bash
# Example command
claude -p prompts/category/your-prompt.md

# User intent
"Accomplish specific task with these parameters"
```

### Scenario 2: Advanced Use Case
Description of more complex usage...

## 📊 Success Metrics

- **Metric 1**: How to measure success
- **Metric 2**: Performance indicators
- **Quality Check**: Verification steps

## 🚨 Error Handling

### Common Issues
1. **Issue Type**: How to resolve
2. **Another Issue**: Resolution steps

## 🔄 Maintenance

- How often should this prompt be reviewed?
- What might need updating over time?
- Dependencies to watch for changes
```

### 3. Update the Registry

Add your prompt to `registry.json`:

```json
{
  "id": "category/prompt-name",
  "name": "Your Prompt Name",
  "version": "1.0.0",
  "description": "Brief description of functionality",
  "category": "development",
  "tags": ["automation", "testing"],
  "complexity": "moderate",
  "path": "development/prompt-name.md",
  "metadata": {
    "llm_provider": ["claude"],
    "estimated_tokens": 5000,
    "time_estimate": "15-30 minutes"
  }
}
```

### 4. Validate Your Contribution

Before submitting:
- [ ] Prompt follows the standard template
- [ ] Added to registry.json with unique ID
- [ ] Tested with target LLM
- [ ] Includes at least 2 usage examples
- [ ] Documents all requirements
- [ ] Handles common error cases
- [ ] Uses consistent formatting

## 🔧 Technical Standards

### Naming Conventions
- **File names**: `kebab-case.md` (e.g., `cross-project-dependency-update.md`)
- **Prompt IDs**: `category/prompt-name` (e.g., `development/dependency-update`)
- **Version**: Semantic versioning `MAJOR.MINOR.PATCH`

### Metadata Requirements
- **name**: Max 50 characters, descriptive
- **description**: Max 100 characters, action-oriented
- **tags**: 2-5 relevant tags for searchability
- **complexity**: `simple`, `moderate`, `complex`, or `advanced`

### Content Guidelines
- Use markdown headers consistently (# for title, ## for sections)
- Include code blocks with language specification
- Provide concrete examples, not abstract descriptions
- Use active voice and clear instructions

## 📤 Submitting Your Contribution

1. **Fork the Repository**: Create your own fork
2. **Create Feature Branch**: `git checkout -b add-prompt-name`
3. **Add Your Files**: Prompt file and registry update
4. **Test Thoroughly**: Verify the prompt works as expected
5. **Commit Changes**: Use descriptive commit messages
6. **Submit PR**: Include description of what your prompt does

### PR Description Template
```markdown
## New Prompt: [Prompt Name]

### Purpose
Brief description of what this prompt automates

### Category
[Category name]

### Testing
- [ ] Tested with Claude Code
- [ ] Tested with [other LLM if applicable]
- [ ] Verified all examples work
- [ ] Checked error handling

### Notes
Any additional context or considerations
```

## 🤝 Code of Conduct

- **Be Respectful**: Constructive feedback only
- **Test Thoroughly**: Don't submit untested prompts
- **Document Clearly**: Others should understand without asking
- **Stay Focused**: Prompts should solve real problems
- **Share Knowledge**: Help others learn from your automation

## ❓ Questions?

- Open an issue for clarification
- Check existing prompts for examples
- Review the registry schema for metadata requirements

Thank you for contributing to our automation ecosystem!