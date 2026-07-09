---
name: task-management
version: 1.0.1
description: Current Claude Code task-tool patterns for effective task tracking
---

# Task Management Protocol

## Task Tool Usage

### Initial Task Planning
When you receive a request, immediately create a task list:

```javascript
📝 Creating task list:
1. [Research/Investigation] - Understand requirements
2. [Analysis] - Analyze existing code/patterns
3. [Design] - Plan the solution approach
4. [Implementation] - Execute the changes
5. [Validation] - Test and verify results
```

### Task Status Management

#### Status Flow
- `pending` → Task not yet started
- `in_progress` → Currently working on this task
- `completed` → Task finished successfully

#### Best Practices
1. **Only ONE task** should be `in_progress` at a time
2. **Update immediately** when starting or completing a task
3. **Add research findings** to task descriptions as you discover them
4. **Break down complex tasks** into smaller subtasks when needed

### Example Task Tool Usage

```javascript
// Create tasks individually and retain the returned IDs.
const research = TaskCreate({
  subject: "Research existing authentication patterns",
  description: "Find and compare the authentication patterns already used in the repository",
  activeForm: "Researching authentication patterns"
})
const design = TaskCreate({
  subject: "Design OAuth 2.1 integration",
  description: "Choose a design using the repository findings",
  activeForm: "Designing OAuth 2.1 integration"
})

// Update status and record useful findings as work progresses.
TaskUpdate({ taskId: research.id, status: "in_progress" })
TaskUpdate({
  taskId: research.id,
  status: "completed",
  description: "Found NextAuth v5, Supabase Auth, and a custom JWT flow"
})
TaskUpdate({ taskId: design.id, status: "in_progress" })
```

### Research Documentation Pattern

When conducting research, append findings to the task description:

```
Original: "Research OAuth 2.1 specifications"
↓
After research: "Research OAuth 2.1 specifications - Found: Mandatory PKCE, no implicit flow, strict redirect URIs, 15-min token expiry"
```

### Complex Task Breakdown

For complex operations, create subtasks:

```text
Refactor authentication system
├── Audit current auth implementation (completed)
├── Design new architecture (in progress)
├── Implement core changes (pending)
└── Migrate existing users (pending)
```

Create each child with `TaskCreate`, then connect it to the parent with the
dependency fields exposed by the installed tool schema. Use `TaskList` for the
overview and `TaskGet` when you need the full details for one task.

## Benefits of Proper Task Management

1. **Transparency**: Users see exactly what you're planning and doing
2. **Progress Tracking**: Clear visibility of work progression
3. **Knowledge Capture**: Research findings are documented inline
4. **Error Recovery**: Easy to see where things went wrong
5. **Collaboration**: Other agents can understand your work
