"use client"

import { useState } from "react"
import { DitherAvatar } from "@/components/dither-kit/avatar"
import { bandedHue } from "@/lib/banded-hue"
import { cn } from "@/lib/utils"

/**
 * Real catalog art first, deterministic dither art when it can't load.
 * The bopen.ai catalog is the single source of truth for plugin icons —
 * bundling copies here would drift the moment a new plugin ships. The
 * dither avatar keeps the UI fully usable offline.
 */
export function PluginIcon({
	name,
	size,
	className,
}: {
	name: string
	size: number
	className?: string
}) {
	const [failed, setFailed] = useState(false)
	if (failed) {
		return <DitherAvatar name={name} hue={bandedHue(name)} size={size} className={className} />
	}
	return (
		// biome-ignore lint/performance/noImgElement: remote catalog art at a fixed pixel size with an onError fallback — next/image adds nothing here
		<img
			src={`https://bopen.ai/images/catalog/plugins/${name}.png`}
			alt=""
			width={size}
			height={size}
			className={cn("[image-rendering:pixelated]", className)}
			onError={() => setFailed(true)}
		/>
	)
}
