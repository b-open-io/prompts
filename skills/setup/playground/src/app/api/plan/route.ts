// POST /api/plan — re-exposes emitPlan with the identical JSON contract as
// skills/setup/scripts/server.ts: validates PlanSelections, diffs against
// fresh detected state, and returns the complete prompt as {markdown}.
import { detectHarness, type PlanSelections } from "../../../../../scripts/detector"
import { emitPlan } from "../../../../../scripts/emitter"
import { isRuntime, type Runtime } from "../../../../../scripts/runtimes"

function resolveRuntime(): Runtime {
	const raw = process.env.BOPEN_SETUP_RUNTIME
	return raw && isRuntime(raw) ? raw : "generic"
}

function isPlanSelections(body: unknown): body is PlanSelections {
	if (!body || typeof body !== "object") return false
	const candidate = body as Record<string, unknown>
	if (typeof candidate.runtime !== "string" || !isRuntime(candidate.runtime)) return false
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

	const state = await detectHarness({
		runtimeArg: resolveRuntime(),
		packPath: process.env.BOPEN_SETUP_PACK,
	})
	const markdown = emitPlan(state, body)
	return Response.json({ markdown })
}
