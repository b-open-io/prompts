"use client"

import { cn } from "@/lib/utils"

/** The □/■ checkbox-style glyph from ui.html — checked/installed states,
 * "inert" when the state can't be changed (already installed, or the row
 * doesn't apply to the active plan runtime). */
export function GlyphToggle({
	checked,
	inert,
	onToggle,
	label,
}: {
	checked: boolean
	inert: boolean
	onToggle?: () => void
	label: string
}) {
	return (
		<button
			type="button"
			aria-pressed={checked}
			aria-label={label}
			disabled={inert}
			onClick={onToggle}
			className={cn(
				"w-4 flex-none select-none rounded-sm text-left font-mono leading-tight outline-none focus-visible:ring-2 focus-visible:ring-ring",
				checked ? "text-primary" : "text-muted-foreground",
				inert ? "cursor-default" : "cursor-pointer",
			)}
		>
			{checked ? "■" : "□"}
		</button>
	)
}
