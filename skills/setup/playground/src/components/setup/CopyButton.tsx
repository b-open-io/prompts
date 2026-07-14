"use client"

import { useState } from "react"
import { useSound } from "@/components/SoundProvider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CopyButton({
	text,
	className,
	label: defaultLabel = "copy",
}: {
	text: string
	className?: string
	label?: string
}) {
	const [label, setLabel] = useState(defaultLabel)
	const { play } = useSound()

	async function doCopy() {
		try {
			await navigator.clipboard.writeText(text)
			setLabel("copied ✓")
			play("NOTIFICATION_BADGE")
		} catch {
			setLabel("copy failed ✗")
			play("NOTIFICATION_ERROR")
		} finally {
			setTimeout(() => setLabel(defaultLabel), 1500)
		}
	}

	return (
		<Button
			size="sm"
			onClick={doCopy}
			data-sound="none"
			className={cn("rounded-md normal-case", className)}
		>
			{label}
		</Button>
	)
}
