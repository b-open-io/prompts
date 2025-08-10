---
name: task-management
version: 1.0.0
description: TodoWrite tool usage patterns for effective task tracking
---

# Task Management Protocol

## TodoWrite Tool Usage

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

### Example TodoWrite Usage

```javascript
// Initial task creation
TodoWrite({
  todos: [
    {id: "1", content: "Research existing authentication patterns", status: "pending"},
    {id: "2", content: "Design new OAuth 2.1 integration", status: "pending"},
    {id: "3", content: "Implement authentication flow", status: "pending"},
    {id: "4", content: "Add test coverage", status: "pending"},
    {id: "5", content: "Update documentation", status: "pending"}
  ]
})

// Update when starting research
TodoWrite({
  todos: [
    {id: "1", content: "Research existing authentication patterns - Found 3 patterns in codebase", status: "in_progress"},
    // ... other tasks remain pending
  ]
})

// Update when completing with findings
TodoWrite({
  todos: [
    {id: "1", content: "Research existing authentication patterns - Found: NextAuth v5, Supabase Auth, Custom JWT", status: "completed"},
    {id: "2", content: "Design new OAuth 2.1 integration", status: "in_progress"},
    // ... remaining tasks
  ]
})
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

```javascript
TodoWrite({
  todos: [
    {id: "1", content: "Refactor authentication system", status: "in_progress"},
    {id: "1.1", content: "├─ Audit current auth implementation", status: "completed"},
    {id: "1.2", content: "├─ Design new architecture", status: "in_progress"},
    {id: "1.3", content: "├─ Implement core changes", status: "pending"},
    {id: "1.4", content: "└─ Migrate existing users", status: "pending"}
  ]
})
```

## Benefits of Proper Task Management

1. **Transparency**: Users see exactly what you're planning and doing
2. **Progress Tracking**: Clear visibility of work progression
3. **Knowledge Capture**: Research findings are documented inline
4. **Error Recovery**: Easy to see where things went wrong
5. **Collaboration**: Other agents can understand your work