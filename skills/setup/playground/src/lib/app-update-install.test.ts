import { describe, expect, test } from "bun:test"
import {
	applyStagedUpdate,
	stageUpdate,
	swapScript,
	updateWorkDirectory,
} from "./app-update-install"

describe("install guards", () => {
	test("refuses to stage a release for a standalone setup session", async () => {
		await expect(
			stageUpdate({
				env: {},
				authorization: "Bearer token",
				expectedVersion: "0.2.0",
				channel: "production",
			}),
		).rejects.toThrow("Updates apply only to the Agent Master desktop app.")
	})

	test("refuses to swap when no host bundle was handed over", async () => {
		await expect(applyStagedUpdate({ env: {} })).rejects.toThrow(
			"Updates apply only to the Agent Master desktop app.",
		)
	})

	test("refuses to swap before anything has been verified and staged", async () => {
		await expect(
			applyStagedUpdate({
				env: {
					BOPEN_AGENT_MASTER: "1",
					AGENT_MASTER_APP_VERSION: "0.1.6",
					AGENT_MASTER_APP_BUNDLE: "/Applications/agent-master.app",
					AGENT_MASTER_APP_PID: "4321",
				},
			}),
		).rejects.toThrow("No verified update is staged.")
	})

	test("keeps update working files out of the bundle being replaced", () => {
		expect(updateWorkDirectory()).toContain("/.bopen/agent-master/updates")
		expect(updateWorkDirectory()).not.toContain(".app/")
	})
})

describe("swap script", () => {
	const script = swapScript()

	test("waits for the shell to exit rather than replacing a running bundle", () => {
		expect(script).toContain('/bin/kill -TERM "$app_pid"')
		expect(script).toContain('/bin/kill -0 "$app_pid"')
		expect(script).toContain("exit 1")
	})

	test("keeps the outgoing bundle until the replacement is in place", () => {
		const move = script.indexOf('/bin/mv "$target" "$target.previous"')
		const copy = script.indexOf('/usr/bin/ditto "$staged" "$target"')
		const discard = script.indexOf('/bin/rm -rf "$target.previous"\n/usr/bin/open')
		expect(move).toBeGreaterThan(-1)
		expect(copy).toBeGreaterThan(move)
		expect(discard).toBeGreaterThan(copy)
	})

	test("restores the previous bundle when the copy fails", () => {
		expect(script).toContain('/bin/mv "$target.previous" "$target"')
	})

	test("relaunches the app it just replaced", () => {
		expect(script).toContain('/usr/bin/open "$target"')
	})
})
