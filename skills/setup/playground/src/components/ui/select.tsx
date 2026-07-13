"use client"

import { ChevronDown } from "lucide-react"
import { Select as SelectPrimitive } from "radix-ui"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({
	className,
	children,
	...props
}: ComponentProps<typeof SelectPrimitive.Trigger>) {
	return (
		<SelectPrimitive.Trigger
			className={cn(
				"flex items-center gap-1 border border-border bg-input px-2 py-1 font-mono text-[0.72rem] uppercase text-foreground outline-none",
				className,
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<ChevronDown className="size-3 opacity-70" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	)
}

export function SelectContent({
	className,
	children,
	...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				className={cn(
					"z-50 border border-border bg-card font-mono text-[0.72rem] uppercase text-foreground shadow-md",
					className,
				)}
				position="popper"
				sideOffset={4}
				{...props}
			>
				<SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	)
}

export function SelectItem({
	className,
	children,
	...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			className={cn(
				"cursor-pointer select-none px-2 py-1 outline-none data-[highlighted]:bg-muted data-[highlighted]:text-primary data-[state=checked]:text-primary",
				className,
			)}
			{...props}
		>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	)
}
