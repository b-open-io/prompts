import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	convertToModelMessages,
	gateway,
	streamText,
	tool,
	type UIMessage,
	zodSchema,
} from "ai";
import { Hono } from "hono";
import { z } from "zod";
import {
	type AccountManagerContext,
	getDocuments,
	lookupAvailability,
	lookupSpecialist,
	subscribeNewsletter,
	upsertCustomer,
} from "./bopen-client.js";
import { getSystemPrompt } from "./prompt.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const soul = readFileSync(join(__dirname, "..", "SOUL.md"), "utf-8");

const contextSchema = z.object({
	source: z.string().optional(),
	currentPage: z.string().optional(),
	bookingStep: z.string().nullable().optional(),
	isAuthenticated: z.boolean().optional(),
	guestId: z.string().optional(),
	customerSummary: z
		.object({
			id: z.string().optional(),
			email: z.string().optional(),
			name: z.string().optional(),
			company: z.string().optional(),
		})
		.nullable()
		.optional(),
});

const bodySchema = z.object({
	messages: z.array(z.custom<UIMessage>()),
	context: contextSchema.optional(),
});

function createTools(context: AccountManagerContext) {
	return {
		navigate: tool({
			description:
				"Navigate the user to any page on bOpen.io. Use this when the user wants to go somewhere or when you recommend a specific page.",
			inputSchema: zodSchema(
				z.object({
					destination: z
						.string()
						.describe(
							"A route path or natural language destination on bOpen.io",
						),
				}),
			),
		}),
		openExternal: tool({
			description:
				"Open a whitelisted external partner or ecosystem URL in a new tab.",
			inputSchema: zodSchema(
				z.object({
					url: z.string().url().describe("Whitelisted external URL"),
				}),
			),
		}),
		getUserBookings: tool({
			description:
				"Get the visitor's bookings. Use when they ask about scheduled calls or appointments.",
			inputSchema: zodSchema(
				z.object({
					filter: z.enum(["upcoming", "past", "all"]).default("all"),
					email: z.string().email().optional(),
				}),
			),
			execute: async ({ filter, email }) =>
				upsertCustomer("bookings", { filter, email }),
		}),
		getAvailableSlots: tool({
			description: "Get available time slots for booking a discovery call.",
			inputSchema: zodSchema(
				z.object({
					startDate: z.string().describe("YYYY-MM-DD"),
					endDate: z.string().optional().describe("YYYY-MM-DD"),
				}),
			),
			execute: async ({ startDate, endDate }) =>
				lookupAvailability(startDate, endDate),
		}),
		identifyUser: tool({
			description:
				"Identify or register a visitor by email when they share it in chat.",
			inputSchema: zodSchema(
				z.object({
					email: z.string().email(),
					name: z.string().optional(),
					company: z.string().optional(),
				}),
			),
			execute: async ({ email, name, company }) =>
				upsertCustomer("identify", {
					email,
					name,
					company,
					guestId: context.guestId,
				}),
		}),
		updateUserProfile: tool({
			description:
				"Update a visitor's profile information after they identify themselves.",
			inputSchema: zodSchema(
				z.object({
					email: z.string().email(),
					name: z.string().optional(),
					company: z.string().optional(),
					phone: z.string().optional(),
				}),
			),
			execute: async ({ email, name, company, phone }) =>
				upsertCustomer("update", { email, name, company, phone }),
		}),
		requestDocumentUpload: tool({
			description:
				"Ask the visitor to upload a project brief, contract, or asset.",
			inputSchema: zodSchema(
				z.object({
					purpose: z.string(),
					fileTypes: z.array(z.string()).optional(),
				}),
			),
			execute: async ({ purpose, fileTypes = ["PDF", "DOCX", "TXT"] }) => ({
				action: "request_upload",
				purpose,
				acceptedTypes: fileTypes,
				message: `Please upload your ${purpose}. Accepted formats: ${fileTypes.join(", ")}`,
			}),
		}),
		getUploadedDocuments: tool({
			description:
				"List documents the visitor has uploaded. Requires their email.",
			inputSchema: zodSchema(
				z.object({
					email: z.string().email(),
				}),
			),
			execute: async ({ email }) => getDocuments("list", { email }),
		}),
		readDocument: tool({
			description:
				"Read or view the contents of an uploaded document by document ID.",
			inputSchema: zodSchema(
				z.object({
					documentId: z.string(),
				}),
			),
			execute: async ({ documentId }) => getDocuments("read", { documentId }),
			toModelOutput: ({ output }) => {
				if (output.type === "image" && output.url && output.filename) {
					return {
						type: "content" as const,
						value: [
							{
								type: "text" as const,
								text: `Viewing document: ${output.filename}`,
							},
							{ type: "image-url" as const, url: output.url },
						],
					};
				}

				if (output.type === "text" && output.content && output.filename) {
					return {
						type: "text" as const,
						value: `Contents of ${output.filename}:\n\n${output.content}`,
					};
				}

				if (
					output.type === "unsupported" &&
					output.url &&
					output.filename &&
					output.mimeType
				) {
					return {
						type: "text" as const,
						value: `Document "${output.filename}" (${output.mimeType}) cannot be read inline. Download: ${output.url}`,
					};
				}

				return {
					type: "text" as const,
					value:
						typeof output.message === "string"
							? output.message
							: "Document could not be read.",
				};
			},
		}),
		subscribeNewsletter: tool({
			description:
				"Subscribe the visitor to the newsletter when they ask for updates.",
			inputSchema: zodSchema(
				z.object({
					email: z.string().email(),
				}),
			),
			execute: async ({ email }) => subscribeNewsletter(email, context.guestId),
		}),
		lookupSpecialist: tool({
			description:
				"Ask Martha, the internal directory bot, which specialist handles a topic or whether a live endpoint exists.",
			inputSchema: zodSchema(
				z.object({
					query: z.string().describe("Specialty, agent name, or task"),
				}),
			),
			execute: async ({ query }) => lookupSpecialist(query),
		}),
	};
}

const app = new Hono();

app.get("/", (c) =>
	c.json({
		name: "account-manager",
		displayName: "Kurt",
		version: "0.1.0",
		status: "ok",
		role: "account-manager",
	}),
);

app.get("/api/heartbeat", (c) =>
	c.json({
		name: "account-manager",
		status: "ok",
		timestamp: new Date().toISOString(),
	}),
);

app.post("/api/chat", async (c) => {
	let parsedBody: z.infer<typeof bodySchema>;

	try {
		const payload = await c.req.json();
		parsedBody = bodySchema.parse(payload);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Invalid chat payload.";
		return c.json({ success: false, error: message }, 400);
	}

	const context = parsedBody.context ?? {};
	const system = `${soul}\n\n${getSystemPrompt(context)}`;

	try {
		const modelMessages = await convertToModelMessages(parsedBody.messages);
		const result = streamText({
			model: gateway("anthropic/claude-sonnet-4.5"),
			system,
			messages: modelMessages,
			tools: createTools(context),
		});

		return result.toUIMessageStreamResponse({
			onError: (error) => {
				console.error("Account manager stream error:", error);
				return error instanceof Error ? error.message : "Stream error";
			},
		});
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Failed to process chat request.";
		console.error("Account manager chat error:", message);
		return c.json({ success: false, error: message }, 502);
	}
});

const defaultPort = 3000;
const parsedPort = Number.parseInt(process.env.PORT ?? `${defaultPort}`, 10);
const port = Number.isNaN(parsedPort) ? defaultPort : parsedPort;

export default {
	port,
	fetch: app.fetch,
};
