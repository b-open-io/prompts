import type { PackCatalogEntry, PackPlugin } from "@/lib/pack-catalog"
import type { HarnessState, Runtime } from "@/lib/types"

export type PackDependency = PackPlugin & {
	installed: boolean
	installedVersion: string | null
	installCommand: string
}

function installedVersion(
	state: HarnessState,
	plugin: PackPlugin,
	runtime: Runtime,
): string | null {
	if (plugin.marketplace === "portable-skill") {
		return state.portableSkills.includes(plugin.name) ? "installed" : null
	}

	const installed = state.plugins.find((candidate) => candidate.name === plugin.name)
	if (!installed) return null
	if (runtime === "codex") return installed.installedCodex
	if (runtime === "claude" || runtime === "opencode" || runtime === "grok") {
		return installed.installedClaude
	}
	return installed.installedCodex ?? installed.installedClaude
}

/** Convert the canonical pack.json install hint into an executable command.
 * The generated portable-skill hints include a parenthetical note that is not
 * shell syntax, so remove that annotation while preserving the exact command. */
export function installCommandForRuntime(plugin: PackPlugin, runtime: Runtime): string {
	if (plugin.marketplace === "portable-skill") {
		return plugin.install.replace(/\s+\(source pinned in the pack setup manifest\)$/, "")
	}
	if (runtime === "codex") {
		return `codex plugin marketplace upgrade\ncodex plugin add ${plugin.name}@${plugin.marketplace}`
	}
	if (runtime === "grok" && plugin.marketplace === "b-open-io") {
		return "grok plugin install b-open-io/prompts --trust"
	}
	return plugin.install
}

export function diffPackDependencies(
	pack: PackCatalogEntry,
	state: HarnessState,
	runtime: Runtime,
): PackDependency[] {
	return pack.plugins.map((plugin) => {
		const version = installedVersion(state, plugin, runtime)
		return {
			...plugin,
			installed: version !== null,
			installedVersion: version,
			installCommand: installCommandForRuntime(plugin, runtime),
		}
	})
}
