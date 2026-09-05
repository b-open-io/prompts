import { describe, expect, test } from "bun:test"
import type { PackCatalogEntry, PackPlugin } from "./pack-catalog"
import { diffPackDependencies, installCommandForRuntime } from "./pack-dependencies"
import type { HarnessState } from "./types"

const pack: PackCatalogEntry = {
	slug: "test-pack",
	productId: "pack-test",
	name: "Test Pack",
	tagline: "A test pack",
	plugins: [
		{
			name: "core",
			marketplace: "b-open-io",
			inCatalog: true,
			install: "claude plugin install core@b-open-io",
		},
		{
			name: "stripe",
			marketplace: "claude-plugins-official",
			install: "claude plugin install stripe@claude-plugins-official",
		},
		{ name: "react-doctor", marketplace: "portable-skill", install: "npx skills add react-doctor" },
	],
	playbooks: [],
}

const state: HarnessState = {
	runtimeArg: "claude",
	runtimeDetected: "claude",
	platform: "darwin",
	generatedAt: "2026-07-14T00:00:00.000Z",
	plugins: [
		{
			name: "core",
			marketplace: "b-open-io",
			installedClaude: "1.1.70",
			installedCodex: null,
			marketplaceVersion: "1.1.70",
			hasSetupManifest: true,
			checks: [],
			hooks: [],
			hooksConfigPath: null,
		},
	],
	portableSkills: ["react-doctor"],
	marketplace: { fetched: true, error: null, fetchedAt: "2026-07-14T00:00:00.000Z" },
	pack: null,
}

describe("pack dependency diff", () => {
	test("separates installed marketplace plugins, portable skills, and missing dependencies", () => {
		const dependencies = diffPackDependencies(pack, state, "claude")
		expect(dependencies.map(({ name, installed }) => ({ name, installed }))).toEqual([
			{ name: "core", installed: true },
			{ name: "stripe", installed: false },
			{ name: "react-doctor", installed: true },
		])
		expect(dependencies[0].installedVersion).toBe("1.1.70")
	})

	test("uses the selected harness instead of another installed harness", () => {
		const dependencies = diffPackDependencies(pack, state, "codex")
		expect(dependencies.find((dependency) => dependency.name === "core")?.installed).toBe(false)
	})
})

describe("runtime install commands", () => {
	const plugin: PackPlugin = {
		name: "static-analysis",
		marketplace: "trailofbits",
		install: "claude plugin install static-analysis@trailofbits",
	}

	test("preserves canonical pack.json commands for Claude", () => {
		expect(installCommandForRuntime(plugin, "claude")).toBe(plugin.install)
	})

	test("emits the exact Codex marketplace command sequence", () => {
		expect(installCommandForRuntime(plugin, "codex")).toBe(
			"codex plugin marketplace upgrade\ncodex plugin add static-analysis@trailofbits",
		)
	})

	test("removes the non-shell annotation from portable skill commands", () => {
		const portable: PackPlugin = {
			name: "react-doctor",
			marketplace: "portable-skill",
			install: "npx skills add react-doctor (source pinned in the pack setup manifest)",
		}
		expect(installCommandForRuntime(portable, "codex")).toBe("npx skills add react-doctor")
	})
})


test("OpenCode does not inherit Claude plugin status or install commands", () => {
  const dependencies = diffPackDependencies(pack, state, "opencode")
  expect(dependencies.find((item) => item.name === "core")?.installed).toBe(false)
  expect(dependencies.find((item) => item.name === "core")?.installCommand).toBe("")
})
