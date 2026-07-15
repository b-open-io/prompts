import { afterEach, describe, expect, test } from "bun:test"
import {
	agentMasterConnectionToken,
	isAllowedWebOrigin,
	requireAgentMasterMode,
	requireConnectionRequest,
	requireConnectionToken,
} from "./agent-master-cors"

const originalOrigins = process.env.AGENT_MASTER_WEB_ORIGINS
const originalMode = process.env.BOPEN_AGENT_MASTER

afterEach(() => {
	if (originalOrigins === undefined) delete process.env.AGENT_MASTER_WEB_ORIGINS
	else process.env.AGENT_MASTER_WEB_ORIGINS = originalOrigins
	if (originalMode === undefined) delete process.env.BOPEN_AGENT_MASTER
	else process.env.BOPEN_AGENT_MASTER = originalMode
})

describe("Agent Master connection capability", () => {
	test("is unavailable unless the setup server was launched in Agent Master mode", () => {
		delete process.env.BOPEN_AGENT_MASTER
		const request = new Request("http://agent-master.localhost/api/agent-master/status")
		expect(requireAgentMasterMode(request)?.status).toBe(404)
		process.env.BOPEN_AGENT_MASTER = "1"
		expect(requireAgentMasterMode(request)).toBeUndefined()
	})

	test("requires an explicit connection handshake", () => {
		const missing = new Request("http://agent-master.localhost/api/agent-master/status")
		const present = new Request("http://agent-master.localhost/api/agent-master/status", {
			headers: { "X-Bopen-Agent-Master": "connect" },
		})
		expect(requireConnectionRequest(missing)?.status).toBe(400)
		expect(requireConnectionRequest(present)).toBeUndefined()
	})

	test("accepts only the per-process connection token", () => {
		const invalid = new Request("http://agent-master.localhost/api/agent-master/interfaces", {
			headers: { "X-Bopen-Agent-Master-Token": "not-the-token" },
		})
		const valid = new Request("http://agent-master.localhost/api/agent-master/interfaces", {
			headers: { "X-Bopen-Agent-Master-Token": agentMasterConnectionToken() },
		})
		expect(requireConnectionToken(invalid)?.status).toBe(401)
		expect(requireConnectionToken(valid)).toBeUndefined()
	})
})

describe("Agent Master web origins", () => {
	test("allows production and named local bopen origins", () => {
		expect(isAllowedWebOrigin("https://bopen.ai")).toBe(true)
		expect(isAllowedWebOrigin("http://bopen-ai.localhost:1355")).toBe(true)
	})

	test("rejects lookalikes and unrelated sites", () => {
		expect(isAllowedWebOrigin("https://bopen.ai.evil.example")).toBe(false)
		expect(isAllowedWebOrigin("https://example.com")).toBe(false)
		expect(isAllowedWebOrigin(null)).toBe(false)
	})

	test("supports an explicit deployment allowlist", () => {
		process.env.AGENT_MASTER_WEB_ORIGINS = "https://preview.bopen.ai"
		expect(isAllowedWebOrigin("https://preview.bopen.ai/path")).toBe(true)
		expect(isAllowedWebOrigin("https://bopen.ai")).toBe(false)
	})
})
