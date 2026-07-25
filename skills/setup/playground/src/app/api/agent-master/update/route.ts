import { checkForUpdate } from "@/lib/app-update"
import { currentInstallState, stagedUpdate } from "@/lib/app-update-install"
import { NO_STORE_HEADERS } from "@/lib/bopen-device"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(): Promise<Response> {
	const check = await checkForUpdate({ env: process.env })
	return Response.json(
		{ check, install: currentInstallState(), staged: stagedUpdate()?.version ?? null },
		{ headers: NO_STORE_HEADERS },
	)
}
