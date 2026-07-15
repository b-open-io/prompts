import { describe, expect, test } from "bun:test"
import {
	INTERFACE_STARTUP_TIMEOUT_MS,
	interfaceUrl,
	listLocalInterfaces,
	waitForReady,
} from "./agent-master-interfaces"

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

describe("Agent Master local interface readiness", () => {
	test("allows production tools enough time for a cold standalone start", () => {
		expect(INTERFACE_STARTUP_TIMEOUT_MS).toBe(90_000)
	})

	test("does not treat a wildcard 404 as a ready interface", async () => {
		let requests = 0
		const server = Bun.serve({
			port: 0,
			fetch() {
				requests += 1
				if (requests === 1) return new Response("Parent wildcard route", { status: 404 })
				return new Response("<title>Deck Playground</title>")
			},
		})

		try {
			await waitForReady(server.url.toString(), "<title>Deck Playground</title>", 1_000)
			expect(requests).toBeGreaterThanOrEqual(2)
		} finally {
			server.stop(true)
		}
	})

	test("requires the expected product marker on a successful response", async () => {
		const server = Bun.serve({
			port: 0,
			fetch() {
				return Response.json({ product: "wrong-interface", status: "ready" })
			},
		})

		try {
			await expect(
				waitForReady(server.url.toString(), '"product":"visual-wayfinder"', 50),
			).rejects.toThrow("readiness marker missing")
		} finally {
			server.stop(true)
		}
	})
})
