import { AGENT_MASTER_CLIENT_ID, forwardBopenJson } from "@/lib/bopen-device"

export async function POST(): Promise<Response> {
	return forwardBopenJson("/api/auth/device/code", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ client_id: AGENT_MASTER_CLIENT_ID }),
	})
}
