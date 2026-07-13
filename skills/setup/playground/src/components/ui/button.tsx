import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

const VARIANT_CLASS: Record<string, string> = {
	default: "bg-input text-foreground border border-border hover:border-primary hover:text-primary",
	primary:
		"bg-primary text-primary-foreground border border-primary font-bold hover:border-foreground",
	ghost: "bg-transparent text-foreground border-none hover:text-primary",
}

const SIZE_CLASS: Record<string, string> = {
	default: "px-3 py-1.5 text-xs",
	sm: "px-2 py-1 text-[0.68rem]",
}

export type ButtonProps = ComponentProps<"button"> & {
	variant?: keyof typeof VARIANT_CLASS
	size?: keyof typeof SIZE_CLASS
}

export function Button({
	className,
	variant = "default",
	size = "default",
	...props
}: ButtonProps) {
	return (
		<button
			type="button"
			className={cn(
				"inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-mono uppercase tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50",
				VARIANT_CLASS[variant],
				SIZE_CLASS[size],
				className,
			)}
			{...props}
		/>
	)
}
