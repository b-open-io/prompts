"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function HookToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
	return (
		<button type="button" onClick={onToggle} className="inline-flex items-center gap-2">
			<Badge
				className={cn(
					"border",
					on ? "border-primary text-primary" : "border-border text-muted-foreground",
				)}
				variant="default"
			>
				[{on ? "ON" : "OFF"}]
			</Badge>
		</button>
	)
}
