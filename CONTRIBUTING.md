# Contributing to the OPL Prompts Repository

Thank you for contributing! This guide will help you add new prompts to our collection.

## 📋 Before You Begin

1. **Check Existing Prompts**: Browse the directories to avoid duplicates
2. **Test Your Prompt**: Ensure it works with Claude Code
3. **Keep It Simple**: Focus on useful content, not complex metadata

## 📝 Creating a New Prompt

### 1. Choose the Right Category

Place your prompt in the appropriate directory:
- `design/` - UI/UX frameworks and design tools
- `development/` - Code and dependency workflows
- `infrastructure/` - DevOps and deployment

### 2. Use Simple Frontmatter

Create your prompt file with minimal YAML frontmatter:

```markdown
---
title: "Your Prompt Title"
description: "Brief description of what this prompt does"
---

# Your Prompt Title

[Your prompt content here...]
```

That's all you need! Focus on writing clear, useful prompts.

### 3. Write Clear Content

Your prompt should:
- Have a clear purpose
- Include step-by-step instructions where appropriate
- Provide examples if helpful
- Be self-contained

### 4. Test Your Prompt

Before submitting:
- [ ] Test with Claude Code
- [ ] Verify it produces expected results
- [ ] Ensure examples work correctly

## 🔧 Guidelines

- **File names**: Use descriptive `kebab-case.md`
- **Content**: Focus on clarity and usefulness
- **Examples**: Include practical examples when helpful
- **Structure**: Use markdown headers to organize content

## 📤 Submitting Your Contribution

1. **Fork the Repository**: Create your own fork
2. **Create Feature Branch**: `git checkout -b add-prompt-name`
3. **Add Your Prompt**: Place in appropriate directory
4. **Test Thoroughly**: Verify the prompt works
5. **Commit Changes**: Use descriptive commit messages
6. **Submit PR**: Include description of what your prompt does

### PR Description Template
```markdown
## New Prompt: [Prompt Name]

### Purpose
Brief description of what this prompt does

### Category
[design/development/infrastructure]

### Testing
- [ ] Tested with Claude Code
- [ ] Verified all examples work

### Notes
Any additional context
```

## 🤝 Code of Conduct

- **Be Respectful**: Constructive feedback only
- **Test Thoroughly**: Don't submit untested prompts
- **Document Clearly**: Others should understand without asking
- **Stay Focused**: Prompts should solve real problems

Thank you for contributing!