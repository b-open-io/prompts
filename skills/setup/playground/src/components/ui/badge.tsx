import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

const VARIANT_CLASS: Record<string, string> = {
	default: "border border-border bg-muted text-foreground",
	warn: "border border-accent bg-accent text-background",
	dim: "border border-transparent bg-transparent text-muted-foreground",
}

export type BadgeProps = ComponentProps<"span"> & {
	variant?: keyof typeof VARIANT_CLASS
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center px-1.5 py-0.5 font-mono text-[0.7rem] uppercase tracking-wide",
				VARIANT_CLASS[variant],
				className,
			)}
			{...props}
		/>
	)
}
