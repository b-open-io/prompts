import type { HarnessState, PluginState } from "./types"

export type PluginPartition = {
	/** bopen.ai marketplace plugins: the list the UI is about. */
	catalog: PluginState[]
	/** Everything else found in a plugin cache: shown only on request. */
	other: PluginState[]
}

export function partitionPlugins(plugins: readonly PluginState[]): PluginPartition {
	const catalog: PluginState[] = []
	const other: PluginState[] = []
	for (const plugin of plugins) (plugin.inCatalog ? catalog : other).push(plugin)
	return { catalog, other }
}

export function isInstalled(plugin: PluginState): boolean {
	return plugin.installedClaude !== null || plugin.installedCodex !== null
}

export function catalogSummary(state: HarnessState): { installed: number; total: number } {
	const { catalog } = partitionPlugins(state.plugins)
	return { installed: catalog.filter(isInstalled).length, total: catalog.length }
}
