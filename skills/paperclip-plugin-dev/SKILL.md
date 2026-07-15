---
name: paperclip-plugin-dev
version: 1.1.2
description: >-
  This skill should be used when the user asks to
  "scaffold a Paperclip plugin", "write a Paperclip plugin manifest",
  "add a UI slot to a Paperclip plugin", "publish a Paperclip plugin to npm",
  or "install a Paperclip plugin". Builds, publishes, and installs Paperclip
  plugins correctly, with critical lessons learned from real publishing
  failures — plugin capabilities, jobs, webhooks, and agent tools.
---

# Paperclip Plugin Development

Build Paperclip plugins based on the actual SDK source code, validator source code, and examples. Follows lessons learned from real publishing failures.

## SDK Version

`@paperclipai/plugin-sdk` is published on npm under calver
(`YYYY.MDD.patch`), with a `canary` dist-tag for prereleases. Before starting
work, run `npm view @paperclipai/plugin-sdk version dist-tags exports --json`,
inspect the installed package exports, and pin the selected release in the
project. Do not copy a remembered SDK version or entry-point list.

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

### 7. No arbitrary `agents.create` in SDK

The plugin SDK can read, pause, resume, invoke, and chat with agents — but cannot create or update arbitrary agents. Two newer, narrower paths exist: `ctx.agents.managed` (`get`/`reconcile`/`reset` of manifest-declared plugin-managed agents by stable key, requires `agents.managed`) and `ctx.agents.sessions` (create/message/close two-way chat sessions, requires `agent.sessions.*`). For anything else, present templates in the UI and let the operator create agents manually.

### 8. ConvexError stores messages in `error.data`, NOT `error.message`

When catching errors from Convex mutations in Next.js API routes, `error.message` is always the generic `"[Request ID: xxx] Server Error"`. The actual user-facing message is in `error.data`. Use this pattern:

```typescript
import { ConvexError } from "convex/values";

function extractConvexErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object" && "message" in data) {
      return String((data as { message: unknown }).message);
    }
    return JSON.stringify(data);
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
```

### 9. Depend on the npm SDK; tgz packing is only for unpublished upstream changes

The SDK is now published to npm — depend on `@paperclipai/plugin-sdk` directly and bump it like any dependency (calver; check the `canary` dist-tag for bleeding edge). The old local-tgz workflow is only needed when tracking upstream changes that haven't shipped yet:

```bash
cd ~/code/paperclip/packages/shared && pnpm run build && pnpm pack
cd ~/code/paperclip/packages/plugins/sdk && pnpm run build && pnpm pack
# Copy both .tgz files to plugin's .paperclip-sdk/ directory
# Delete pnpm-lock.yaml (integrity hashes are cached)
bun install
```

Local tgz files go stale the moment upstream changes shared types — prefer the published package.

### 10. Use typed SDK clients, not raw HTTP against the internal API

Never call the internal Paperclip API via `ctx.http.fetch` or raw fetch — use the typed clients: `ctx.issues`, `ctx.agents`, `ctx.goals`, `ctx.projects`, `ctx.companies`, `ctx.executionWorkspaces`, plus the managed-resource clients `ctx.routines` (requires `routines.managed`) and `ctx.skills` (requires `skills.managed`). The old "there is no `ctx.routines` client" limitation is gone. `ctx.http.fetch` (requires `http.outbound`) is for external services and exists for host-managed tracing/audit; requests need absolute URLs.

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

## Worker Runtime Constraints

Plugin workers run as out-of-process child processes (`node:child_process` fork) speaking JSON-RPC to the host — no longer a `vm.createContext()` sandbox. Bundle as ESM via `createPluginBundlerPresets` from `@paperclipai/plugin-sdk/bundlers` (the old CJS-only requirement is gone). All Paperclip host interaction still goes through `PluginContext` methods, gated by declared capabilities.

---

## Secrets

Declare `format: "secret-ref"` in `instanceConfigSchema`. Operator pastes a secret UUID. Resolve at runtime: `await ctx.secrets.resolve(config.apiKey)`. Never cache resolved values.

---

## Reference Files

For detailed API documentation, consult:

- **`references/manifest-reference.md`** — Capabilities (73 as of SDK 2026.707.0 — verify against `packages/shared/src/constants.ts` `PLUGIN_CAPABILITIES`, the reference file predates the expansion from 37), slot types, validation rules, declaration examples
- **`references/worker-api-reference.md`** — Full PluginContext API, lifecycle hooks, runtime constraints
- **`references/ui-reference.md`** — UI hooks (now 7: `usePluginData`, `usePluginAction`, `useHostContext`, `useHostNavigation`, `useHostLocation`, `usePluginStream`, `usePluginToast`), component props, styling, streaming, navigation patterns

## Source Code References

`~/code/paperclip` is a fork of `paperclipai/paperclip` — verify it is synced with upstream (`git fetch upstream && git merge upstream/master`) before treating it as source of truth, or consult `github.com/paperclipai/paperclip` directly.

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
