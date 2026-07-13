// POST /api/plan — re-exposes emitPlan with the identical JSON contract as
// skills/setup/scripts/server.ts: validates PlanSelections, diffs against
// fresh detected state, writes the single plan file to cwd, returns
// {markdown, path}. detector.ts/emitter.ts are imported, never modified.
import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { detectHarness, type PlanSelections, type Runtime } from "../../../../../scripts/detector"
import { emitPlan } from "../../../../../scripts/emitter"

const VALID_RUNTIMES: Runtime[] = ["claude", "codex", "opencode", "grok", "hermes", "generic"]

function resolveRuntime(): Runtime {
	const raw = process.env.BOPEN_SETUP_RUNTIME
	return raw && VALID_RUNTIMES.includes(raw as Runtime) ? (raw as Runtime) : "generic"
}

function isPlanSelections(body: unknown): body is PlanSelections {
	if (!body || typeof body !== "object") return false
	const candidate = body as Record<string, unknown>
	if (
		typeof candidate.runtime !== "string" ||
		!VALID_RUNTIMES.includes(candidate.runtime as Runtime)
	)
		return false
	if (!Array.isArray(candidate.plugins)) return false

	return candidate.plugins.every((entry) => {
		if (!entry || typeof entry !== "object") return false
		const plugin = entry as Record<string, unknown>
		return (
			typeof plugin.name === "string" &&
			typeof plugin.installPlugin === "boolean" &&
			Array.isArray(plugin.checks) &&
			plugin.checks.every((c) => typeof c === "string") &&
			typeof plugin.hooks === "object" &&
			plugin.hooks !== null &&
			!Array.isArray(plugin.hooks)
		)
	})
}

export async function POST(req: Request) {
	let body: unknown
	try {
		body = await req.json()
	} catch {
		return Response.json({ error: "malformed JSON body" }, { status: 400 })
	}
	if (!isPlanSelections(body)) {
		return Response.json({ error: "body does not match PlanSelections" }, { status: 400 })
	}

	const state = await detectHarness({ runtimeArg: resolveRuntime() })
	const markdown = emitPlan(state, body)
	const path = join(process.cwd(), "bopen-setup-plan.md")
	await writeFile(path, markdown, "utf8")
	return Response.json({ markdown, path })
}
