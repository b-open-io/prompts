import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function Card({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("border border-border bg-card", className)} {...props} />
}
