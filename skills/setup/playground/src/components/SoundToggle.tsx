"use client"

import { Volume2, VolumeX } from "lucide-react"
import { useSound } from "@/components/SoundProvider"
import { Toggle } from "@/components/ui/toggle"

export function SoundToggle() {
	const { enabled, toggle } = useSound()
	return (
		<Toggle
			size="sm"
			pressed={enabled}
			onPressedChange={toggle}
			aria-label={enabled ? "Mute interface sounds" : "Enable interface sounds"}
			title={enabled ? "Mute interface sounds" : "Enable interface sounds"}
			data-sound="none"
		>
			{enabled ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
		</Toggle>
	)
}
