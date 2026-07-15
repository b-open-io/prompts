import { describe, expect, test } from "bun:test"
import { interfaceUrl, listLocalInterfaces } from "./agent-master-interfaces"

describe("Agent Master local interface routing", () => {
	test("uses isolated Portless subdomains for server-backed tools", () => {
		expect(interfaceUrl("https://agent-master.localhost", "gemskills:deck-creator")).toBe(
			"https://deck.agent-master.localhost",
		)
		expect(interfaceUrl("http://agent-master.localhost:1355", "gemskills:visual-planner")).toBe(
			"http://planner.agent-master.localhost:1355",
		)
	})

	test("isolates static tools on their own Portless origin", () => {
		expect(interfaceUrl("http://127.0.0.1:7788", "bopen-tools:visual-wayfinder")).toBe(
			"https://wayfinder.agent-master.localhost",
		)
	})

	test("publishes only the compiled-in interface set", () => {
		expect(listLocalInterfaces("https://agent-master.localhost").map((entry) => entry.id)).toEqual([
			"gemskills:deck-creator",
			"gemskills:visual-planner",
			"bopen-tools:visual-wayfinder",
		])
	})
})
