import { describe, expect, test } from "bun:test"
import { catalogSummary, partitionPlugins } from "./plugins"
import type { HarnessState, PluginState } from "./types"

function plugin(name: string, inCatalog: boolean, installedClaude: string | null): PluginState {
	return {
		name,
		marketplace: inCatalog ? "b-open-io" : "openai-bundled",
		inCatalog,
		installedClaude,
		installedCodex: null,
		marketplaceVersion: inCatalog ? "1.0.0" : null,
		hasSetupManifest: false,
		checks: [],
		hooks: [],
		hooksConfigPath: null,
	}
}

describe("plugin partition", () => {
	const state = {
		plugins: [
			plugin("core", true, "1.1.157"),
			plugin("bsv-skills", true, null),
			plugin("browser", false, null),
			plugin("canva", false, "14.0.0"),
		],
	} as unknown as HarnessState

	test("keeps only marketplace plugins in the catalog list", () => {
		const { catalog, other } = partitionPlugins(state.plugins)
		expect(catalog.map((p) => p.name)).toEqual(["core", "bsv-skills"])
		expect(other.map((p) => p.name)).toEqual(["browser", "canva"])
	})

	test("counts installed against the catalog total, not the whole cache", () => {
		expect(catalogSummary(state)).toEqual({ installed: 1, total: 2 })
	})
})
