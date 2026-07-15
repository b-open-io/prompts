#!/usr/bin/env bun

import { existsSync } from "node:fs"
import { resolve } from "node:path"

const port = Number.parseInt(process.env.PORT || "3460", 10)
const hostname = process.env.HOST || "127.0.0.1"
const asset = resolve(import.meta.dir, "../../visual-wayfinder/assets/visual-wayfinder-demo.html")

if (!Number.isInteger(port) || port < 1 || port > 65535) {
	throw new Error("PORT must be an integer from 1 through 65535.")
}
if (!existsSync(asset)) throw new Error("Visual Wayfinder interface is not installed.")

const csp = [
	"default-src 'none'",
	"script-src 'unsafe-inline'",
	"style-src 'unsafe-inline'",
	"img-src data: blob:",
	"font-src data:",
	"connect-src 'none'",
	"object-src 'none'",
	"base-uri 'none'",
	"form-action 'none'",
	"frame-ancestors https://bopen.ai https://www.bopen.ai",
].join("; ")

Bun.serve({
	hostname,
	port,
	async fetch(request) {
		const url = new URL(request.url)
		if (url.pathname === "/health") {
			return Response.json({ product: "visual-wayfinder", status: "ready" }, {
				headers: { "Cache-Control": "no-store" },
			})
		}
		if (url.pathname !== "/") return new Response("Not found", { status: 404 })
		return new Response(Bun.file(asset), {
			headers: {
				"Cache-Control": "no-store",
				"Content-Security-Policy": csp,
				"Content-Type": "text/html; charset=utf-8",
				"Referrer-Policy": "no-referrer",
				"X-Content-Type-Options": "nosniff",
			},
		})
	},
})

console.error(`Visual Wayfinder: ${process.env.PORTLESS_URL || `http://${hostname}:${port}`}`)
