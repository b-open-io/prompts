"use client"

import { AlertCircle, WifiOff } from "lucide-react"
import { useEffect, useState } from "react"
import type { HarnessState } from "@/lib/types"

export function Banners({
	state,
	transientErrors,
}: {
	state: HarnessState | null
	transientErrors: string[]
}) {
	return (
		<div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2">
			{state && (!state.marketplace.fetched || state.marketplace.error) && (
				<div
					role="status"
					className="pointer-events-auto flex gap-2 rounded-lg border border-border bg-popover/90 p-3 text-[0.72rem] text-popover-foreground shadow-lg backdrop-blur-xl"
				>
					<WifiOff className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
					<div>
						<div className="font-medium">Marketplace unavailable</div>
						<div className="mt-0.5 text-muted-foreground">
							{state.marketplace.error ?? "No marketplace data"}. Local detection is still active.
						</div>
					</div>
				</div>
			)}
			{transientErrors.map((entry) => {
				const separator = entry.indexOf(":")
				const id = entry.slice(0, separator)
				const message = entry.slice(separator + 1)
				return <TransientToast key={id} message={message} />
			})}
		</div>
	)
}

function TransientToast({ message }: { message: string }) {
	const [visible, setVisible] = useState(true)
	useEffect(() => {
		const timer = window.setTimeout(() => setVisible(false), 8000)
		return () => window.clearTimeout(timer)
	}, [])
	if (!visible) return null
	return (
		<div
			role="alert"
			className="pointer-events-auto flex animate-in gap-2 rounded-lg border border-border bg-popover/90 p-3 text-[0.72rem] text-popover-foreground shadow-lg backdrop-blur-xl duration-200 fade-in slide-in-from-right-2"
		>
			<AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
			<span>{message}</span>
		</div>
	)
}
