import {
	agentMasterConnectionToken,
	agentMasterJson,
	agentMasterOptions,
	requireAgentMasterMode,
	requireAllowedWebOrigin,
	requireConnectionRequest,
} from "@/lib/agent-master-cors"
import { AGENT_MASTER_PROTOCOL_VERSION, listLocalInterfaces } from "@/lib/agent-master-interfaces"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function OPTIONS(request: Request): Response {
	const unavailable = requireAgentMasterMode(request)
	if (unavailable) return unavailable
	return agentMasterOptions(request)
}

export function GET(request: Request): Response {
	const unavailable = requireAgentMasterMode(request)
	if (unavailable) return unavailable
	const denied = requireAllowedWebOrigin(request)
	if (denied) return denied
	const invalidConnection = requireConnectionRequest(request)
	if (invalidConnection) return invalidConnection

	return agentMasterJson(request, {
		product: "agent-master",
		protocolVersion: AGENT_MASTER_PROTOCOL_VERSION,
		status: "ready",
		connectionToken: agentMasterConnectionToken(),
		interfaces: listLocalInterfaces(new URL(request.url).origin),
	})
}
