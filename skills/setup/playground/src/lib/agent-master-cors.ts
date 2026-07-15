import { randomBytes, timingSafeEqual } from "node:crypto"

const DEFAULT_WEB_ORIGINS = new Set([
	"https://bopen.ai",
	"https://www.bopen.ai",
	"https://bopen-ai.localhost",
	"http://bopen-ai.localhost:1355",
])

const sessionState = globalThis as typeof globalThis & {
	__agentMasterConnectionToken?: string
}

export function isAgentMasterMode(): boolean {
	return process.env.BOPEN_AGENT_MASTER === "1"
}

export function agentMasterConnectionToken(): string {
	if (!sessionState.__agentMasterConnectionToken) {
		sessionState.__agentMasterConnectionToken = randomBytes(32).toString("base64url")
	}
	return sessionState.__agentMasterConnectionToken
}

function connectionTokenMatches(candidate: string | null): boolean {
	if (!candidate) return false
	const expected = Buffer.from(agentMasterConnectionToken())
	const supplied = Buffer.from(candidate)
	return expected.length === supplied.length && timingSafeEqual(expected, supplied)
}

function configuredOrigins(): Set<string> {
	const configured = process.env.AGENT_MASTER_WEB_ORIGINS
	if (!configured) return DEFAULT_WEB_ORIGINS
	return new Set(
		configured
			.split(",")
			.map((origin) => origin.trim())
			.filter(Boolean)
			.map((origin) => new URL(origin).origin),
	)
}

export function isAllowedWebOrigin(origin: string | null): boolean {
	if (!origin) return false
	try {
		return configuredOrigins().has(new URL(origin).origin)
	} catch {
		return false
	}
}

function corsHeaders(request: Request): Headers {
	const headers = new Headers({
		"Cache-Control": "no-store",
		Vary: "Origin",
	})
	const origin = request.headers.get("origin")
	if (!isAllowedWebOrigin(origin)) return headers
	if (!origin) return headers
	headers.set("Access-Control-Allow-Origin", origin)
	headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	headers.set(
		"Access-Control-Allow-Headers",
		"Content-Type, X-Bopen-Agent-Master, X-Bopen-Agent-Master-Token",
	)
	if (request.headers.get("access-control-request-private-network") === "true") {
		headers.set("Access-Control-Allow-Private-Network", "true")
	}
	return headers
}

export function agentMasterJson(
	request: Request,
	body: unknown,
	init: { status?: number } = {},
): Response {
	return Response.json(body, { status: init.status ?? 200, headers: corsHeaders(request) })
}

export function requireAllowedWebOrigin(request: Request): Response | undefined {
	if (isAllowedWebOrigin(request.headers.get("origin"))) return undefined
	return agentMasterJson(
		request,
		{ error: "Origin is not allowed to access Agent Master." },
		{ status: 403 },
	)
}

export function requireAgentMasterMode(request: Request): Response | undefined {
	if (isAgentMasterMode()) return undefined
	return agentMasterJson(request, { error: "Agent Master is not running." }, { status: 404 })
}

export function requireConnectionRequest(request: Request): Response | undefined {
	if (request.headers.get("x-bopen-agent-master") === "connect") return undefined
	return agentMasterJson(
		request,
		{ error: "Missing Agent Master connection header." },
		{ status: 400 },
	)
}

export function requireConnectionToken(request: Request): Response | undefined {
	if (connectionTokenMatches(request.headers.get("x-bopen-agent-master-token"))) {
		return undefined
	}
	return agentMasterJson(
		request,
		{ error: "Agent Master connection token is missing or invalid." },
		{ status: 401 },
	)
}

export function agentMasterOptions(request: Request): Response {
	if (!isAllowedWebOrigin(request.headers.get("origin"))) {
		return new Response(null, { status: 403, headers: corsHeaders(request) })
	}
	return new Response(null, { status: 204, headers: corsHeaders(request) })
}
