"use client"

import { useEffect, useState } from "react"
import type { HarnessState } from "@/lib/types"

// transientErrors entries carry a caller-assigned unique id, formatted as
// "id:message" (see page.tsx's pushTransientError) — that id is the React
// key, not the array index, so banners keep their identity as older ones expire.
export function Banners({
	state,
	transientErrors,
}: {
	state: HarnessState | null
	transientErrors: string[]
}) {
	return (
		<div className="flex flex-col">
			{state && (!state.marketplace.fetched || state.marketplace.error) && (
				<div className="border-b border-border border-l-3 border-l-accent bg-muted px-4 py-2 text-[0.78rem] text-accent">
					Marketplace unavailable: {state.marketplace.error ?? "no data"} — local detection still
					works; marketplace version columns show "unavailable".
				</div>
			)}
			{transientErrors.map((entry) => {
				const sep = entry.indexOf(":")
				const id = entry.slice(0, sep)
				const message = entry.slice(sep + 1)
				return <TransientBanner key={id} message={message} />
			})}
			{state?.plugins.some((p) => !p.hasSetupManifest) && (
				<div className="border-b border-border border-l-3 border-l-border bg-muted px-4 py-2 text-[0.78rem] text-muted-foreground">
					Plugins without a setup/manifest.json show install state only — no CLI/env/skill/hook
					checks are available for them.
				</div>
			)}
		</div>
	)
}

function TransientBanner({ message }: { message: string }) {
	const [visible, setVisible] = useState(true)
	useEffect(() => {
		const t = setTimeout(() => setVisible(false), 8000)
		return () => clearTimeout(t)
	}, [])
	if (!visible) return null
	return (
		<div className="border-b border-border border-l-3 border-l-accent bg-muted px-4 py-2 text-[0.78rem] text-accent">
			{message}
		</div>
	)
}
