"use client"

import { DitherGradient } from "@/components/dither-kit/gradient"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { RUNTIMES } from "@/lib/types"

export function Header({
	runtimeArg,
	runtimeDetected,
	selectedRuntime,
	onRuntimeChange,
	onRefresh,
	onBuildPlan,
	refreshing,
	building,
}: {
	runtimeArg: string | null
	runtimeDetected: string | null
	selectedRuntime: string | null
	onRuntimeChange: (runtime: string) => void
	onRefresh: () => void
	onBuildPlan: () => void
	refreshing: boolean
	building: boolean
}) {
	const mismatch = runtimeArg !== null && runtimeDetected !== null && runtimeArg !== runtimeDetected

	return (
		<header className="relative flex flex-wrap items-center gap-3 overflow-hidden border-b border-border bg-card px-4 py-3">
			<DitherGradient
				from="blue"
				to="transparent"
				direction="right"
				cell={4}
				opacity={0.5}
				className="opacity-40"
			/>
			<div className="relative font-mono text-base font-bold tracking-wide">[ bOpen SETUP ]</div>
			<div className="relative flex flex-wrap items-center gap-2">
				<span className="border border-border bg-muted px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-wide">
					runtime: {runtimeArg ?? "?"}
				</span>
				{mismatch && (
					<span className="border border-accent bg-accent px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-wide text-background">
						detected: {runtimeDetected}
					</span>
				)}
				<span className="font-mono text-[0.7rem] uppercase tracking-wide text-muted-foreground">
					plan for:
				</span>
				<Select value={selectedRuntime ?? undefined} onValueChange={onRuntimeChange}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{RUNTIMES.map((runtime) => (
							<SelectItem key={runtime.id} value={runtime.id}>
								<span>{runtime.label}</span>
								{runtime.tier === "experimental" && (
									<span className="ml-1 normal-case text-muted-foreground">experimental</span>
								)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="relative flex-1" />
			<Button onClick={onRefresh} disabled={refreshing} className="relative">
				{refreshing ? "re-checking…" : "Refresh"}
			</Button>
			<Button variant="primary" onClick={onBuildPlan} disabled={building} className="relative">
				{building ? "building…" : "Build setup plan"}
			</Button>
		</header>
	)
}
