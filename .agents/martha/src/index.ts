import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	convertToModelMessages,
	gateway,
	generateText,
	streamText,
	type ToolSet,
	type UIMessage,
} from "ai";
import {
	createBashTool,
	experimental_createSkillTool as createSkillTool,
} from "bash-tool";
import { Hono } from "hono";
import {
	deregisterAgent,
	getDirectory,
	lookupAgent,
	registerAgent,
} from "./registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOUL = readFileSync(join(__dirname, "..", "SOUL.md"), "utf-8");

// Discover skills and create tools if skills/ directory exists
let agentTools: ToolSet = {};
let skillInstructions = "";

const skillsDir = join(__dirname, "..", "skills");
if (existsSync(skillsDir)) {
	const { skill, files, instructions } = await createSkillTool({
		skillsDirectory: skillsDir,
	});
	const { tools } = await createBashTool({
		files,
		extraInstructions: instructions,
	});
	agentTools = { skill, ...tools };
	skillInstructions = instructions;
	console.log(`Loaded skills from ${skillsDir}`);
}

const app = new Hono();
const registrySecret = process.env.REGISTRY_SHARED_SECRET;

const MAX_MESSAGE_LENGTH = 4000;

type ChatRole = "system" | "user" | "assistant" | "tool";

type ChatMessage = {
	role: ChatRole;
	content: string;
};

function parseMessage(value: unknown): ChatMessage | null {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return null;
	const { role, content } = value as Record<string, unknown>;
	if (
		role !== "system" &&
		role !== "user" &&
		role !== "assistant" &&
		role !== "tool"
	)
		return null;
	if (typeof content !== "string") return null;
	const trimmed = content.trim();
	if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return null;
	return { role, content: trimmed };
}

function isAuthorizedRegistryRequest(headerValue: string | undefined): boolean {
	if (!registrySecret) return true;
	return headerValue === registrySecret;
}

// --- Health ---

app.get("/", (c) =>
	c.json({
		name: "martha",
		displayName: "Martha",
		version: "0.1.0",
		status: "ok",
		role: "front-desk",
	}),
);

app.get("/api/heartbeat", (c) =>
	c.json({
		name: "martha",
		status: "ok",
		timestamp: new Date().toISOString(),
	}),
);

// --- Chat (Vercel AI SDK compatible) ---

app.post("/api/chat", async (c) => {
	let payload: unknown;
	try {
		payload = await c.req.json();
	} catch {
		return c.json({ success: false, error: "Invalid JSON body." }, 400);
	}

	if (
		typeof payload !== "object" ||
		payload === null ||
		!Array.isArray((payload as Record<string, unknown>).messages)
	) {
		return c.json(
			{
				success: false,
				error: "Expected { messages: Array<{ role, content }> }.",
			},
			400,
		);
	}

	const rawMessages = (payload as Record<string, unknown>)
		.messages as unknown[];
	const messages: ChatMessage[] = [];
	for (const raw of rawMessages) {
		const msg = parseMessage(raw);
		if (!msg) {
			return c.json({ success: false, error: "Invalid message format." }, 400);
		}
		messages.push(msg);
	}

	// Build live registry context to inject alongside SOUL
	const liveAgents = getDirectory().filter((a) => a.status === "online");
	const registryContext =
		liveAgents.length > 0
			? `\n\n## Currently Online Agents\n${liveAgents.map((a) => `- **${a.displayName}** (${a.id}) — ${a.endpoint}`).join("\n")}`
			: "";

	const systemPrompt =
		SOUL +
		registryContext +
		(skillInstructions ? `\n\n${skillInstructions}` : "");

	try {
		const uiMessages = messages as unknown as UIMessage[];
		const modelMessages = await convertToModelMessages(uiMessages, {
			tools: agentTools,
		});
		const result = streamText({
			model: gateway("anthropic/claude-sonnet-4.6"),
			system: systemPrompt,
			tools: agentTools,
			messages: modelMessages,
		});

		return result.toUIMessageStreamResponse();
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error("Chat error:", message);
		return c.json({ success: false, error: message }, 502);
	}
});

// --- Registry ---

app.get("/directory", (c) => c.json(getDirectory()));

app.get("/lookup", (c) => {
	const query = c.req.query("agent");
	if (!query) {
		return c.json({ success: false, error: "Missing ?agent= parameter." }, 400);
	}
	const result = lookupAgent(query);
	if (!result) {
		return c.json(
			{ success: false, error: `No agent found for "${query}".` },
			404,
		);
	}
	return c.json(result);
});

app.post("/register", async (c) => {
	if (!isAuthorizedRegistryRequest(c.req.header("x-registry-secret"))) {
		return c.json({ success: false, error: "Unauthorized." }, 401);
	}

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ success: false, error: "Invalid JSON body." }, 400);
	}

	if (typeof body !== "object" || body === null) {
		return c.json({ success: false, error: "Expected JSON object." }, 400);
	}

	const { id, displayName, endpoint } = body as Record<string, unknown>;
	if (
		typeof id !== "string" ||
		typeof displayName !== "string" ||
		typeof endpoint !== "string"
	) {
		return c.json(
			{
				success: false,
				error:
					"Expected { id: string, displayName: string, endpoint: string }.",
			},
			400,
		);
	}

	const entry = registerAgent({
		id: id.trim(),
		displayName: displayName.trim(),
		endpoint: endpoint.trim(),
	});
	return c.json({ success: true, agent: entry }, 201);
});

app.post("/deregister", async (c) => {
	if (!isAuthorizedRegistryRequest(c.req.header("x-registry-secret"))) {
		return c.json({ success: false, error: "Unauthorized." }, 401);
	}

	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ success: false, error: "Invalid JSON body." }, 400);
	}

	const { id } = (body ?? {}) as Record<string, unknown>;
	if (typeof id !== "string") {
		return c.json({ success: false, error: "Expected { id: string }." }, 400);
	}

	const success = deregisterAgent(id.trim());
	if (!success) {
		return c.json({ success: false, error: `Agent "${id}" not found.` }, 404);
	}
	return c.json({ success: true });
});

// --- P2P Messages ---

type P2PMessageRequest = {
	from: { bapId: string; botName: string };
	message: string;
	conversationId?: string;
	signature: string;
	publicKey: string;
	timestamp: number;
};

function parseP2PMessage(value: unknown): P2PMessageRequest | null {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return null;
	const { from, message, conversationId, signature, publicKey, timestamp } =
		value as Record<string, unknown>;
	if (typeof from !== "object" || from === null || Array.isArray(from))
		return null;
	const fromObj = from as Record<string, unknown>;
	if (typeof fromObj.bapId !== "string" || typeof fromObj.botName !== "string")
		return null;
	if (typeof message !== "string") return null;
	if (typeof signature !== "string") return null;
	if (typeof publicKey !== "string") return null;
	if (typeof timestamp !== "number") return null;

	const trimmedMessage = (message as string).trim();
	if (!trimmedMessage || trimmedMessage.length > MAX_MESSAGE_LENGTH)
		return null;

	return {
		from: {
			bapId: fromObj.bapId as string,
			botName: fromObj.botName as string,
		},
		message: trimmedMessage,
		conversationId:
			typeof conversationId === "string" ? conversationId : undefined,
		signature: signature as string,
		publicKey: publicKey as string,
		timestamp: timestamp as number,
	};
}

function hasValidSignature(req: P2PMessageRequest): boolean {
	return (
		typeof req.signature === "string" &&
		req.signature.length > 0 &&
		typeof req.publicKey === "string" &&
		req.publicKey.length > 0 &&
		typeof req.timestamp === "number" &&
		req.timestamp > 0
	);
}

app.post("/api/messages", async (c) => {
	let payload: unknown;
	try {
		const raw = await c.req.text();
		payload = JSON.parse(raw);
	} catch (err) {
		const detail = err instanceof Error ? err.message : "unknown";
		return c.json(
			{ success: false, error: `Invalid JSON body: ${detail}` },
			400,
		);
	}

	const request = parseP2PMessage(payload);
	if (!request) {
		return c.json(
			{
				success: false,
				error:
					"Expected { from: { bapId, botName }, message, signature, publicKey, timestamp }.",
			},
			400,
		);
	}

	if (!hasValidSignature(request)) {
		return c.json({ success: false, error: "Invalid signature." }, 401);
	}

	// Process via AI if available, otherwise acknowledge
	let reply = `Message received from ${request.from.botName}. Martha acknowledges.`;

	try {
		const systemPrompt =
			SOUL +
			"\n\nYou are receiving a P2P message from another bot. Respond briefly and helpfully.";
		const result = await generateText({
			model: gateway("anthropic/claude-haiku-4.5"),
			system: systemPrompt,
			prompt: `[From ${request.from.botName}]: ${request.message}`,
			maxTokens: 300,
		});

		if (result.text.trim()) {
			reply = result.text.trim();
		}
	} catch (err) {
		console.error("P2P message AI reply error:", err);
	}

	return c.json({
		success: true,
		from: { bapId: "martha", botName: "martha" },
		reply,
		conversationId: request.conversationId ?? null,
		timestamp: Math.floor(Date.now() / 1000),
	});
});

// --- Start ---

const defaultPort = 3000;
const parsedPort = Number.parseInt(process.env.PORT ?? `${defaultPort}`, 10);
const port = Number.isNaN(parsedPort) ? defaultPort : parsedPort;

export default {
	port,
	fetch: app.fetch,
};
