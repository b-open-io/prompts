import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "registry.json");

export type AgentEntry = {
	id: string;
	displayName: string;
	endpoint: string;
	status: "online" | "offline";
	lastHeartbeat: string;
};

let agents: AgentEntry[] = [];

function loadFromDisk(): AgentEntry[] {
	if (!existsSync(DATA_PATH)) return [];
	try {
		return JSON.parse(readFileSync(DATA_PATH, "utf-8"));
	} catch {
		return [];
	}
}

function saveToDisk(): void {
	try {
		writeFileSync(DATA_PATH, JSON.stringify(agents, null, 2));
	} catch {
		// Sandbox filesystem may be read-only — that's fine, we keep in-memory
	}
}

// Initialize from seed data on cold start
agents = loadFromDisk();

export function getDirectory(): AgentEntry[] {
	return agents;
}

export function lookupAgent(query: string): AgentEntry | undefined {
	const q = query.toLowerCase();
	return agents.find(
		(a) =>
			a.id.toLowerCase().includes(q) ||
			a.displayName.toLowerCase().includes(q),
	);
}

export function registerAgent(entry: {
	id: string;
	displayName: string;
	endpoint: string;
}): AgentEntry {
	const existing = agents.find((a) => a.id === entry.id);
	const now = new Date().toISOString();

	if (existing) {
		existing.endpoint = entry.endpoint;
		existing.displayName = entry.displayName;
		existing.status = "online";
		existing.lastHeartbeat = now;
		saveToDisk();
		return existing;
	}

	const newEntry: AgentEntry = {
		id: entry.id,
		displayName: entry.displayName,
		endpoint: entry.endpoint,
		status: "online",
		lastHeartbeat: now,
	};
	agents.push(newEntry);
	saveToDisk();
	return newEntry;
}

export function deregisterAgent(id: string): boolean {
	const agent = agents.find((a) => a.id === id);
	if (!agent) return false;
	agent.status = "offline";
	saveToDisk();
	return true;
}
