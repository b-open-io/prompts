"use client"

import { Info } from "lucide-react"
import { Tooltip } from "radix-ui"

export const MANIFEST_INFO =
	"Plugins without a setup/manifest.json show install state only — no CLI/env/skill/hook checks are available for them."

export function ManifestInfo({ compact = false }: { compact?: boolean }) {
	return (
		<Tooltip.Provider delayDuration={250}>
			<Tooltip.Root>
				<Tooltip.Trigger asChild>
					<button
						type="button"
						aria-label={MANIFEST_INFO}
						className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
					>
						<Info className={compact ? "size-3" : "size-3.5"} aria-hidden="true" />
					</button>
				</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content
						side="right"
						sideOffset={8}
						className="z-50 max-w-72 rounded-sm border border-border bg-popover px-2.5 py-2 text-[0.72rem] leading-4 text-popover-foreground shadow-lg"
					>
						{MANIFEST_INFO}
						<Tooltip.Arrow className="fill-popover" />
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
		</Tooltip.Provider>
	)
}
