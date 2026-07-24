---
name: notebooklm
version: 1.0.0
description: Best practices and workflow patterns
---

# Best Practices

## Workflow Patterns

### Pattern 1: Research Session

For deep research on a specific topic:

```bash
# 1. Check library
python scripts/run.py notebook_manager.py list

# 2. Activate relevant notebook
python scripts/run.py notebook_manager.py activate --id nb_docs

# 3. Ask initial broad question
python scripts/run.py ask_question.py \
  --question "Give me an overview of authentication in this system"

# 4. Follow up with specific questions
python scripts/run.py ask_question.py \
  --question "What are the specific OAuth 2.0 endpoints?"

python scripts/run.py ask_question.py \
  --question "How do I handle token refresh?"

# 5. Synthesize findings
```

---

### Pattern 2: Multi-Notebook Research

When information spans multiple notebooks:

```bash
# Query each notebook separately
python scripts/run.py ask_question.py \
  --question "API rate limits" \
  --notebook-id nb_api_docs

python scripts/run.py ask_question.py \
  --question "Rate limiting best practices" \
  --notebook-id nb_architecture

python scripts/run.py ask_question.py \
  --question "Historical rate limit changes" \
  --notebook-id nb_changelog

# Combine answers manually
```

---

### Pattern 3: Discovery Before Add

When adding a new notebook:

```bash
# Step 1: Query to discover content
python scripts/run.py ask_question.py \
  --question "What is the content of this notebook? What topics are covered?" \
  --notebook-url "https://notebooklm.google.com/notebook/..."

# Step 2: Add with discovered information
python scripts/run.py notebook_manager.py add \
  --url "https://notebooklm.google.com/notebook/..." \
  --name "[Based on content]" \
  --description "[Based on content]" \
  --topics "[Based on content]"
```

---

## Question Strategies

### Effective Question Patterns

**1. Start Broad, Then Narrow**
```bash
# First: Overview
"What does this documentation cover?"

# Then: Specifics
"How do I implement the webhook handler?"
```

**2. Request Examples**
```bash
"Show me an example of implementing X"
"What does a typical Y configuration look like?"
```

**3. Ask for Comparisons**
```bash
"What are the differences between approach A and B?"
"When should I use X vs Y?"
```

**4. Troubleshooting Questions**
```bash
"What are common errors when doing X?"
"How do I debug Y issue?"
```

---

### Question Anti-Patterns

**Avoid:**
- ❌ "Tell me everything" (too broad)
- ❌ "What is on page 47?" (NotebookLM doesn't know page numbers)
- ❌ "Fix this code" (no code provided)
- ❌ "Why did they design it this way?" (NotebookLM can't infer intent)

**Instead:**
- ✅ "What are the main sections of this documentation?"
- ✅ "What are the configuration options for X?"
- ✅ "How do I implement Y feature?"
- ✅ "What does the documentation say about Z design decision?"

---

## Library Organization

### Recommended Structure

Organize notebooks by:

**By Project:**
```
Project A Docs
Project A API
Project A Architecture

Project B Docs
Project B API
```

**By Topic:**
```
Frontend Guidelines
Backend Standards
Database Schema
DevOps Runbooks
```

**By Type:**
```
User Documentation
API Reference
Architecture Decisions
Meeting Notes
```

### Topic Tagging Strategy

Use consistent topic tags:

```bash
# Technical areas
--topics "api,rest,authentication"
--topics "frontend,react,css"
--topics "database,postgres,schema"

# Project phases
--topics "planning,requirements"
--topics "implementation,code"
--topics "deployment,ops"

# Content types
--topics "reference,api"
--topics "guide,tutorial"
--topics "meeting,decisions"
```

---

## Session Management

### Daily Workflow

```bash
# Morning: Check library
python scripts/run.py notebook_manager.py list

# During work: Query as needed
python scripts/run.py ask_question.py --question "..."

# End of day: No action needed
# Sessions are stateless, no cleanup required
```

### Weekly Maintenance

```bash
# Check for stale notebooks
python scripts/run.py notebook_manager.py stats

# Remove unused notebooks
python scripts/run.py notebook_manager.py remove --id nb_old

# Cleanup temp files
python scripts/run.py cleanup_manager.py --preserve-library
```

---

## Rate Limit Management

### Tracking Usage

Free accounts: 50 queries/day

**Conservation strategies:**

1. **Batch questions:**
   ```bash
   # Instead of 3 separate questions:
   # "What is X?" + "What is Y?" + "What is Z?"
   
   # Ask one comprehensive question:
   python scripts/run.py ask_question.py \
     --question "What are X, Y, and Z, and how do they relate?"
   ```

2. **Use library for context:**
   ```bash
   # Set active notebook once
   python scripts/run.py notebook_manager.py activate --id nb_main
   
   # Then query without --notebook-id
   python scripts/run.py ask_question.py --question "..."
   ```

3. **Cache important answers:**
   - Save critical responses to local files
   - Reference instead of re-querying

---

## Security Best Practices

### Data Protection

1. **Never commit data directory:**
   ```bash
   # .gitignore should include:
   data/
   .venv/
   __pycache__/
   ```

2. **Library data is local only:**
   - Notebook metadata stored locally
   - No cloud sync of library
   - Authentication in browser_state/

3. **Session isolation:**
   - Each query is independent
   - No persistent conversation history
   - No server-side data storage

---

## Integration Tips

### With Claude Code

**Always check notebook before answering:**

```
User: "How does the API handle errors?"

Claude: "Let me check your API documentation..."

[Run notebooklm query]

"According to your API docs, error handling works like this..."
```

### With Other Tools

**Combine with web search:**
```bash
# 1. Query notebook for internal info
python scripts/run.py ask_question.py \
  --question "What is our error handling approach?"

# 2. Search web for external context
# [Use WebSearch tool]

# 3. Synthesize both sources
```

---

## Performance Optimization

### Query Optimization

**Fast queries:**
- Specific, focused questions
- Reference known sections
- Request specific formats

```bash
python scripts/run.py ask_question.py \
  --question "List the three authentication methods from the API reference"
```

**Slower queries:**
- Open-ended questions
- Synthesis across documents
- Complex comparisons

```bash
python scripts/run.py ask_question.py \
  --question "Analyze the evolution of our architecture decisions"
```

### Notebook Optimization

**For faster responses:**
- Upload focused documents (not entire wikis)
- Remove duplicate content
- Organize by topic
- Limit to 50-100 sources per notebook

---

## Common Workflows

### Onboarding New Team Member

```bash
# 1. Add onboarding docs
python scripts/run.py notebook_manager.py add \
  --url "..." \
  --name "Engineering Onboarding" \
  --description "New hire guide and setup instructions" \
  --topics "onboarding,engineering,setup"

# 2. Answer their questions as they come up
python scripts/run.py ask_question.py \
  --question "How do I set up the development environment?"
```

### Pre-Meeting Prep

```bash
# Query meeting notes from previous sessions
python scripts/run.py ask_question.py \
  --question "What were the action items from last week's architecture review?"
```

### Code Review Context

```bash
# Query architecture docs for context
python scripts/run.py ask_question.py \
  --question "What are the coding standards for this module?"
```
