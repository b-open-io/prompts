"use client"

import { DitherAvatar } from "@/components/dither-kit/avatar"
import { Badge } from "@/components/ui/badge"
import { bandedHue } from "@/lib/banded-hue"
import type { HarnessState } from "@/lib/types"
import { cn } from "@/lib/utils"

export function TabBar({
	state,
	activeTab,
	onSelect,
}: {
	state: HarnessState | null
	activeTab: string
	onSelect: (tab: string) => void
}) {
	if (!state) return <nav className="border-b border-border" />

	return (
		<nav className="flex overflow-x-auto whitespace-nowrap border-b border-border bg-background">
			<TabButton
				id="overview"
				label="OVERVIEW"
				active={activeTab === "overview"}
				installed
				onSelect={onSelect}
			/>
			{state.plugins.map((p) => {
				const installed = p.installedClaude !== null || p.installedCodex !== null
				return (
					<TabButton
						key={p.name}
						id={p.name}
						label={p.name}
						active={activeTab === p.name}
						installed={installed}
						icon={
							<DitherAvatar
								name={p.name}
								hue={bandedHue(p.name)}
								size={16}
								className="rounded-none"
							/>
						}
						onSelect={onSelect}
					/>
				)
			})}
		</nav>
	)
}

function TabButton({
	id,
	label,
	active,
	installed,
	icon,
	onSelect,
}: {
	id: string
	label: string
	active: boolean
	installed: boolean
	icon?: React.ReactNode
	onSelect: (tab: string) => void
}) {
	return (
		<button
			type="button"
			onClick={() => onSelect(id)}
			className={cn(
				"flex flex-none items-center gap-1.5 border-r border-border px-3.5 py-2 font-mono text-xs uppercase tracking-wide",
				active ? "border-b-2 border-b-primary bg-card text-primary" : "text-foreground",
				!installed && !active && "text-muted-foreground",
			)}
		>
			{icon}
			{label}
			{!installed && (
				<Badge variant="dim" className="ml-1 border border-border bg-muted">
					not installed
				</Badge>
			)}
		</button>
	)
}
