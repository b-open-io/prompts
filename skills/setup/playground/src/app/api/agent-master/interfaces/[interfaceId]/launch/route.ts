import {
	agentMasterJson,
	agentMasterOptions,
	requireAgentMasterMode,
	requireAllowedWebOrigin,
	requireConnectionToken,
} from "@/lib/agent-master-cors"
import { launchLocalInterface } from "@/lib/agent-master-interfaces"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function OPTIONS(request: Request): Response {
	const unavailable = requireAgentMasterMode(request)
	if (unavailable) return unavailable
	return agentMasterOptions(request)
}

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ interfaceId: string }> },
): Promise<Response> {
	const unavailable = requireAgentMasterMode(request)
	if (unavailable) return unavailable
	const denied = requireAllowedWebOrigin(request)
	if (denied) return denied
	const unauthorized = requireConnectionToken(request)
	if (unauthorized) return unauthorized

	const { interfaceId } = await params
	try {
		const launched = await launchLocalInterface(new URL(request.url).origin, interfaceId)
		return agentMasterJson(request, launched)
	} catch (error) {
		return agentMasterJson(
			request,
			{ error: error instanceof Error ? error.message : "Unable to launch interface." },
			{ status: 503 },
		)
	}
}
