const BOPEN_ORIGIN = "https://bopen.ai"

export const AGENT_MASTER_CLIENT_ID = "agent-master"
export const DEVICE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code"
export const NO_STORE_HEADERS = {
	"Cache-Control": "private, no-store",
	Pragma: "no-cache",
}

export function isBearerAuthorization(value: string | null): value is string {
	return Boolean(value && /^Bearer\s+\S+$/.test(value))
}

export async function forwardBopenJson(path: string, init: RequestInit): Promise<Response> {
	try {
		const upstream = await fetch(`${BOPEN_ORIGIN}${path}`, {
			...init,
			cache: "no-store",
			headers: {
				Accept: "application/json",
				...(init.headers ?? {}),
			},
		})
		const body = await upstream.text()
		return new Response(body, {
			status: upstream.status,
			headers: {
				...NO_STORE_HEADERS,
				"Content-Type": upstream.headers.get("content-type") ?? "application/json",
			},
		})
	} catch {
		return Response.json(
			{ error: "bopen_unavailable", error_description: "Could not reach bopen.ai" },
			{ status: 502, headers: NO_STORE_HEADERS },
		)
	}
}
