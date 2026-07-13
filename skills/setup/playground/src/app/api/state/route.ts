// GET /api/state — re-exposes detectHarness with the identical JSON contract
// as skills/setup/scripts/server.ts. Runtime imports detector.ts directly
// (never modified — see SPEC-OPL-2879-playground.md); this route is the only
// consumer allowed to reach across into the sibling unit's scripts/.
import {
	detectHarness,
	fetchMarketplaceCatalog,
	type Runtime,
} from "../../../../../scripts/detector"

export const dynamic = "force-dynamic"

const VALID_RUNTIMES: Runtime[] = ["claude", "codex", "opencode", "grok", "hermes", "generic"]

function resolveRuntime(): Runtime {
	const raw = process.env.BOPEN_SETUP_RUNTIME
	return raw && VALID_RUNTIMES.includes(raw as Runtime) ? (raw as Runtime) : "generic"
}

// Fetched once per server process — /api/state reuses this snapshot but
// re-runs every other check live on each call, matching server.ts's caching
// contract (marketplaceCache is fetched once at boot there).
let marketplaceCachePromise: ReturnType<typeof fetchMarketplaceCatalog> | null = null

export async function GET() {
	if (!marketplaceCachePromise) marketplaceCachePromise = fetchMarketplaceCatalog()
	const marketplaceCache = await marketplaceCachePromise
	const state = await detectHarness({ runtimeArg: resolveRuntime(), marketplaceCache })
	return Response.json(state)
}
