import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { detectHarness } from "../../../../../../scripts/detector"
import { validatePackRuntime } from "../../../../../../scripts/pack"

const execFileAsync = promisify(execFile)

async function run(file: string, args: string[]): Promise<void> {
	await execFileAsync(file, args, {
		timeout: 120_000,
		maxBuffer: 2 * 1024 * 1024,
		env: process.env,
	})
}

export async function POST(request: Request): Promise<Response> {
	const packPath = process.env.BOPEN_SETUP_PACK
	if (!packPath) {
		return Response.json(
			{ error: "No pack was supplied to the playground launcher" },
			{ status: 400 },
		)
	}

	const body = (await request.json().catch(() => null)) as { runtime?: unknown } | null
	if (!body || !validatePackRuntime(body.runtime)) {
		return Response.json({ error: "runtime must be claude, codex, or grok" }, { status: 400 })
	}

	try {
		const state = await detectHarness({ runtimeArg: body.runtime, packPath })
		if (!state.pack) return Response.json({ error: "Pack state unavailable" }, { status: 400 })

		const installed: string[] = []
		for (const dependency of state.pack.dependencies) {
			const runtimeState = dependency.runtimes[body.runtime]
			if (runtimeState.installed) continue

			if (dependency.marketplace === "portable-skill") {
				const agent = body.runtime === "codex" ? "codex" : "claude-code"
				await run("npx", [
					"skills",
					"add",
					dependency.source,
					"--global",
					"--yes",
					"--agent",
					agent,
					"--skill",
					dependency.name,
				])
			} else if (body.runtime === "codex") {
				if (runtimeState.installCommand.includes("codex plugin marketplace add")) {
					const source =
						dependency.marketplace === "b-open-io" ? "b-open-io/prompts" : dependency.source
					await run("codex", ["plugin", "marketplace", "add", source])
				}
				await run("codex", ["plugin", "marketplace", "upgrade"])
				await run("codex", ["plugin", "add", `${dependency.name}@${dependency.marketplace}`])
			} else {
				if (runtimeState.installCommand.includes("claude plugin marketplace add")) {
					await run("claude", ["plugin", "marketplace", "add", dependency.source])
				}
				await run("claude", ["plugin", "install", `${dependency.name}@${dependency.marketplace}`])
			}
			installed.push(dependency.name)
		}

		return Response.json({ installed })
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		return Response.json({ error: message }, { status: 500 })
	}
}
