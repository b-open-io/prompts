#!/usr/bin/env bun
/**
 * chrome-cdp — Bun-native Chrome DevTools Protocol CLI.
 *
 * Connects directly to Chrome via WebSocket using the DevToolsActivePort file.
 * Per-tab persistent daemon model avoids repeated "Allow debugging" modals.
 * Zero npm dependencies — uses Bun's built-in WebSocket and Unix sockets.
 *
 * Usage:
 *   bun cdp.ts list                      — show all open tabs
 *   bun cdp.ts snap <target>             — accessibility tree
 *   bun cdp.ts eval <target> "js code"   — execute JavaScript
 *   bun cdp.ts nav <target> <url>        — navigate to URL
 *   bun cdp.ts click <target> "selector" — click element by CSS selector
 *   bun cdp.ts type <target> "text"      — type text (cross-origin safe)
 *   bun cdp.ts shot <target>             — screenshot to /tmp/screenshot.png
 *   bun cdp.ts html <target> [selector]  — extract HTML
 *   bun cdp.ts stop [target]             — terminate daemon(s)
 *
 * <target> is a unique prefix of the targetId shown by `list`.
 *
 * Inspired by pasky/chrome-cdp-skill. Adapted for Bun runtime.
 */

import { existsSync, unlinkSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

// --- Constants ---
const TIMEOUT = 15_000;
const NAVIGATION_TIMEOUT = 30_000;
const IDLE_TIMEOUT = 20 * 60 * 1000; // 20 minutes
const DAEMON_CONNECT_RETRIES = 20;
const DAEMON_CONNECT_DELAY = 300; // ms
const MIN_TARGET_PREFIX_LEN = 8;
const SOCK_PREFIX = "/tmp/cdp-";
const PAGES_CACHE = "/tmp/cdp-pages.json";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- DevToolsActivePort discovery ---

function getDevToolsActivePortPath(): string {
	const candidates = [
		resolve(homedir(), "Library/Application Support/Google/Chrome/DevToolsActivePort"),
		resolve(homedir(), ".config/google-chrome/DevToolsActivePort"),
		resolve(homedir(), ".config/chromium/DevToolsActivePort"),
	];
	const found = candidates.find((p) => existsSync(p));
	if (!found) {
		throw new Error(
			`Chrome remote debugging not enabled.\n\n` +
				`Enable it:\n` +
				`  1. Open chrome://inspect/#remote-debugging in Chrome\n` +
				`  2. Toggle the switch to enable\n\n` +
				`Or run: open "chrome://inspect/#remote-debugging"\n\n` +
				`Checked paths:\n${candidates.map((c) => `  ${c}`).join("\n")}`,
		);
	}
	return found;
}

function getWsUrl(): string {
	const portFile = getDevToolsActivePortPath();
	const content = Bun.file(portFile).text();
	// DevToolsActivePort is synchronous-read critical — use Node compat
	const text = require("node:fs").readFileSync(portFile, "utf8").trim();
	const lines = text.split("\n");
	if (lines.length < 2) {
		throw new Error(`Invalid DevToolsActivePort content: ${text}`);
	}
	return `ws://127.0.0.1:${lines[0]}${lines[1]}`;
}

// --- Minimal CDP WebSocket Client ---

type CDPHandler = (params: Record<string, unknown>) => void;

class CDP {
	private ws: WebSocket;
	private nextId = 1;
	private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
	private eventHandlers = new Map<string, Set<CDPHandler>>();
	private ready: Promise<void>;

	constructor(url: string) {
		this.ws = new WebSocket(url);
		this.ready = new Promise((resolve, reject) => {
			this.ws.onopen = () => resolve();
			this.ws.onerror = (e) => reject(new Error(`WebSocket error: ${e}`));
		});
		this.ws.onmessage = (event) => {
			const msg = JSON.parse(String(event.data));
			if (msg.id !== undefined) {
				const p = this.pending.get(msg.id);
				if (p) {
					this.pending.delete(msg.id);
					if (msg.error) p.reject(new Error(`CDP error: ${JSON.stringify(msg.error)}`));
					else p.resolve(msg.result);
				}
			} else if (msg.method) {
				const handlers = this.eventHandlers.get(msg.method);
				if (handlers) {
					for (const h of handlers) h(msg.params ?? {});
				}
			}
		};
		this.ws.onclose = () => {
			for (const [, p] of this.pending) {
				p.reject(new Error("WebSocket closed"));
			}
			this.pending.clear();
		};
	}

	async send(method: string, params: Record<string, unknown> = {}, timeout = TIMEOUT, sessionId?: string): Promise<any> {
		await this.ready;
		const id = this.nextId++;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`CDP timeout: ${method} (${timeout}ms)`));
			}, timeout);
			this.pending.set(id, {
				resolve: (v) => {
					clearTimeout(timer);
					resolve(v);
				},
				reject: (e) => {
					clearTimeout(timer);
					reject(e);
				},
			});
			const msg: Record<string, unknown> = { id, method, params };
			if (sessionId) msg.sessionId = sessionId;
			this.ws.send(JSON.stringify(msg));
		});
	}

	on(method: string, handler: CDPHandler) {
		if (!this.eventHandlers.has(method)) this.eventHandlers.set(method, new Set());
		this.eventHandlers.get(method)!.add(handler);
	}

	waitForEvent(method: string, timeout = TIMEOUT): { promise: Promise<Record<string, unknown>>; cancel: () => void } {
		let cancel = () => {};
		const promise = new Promise<Record<string, unknown>>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.eventHandlers.get(method)?.delete(handler);
				reject(new Error(`Timeout waiting for ${method}`));
			}, timeout);
			const handler: CDPHandler = (params) => {
				clearTimeout(timer);
				this.eventHandlers.get(method)?.delete(handler);
				resolve(params);
			};
			cancel = () => {
				clearTimeout(timer);
				this.eventHandlers.get(method)?.delete(handler);
			};
			this.on(method, handler);
		});
		return { promise, cancel };
	}

	close() {
		this.ws.close();
	}
}

// --- Tab Discovery ---

interface TargetInfo {
	targetId: string;
	type: string;
	title: string;
	url: string;
}

async function getPages(cdp: CDP): Promise<TargetInfo[]> {
	const { targetInfos } = (await cdp.send("Target.getTargets")) as { targetInfos: TargetInfo[] };
	return targetInfos.filter((t) => t.type === "page" && !t.url.startsWith("chrome://") && !t.url.startsWith("chrome-extension://"));
}

// --- Target Prefix Resolution ---

function resolvePrefix(prefix: string, candidates: string[]): string {
	const upper = prefix.toUpperCase();
	const matches = candidates.filter((c) => c.toUpperCase().startsWith(upper));
	if (matches.length === 0) throw new Error(`No target matching prefix "${prefix}". Run \`cdp list\` first.`);
	if (matches.length > 1) throw new Error(`Ambiguous prefix "${prefix}" — matches ${matches.length} targets. Use more characters.`);
	return matches[0];
}

function getDisplayPrefixLength(targetIds: string[]): number {
	if (targetIds.length === 0) return MIN_TARGET_PREFIX_LEN;
	const maxLen = Math.max(...targetIds.map((id) => id.length));
	for (let len = MIN_TARGET_PREFIX_LEN; len <= maxLen; len++) {
		const prefixes = new Set(targetIds.map((id) => id.slice(0, len).toUpperCase()));
		if (prefixes.size === targetIds.length) return len;
	}
	return maxLen;
}

function sockPath(targetId: string): string {
	return `${SOCK_PREFIX}${targetId}.sock`;
}

// --- Daemon IPC ---

async function sendToDaemon(socketPath: string, cmd: string, args: unknown[] = [], timeout = TIMEOUT): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const id = Date.now();
		let buffer = "";
		let settled = false;

		async function tryParse() {
			const parts = buffer.split("\n");
			buffer = parts.pop() ?? "";
			for (const line of parts) {
				if (!line.trim()) continue;
				try {
					const msg = JSON.parse(line);
					if (msg.id === id && !settled) {
						settled = true;
						if (msg.file) {
							// Large response stored in temp file
							const content = await Bun.file(msg.file).text();
							try { unlinkSync(msg.file); } catch {}
							if (msg.ok) resolve(content);
							else reject(new Error(content));
						} else if (msg.ok) {
							resolve(msg.result);
						} else {
							reject(new Error(msg.error ?? "Daemon error"));
						}
						return true;
					}
				} catch {}
			}
			return false;
		}

		const socket = Bun.connect({
			unix: socketPath,
			socket: {
				data(socket, data) {
					buffer += new TextDecoder().decode(data);
					tryParse().then((done) => { if (done) socket.end(); });
				},
				error(socket, error) {
					if (!settled) { settled = true; reject(error); }
				},
				close() {},
				connectError(socket, error) {
					if (!settled) { settled = true; reject(error); }
				},
				open(socket) {
					socket.write(JSON.stringify({ id, cmd, args }) + "\n");
					socket.flush();
				},
			},
		});

		setTimeout(() => {
			if (!settled) {
				settled = true;
				reject(new Error(`Daemon command timeout: ${cmd} (${timeout}ms)`));
				try { socket.end(); } catch {}
			}
		}, timeout);
	});
}

async function connectToDaemon(targetId: string): Promise<string> {
	const sp = sockPath(targetId);
	// Try connecting to existing daemon
	try {
		await sendToDaemon(sp, "ping");
		return sp;
	} catch {
		// No daemon running
	}

	// Clean stale socket
	try {
		unlinkSync(sp);
	} catch {}

	// Spawn daemon
	const scriptPath = new URL(import.meta.url).pathname;
	const child = Bun.spawn(["bun", scriptPath, "_daemon", targetId], {
		stdio: ["ignore", "ignore", "ignore"],
	});
	child.unref();

	// Wait for daemon to start (user may need to click "Allow" in Chrome)
	for (let i = 0; i < DAEMON_CONNECT_RETRIES; i++) {
		await sleep(DAEMON_CONNECT_DELAY);
		try {
			await sendToDaemon(sp, "ping");
			return sp;
		} catch {}
	}

	throw new Error(
		`Daemon failed to start for target ${targetId.slice(0, 8)}.\n` + `Did you click "Allow" in Chrome's debugging permission dialog?`,
	);
}

// --- Daemon Process ---

async function runDaemon(targetId: string) {
	const sp = sockPath(targetId);
	const wsUrl = getWsUrl();
	const cdp = new CDP(wsUrl);

	// Attach to the specific tab
	const { sessionId } = (await cdp.send("Target.attachToTarget", {
		targetId,
		flatten: true,
	})) as { sessionId: string };

	let idleTimer = setTimeout(shutdown, IDLE_TIMEOUT);

	function resetIdle() {
		clearTimeout(idleTimer);
		idleTimer = setTimeout(shutdown, IDLE_TIMEOUT);
	}

	function shutdown() {
		server.stop();
		try {
			unlinkSync(sp);
		} catch {}
		cdp.close();
		process.exit(0);
	}

	// Auto-shutdown on tab close or detach
	cdp.on("Target.targetDestroyed", (params) => {
		if (params.targetId === targetId) shutdown();
	});
	cdp.on("Target.detachedFromTarget", (params) => {
		if (params.sessionId === sessionId) shutdown();
	});

	// Helper: send CDP command to the attached tab (sessionId at top level, not in params)
	async function tabSend(method: string, params: Record<string, unknown> = {}, timeout = TIMEOUT) {
		return cdp.send(method, params, timeout, sessionId);
	}

	// Command handlers
	async function handleCommand(cmd: string, args: unknown[]): Promise<unknown> {
		resetIdle();

		switch (cmd) {
			case "ping":
				return "pong";

			case "snap": {
				// Use JS-based DOM traversal — more reliable than Accessibility.getFullAXTree
				// which can hang on complex pages
				const result = await tabSend("Runtime.evaluate", {
					expression: `(() => {
						const lines = [];
						let count = 0;
						const MAX = 500;
						function walk(el, depth) {
							if (count >= MAX || depth > 8) return;
							const tag = el.tagName?.toLowerCase() || '';
							const role = el.getAttribute?.('role') || '';
							const ariaLabel = el.getAttribute?.('aria-label') || '';
							const text = el.childNodes?.length === 1 && el.childNodes[0].nodeType === 3
								? el.childNodes[0].textContent.trim().slice(0, 80) : '';
							const type = el.getAttribute?.('type') || '';
							const href = el.getAttribute?.('href') || '';
							// Skip invisible elements
							if (el.offsetParent === null && tag !== 'body' && tag !== 'html') return;
							// Skip script/style/noscript
							if (['script','style','noscript','svg','path'].includes(tag)) return;

							let desc = tag;
							if (role) desc += '[role=' + role + ']';
							if (ariaLabel) desc += ' "' + ariaLabel.slice(0, 60) + '"';
							else if (text) desc += ' "' + text + '"';
							if (href) desc += ' href=' + href.slice(0, 60);
							if (type) desc += ' type=' + type;

							const indent = '  '.repeat(depth);
							lines.push(indent + desc);
							count++;

							for (const child of el.children || []) walk(child, depth + 1);
						}
						walk(document.body, 0);
						return lines.join('\\n') + (count >= MAX ? '\\n... (truncated at ' + MAX + ' elements)' : '');
					})()`,
					returnByValue: true,
					awaitPromise: true,
				});
				return (result as any).result?.value ?? "(empty page)";
			}

			case "eval": {
				const [expression] = args as [string];
				const result = await tabSend("Runtime.evaluate", {
					expression,
					returnByValue: true,
					awaitPromise: true,
				});
				return (result as any).result?.value ?? JSON.stringify((result as any).result);
			}

			case "nav": {
				const [url] = args as [string];
				await tabSend("Page.enable");
				const loadWait = cdp.waitForEvent("Page.loadEventFired", NAVIGATION_TIMEOUT);
				await tabSend("Page.navigate", { url });
				await loadWait.promise;
				// Wait for readyState complete
				for (let i = 0; i < 60; i++) {
					const r = await tabSend("Runtime.evaluate", {
						expression: "document.readyState",
						returnByValue: true,
					});
					if ((r as any).result?.value === "complete") break;
					await sleep(500);
				}
				return `Navigated to ${url}`;
			}

			case "click": {
				const [selector] = args as [string];
				const result = await tabSend("Runtime.evaluate", {
					expression: `(() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return 'Element not found: ${selector}';
            el.click();
            return 'Clicked: ' + (el.textContent || '').trim().slice(0, 50);
          })()`,
					returnByValue: true,
					awaitPromise: true,
				});
				return (result as any).result?.value;
			}

			case "type": {
				const [text] = args as [string];
				await tabSend("Input.insertText", { text });
				return `Typed ${text.length} characters`;
			}

			case "shot": {
				const result = await tabSend("Page.captureScreenshot", { format: "png" });
				const data = (result as any).data;
				const outPath = "/tmp/screenshot.png";
				await Bun.write(outPath, Buffer.from(data, "base64"));
				return `Screenshot saved to ${outPath}`;
			}

			case "html": {
				const [selector] = args as [string | undefined];
				const expr = selector
					? `document.querySelector(${JSON.stringify(selector)})?.outerHTML ?? 'Element not found'`
					: "document.documentElement.outerHTML";
				const result = await tabSend("Runtime.evaluate", {
					expression: expr,
					returnByValue: true,
				});
				const html = (result as any).result?.value ?? "";
				// Truncate to avoid overwhelming output
				return html.length > 50000 ? html.slice(0, 50000) + "\n... (truncated)" : html;
			}

			default:
				throw new Error(`Unknown command: ${cmd}`);
		}
	}

	// Helper: send response, using temp file for large payloads (Bun socket write has ~8KB limit)
	const SOCKET_THRESHOLD = 7000;

	async function sendResponse(socket: any, id: number, ok: boolean, payload: unknown) {
		const msg = ok ? { id, ok: true, result: payload } : { id, ok: false, error: payload };
		const json = JSON.stringify(msg);
		if (json.length > SOCKET_THRESHOLD) {
			const tmpFile = `/tmp/cdp-resp-${id}.json`;
			await Bun.write(tmpFile, String(payload));
			socket.write(JSON.stringify({ id, ok, file: tmpFile }) + "\n");
		} else {
			socket.write(json + "\n");
		}
		socket.flush();
	}

	// Start Unix socket server
	const server = Bun.listen({
		unix: sp,
		socket: {
			data(socket, data) {
				const text = new TextDecoder().decode(data);
				const lines = text.split("\n").filter((l) => l.trim());
				for (const line of lines) {
					try {
						const msg = JSON.parse(line);
						handleCommand(msg.cmd, msg.args ?? [])
							.then((result) => sendResponse(socket, msg.id, true, result))
							.catch((err) => sendResponse(socket, msg.id, false, String(err)));
					} catch (e) {
						socket.write(JSON.stringify({ ok: false, error: `Parse error: ${e}` }) + "\n");
						socket.flush();
					}
				}
			},
			close() {},
			error(socket, error) {
				console.error("Socket error:", error);
			},
		},
	});
}

// --- Accessibility Tree Formatter ---

const MAX_SNAP_LINES = 500;
const MAX_SNAP_CHARS = 50_000;

function formatAccessibilityTree(nodes: any[]): string {
	const lines: string[] = [];
	const visited = new Set<string>();
	const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));
	let charCount = 0;
	let truncated = false;

	function walk(nodeId: string, depth: number) {
		if (truncated || visited.has(nodeId) || depth > 10) return;
		if (lines.length >= MAX_SNAP_LINES || charCount >= MAX_SNAP_CHARS) {
			truncated = true;
			return;
		}
		visited.add(nodeId);

		const node = nodeMap.get(nodeId);
		if (!node) return;

		const role = node.role?.value ?? "";
		const name = node.name?.value ?? "";
		const value = node.value?.value ?? "";

		// Skip generic/none roles with no name
		if ((role === "none" || role === "generic" || role === "InlineTextBox") && !name && !value) {
			for (const childId of node.childIds ?? []) walk(childId, depth);
			return;
		}

		const indent = "  ".repeat(Math.min(depth, 10));
		let line = `${indent}[${role}]`;
		if (name) line += ` "${name.slice(0, 100)}"`;
		if (value) line += ` value="${value.slice(0, 100)}"`;
		lines.push(line);
		charCount += line.length + 1;

		for (const childId of node.childIds ?? []) walk(childId, depth + 1);
	}

	const root = nodes.find((n) => n.role?.value === "RootWebArea" || n.role?.value === "WebArea");
	if (root) {
		walk(root.nodeId, 0);
	} else if (nodes.length > 0) {
		walk(nodes[0].nodeId, 0);
	}

	let result = lines.join("\n") || "(empty accessibility tree)";
	if (truncated) result += `\n\n... (truncated at ${lines.length} lines, ${nodes.length} total nodes)`;
	return result;
}

// --- CLI Entry Point ---

async function main() {
	const args = process.argv.slice(2);
	const cmd = args[0];

	if (!cmd) {
		console.log(`Usage: bun cdp.ts <command> [target] [args...]

Commands:
  list                    Show all open tabs
  snap <target>           Accessibility tree (semantic structure)
  eval <target> "code"    Execute JavaScript in page context
  nav <target> <url>      Navigate to URL
  click <target> "sel"    Click element by CSS selector
  type <target> "text"    Type text (cross-origin safe)
  shot <target>           Screenshot to /tmp/screenshot.png
  html <target> [sel]     Extract HTML (full page or selector)
  stop [target]           Terminate daemon(s)
  enable                  Open chrome://inspect to enable debugging`);
		process.exit(0);
	}

	// Internal: daemon mode
	if (cmd === "_daemon") {
		await runDaemon(args[1]);
		return;
	}

	// Enable: open chrome://inspect
	if (cmd === "enable") {
		const platform = process.platform;
		if (platform === "darwin") {
			Bun.spawn(["open", "-a", "Google Chrome", "chrome://inspect/#remote-debugging"]);
		} else if (platform === "linux") {
			Bun.spawn(["xdg-open", "chrome://inspect/#remote-debugging"]);
		} else {
			console.log("Open chrome://inspect/#remote-debugging in Chrome and toggle the switch.");
		}
		console.log("Toggle the remote debugging switch in Chrome, then run: bun cdp.ts list");
		return;
	}

	// Stop: kill daemon(s)
	if (cmd === "stop") {
		const prefix = args[1];
		const sockets = readdirSync("/tmp").filter((f) => f.startsWith("cdp-") && f.endsWith(".sock"));
		if (sockets.length === 0) {
			console.log("No running daemons.");
			return;
		}
		for (const sock of sockets) {
			const targetId = sock.replace("cdp-", "").replace(".sock", "");
			if (prefix && !targetId.toUpperCase().startsWith(prefix.toUpperCase())) continue;
			try {
				await sendToDaemon(`/tmp/${sock}`, "stop");
			} catch {}
			try {
				unlinkSync(`/tmp/${sock}`);
			} catch {}
			console.log(`Stopped daemon for ${targetId.slice(0, 8)}`);
		}
		return;
	}

	// List: show all tabs
	if (cmd === "list") {
		const wsUrl = getWsUrl();
		const cdp = new CDP(wsUrl);
		const pages = await getPages(cdp);
		cdp.close();

		// Cache for prefix resolution
		await Bun.write(PAGES_CACHE, JSON.stringify(pages.map((p) => p.targetId)));

		const prefixLen = getDisplayPrefixLength(pages.map((p) => p.targetId));
		console.log(`\n  ${"TARGET".padEnd(prefixLen)}  ${"TITLE".padEnd(40)}  URL`);
		console.log(`  ${"─".repeat(prefixLen)}  ${"─".repeat(40)}  ${"─".repeat(50)}`);
		for (const page of pages) {
			const prefix = page.targetId.slice(0, prefixLen).toUpperCase();
			const title = page.title.length > 40 ? page.title.slice(0, 37) + "..." : page.title.padEnd(40);
			console.log(`  ${prefix}  ${title}  ${page.url}`);
		}
		console.log(`\n  ${pages.length} tabs. Use the TARGET prefix with other commands.\n`);
		return;
	}

	// All other commands need a target
	const targetPrefix = args[1];
	if (!targetPrefix) {
		console.error(`Error: ${cmd} requires a target prefix. Run \`bun cdp.ts list\` first.`);
		process.exit(1);
	}

	// Resolve target prefix — combine running daemons + cached page list
	const idSet = new Set<string>();
	try {
		const sockets = readdirSync("/tmp").filter((f) => f.startsWith("cdp-") && f.endsWith(".sock"));
		for (const s of sockets) idSet.add(s.replace("cdp-", "").replace(".sock", ""));
	} catch {}
	try {
		const cached = (await Bun.file(PAGES_CACHE).json()) as string[];
		for (const id of cached) idSet.add(id);
	} catch {}

	if (idSet.size === 0) {
		console.error("No cached tab list. Run `bun cdp.ts list` first.");
		process.exit(1);
	}
	const allTargetIds = [...idSet];

	const targetId = resolvePrefix(targetPrefix, allTargetIds);
	const sp = await connectToDaemon(targetId);

	// Execute command (snap/nav get longer timeouts)
	const cmdArgs = args.slice(2);
	const longCommands = new Set(["snap", "nav", "html", "shot"]);
	const cmdTimeout = longCommands.has(cmd) ? 45_000 : TIMEOUT;
	try {
		const result = await sendToDaemon(sp, cmd, cmdArgs, cmdTimeout);
		if (result !== undefined && result !== null) {
			console.log(String(result));
		}
	} catch (err) {
		console.error(`Error: ${err}`);
		process.exit(1);
	}
}

main().catch((err) => {
	console.error(err.message ?? err);
	process.exit(1);
});
