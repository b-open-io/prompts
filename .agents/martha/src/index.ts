import { gateway, streamText } from "ai";
import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	getDirectory,
	lookupAgent,
	registerAgent,
	deregisterAgent,
} from "./registry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOUL = readFileSync(join(__dirname, "..", "SOUL.md"), "utf-8");

const app = new Hono();

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
			return c.json(
				{ success: false, error: "Invalid message format." },
				400,
			);
		}
		messages.push(msg);
	}

	// Build live registry context to inject alongside SOUL
	const liveAgents = getDirectory().filter((a) => a.status === "online");
	const registryContext =
		liveAgents.length > 0
			? `\n\n## Currently Online Agents\n${liveAgents.map((a) => `- **${a.displayName}** (${a.id}) — ${a.endpoint}`).join("\n")}`
			: "";

	const systemPrompt = SOUL + registryContext;

	try {
		const result = streamText({
			model: gateway("anthropic/claude-sonnet-4.6"),
			system: systemPrompt,
			messages: messages.map((m) => ({ role: m.role, content: m.content })),
		});
		return result.toDataStreamResponse();
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error("Chat error:", message);
		return c.json(
			{ success: false, error: message },
			502,
		);
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
		return c.json({ success: false, error: `No agent found for "${query}".` }, 404);
	}
	return c.json(result);
});

app.post("/register", async (c) => {
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
				error: "Expected { id: string, displayName: string, endpoint: string }.",
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
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ success: false, error: "Invalid JSON body." }, 400);
	}

	const { id } = (body ?? {}) as Record<string, unknown>;
	if (typeof id !== "string") {
		return c.json(
			{ success: false, error: "Expected { id: string }." },
			400,
		);
	}

	const success = deregisterAgent(id.trim());
	if (!success) {
		return c.json({ success: false, error: `Agent "${id}" not found.` }, 404);
	}
	return c.json({ success: true });
});

// --- Start ---

const defaultPort = 3000;
const parsedPort = Number.parseInt(process.env.PORT ?? `${defaultPort}`, 10);
const port = Number.isNaN(parsedPort) ? defaultPort : parsedPort;

export default {
	port,
	fetch: app.fetch,
};
