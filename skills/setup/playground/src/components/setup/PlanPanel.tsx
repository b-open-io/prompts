"use client"

import { CopyButton } from "@/components/setup/CopyButton"
import { Button } from "@/components/ui/button"

export function PlanPanel({
	markdown,
	path,
	onClose,
}: {
	markdown: string
	path: string
	onClose: () => void
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-8">
			<div className="w-full max-w-3xl border border-border bg-card p-4">
				<div className="mb-2.5 flex items-center justify-between">
					<span className="font-mono text-[0.72rem] uppercase tracking-wide text-accent">
						[ SETUP PLAN ]
					</span>
					<Button onClick={onClose}>Close</Button>
				</div>
				<div className="mb-2 flex items-center gap-2 break-all text-[0.75rem] text-muted-foreground">
					<span>{path}</span>
					<CopyButton text={path} />
				</div>
				<pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words border border-border bg-muted p-3 text-[0.78rem]">
					{markdown}
				</pre>
				<div className="mt-2.5 text-right">
					<CopyButton text={markdown} />
				</div>
			</div>
		</div>
	)
}
