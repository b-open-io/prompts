import {
	agentMasterJson,
	agentMasterOptions,
	requireAgentMasterMode,
	requireAllowedWebOrigin,
	requireConnectionToken,
} from "@/lib/agent-master-cors"
import { listLocalInterfaces } from "@/lib/agent-master-interfaces"

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
	const unauthorized = requireConnectionToken(request)
	if (unauthorized) return unauthorized
	return agentMasterJson(request, {
		interfaces: listLocalInterfaces(new URL(request.url).origin),
	})
}
