import { PLAYBOOK_CLASSES, type PlaybookClass } from "@/lib/pack-catalog"

export function ClassChip({ value }: { value: PlaybookClass }) {
	const entry = PLAYBOOK_CLASSES.find((candidate) => candidate.key === value)
	if (!entry) return null
	return (
		<span
			className="inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border px-1.5 font-mono text-[0.58rem] font-semibold tracking-[0.08em]"
			style={{
				color: entry.color,
				borderColor: `color-mix(in srgb, ${entry.color} 42%, transparent)`,
				background: `color-mix(in srgb, ${entry.color} 10%, transparent)`,
			}}
		>
			<span aria-hidden="true">{entry.glyph}</span>
			{entry.label}
		</span>
	)
}
