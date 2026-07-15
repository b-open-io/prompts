import { forwardBopenJson, isBearerAuthorization, NO_STORE_HEADERS } from "@/lib/bopen-device"

export async function GET(request: Request): Promise<Response> {
	const authorization = request.headers.get("authorization")
	if (!isBearerAuthorization(authorization)) {
		return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS })
	}

	return forwardBopenJson("/api/me/packs", {
		method: "GET",
		headers: { Authorization: authorization },
	})
}
