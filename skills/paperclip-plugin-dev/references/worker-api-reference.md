# Worker API Reference

## Plugin Definition

```ts
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

const plugin = definePlugin({
  async setup(ctx: PluginContext) { /* register everything here */ },
  async onHealth() { return { status: "ok" }; },
  async onConfigChanged(newConfig) { /* hot reload */ },
  async onValidateConfig(config) { return { ok: true }; },
  async onWebhook(input) { /* handle inbound webhook */ },
  async onShutdown() { /* 10 seconds to clean up */ },
});

export default plugin;
runWorker(plugin, import.meta.url);
```

All registrations must complete before `setup()` resolves. Do NOT register handlers inside async callbacks.

## PluginContext API

All clients are capability-gated. Calling without the required capability throws a 403.

### Config and Logging (no capability required)
```ts
ctx.manifest              // PaperclipPluginManifestV1
ctx.config.get()          // Promise<Record<string, unknown>>
ctx.logger.info/warn/error/debug(message, meta?)
```

### Events (events.subscribe / events.emit)
```ts
ctx.events.on("issue.created", async (event) => { ... })
ctx.events.on("agent.status_changed", { agentId }, async (event) => { ... })
ctx.events.emit("my-event", companyId, payload)
// Emitted as "plugin.<pluginId>.my-event"
```

Available event types: `company.created`, `company.updated`, `project.created`, `project.updated`, `project.workspace_created/updated/deleted`, `issue.created`, `issue.updated`, `issue.comment.created`, `agent.created`, `agent.updated`, `agent.status_changed`, `agent.run.started/finished/failed/cancelled`, `goal.created`, `goal.updated`, `approval.created`, `approval.decided`, `cost_event.created`, `activity.logged`

### Jobs (jobs.schedule)
```ts
ctx.jobs.register("job-key", async (job: PluginJobContext) => {
  // job.jobKey, job.runId, job.trigger ("schedule"|"manual"|"retry"), job.scheduledAt
});
```

### HTTP (http.outbound)
```ts
const response = await ctx.http.fetch(url, init?)
```

### Secrets (secrets.read-ref)
```ts
const value = await ctx.secrets.resolve(secretRef)  // Never cache
```

### State (plugin.state.read / plugin.state.write)
```ts
await ctx.state.get({ scopeKind, scopeId?, namespace?, stateKey })
await ctx.state.set({ scopeKind, scopeId?, stateKey }, value)
await ctx.state.delete({ scopeKind, scopeId?, stateKey })
// scopeKind: "instance"|"company"|"project"|"project_workspace"|"agent"|"issue"|"goal"|"run"
```

### Entities (no capability required)
```ts
await ctx.entities.upsert({ entityType, scopeKind, scopeId?, externalId?, title?, status?, data })
await ctx.entities.list({ entityType?, scopeKind?, scopeId?, externalId?, limit?, offset? })
```

### Activity Log (activity.log.write)
```ts
await ctx.activity.log({ companyId, message, entityType?, entityId?, metadata? })
```

### Metrics (metrics.write)
```ts
await ctx.metrics.write(name, value, tags?)
```

### Streaming — worker to UI SSE (no capability required)
```ts
ctx.streams.open(channel, companyId)
ctx.streams.emit(channel, event)
ctx.streams.close(channel)
```

### Data and Actions — backing UI hooks (no capability required)
```ts
ctx.data.register(key, async (params) => result)
ctx.actions.register(key, async (params) => result)
```

### Agent Tools (agent.tools.register)
```ts
ctx.tools.register(name, { displayName, description, parametersSchema },
  async (params, runCtx: ToolRunContext) => ToolResult)
// ToolResult = { content?: string, data?: unknown, error?: string }
// runCtx = { agentId, runId, companyId, projectId }
```

### Agents (agents.read / agents.pause / agents.resume / agents.invoke)
```ts
ctx.agents.list({ companyId, status?, limit?, offset? })
ctx.agents.get(agentId, companyId)
ctx.agents.pause(agentId, companyId)
ctx.agents.resume(agentId, companyId)
ctx.agents.invoke(agentId, companyId, { prompt, reason? })
// NOTE: No agents.create or agents.update in SDK
```

### Agent Sessions (agent.sessions.*)
```ts
ctx.agents.sessions.create(agentId, companyId, { taskKey?, reason? })
ctx.agents.sessions.list(agentId, companyId)
ctx.agents.sessions.sendMessage(sessionId, companyId, { prompt, reason?, onEvent? })
ctx.agents.sessions.close(sessionId, companyId)
```

### Issues (issues.read / issues.create / issues.update / issue.comments.*)
```ts
ctx.issues.list({ companyId, projectId?, assigneeAgentId?, status?, limit?, offset? })
ctx.issues.get(issueId, companyId)
ctx.issues.create({ companyId, projectId?, goalId?, parentId?, title, description?, priority?, assigneeAgentId? })
ctx.issues.update(issueId, patch, companyId)
ctx.issues.listComments(issueId, companyId)
ctx.issues.createComment(issueId, body, companyId)
```

### Goals (goals.read / goals.create / goals.update)
```ts
ctx.goals.list({ companyId, level?, status?, limit?, offset? })
ctx.goals.get(goalId, companyId)
ctx.goals.create({ companyId, title, description?, level?, status?, parentId?, ownerAgentId? })
ctx.goals.update(goalId, patch, companyId)
```

### Companies (companies.read) and Projects (projects.read)
```ts
ctx.companies.list({ limit?, offset? })
ctx.companies.get(companyId)
ctx.projects.list({ companyId, limit?, offset? })
ctx.projects.get(projectId, companyId)
ctx.projects.listWorkspaces(projectId, companyId)
ctx.projects.getPrimaryWorkspace(projectId, companyId)
ctx.projects.getWorkspaceForIssue(issueId, companyId)
```

## Worker Architecture Pattern

```ts
const plugin = definePlugin({
  async setup(ctx) {
    await registerEventHandlers(ctx);
    await registerJobs(ctx);
    await registerDataHandlers(ctx);
    await registerActionHandlers(ctx);
    await registerToolHandlers(ctx);
  },
});
```

## Sandbox Constraints

- No `process`, `require`, `global`, `Buffer`, `fetch`, `fs`, `net`, `child_process`
- CJS only (esbuild presets handle this)
- Module evaluation timeout: 2 seconds
- Path traversal blocked
- All host interactions through PluginContext

## Secrets Pattern

```json
// instanceConfigSchema
{ "type": "object", "properties": { "apiKey": { "type": "string", "format": "secret-ref" } } }
```
Resolution is rate-limited (30/min), scoped to plugin's own config, never cached.
