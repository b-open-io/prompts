import type { SkillActivityState } from "@/lib/types"
import { cn } from "@/lib/utils"

const ACTIVE_WINDOW_SECONDS = 30 * 60

export function isRecentSkillActivity(
	activity: SkillActivityState,
	nowSeconds = Date.now() / 1000,
): boolean {
	const age = nowSeconds - activity.lastInvokedAt
	return age >= 0 && age <= ACTIVE_WINDOW_SECONDS
}

function relativeAge(timestamp: number, nowSeconds = Date.now() / 1000): string {
	const seconds = Math.max(0, Math.floor(nowSeconds - timestamp))
	if (seconds < 60) return "less than a minute"

	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`

	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`

	const days = Math.floor(hours / 24)
	return `${days} ${days === 1 ? "day" : "days"}`
}

function shortSessionId(sessionId: string): string {
	return sessionId.length > 8 ? sessionId.slice(0, 8) : sessionId
}

export function SkillActivityBadge({
	activity,
	compact = false,
}: {
	activity: SkillActivityState
	compact?: boolean
}) {
	const age = relativeAge(activity.lastInvokedAt)
	const sessionId = shortSessionId(activity.sessionId)
	const tooltip = `${activity.isLive ? "session live" : `invoked ${age} ago`} · session ${sessionId}`

	if (compact) {
		return (
			<span
				title={tooltip}
				aria-label={tooltip}
				role="img"
				className="inline-flex size-3 shrink-0 items-center justify-center"
			>
				<span className="relative flex size-2">
					{activity.isLive && (
						<span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-45" />
					)}
					<span
						className={cn(
							"relative inline-flex size-2 rounded-full",
							activity.isLive ? "bg-green-500" : "bg-muted-foreground/45",
						)}
					/>
				</span>
			</span>
		)
	}

	return (
		<span
			title={tooltip}
			className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.68rem] text-muted-foreground"
		>
			<span
				className={cn(
					"size-2 rounded-full",
					activity.isLive ? "animate-pulse bg-green-500" : "bg-muted-foreground/45",
				)}
			/>
			{activity.isLive ? "session live" : `invoked ${age} ago`}
		</span>
	)
}
