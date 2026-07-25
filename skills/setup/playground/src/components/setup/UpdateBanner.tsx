"use client"

import { ArrowUpCircle, CircleAlert, LoaderCircle, RotateCw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import type { UpdateCheck } from "@/lib/app-update"
import { loadSessionToken, supportsCredentialStore } from "@/lib/native-sdk"

type InstallState =
	| { state: "idle" }
	| { state: "downloading"; version: string }
	| { state: "staged"; version: string }
	| { state: "swapping"; version: string }
	| { state: "failed"; version: string | null; reason: string }

type UpdateStatus = { check: UpdateCheck; install: InstallState; staged: string | null }

const RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

/**
 * Update affordances for the desktop shell. The same setup UI is served by
 * `skills/setup/scripts/server.ts` with no application around it, so this
 * component renders nothing until the broker confirms a packaged host.
 */
export function UpdateBanner() {
	const [status, setStatus] = useState<UpdateStatus | null>(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [dismissed, setDismissed] = useState(false)

	const refresh = useCallback(async () => {
		const response = await fetch("/api/agent-master/update", { cache: "no-store" })
		if (!response.ok) throw new Error(`Update check failed (${response.status})`)
		setStatus((await response.json()) as UpdateStatus)
	}, [])

	useEffect(() => {
		let cancelled = false
		const poll = () => {
			refresh().catch(() => {
				if (!cancelled) setStatus(null)
			})
		}
		poll()
		const timer = window.setInterval(poll, RECHECK_INTERVAL_MS)
		return () => {
			cancelled = true
			window.clearInterval(timer)
		}
	}, [refresh])

	async function download() {
		setBusy(true)
		setError(null)
		try {
			if (!(await supportsCredentialStore())) {
				throw new Error("This build has no OS credential store, so the release cannot be fetched.")
			}
			const token = await loadSessionToken()
			if (!token) {
				throw new Error("Sign in on the My Packs tab to download the release you own.")
			}
			const response = await fetch("/api/agent-master/update/install", {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({ action: "stage" }),
			})
			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as { error?: string } | null
				throw new Error(body?.error ?? `Download failed (${response.status})`)
			}
			await refresh()
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause))
		} finally {
			setBusy(false)
		}
	}

	async function install() {
		setBusy(true)
		setError(null)
		try {
			const response = await fetch("/api/agent-master/update/install", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "apply" }),
			})
			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as { error?: string } | null
				throw new Error(body?.error ?? `Install failed (${response.status})`)
			}
			await refresh()
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause))
			setBusy(false)
		}
	}

	if (!status || dismissed) return null
	const { check, install: installState } = status

	if (installState.state === "swapping") {
		return (
			<Card tone="progress">
				<LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
				<div>
					<div className="font-medium">Installing {installState.version}</div>
					<div className="mt-0.5 text-muted-foreground">
						Agent Master is closing and will reopen on the new version.
					</div>
				</div>
			</Card>
		)
	}

	if (installState.state === "staged") {
		return (
			<Card tone="ready">
				<ArrowUpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
				<div className="min-w-0 flex-1">
					<div className="font-medium">Version {installState.version} is ready</div>
					<div className="mt-0.5 text-muted-foreground">
						Installing quits Agent Master, replaces it, and reopens it.
					</div>
					{error && <div className="mt-1 text-destructive">{error}</div>}
					<Button
						size="sm"
						variant="primary"
						disabled={busy}
						onClick={install}
						className="mt-2 h-7 rounded-md normal-case"
					>
						{busy ? (
							<LoaderCircle className="size-3 animate-spin" />
						) : (
							<RotateCw className="size-3" />
						)}
						Install and restart
					</Button>
				</div>
			</Card>
		)
	}

	if (check.state === "available") {
		return (
			<Card tone="ready">
				<ArrowUpCircle className="mt-0.5 size-4 shrink-0 text-primary" />
				<div className="min-w-0 flex-1">
					<div className="font-medium">Agent Master {check.latest} is available</div>
					<div className="mt-0.5 text-muted-foreground">You are running {check.installed}.</div>
					{error && <div className="mt-1 text-destructive">{error}</div>}
					<div className="mt-2 flex gap-2">
						<Button
							size="sm"
							variant="primary"
							disabled={busy}
							onClick={download}
							className="h-7 rounded-md normal-case"
						>
							{busy && <LoaderCircle className="size-3 animate-spin" />}
							{busy ? "Downloading…" : "Download update"}
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setDismissed(true)}
							className="h-7 rounded-md normal-case"
						>
							Later
						</Button>
					</div>
				</div>
			</Card>
		)
	}

	if (installState.state === "failed") {
		return (
			<Card tone="problem">
				<CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
				<div className="min-w-0 flex-1">
					<div className="font-medium">
						Update to {installState.version ?? "the new release"} failed
					</div>
					<div className="mt-0.5 text-muted-foreground">{installState.reason}</div>
				</div>
			</Card>
		)
	}

	return null
}

function Card({
	tone,
	children,
}: {
	tone: "ready" | "progress" | "problem"
	children: React.ReactNode
}) {
	return (
		<div
			role={tone === "problem" ? "alert" : "status"}
			className="pointer-events-auto flex gap-2 rounded-lg border border-border bg-popover/90 p-3 text-[0.72rem] text-popover-foreground shadow-lg backdrop-blur-xl"
		>
			{children}
		</div>
	)
}
