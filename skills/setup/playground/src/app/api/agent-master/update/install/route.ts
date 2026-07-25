import { checkForUpdate } from "@/lib/app-update"
import { applyStagedUpdate, stageUpdate } from "@/lib/app-update-install"
import { isBearerAuthorization, NO_STORE_HEADERS } from "@/lib/bopen-device"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function failure(message: string, status: number): Response {
	return Response.json({ error: message }, { status, headers: NO_STORE_HEADERS })
}

/**
 * `stage` downloads and verifies; `apply` quits the app and swaps in what was
 * staged. Splitting them keeps every recoverable failure on the side of the
 * boundary where the running app is still there to report it.
 */
export async function POST(request: Request): Promise<Response> {
	const body = (await request.json().catch(() => null)) as { action?: string } | null
	const action = body?.action
	if (action !== "stage" && action !== "apply") {
		return failure("Request must name an action of 'stage' or 'apply'.", 400)
	}

	if (action === "apply") {
		try {
			const staged = await applyStagedUpdate({ env: process.env })
			return Response.json(
				{ applying: staged.version, target: staged.target },
				{ headers: NO_STORE_HEADERS },
			)
		} catch (error) {
			return failure(error instanceof Error ? error.message : String(error), 409)
		}
	}

	const authorization = request.headers.get("authorization")
	if (!isBearerAuthorization(authorization)) {
		return failure("A signed-in bopen.ai session is required to download a release.", 401)
	}

	const check = await checkForUpdate({ env: process.env })
	if (check.state !== "available") {
		return failure(
			check.state === "unsupported"
				? check.reason
				: `No update is available to stage (${check.state}).`,
			409,
		)
	}

	try {
		const staged = await stageUpdate({
			env: process.env,
			authorization,
			expectedVersion: check.latest,
			channel: check.channel,
		})
		return Response.json({ staged: staged.version }, { headers: NO_STORE_HEADERS })
	} catch (error) {
		return failure(error instanceof Error ? error.message : String(error), 502)
	}
}
