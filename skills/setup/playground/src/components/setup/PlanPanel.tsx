"use client"

import { CheckCircle2, X } from "lucide-react"
import { useEffect } from "react"
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
	useEffect(() => {
		function handleEscape(event: KeyboardEvent) {
			if (event.key === "Escape") onClose()
		}
		document.addEventListener("keydown", handleEscape)
		return () => document.removeEventListener("keydown", handleEscape)
	}, [onClose])

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 py-8 backdrop-blur-sm animate-in fade-in duration-200">
			<button
				type="button"
				aria-label="Close setup plan"
				onClick={onClose}
				className="absolute inset-0 cursor-default"
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="plan-title"
				className="relative w-full max-w-3xl rounded-xl border border-border bg-card p-4 shadow-2xl animate-in slide-in-from-bottom-2 duration-200"
			>
				<div className="mb-3 flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<div className="flex size-7 items-center justify-center rounded-md bg-green-500/12 text-green-600">
							<CheckCircle2 className="size-4" />
						</div>
						<div>
							<div id="plan-title" className="text-[0.85rem] font-semibold">
								Setup plan ready
							</div>
							<div className="text-[0.65rem] text-muted-foreground">
								Review or copy the generated steps.
							</div>
						</div>
					</div>
					<Button onClick={onClose} aria-label="Close setup plan" className="size-7 rounded-md p-0">
						<X className="size-3.5" />
					</Button>
				</div>
				<div className="mb-2 flex items-center gap-2 rounded-md bg-muted px-2.5 py-2 text-[0.7rem] text-muted-foreground">
					<code className="min-w-0 flex-1 break-all font-mono">{path}</code>
					<CopyButton text={path} />
				</div>
				<pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted p-3 font-mono text-[0.72rem] leading-5">
					{markdown}
				</pre>
				<div className="mt-3 flex justify-end">
					<CopyButton text={markdown} className="px-3" />
				</div>
			</div>
		</div>
	)
}
