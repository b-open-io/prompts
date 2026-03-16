# Plugin Manifest Reference

## Top-Level Fields

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable reverse-DNS ID. `@scope/name` becomes `"scope.name"` |
| `apiVersion` | `1` | Always `1` |
| `version` | `string` | SemVer. Start at `"0.0.1"` |
| `displayName` | `string` | Human-readable, 1-100 chars |
| `description` | `string` | Shown in the plugin admin UI, 1-500 chars |
| `author` | `string` | 1-200 chars |
| `categories` | `PluginCategory[]` | `"connector"`, `"workspace"`, `"automation"`, `"ui"` |
| `capabilities` | `PluginCapability[]` | Declarative allowlist — must match all features |
| `entrypoints.worker` | `string` | `"./dist/worker.js"` |
| `entrypoints.ui` | `string` | `"./dist/ui"` — required when `ui.slots` or `ui.launchers` declared |
| `instanceConfigSchema` | `JsonSchema` | Optional. JSON Schema for operator config form |
| `jobs` | `PluginJobDeclaration[]` | Optional. Scheduled jobs |
| `webhooks` | `PluginWebhookDeclaration[]` | Optional. Webhook endpoints |
| `tools` | `PluginToolDeclaration[]` | Optional. Agent tool declarations |
| `ui.slots` | `PluginUiSlotDeclaration[]` | Optional. UI extension slots |
| `ui.launchers` | `PluginLauncherDeclaration[]` | Optional. Toolbar button launchers |

## All 37 Capabilities

```
# Data read
companies.read, projects.read, project.workspaces.read
issues.read, issue.comments.read, agents.read
goals.read, activity.read, costs.read

# Data write
issues.create, issues.update, issue.comments.create
activity.log.write, metrics.write

# Agent operations
agents.pause, agents.resume, agents.invoke
agent.sessions.create, agent.sessions.list
agent.sessions.send, agent.sessions.close

# Goals write
goals.create, goals.update

# Plugin state
plugin.state.read, plugin.state.write

# Runtime / integration
events.subscribe, events.emit
jobs.schedule, webhooks.receive
http.outbound, secrets.read-ref
agent.tools.register

# UI slots
ui.sidebar.register, ui.page.register
ui.detailTab.register, ui.dashboardWidget.register
ui.commentAnnotation.register, ui.action.register
instance.settings.register
```

## UI Slot Type → Required Capability

| Slot type | Required capability |
|---|---|
| `sidebar` | `ui.sidebar.register` |
| `sidebarPanel` | `ui.sidebar.register` |
| `projectSidebarItem` | `ui.sidebar.register` |
| `page` | `ui.page.register` |
| `detailTab` | `ui.detailTab.register` |
| `taskDetailView` | `ui.detailTab.register` |
| `dashboardWidget` | `ui.dashboardWidget.register` |
| `globalToolbarButton` | `ui.action.register` |
| `toolbarButton` | `ui.action.register` |
| `contextMenuItem` | `ui.action.register` |
| `commentAnnotation` | `ui.commentAnnotation.register` |
| `commentContextMenuItem` | `ui.action.register` |
| `settingsPage` | `instance.settings.register` |

## Feature → Required Capability

| Feature | Capability |
|---|---|
| `tools[]` non-empty | `agent.tools.register` |
| `jobs[]` non-empty | `jobs.schedule` |
| `webhooks[]` non-empty | `webhooks.receive` |

## Declaration Examples

### Job
```ts
{ jobKey: "my-sync", displayName: "My Sync", description: "...", schedule: "*/15 * * * *" }
```

### Webhook
```ts
{ endpointKey: "my-ingest", displayName: "My Ingest", description: "..." }
```
Route: `POST /api/plugins/:pluginId/webhooks/:endpointKey`

### Agent Tool
```ts
{ name: "my-tool", displayName: "My Tool", description: "...", parametersSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } }
```
Auto-namespaced by plugin ID at runtime.

### UI Slot
```ts
{ type: "page", id: "my-page", displayName: "My Page", exportName: "MyPage", routePath: "my-plugin" }
{ type: "dashboardWidget", id: "my-widget", displayName: "My Widget", exportName: "MyWidget" }
{ type: "sidebar", id: "my-sidebar", displayName: "My Plugin", exportName: "MySidebar" }
{ type: "settingsPage", id: "my-settings", displayName: "Settings", exportName: "MySettings" }
{ type: "detailTab", id: "my-tab", displayName: "My Tab", exportName: "MyTab", entityTypes: ["project"] }
```

Entity-scoped slots (`detailTab`, `taskDetailView`, `contextMenuItem`, `commentAnnotation`, `commentContextMenuItem`, `projectSidebarItem`) require at least one `entityType`.

Reserved `routePath` values (will be rejected): `dashboard`, `onboarding`, `companies`, `company`, `settings`, `plugins`, `org`, `agents`, `projects`, `issues`, `goals`, `approvals`, `costs`, `activity`, `inbox`, `design-guide`, `tests`.

### Launcher
```ts
{ id: "my-launcher", displayName: "My Launcher", placementZone: "toolbarButton", entityTypes: ["project", "issue"], action: { type: "openModal", target: "MyModal" }, render: { environment: "hostOverlay", bounds: "wide" } }
```

## Manifest Validation Rules

The Zod schema validates:
- All `jobKey` values must be unique
- All `endpointKey` values must be unique
- All `tools[].name` values must be unique
- All `ui.slots[].id` values must be unique
- All launcher `id` values must be unique
- `entrypoints.ui` required when `ui.slots` or `ui.launchers` present
- `projectSidebarItem` must include `"project"` in entityTypes
- `commentAnnotation` must include `"comment"` in entityTypes

After Zod validation, `validateManifestCapabilities()` checks every declared feature has a matching capability.
