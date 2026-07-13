import { ExternalLink } from "@/components/setup/ExternalLink"
import { Card } from "@/components/ui/card"
import { pluginBopenUrl } from "@/lib/links"
import type { HarnessState } from "@/lib/types"

function Tile({ value, label }: { value: string; label: string }) {
	return (
		<Card className="min-w-36 flex-1 px-3.5 py-2.5">
			<div className="text-xl text-primary">{value}</div>
			<div className="font-mono text-[0.68rem] uppercase tracking-wide text-muted-foreground">
				{label}
			</div>
		</Card>
	)
}

export function OverviewTab({ state }: { state: HarnessState }) {
	const total = state.plugins.length
	const installedCount = state.plugins.filter(
		(p) => p.installedClaude !== null || p.installedCodex !== null,
	).length

	let missingClis = 0
	let unsetEnv = 0
	let hooksOn = 0
	let hooksTotal = 0
	for (const p of state.plugins) {
		for (const c of p.checks ?? []) {
			if (c.kind === "cli" && !c.installed) missingClis++
			if (c.kind === "env" && !c.installed) unsetEnv++
		}
		for (const h of p.hooks ?? []) {
			hooksTotal++
			if (h.enabled) hooksOn++
		}
	}

	return (
		<div>
			<div className="mb-4 flex flex-wrap gap-3">
				<Tile value={`${installedCount} / ${total}`} label="plugins installed" />
				<Tile value={String(missingClis)} label="missing CLIs" />
				<Tile value={String(unsetEnv)} label="unset env keys" />
				<Tile value={`${hooksOn} / ${hooksTotal}`} label="hooks enabled" />
			</div>

			<span className="mb-1.5 block font-mono text-[0.72rem] uppercase tracking-wide text-accent">
				[ PLUGINS ]
			</span>
			{state.plugins.map((p) => {
				const claudeBit =
					p.installedClaude !== null ? `claude v${p.installedClaude}` : "claude: not installed"
				const codexBit =
					p.installedCodex !== null ? `codex v${p.installedCodex}` : "codex: not installed"
				const mktBit =
					p.marketplaceVersion !== null
						? `marketplace v${p.marketplaceVersion}`
						: "marketplace: unavailable"
				return (
					<div
						key={p.name}
						className="flex flex-wrap items-baseline gap-2 border-b border-border py-1.5 text-sm"
					>
						<strong>{p.name}</strong>
						<ExternalLink href={pluginBopenUrl(p.name)} label={`Open ${p.name} on bopen.ai`} />
						<span className="text-[0.75rem] text-muted-foreground">
							{claudeBit} &middot; {codexBit} &middot; {mktBit}
						</span>
					</div>
				)
			})}
			<p className="py-2 text-[0.78rem] text-muted-foreground">
				Generated at {state.generatedAt} on {state.platform}.
			</p>
		</div>
	)
}
