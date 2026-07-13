// Client-side mirror of the HarnessState/PlanSelections contract from
// ../../../scripts/detector.ts (SPEC-OPL-2850-CONTRACTS.md). Kept local
// rather than imported so nothing server-only (Bun.spawn, node:fs) ends up
// in the client bundle — only the route handlers import detector.ts/emitter.ts
// directly, per SPEC-OPL-2879-playground.md.

export type Runtime = "claude" | "codex" | "opencode" | "grok" | "hermes" | "generic"

export type CheckKind = "cli" | "env" | "third-party-skill" | "codex-agents" | "setup-script"

export type CheckState = {
	id: string
	kind: CheckKind
	name: string
	installed: boolean
	detail?: string
	install?: string
	installNote?: string
	checkCommand?: string
	usedBy?: string[]
	obtain?: string
}

export type HookState = {
	name: string
	enabled: boolean
	summary: string
	runtimes: string[]
}

export type PluginState = {
	name: string
	installedClaude: string | null
	installedCodex: string | null
	marketplaceVersion: string | null
	hasSetupManifest: boolean
	checks: CheckState[]
	hooks: HookState[]
	hooksConfigPath: string | null
}

export type HarnessState = {
	runtimeArg: Runtime
	runtimeDetected: Runtime
	platform: "darwin" | "linux" | "win32"
	generatedAt: string
	plugins: PluginState[]
	marketplace: { fetched: boolean; error: string | null; fetchedAt: string | null }
}

export type PlanSelections = {
	runtime: Runtime
	plugins: Array<{
		name: string
		installPlugin: boolean
		checks: string[]
		hooks: Record<string, boolean>
	}>
}

export const VALID_RUNTIMES: Runtime[] = [
	"claude",
	"codex",
	"opencode",
	"grok",
	"hermes",
	"generic",
]

/** Per-plugin UI selection state — not part of the server contract. */
export type PluginSelection = {
	installPlugin: boolean
	checks: Set<string>
	hooks: Record<string, boolean>
}

export type Selections = Record<string, PluginSelection>
