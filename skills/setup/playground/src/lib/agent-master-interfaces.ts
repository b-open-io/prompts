import { type ChildProcess, spawn, spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"

export const AGENT_MASTER_PROTOCOL_VERSION = 1

export type LocalInterfaceId =
	| "gemskills:deck-creator"
	| "gemskills:visual-planner"
	| "bopen-tools:visual-wayfinder"

export interface LocalInterfaceDescriptor {
	id: LocalInterfaceId
	label: string
	description: string
	kind: "server" | "static"
	available: boolean
	running: boolean
	url?: string
	reason?: string
}

type InterfaceDefinition = {
	id: LocalInterfaceId
	label: string
	description: string
	kind: "server" | "static"
	portlessName: string
}

type ManagedProcess = {
	child: ChildProcess
	startedAt: number
	url: string
}

const INTERFACES: readonly InterfaceDefinition[] = [
	{
		id: "gemskills:deck-creator",
		label: "Deck Creator",
		description: "Open the local deck workspace and presentation playground.",
		kind: "server",
		portlessName: "deck.agent-master",
	},
	{
		id: "gemskills:visual-planner",
		label: "Visual Planner",
		description: "Open a local tldraw workflow canvas managed by Agent Master.",
		kind: "server",
		portlessName: "planner.agent-master",
	},
	{
		id: "bopen-tools:visual-wayfinder",
		label: "Visual Wayfinder",
		description: "Open the build-free visual decision workbench.",
		kind: "static",
		portlessName: "wayfinder.agent-master",
	},
] as const

const globalState = globalThis as typeof globalThis & {
	__agentMasterInterfaces?: Map<LocalInterfaceId, ManagedProcess>
	__agentMasterLaunches?: Map<LocalInterfaceId, Promise<string>>
	__agentMasterCleanupRegistered?: boolean
}

function managedProcesses(): Map<LocalInterfaceId, ManagedProcess> {
	globalState.__agentMasterInterfaces ??= new Map()
	if (!globalState.__agentMasterCleanupRegistered) {
		globalState.__agentMasterCleanupRegistered = true
		process.once("exit", () => {
			for (const managed of managedProcesses().values()) managed.child.kill("SIGTERM")
		})
	}
	return globalState.__agentMasterInterfaces
}

function pendingLaunches(): Map<LocalInterfaceId, Promise<string>> {
	globalState.__agentMasterLaunches ??= new Map()
	return globalState.__agentMasterLaunches
}

function existingDirectory(candidates: Array<string | undefined>): string | undefined {
	for (const candidate of candidates) {
		if (!candidate) continue
		try {
			if (statSync(candidate).isDirectory()) return candidate
		} catch {
			// Candidate is absent or unreadable; continue through supported locations.
		}
	}
	return undefined
}

function newestVersionDirectory(base: string): string | undefined {
	try {
		return readdirSync(base, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
			.map((entry) => join(base, entry))
			.find((entry) => statSync(entry).isDirectory())
	} catch {
		return undefined
	}
}

function pluginRootFromPlayground(): string {
	return resolve(process.cwd(), "../../..")
}

export function resolveBopenToolsRoot(): string | undefined {
	const home = homedir()
	return existingDirectory([
		process.env.AGENT_MASTER_BOPEN_TOOLS_ROOT,
		pluginRootFromPlayground(),
		newestVersionDirectory(join(home, ".codex/plugins/cache/b-open-io/bopen-tools")),
		newestVersionDirectory(join(home, ".claude/plugins/cache/b-open-io/bopen-tools")),
	])
}

export function resolveGemskillsRoot(): string | undefined {
	const home = homedir()
	const bopenToolsRoot = resolveBopenToolsRoot()
	return existingDirectory([
		process.env.AGENT_MASTER_GEMSKILLS_ROOT,
		bopenToolsRoot ? resolve(bopenToolsRoot, "../gemskills") : undefined,
		resolve(process.cwd(), "../../../../gemskills"),
		newestVersionDirectory(join(home, ".codex/plugins/cache/b-open-io/gemskills")),
		newestVersionDirectory(join(home, ".claude/plugins/cache/b-open-io/gemskills")),
	])
}

function definitionFor(id: string): InterfaceDefinition | undefined {
	return INTERFACES.find((entry) => entry.id === id)
}

function processIsRunning(id: LocalInterfaceId): boolean {
	const managed = managedProcesses().get(id)
	if (!managed) return false
	if (managed.child.exitCode === null && !managed.child.killed) return true
	managedProcesses().delete(id)
	return false
}

function localOrigin(requestOrigin: string): string {
	const configured = process.env.AGENT_MASTER_PORTLESS_ORIGIN?.trim()
	if (configured) return new URL(configured).origin
	const parentPortlessUrl = process.env.PORTLESS_URL?.trim()
	if (parentPortlessUrl) return new URL(parentPortlessUrl).origin

	const requestUrl = new URL(requestOrigin)
	if (requestUrl.hostname.endsWith(".localhost")) return requestUrl.origin
	return "https://agent-master.localhost"
}

export function interfaceUrl(requestOrigin: string, id: LocalInterfaceId): string {
	const definition = definitionFor(id)
	if (!definition) throw new Error(`Unknown local interface: ${id}`)

	const origin = new URL(localOrigin(requestOrigin))
	origin.hostname = `${definition.portlessName}.localhost`
	return origin.origin
}

function interfaceAvailability(id: LocalInterfaceId): { available: boolean; reason?: string } {
	if (id === "bopen-tools:visual-wayfinder") {
		const root = resolveBopenToolsRoot()
		const asset = root && join(root, "skills/visual-wayfinder/assets/visual-wayfinder-demo.html")
		const launcher = root && join(root, "skills/setup/scripts/visual_wayfinder_server.ts")
		return asset && launcher && existsSync(asset) && existsSync(launcher)
			? { available: true }
			: { available: false, reason: "Visual Wayfinder is not installed." }
	}

	const root = resolveGemskillsRoot()
	if (!root) return { available: false, reason: "Gemskills is not installed." }
	const script =
		id === "gemskills:deck-creator"
			? join(root, "skills/deck-creator/scripts/playground_server.ts")
			: join(root, "skills/visual-planner/scripts/playground_server.ts")
	return existsSync(script)
		? { available: true }
		: { available: false, reason: "The installed Gemskills package has no compatible launcher." }
}

export function listLocalInterfaces(requestOrigin: string): LocalInterfaceDescriptor[] {
	return INTERFACES.map((definition) => {
		const availability = interfaceAvailability(definition.id)
		return {
			id: definition.id,
			label: definition.label,
			description: definition.description,
			kind: definition.kind,
			available: availability.available,
			running: processIsRunning(definition.id),
			...(availability.available ? { url: interfaceUrl(requestOrigin, definition.id) } : {}),
			...(availability.reason ? { reason: availability.reason } : {}),
		}
	})
}

function ensureDeckDirectory(): string {
	const deckDir = join(homedir(), ".bopen", "agent-master", "decks", "default")
	mkdirSync(deckDir, { recursive: true })
	return deckDir
}

function ensurePlannerFile(gemskillsRoot: string): string {
	const plannerDir = join(homedir(), ".bopen", "agent-master", "plans")
	const plannerFile = join(plannerDir, "default.tldr")
	if (existsSync(plannerFile)) return plannerFile

	mkdirSync(plannerDir, { recursive: true })
	copyFileSync(join(gemskillsRoot, "skills/visual-planner/assets/pipeline.tldr"), plannerFile)
	return plannerFile
}

function launcherCommand(id: LocalInterfaceId): { cwd: string; args: string[] } {
	if (id === "bopen-tools:visual-wayfinder") {
		const root = resolveBopenToolsRoot()
		if (!root) throw new Error("bOpen Tools is not installed.")
		return {
			cwd: root,
			args: [join(root, "skills/setup/scripts/visual_wayfinder_server.ts")],
		}
	}

	const gemskillsRoot = resolveGemskillsRoot()
	if (!gemskillsRoot) throw new Error("Gemskills is not installed.")
	if (id === "gemskills:deck-creator") {
		return {
			cwd: gemskillsRoot,
			args: [
				join(gemskillsRoot, "skills/deck-creator/scripts/playground_server.ts"),
				"--dir",
				ensureDeckDirectory(),
				"--no-open",
			],
		}
	}
	return {
		cwd: gemskillsRoot,
		args: [
			join(gemskillsRoot, "skills/visual-planner/scripts/playground_server.ts"),
			"--file",
			ensurePlannerFile(gemskillsRoot),
			"--no-open",
		],
	}
}

function registeredPortlessUrl(portless: string, portlessName: string, fallback: string): string {
	const result = spawnSync(portless, ["get", portlessName], {
		encoding: "utf8",
		env: process.env,
	})
	if (result.status !== 0) return fallback
	const match = result.stdout.match(/https?:\/\/[^\s]+/)
	return match?.[0] ? new URL(match[0]).origin : fallback
}

async function waitForReady(url: string, timeoutMs = 30_000): Promise<void> {
	const deadline = Date.now() + timeoutMs
	let lastError: unknown
	while (Date.now() < deadline) {
		const controller = new AbortController()
		const timeout = setTimeout(() => controller.abort(), 1_500)
		try {
			const response = await fetch(url, {
				cache: "no-store",
				redirect: "manual",
				signal: controller.signal,
			})
			if (response.status < 500) return
			lastError = new Error(`HTTP ${response.status}`)
		} catch (error) {
			lastError = error
		} finally {
			clearTimeout(timeout)
		}
		await Bun.sleep(250)
	}
	throw new Error(
		`Local interface did not become ready: ${lastError instanceof Error ? lastError.message : "timeout"}`,
	)
}

async function spawnManagedInterface(
	id: LocalInterfaceId,
	portlessName: string,
	fallbackUrl: string,
): Promise<string> {
	const command = launcherCommand(id)
	const portless = process.env.AGENT_MASTER_PORTLESS_BIN?.trim() || "portless"
	const child = spawn(portless, [portlessName, "bun", ...command.args], {
		cwd: command.cwd,
		env: { ...process.env, NODE_ENV: "development" },
		stdio: "inherit",
	})
	const managed = { child, startedAt: Date.now(), url: fallbackUrl }
	managedProcesses().set(id, managed)
	child.once("exit", () => managedProcesses().delete(id))

	const exited = new Promise<never>((_, reject) => {
		child.once("error", reject)
		child.once("exit", (code, signal) => {
			reject(
				new Error(
					`Local interface launcher exited before readiness (${signal ?? `code ${code ?? "unknown"}`}).`,
				),
			)
		})
	})

	try {
		await Bun.sleep(250)
		managed.url = registeredPortlessUrl(portless, portlessName, fallbackUrl)
		await Promise.race([waitForReady(managed.url), exited])
		return managed.url
	} catch (error) {
		managedProcesses().delete(id)
		child.kill("SIGTERM")
		throw error
	}
}

export async function launchLocalInterface(
	requestOrigin: string,
	rawId: string,
): Promise<LocalInterfaceDescriptor> {
	const definition = definitionFor(rawId)
	if (!definition) throw new Error(`Unknown local interface: ${rawId}`)
	const id = definition.id
	const availability = interfaceAvailability(id)
	if (!availability.available) throw new Error(availability.reason ?? "Interface unavailable.")

	let url = interfaceUrl(requestOrigin, id)
	const existing = managedProcesses().get(id)
	if (processIsRunning(id) && existing) {
		url = existing.url
	} else {
		let launch = pendingLaunches().get(id)
		if (!launch) {
			launch = spawnManagedInterface(id, definition.portlessName, url)
			pendingLaunches().set(id, launch)
			void launch.finally(() => pendingLaunches().delete(id)).catch(() => {})
		}
		url = await launch
	}

	return {
		id,
		label: definition.label,
		description: definition.description,
		kind: definition.kind,
		available: true,
		running: true,
		url,
	}
}

export function interfaceProcessMetadata(
	id: LocalInterfaceId,
): { startedAt: number; url: string } | undefined {
	const managed = managedProcesses().get(id)
	if (!managed || !processIsRunning(id)) return undefined
	return { startedAt: managed.startedAt, url: managed.url }
}
