/**
 * Downloading and applying an Agent Master release.
 *
 * The broker does this work rather than the Zig shell: it already has network
 * access, the user's bopen.ai session travels through it for pack entitlements,
 * and the swap has to outlive the process being replaced. Nothing here runs
 * unless `desktopHost()` identifies a packaged bundle, so the standalone setup
 * server can reach these routes and always be told the host is unsupported.
 *
 * Applying is deliberately a two-step: stage first (download, verify, copy the
 * new bundle somewhere safe) and only then swap. Everything that can fail —
 * entitlement, signature, version mismatch, an unwritable install directory —
 * fails while the running app is still intact.
 */

import { execFile, spawn } from "node:child_process"
import { constants } from "node:fs"
import { access, mkdir, rm, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { promisify } from "node:util"
import { desktopHost, type UpdateChannel, type UpdateEnvironment } from "./app-update"

const run = promisify(execFile)

export type StagedUpdate = {
	version: string
	channel: UpdateChannel
	stagedBundle: string
	target: string
}

export type InstallState =
	| { state: "idle" }
	| { state: "downloading"; version: string }
	| { state: "staged"; version: string }
	| { state: "swapping"; version: string }
	| { state: "failed"; version: string | null; reason: string }

const DOWNLOAD_URL = "https://bopen.ai/api/download/agent-master"

const installState = globalThis as typeof globalThis & {
	__agentMasterUpdate?: { status: InstallState; staged: StagedUpdate | null }
}

function store(): { status: InstallState; staged: StagedUpdate | null } {
	installState.__agentMasterUpdate ??= { status: { state: "idle" }, staged: null }
	return installState.__agentMasterUpdate
}

export function currentInstallState(): InstallState {
	return store().status
}

export function stagedUpdate(): StagedUpdate | null {
	return store().staged
}

export function updateWorkDirectory(): string {
	return join(homedir(), ".bopen", "agent-master", "updates")
}

async function bundleVersion(bundle: string): Promise<string> {
	const { stdout } = await run("/usr/bin/plutil", [
		"-extract",
		"CFBundleShortVersionString",
		"raw",
		"-o",
		"-",
		join(bundle, "Contents", "Info.plist"),
	])
	return stdout.trim()
}

async function mountedBundle(mountPoint: string): Promise<string> {
	const { stdout } = await run("/bin/ls", [mountPoint])
	const app = stdout
		.split("\n")
		.map((entry) => entry.trim())
		.find((entry) => entry.endsWith(".app"))
	if (!app) throw new Error("The downloaded disk image contains no application bundle.")
	return join(mountPoint, app)
}

async function assertTrusted(bundle: string, channel: UpdateChannel): Promise<void> {
	await run("/usr/bin/codesign", ["--verify", "--deep", "--strict", bundle]).catch(() => {
		throw new Error("The downloaded application failed signature verification.")
	})
	// Internal builds are ad-hoc signed and never pass Gatekeeper assessment;
	// a production update that fails it is not something we will install.
	if (channel !== "production") return
	await run("/usr/sbin/spctl", ["--assess", "--type", "execute", bundle]).catch(() => {
		throw new Error("The downloaded application was rejected by Gatekeeper.")
	})
}

async function assertInstallable(target: string): Promise<void> {
	await access(dirname(target), constants.W_OK).catch(() => {
		throw new Error(
			`Agent Master cannot replace itself at ${target}: ${dirname(target)} is not writable by this user.`,
		)
	})
}

/**
 * Download the entitled release, verify it, and copy it next to the running
 * bundle. Returns once a swap is safe to attempt.
 */
export async function stageUpdate(options: {
	env: UpdateEnvironment
	authorization: string
	expectedVersion: string
	channel: UpdateChannel
	fetchImpl?: typeof fetch
}): Promise<StagedUpdate> {
	const host = desktopHost(options.env)
	if (!host) throw new Error("Updates apply only to the Agent Master desktop app.")
	await assertInstallable(host.bundle)

	store().status = { state: "downloading", version: options.expectedVersion }
	const workDir = updateWorkDirectory()
	const staged = join(workDir, "staged", "agent-master.app")
	const image = join(workDir, `${options.expectedVersion}.dmg`)
	const mountPoint = join(workDir, "mount")

	try {
		await mkdir(workDir, { recursive: true })
		await rm(join(workDir, "staged"), { recursive: true, force: true })
		await rm(mountPoint, { recursive: true, force: true })

		const request = options.fetchImpl ?? fetch
		const response = await request(DOWNLOAD_URL, {
			headers: { Authorization: options.authorization },
			cache: "no-store",
		})
		if (response.status === 401 || response.status === 403) {
			throw new Error("This bopen.ai account does not have an Agent Master entitlement.")
		}
		if (!response.ok) throw new Error(`The release download failed (${response.status}).`)
		await writeFile(image, new Uint8Array(await response.arrayBuffer()))

		await mkdir(mountPoint, { recursive: true })
		await run("/usr/bin/hdiutil", [
			"attach",
			image,
			"-nobrowse",
			"-readonly",
			"-mountpoint",
			mountPoint,
		])
		try {
			const source = await mountedBundle(mountPoint)
			const shipped = await bundleVersion(source)
			if (shipped !== options.expectedVersion) {
				throw new Error(
					`The release feed offered ${options.expectedVersion} but the download contains ${shipped}.`,
				)
			}
			await assertTrusted(source, options.channel)
			await mkdir(dirname(staged), { recursive: true })
			await run("/usr/bin/ditto", [source, staged])
		} finally {
			await run("/usr/bin/hdiutil", ["detach", mountPoint, "-quiet"]).catch(() => {})
			await rm(image, { force: true })
		}

		const result: StagedUpdate = {
			version: options.expectedVersion,
			channel: options.channel,
			stagedBundle: staged,
			target: host.bundle,
		}
		store().staged = result
		store().status = { state: "staged", version: options.expectedVersion }
		return result
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error)
		store().staged = null
		store().status = { state: "failed", version: options.expectedVersion, reason }
		throw error
	}
}

/**
 * The swap runs after this process is gone, so it lives in a script rather than
 * in the broker. It keeps the outgoing bundle until the copy lands, which is the
 * difference between a failed update and an uninstalled application.
 */
export function swapScript(): string {
	return `#!/bin/bash
set -uo pipefail
app_pid="$1"
staged="$2"
target="$3"

/bin/kill -TERM "$app_pid" 2>/dev/null
for _ in $(/usr/bin/seq 1 120); do
  /bin/kill -0 "$app_pid" 2>/dev/null || break
  /bin/sleep 0.25
done
if /bin/kill -0 "$app_pid" 2>/dev/null; then
  exit 1
fi

/bin/rm -rf "$target.previous"
/bin/mv "$target" "$target.previous" || exit 1
if ! /usr/bin/ditto "$staged" "$target"; then
  /bin/rm -rf "$target"
  /bin/mv "$target.previous" "$target"
  exit 1
fi
/bin/rm -rf "$target.previous"
/usr/bin/open "$target"
`
}

/**
 * Quit the app, replace it, and relaunch. Detached on purpose: killing the shell
 * takes down its whole process group, which includes this broker.
 */
export async function applyStagedUpdate(options: {
	env: UpdateEnvironment
}): Promise<StagedUpdate> {
	const host = desktopHost(options.env)
	if (!host) throw new Error("Updates apply only to the Agent Master desktop app.")
	const staged = store().staged
	if (!staged) throw new Error("No verified update is staged.")

	const scriptPath = join(updateWorkDirectory(), "apply-update.sh")
	await writeFile(scriptPath, swapScript(), { mode: 0o755 })

	const child = spawn(
		"/bin/bash",
		[scriptPath, String(host.pid), staged.stagedBundle, staged.target],
		{
			detached: true,
			stdio: "ignore",
		},
	)
	child.unref()
	store().status = { state: "swapping", version: staged.version }
	return staged
}
