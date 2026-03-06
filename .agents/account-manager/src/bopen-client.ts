const BOPEN_IO_BASE_URL = process.env.BOPEN_IO_BASE_URL;
const BOPEN_AGENT_TOKEN = process.env.BOPEN_AGENT_TOKEN;
const MARTHA_URL = process.env.MARTHA_URL;

type RequestOptions = {
	method?: string;
	body?: unknown;
	query?: URLSearchParams;
};

function requireEnv(value: string | undefined, name: string): string {
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

async function requestJson<T>(
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const baseUrl = requireEnv(BOPEN_IO_BASE_URL, "BOPEN_IO_BASE_URL");
	const token = requireEnv(BOPEN_AGENT_TOKEN, "BOPEN_AGENT_TOKEN");
	const url = new URL(path, baseUrl);

	if (options.query) {
		url.search = options.query.toString();
	}

	const response = await fetch(url, {
		method: options.method ?? "GET",
		headers: {
			"Content-Type": "application/json",
			"x-bopen-agent-token": token,
		},
		body: options.body ? JSON.stringify(options.body) : undefined,
	});

	const text = await response.text();
	const data = text ? (JSON.parse(text) as T) : ({} as T);
	if (!response.ok) {
		const message =
			typeof data === "object" &&
			data !== null &&
			"error" in data &&
			typeof (data as { error: unknown }).error === "string"
				? (data as { error: string }).error
				: `Service request failed with status ${response.status}`;
		throw new Error(message);
	}

	return data;
}

export type CustomerSummary = {
	id?: string;
	email?: string;
	name?: string;
	company?: string;
};

export type AccountManagerContext = {
	source?: string;
	currentPage?: string;
	bookingStep?: string | null;
	isAuthenticated?: boolean;
	guestId?: string;
	customerSummary?: CustomerSummary | null;
};

export async function lookupAvailability(startDate: string, endDate?: string) {
	const query = new URLSearchParams({ startDate });
	if (endDate) {
		query.set("endDate", endDate);
	}

	return requestJson<{
		success: boolean;
		availableSlots: Array<{ date: string; times: string[] }>;
		timezone: string;
		message: string;
	}>("/api/agent/availability", { query });
}

export async function upsertCustomer(
	action: "identify" | "update" | "bookings",
	input: Record<string, unknown>,
) {
	return requestJson<{
		success: boolean;
		message?: string;
		customerId?: string;
		bookings?: Array<{
			id: string;
			date: string;
			time: string;
			duration: number;
			status: string;
			notes: string | null;
		}>;
		count?: number;
		needsEmail?: boolean;
		updated?: string[];
	}>("/api/agent/customer", {
		method: "POST",
		body: { action, ...input },
	});
}

export async function subscribeNewsletter(email: string, guestId?: string) {
	return requestJson<{
		success: boolean;
		alreadySubscribed?: boolean;
		message: string;
	}>("/api/agent/newsletter", {
		method: "POST",
		body: { email, guestId },
	});
}

export async function getDocuments(
	action: "list" | "read",
	input: Record<string, unknown>,
) {
	return requestJson<{
		success?: boolean;
		message?: string;
		count?: number;
		documents?: Array<{
			id: string;
			filename: string;
			purpose: string | null;
			uploadedAt: string;
		}>;
		type?: "image" | "text" | "unsupported" | "error";
		url?: string;
		mimeType?: string;
		filename?: string;
		content?: string;
	}>("/api/agent/documents", {
		method: "POST",
		body: { action, ...input },
	});
}

export async function lookupSpecialist(query: string) {
	if (!MARTHA_URL) {
		return {
			success: false,
			message: "Martha is not configured in this environment.",
		};
	}

	const url = new URL("/lookup", MARTHA_URL);
	url.searchParams.set("agent", query);

	const response = await fetch(url);
	const text = await response.text();
	const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};

	if (!response.ok) {
		return {
			success: false,
			message:
				typeof data.error === "string"
					? data.error
					: "Martha could not resolve that specialist right now.",
		};
	}

	return {
		success: true,
		agent: data,
	};
}
