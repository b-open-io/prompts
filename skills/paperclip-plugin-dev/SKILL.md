---
name: paperclip-plugin-dev
version: 1.0.0
description: Build, publish, and install Paperclip plugins correctly. This skill should be used when scaffolding a new Paperclip plugin, writing a plugin manifest, implementing plugin worker logic, adding UI slots, publishing to npm, or installing a plugin into a Paperclip instance. Contains critical lessons from real publishing failures. Also invoke when working on plugin capabilities, jobs, webhooks, agent tools, or the plugin SDK.
---

# Paperclip Plugin Development

Build Paperclip plugins based on the actual SDK source code, validator source code, and examples. Follows lessons learned from real publishing failures.

## Critical Lessons — Read First

These mistakes have cost real time. Do not repeat them.

### 1. `files` field in package.json is REQUIRED

npm uses `.gitignore` to exclude files. Since `dist/` is gitignored, built output will be absent unless explicitly declared:

```json
{ "files": ["dist", "package.json"] }
```

### 2. Capabilities must exactly match declared features

The server rejects manifests where features lack matching capabilities. Every UI slot type, tool, job, and webhook requires a specific capability. See `references/manifest-reference.md` for the full mapping table.

Example: declaring a `dashboardWidget` slot without `ui.dashboardWidget.register` in capabilities causes install failure.

### 3. First publish version: `0.0.1`

The scaffold generates `0.1.0`. Change to `0.0.1` before first publish.

### 4. Build before publish

`paperclipPlugin` fields point to `./dist/`. Run `bun run build` before `npm publish`. Verify with `npm pack --dry-run`.

### 5. npm cache on the Paperclip server

When iterating, clear stale cache on the server: `npm cache clean --force` via SSH.

### 6. Adding capabilities triggers upgrade approval

Publishing a new version with additional capabilities puts the plugin in `upgrade_pending` state. Plan v1 capabilities carefully.

### 7. No `agents.create` in SDK

The plugin SDK can read, pause, resume, invoke, and chat with agents — but cannot create or update them. For v1, present templates in the UI and let the operator create agents manually.

---

## Scaffolding

```bash
node ~/code/paperclip/packages/plugins/create-paperclip-plugin/src/index.ts \
  <package-name> \
  --output <dir> \
  --display-name "<Name>" \
  --description "<text>" \
  --author "<name>" \
  --category connector|workspace|automation|ui \
  --sdk-path ~/code/paperclip/packages/plugins/sdk
```

**Immediately after scaffolding:**
1. Add `"files": ["dist", "package.json"]` to package.json
2. Change version to `"0.0.1"`
3. Init git, commit

---

## Worker — Quick Overview

```ts
import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

const plugin = definePlugin({
  async setup(ctx) {
    ctx.events.on("issue.created", async (event) => { ... });
    ctx.jobs.register("my-sync", async (job) => { ... });
    ctx.data.register("health", async (params) => ({ status: "ok" }));
    ctx.actions.register("resync", async (params) => { ... });
    ctx.tools.register("my-tool", { displayName: "...", description: "...", parametersSchema: { ... } },
      async (params, runCtx) => ({ content: "result" }));
  },
  async onHealth() { return { status: "ok" }; },
});

export default plugin;
runWorker(plugin, import.meta.url);
```

For the full PluginContext API: read `references/worker-api-reference.md`.

---

## UI — Quick Overview

```tsx
import { usePluginData, usePluginAction, useHostContext, usePluginStream } from "@paperclipai/plugin-sdk/ui";

export function DashboardWidget() {
  const { companyId } = useHostContext();
  const { data, loading, error, refresh } = usePluginData<T>("health", { companyId });
  const doAction = usePluginAction("resync");
  if (loading) return <div>Loading...</div>;
  return <div>Status: {data?.status}</div>;
}
```

For all hooks, props, patterns, and styling: read `references/ui-reference.md`.

---

## Publishing Checklist

```
[ ] bun run build
[ ] "files": ["dist", "package.json"] in package.json
[ ] Version is correct (0.0.1 for first publish)
[ ] Every declared slot type has matching capability
[ ] tools[] → "agent.tools.register", jobs[] → "jobs.schedule", webhooks[] → "webhooks.receive"
[ ] npm pack --dry-run — verify dist/ appears
[ ] bun run test passes
[ ] Use Skill(bopen-tools:npm-publish) for publishing
```

---

## Installing in Paperclip

Enter the npm package name (e.g., `@bopen-io/tortuga-plugin`) in the "Install Plugin" dialog in Settings → Plugins. The server downloads from npm, validates the manifest, and starts the worker.

---

## Naming Conventions

- Slot IDs: `"<plugin-slug>-<slot-type>"` — e.g., `"tortuga-dashboard-widget"`
- Export names: PascalCase — `"DashboardWidget"`, `"FleetPage"`
- Job/webhook/tool/data/action/stream keys: kebab-case — `"clawnet-sync"`, `"fleet-status"`
- Collect all strings in a `constants.ts` file

---

## Sandbox Constraints

Plugin workers run in a `vm.createContext()` sandbox. No access to `process`, `require`, `fs`, `net`, `child_process`. CJS bundles only (esbuild presets handle this). All host interaction through `PluginContext` methods.

---

## Secrets

Declare `format: "secret-ref"` in `instanceConfigSchema`. Operator pastes a secret UUID. Resolve at runtime: `await ctx.secrets.resolve(config.apiKey)`. Never cache resolved values.

---

## Reference Files

For detailed API documentation, consult:

- **`references/manifest-reference.md`** — All 37 capabilities, slot types, validation rules, declaration examples
- **`references/worker-api-reference.md`** — Full PluginContext API, lifecycle hooks, sandbox constraints
- **`references/ui-reference.md`** — All 5 hooks, component props, styling, streaming, navigation patterns

## Source Code References

- Plugin SDK: `~/code/paperclip/packages/plugins/sdk/`
- Plugin spec: `~/code/paperclip/doc/plugins/PLUGIN_SPEC.md`
- Kitchen sink example: `~/code/paperclip/packages/plugins/examples/plugin-kitchen-sink-example/`
- Hello world example: `~/code/paperclip/packages/plugins/examples/plugin-hello-world-example/`
- File browser example: `~/code/paperclip/packages/plugins/examples/plugin-file-browser-example/`
- Scaffolding tool: `~/code/paperclip/packages/plugins/create-paperclip-plugin/`
- Capability validator: `~/code/paperclip/server/src/services/plugin-capability-validator.ts`
- Manifest validator: `~/code/paperclip/server/src/services/plugin-manifest-validator.ts`
- Tortuga plugin: `~/code/tortuga-plugin/`
- Tortuga architecture: `~/code/tortuga-plugin/ARCHITECTURE.md`
