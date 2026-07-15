import {
	AGENT_MASTER_CLIENT_ID,
	DEVICE_GRANT_TYPE,
	forwardBopenJson,
	NO_STORE_HEADERS,
} from "@/lib/bopen-device"

export async function POST(request: Request): Promise<Response> {
	const body = (await request.json().catch(() => null)) as { deviceCode?: unknown } | null
	if (!body || typeof body.deviceCode !== "string" || body.deviceCode.length === 0) {
		return Response.json(
			{ error: "invalid_request", error_description: "deviceCode is required" },
			{ status: 400, headers: NO_STORE_HEADERS },
		)
	}

	return forwardBopenJson("/api/auth/device/token", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			grant_type: DEVICE_GRANT_TYPE,
			device_code: body.deviceCode,
			client_id: AGENT_MASTER_CLIENT_ID,
		}),
	})
}
