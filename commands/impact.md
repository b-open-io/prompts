---
allowed-tools: Agent
description: Map the full blast radius before changing a file or function — importers, tests, CI, docs, owners
argument-hint: <file-or-function>
---

## Your Task

If the arguments contain "--help", show this help and exit:

**impact** - Blast radius analysis

**Usage:** `/impact <file-or-function>`

**Description:**
Fans out 5 agents to map every dimension of impact before you change a file or function. Shows who imports it, what tests cover it, which CI pipelines run on it, what docs reference it, and who owns the code.

**Arguments:**
- `<file-or-function>` : File path, function name, or module to analyze

**Examples:**
- `/impact src/auth/middleware.ts`
- `/impact handlePayment`
- `/impact lib/database/`

Then stop.

Otherwise, run the blast radius analysis:

### Step 1: Resolve the target

From `$ARGUMENTS`, determine:
- Is it a file path? A function name? A directory?
- If it's a function name, note that agents will need to find where it's defined first

### Step 2: Fan out 5 analysis agents IN PARALLEL

Launch all 5 in a SINGLE message:

**Agent 1 — Import Graph**
```
Agent(prompt: "TARGET: $ARGUMENTS

Map all files that import, require, or reference this target:
- Search for import/require statements pointing to this file or exporting this function
- Check for re-exports through index files
- Note both direct and transitive importers (A imports B which imports TARGET)
- Count total files affected

Return: A numbered list of importing files with the specific import line, sorted by directness (direct first, transitive second). Include total count.",
subagent_type: "Explore")
```

**Agent 2 — Test Coverage**
```
Agent(prompt: "TARGET: $ARGUMENTS

Find all test files that exercise this code:
- Search test directories for imports of the target
- Look for test files with matching names (e.g., foo.test.ts for foo.ts)
- Check for integration tests that use the target indirectly
- Note any test utilities or fixtures related to this code

Return: A list of test files with what they test about this code. Note if coverage appears thin.",
subagent_type: "Explore")
```

**Agent 3 — CI/CD Impact**
```
Agent(prompt: "TARGET: $ARGUMENTS

Check how CI/CD pipelines are affected:
- Search for pipeline configs (.github/workflows/, .gitlab-ci.yml, Dockerfile, vercel.json, railway.json, etc.)
- Check if the target is in a path that triggers specific CI jobs
- Look for deployment scripts that reference the target
- Check build configs for special handling of the target

Return: A list of affected pipelines/configs and how they relate to the target. Or 'No direct CI/CD impact found' if clean.",
subagent_type: "Explore")
```

**Agent 4 — Documentation References**
```
Agent(prompt: "TARGET: $ARGUMENTS

Find all documentation that references this code:
- Search *.md files for mentions of the target
- Check README files for API docs or usage examples
- Look for JSDoc/TSDoc comments that reference the target
- Check for Storybook stories or example files

Return: A list of docs/comments that would need updating if this code changes.",
subagent_type: "Explore")
```

**Agent 5 — Code Ownership**
```
Agent(prompt: "TARGET: $ARGUMENTS

Determine who owns the affected code:
- Run git blame on the target file (or the file defining the target function)
- Run git blame on the top 5 most-affected importing files
- Identify the primary contributors (most lines owned)
- Check git log for who last modified each affected area

Return: An ownership summary — who owns the target code and who owns the code that depends on it. Format as 'Name (N files, last active DATE)'.",
subagent_type: "general-purpose")
```

### Step 3: Synthesize the impact map

After all agents return:

```
## Impact Analysis: <target>

### Summary
Changing **<target>** affects **N files**, **N test suites**, **N CI pipelines**, and **N docs pages**.

### Import Graph (<count> files)
<Numbered list from Agent 1, grouped by direct vs transitive>

### Test Coverage
<Findings from Agent 2>
⚠️ <Any coverage gaps noted>

### CI/CD Impact
<Findings from Agent 3>

### Documentation
<Findings from Agent 4>

### Code Ownership
<Findings from Agent 5>

### Recommended Approach
<Based on the blast radius, suggest whether this is a safe refactor, needs careful review, or requires coordination>
```
