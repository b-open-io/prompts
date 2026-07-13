"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CopyButton({ text, className }: { text: string; className?: string }) {
	const [label, setLabel] = useState("copy")

	async function doCopy() {
		try {
			await navigator.clipboard.writeText(text)
			setLabel("copied ✓")
		} catch {
			setLabel("copy failed ✗")
		} finally {
			setTimeout(() => setLabel("copy"), 1500)
		}
	}

	return (
		<Button size="sm" onClick={doCopy} className={cn(className)}>
			{label}
		</Button>
	)
}
