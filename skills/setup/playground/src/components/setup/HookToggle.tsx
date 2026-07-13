"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function HookToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
	return (
		<button
			type="button"
			onClick={onToggle}
			aria-pressed={on}
			className="inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<Badge
				className={cn(
					"rounded-md border transition-colors duration-200",
					on ? "border-primary text-primary" : "border-border text-muted-foreground",
				)}
				variant="default"
			>
				[{on ? "ON" : "OFF"}]
			</Badge>
		</button>
	)
}
