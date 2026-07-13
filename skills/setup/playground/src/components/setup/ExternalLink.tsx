export function ExternalLink({ href, label }: { href: string; label: string }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={label}
			className="ml-1 text-[0.7rem] text-primary hover:text-foreground"
		>
			{"↗"}
		</a>
	)
}

export function Linkify({ text }: { text: string }) {
	const match = /(https?:\/\/[^\s]+)/.exec(text)
	if (!match) return <>{text}</>
	const before = text.slice(0, match.index)
	const url = match[1]
	const after = text.slice(match.index + url.length)
	return (
		<>
			{before}
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="text-primary hover:underline"
			>
				{url}
			</a>
			{after}
		</>
	)
}
