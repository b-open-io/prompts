import { describe, expect, test } from "bun:test"
import {
	channelFor,
	checkForUpdate,
	desktopHost,
	feedUrl,
	type UpdateEnvironment,
} from "./app-update"

const DESKTOP: UpdateEnvironment = {
	BOPEN_AGENT_MASTER: "1",
	AGENT_MASTER_APP_VERSION: "0.1.6",
	AGENT_MASTER_APP_BUNDLE: "/Applications/agent-master.app",
	AGENT_MASTER_APP_PID: "4321",
}

function feed(body: unknown, status = 200): typeof fetch {
	return (async () =>
		new Response(JSON.stringify(body), {
			status,
			headers: { "Content-Type": "application/json" },
		})) as unknown as typeof fetch
}

describe("host detection", () => {
	test("recognises the packaged desktop shell", () => {
		expect(desktopHost(DESKTOP)).toEqual({
			version: "0.1.6",
			bundle: "/Applications/agent-master.app",
			pid: 4321,
		})
	})

	test("reports no host for a standalone setup session", () => {
		expect(desktopHost({})).toBeNull()
	})

	test("reports no host when Agent Master mode is set without the shell handshake", () => {
		// `skills/setup/scripts/server.ts` can be run with BOPEN_AGENT_MASTER=1
		// for connection testing; only the Zig shell supplies version and bundle.
		expect(desktopHost({ BOPEN_AGENT_MASTER: "1" })).toBeNull()
	})

	test("rejects a bundle path with no usable process id", () => {
		expect(desktopHost({ ...DESKTOP, AGENT_MASTER_APP_PID: "0" })).toBeNull()
		expect(desktopHost({ ...DESKTOP, AGENT_MASTER_APP_PID: "not-a-pid" })).toBeNull()
	})
})

describe("channel selection", () => {
	test("keeps release installs on the production channel", () => {
		expect(channelFor("0.1.6")).toBe("production")
	})

	test("lets an internal build see internal releases", () => {
		expect(channelFor("0.2.0-internal.3")).toBe("internal")
	})

	test("asks the feed about the version actually installed", () => {
		const url = new URL(feedUrl("0.1.6", "production", {}))
		expect(url.pathname).toBe("/api/releases/agent-master/latest")
		expect(url.searchParams.get("version")).toBe("0.1.6")
		expect(url.searchParams.get("channel")).toBe("production")
	})

	test("honours a feed override for testing against a local release service", () => {
		const url = new URL(
			feedUrl("0.1.6", "production", {
				AGENT_MASTER_UPDATE_FEED: "http://localhost:3000/api/releases/agent-master/latest",
			}),
		)
		expect(url.origin).toBe("http://localhost:3000")
	})
})

describe("update check", () => {
	test("is unsupported when the setup UI runs outside the desktop app", async () => {
		const result = await checkForUpdate({ env: {}, fetchImpl: feed({}) })
		expect(result.state).toBe("unsupported")
	})

	test("reports an available release the feed says is newer", async () => {
		const result = await checkForUpdate({
			env: DESKTOP,
			fetchImpl: feed({
				channel: "production",
				latest: { version: "0.2.0", channel: "production", filename: "agent-master-0.2.0.dmg" },
				updateAvailable: true,
			}),
		})
		expect(result).toEqual({
			state: "available",
			installed: "0.1.6",
			latest: "0.2.0",
			channel: "production",
			filename: "agent-master-0.2.0.dmg",
		})
	})

	test("stays current when the newest release is the installed one", async () => {
		const result = await checkForUpdate({
			env: DESKTOP,
			fetchImpl: feed({
				latest: { version: "0.1.6", channel: "production", filename: "agent-master-0.1.6.dmg" },
				updateAvailable: false,
			}),
		})
		expect(result).toEqual({ state: "current", installed: "0.1.6", channel: "production" })
	})

	test("stays current when the feed knows of no release at all", async () => {
		const result = await checkForUpdate({
			env: DESKTOP,
			fetchImpl: feed({ channel: "production", latest: null, updateAvailable: false }),
		})
		expect(result.state).toBe("current")
	})

	test("reports an unreachable feed instead of claiming the install is current", async () => {
		const result = await checkForUpdate({
			env: DESKTOP,
			fetchImpl: (async () => {
				throw new Error("network is unreachable")
			}) as unknown as typeof fetch,
		})
		expect(result.state).toBe("unreachable")
		expect(result.state === "unreachable" && result.reason).toBe("network is unreachable")
	})

	test("treats a failing feed response as unreachable", async () => {
		const result = await checkForUpdate({ env: DESKTOP, fetchImpl: feed({}, 503) })
		expect(result.state).toBe("unreachable")
	})
})
