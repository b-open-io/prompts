"use client"

import {
	AlertTriangle,
	Check,
	ChevronRight,
	CircleDot,
	Command,
	KeyRound,
	PackageCheck,
	Search,
	TerminalSquare,
	X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { DitherAvatar } from "@/components/dither-kit/avatar"
import { CopyButton } from "@/components/setup/CopyButton"
import { ManifestInfo } from "@/components/setup/ManifestInfo"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { bandedHue } from "@/lib/banded-hue"
import { pluginUpdateCommand } from "@/lib/links"
import type { HarnessState, PluginState } from "@/lib/types"
import { cn } from "@/lib/utils"

type GridFilter = "all" | "installed" | "missing-cli" | "unset-env" | "hooks"
type AttentionKind = "drift" | "cli" | "env"

type AttentionItem = {
	id: string
	kind: AttentionKind
	problem: string
	command: string
}

function pluginState(plugin: PluginState): "complete" | "partial" | "missing" {
	if (plugin.installedClaude && plugin.installedCodex) return "complete"
	if (plugin.installedClaude || plugin.installedCodex) return "partial"
	return "missing"
}

function statusLabel(plugin: PluginState): string {
	const state = pluginState(plugin)
	if (state === "complete") return "Installed in both runtimes"
	if (state === "partial") return "Partially installed"
	return "Not installed"
}

function buildAttention(state: HarnessState): AttentionItem[] {
	const items: AttentionItem[] = []
	for (const plugin of state.plugins) {
		if (plugin.marketplaceVersion) {
			for (const [runtime, installed] of [
				["claude", plugin.installedClaude],
				["codex", plugin.installedCodex],
			] as const) {
				if (installed && installed !== plugin.marketplaceVersion) {
					items.push({
						id: `drift:${plugin.name}:${runtime}`,
						kind: "drift",
						problem: `${plugin.name} — ${runtime} v${installed} · marketplace v${plugin.marketplaceVersion}`,
						command: pluginUpdateCommand(plugin.name, runtime),
					})
				}
			}
		}

		for (const check of plugin.checks ?? []) {
			if (check.installed || (check.kind !== "cli" && check.kind !== "env")) continue
			if (check.kind === "cli") {
				items.push({
					id: `cli:${plugin.name}:${check.id}`,
					kind: "cli",
					problem: `${check.name} — required by ${plugin.name}`,
					command: check.install ?? check.checkCommand ?? `command -v ${check.name}`,
				})
			} else {
				items.push({
					id: `env:${plugin.name}:${check.id}`,
					kind: "env",
					problem: `${check.name} — requested by ${plugin.name}`,
					command: `export ${check.name}="<value>"`,
				})
			}
		}
	}
	return items
}

function HealthChip({
	icon,
	value,
	label,
	good,
	active,
	onClick,
}: {
	icon: React.ReactNode
	value: string
	label: string
	good: boolean
	active: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex min-h-12 min-w-40 flex-1 items-center gap-2.5 rounded-lg border px-3 py-2 text-left shadow-sm",
				active ? "border-primary bg-primary/10 ring-2 ring-primary/15" : "border-border bg-card",
				"hover:-translate-y-px hover:border-primary/50 hover:shadow-md",
			)}
		>
			<span className={cn("shrink-0", good ? "text-green-600" : "text-amber-600")}>{icon}</span>
			<span className="min-w-0">
				<span className="block text-[0.8rem] font-semibold leading-4">{value}</span>
				<span className="block truncate text-[0.66rem] text-muted-foreground">{label}</span>
			</span>
		</button>
	)
}

function AttentionCard({ item }: { item: AttentionItem }) {
	const icon =
		item.kind === "drift" ? (
			<AlertTriangle className="size-4" />
		) : item.kind === "cli" ? (
			<TerminalSquare className="size-4" />
		) : (
			<KeyRound className="size-4" />
		)
	return (
		<Card className="native-card flex items-start gap-3 p-3 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-px hover:border-primary/30 hover:shadow-md">
			<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/12 text-amber-600">
				{icon}
			</div>
			<div className="min-w-0 flex-1">
				<div className="truncate text-[0.78rem] font-medium" title={item.problem}>
					{item.problem}
				</div>
				<div className="mt-1.5 flex min-w-0 items-center gap-2 rounded-md bg-muted px-2 py-1.5">
					<code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[0.66rem] text-muted-foreground">
						{item.command}
					</code>
					<CopyButton text={item.command} className="shrink-0 rounded-md" />
				</div>
			</div>
		</Card>
	)
}

function RuntimeChip({ runtime, version }: { runtime: string; version: string | null }) {
	return (
		<Badge
			variant={version ? "default" : "dim"}
			className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.6rem] font-normal text-muted-foreground"
		>
			{runtime} {version ? `v${version}` : "—"}
		</Badge>
	)
}

export function OverviewTab({
	state,
	onSelectPlugin,
	searchFocusToken,
}: {
	state: HarnessState
	onSelectPlugin: (plugin: string) => void
	searchFocusToken: number
}) {
	const [query, setQuery] = useState("")
	const [gridFilter, setGridFilter] = useState<GridFilter>("all")
	const [shortcutFlash, setShortcutFlash] = useState(false)
	const searchRef = useRef<HTMLInputElement>(null)
	const attentionRef = useRef<HTMLElement>(null)
	const gridRef = useRef<HTMLElement>(null)

	const attention = useMemo(() => buildAttention(state), [state])
	const missingClis = attention.filter((item) => item.kind === "cli").length
	const unsetEnv = attention.filter((item) => item.kind === "env").length
	const drifts = attention.filter((item) => item.kind === "drift").length
	const installedCount = state.plugins.filter(
		(plugin) => plugin.installedClaude !== null || plugin.installedCodex !== null,
	).length
	const hooks = state.plugins.flatMap((plugin) => plugin.hooks ?? [])
	const hooksOn = hooks.filter((hook) => hook.enabled).length
	const allGood =
		state.plugins.length > 0 &&
		state.plugins.every((plugin) => pluginState(plugin) === "complete") &&
		missingClis === 0 &&
		unsetEnv === 0 &&
		drifts === 0 &&
		hooksOn === hooks.length

	useEffect(() => {
		if (searchFocusToken === 0) return
		searchRef.current?.focus()
		setShortcutFlash(true)
		const timer = window.setTimeout(() => setShortcutFlash(false), 500)
		return () => window.clearTimeout(timer)
	}, [searchFocusToken])

	function chooseFilter(filter: GridFilter, target: "attention" | "grid") {
		setGridFilter((current) => (current === filter ? "all" : filter))
		window.requestAnimationFrame(() => {
			;(target === "attention" ? attentionRef.current : gridRef.current)?.scrollIntoView({
				behavior: "smooth",
				block: "start",
			})
		})
	}

	const filteredPlugins = state.plugins.filter((plugin) => {
		const normalized = query.trim().toLowerCase()
		if (normalized && !plugin.name.toLowerCase().includes(normalized)) return false
		if (gridFilter === "installed")
			return plugin.installedClaude !== null || plugin.installedCodex !== null
		if (gridFilter === "missing-cli")
			return plugin.checks?.some((check) => check.kind === "cli" && !check.installed)
		if (gridFilter === "unset-env")
			return plugin.checks?.some((check) => check.kind === "env" && !check.installed)
		if (gridFilter === "hooks") return (plugin.hooks?.length ?? 0) > 0
		return true
	})

	return (
		<div className="space-y-6">
			<section aria-labelledby="health-heading">
				<div className="mb-3 flex items-center justify-between gap-3">
					<div>
						<h2 id="health-heading" className="text-[0.95rem] font-semibold tracking-[-0.01em]">
							System health
						</h2>
						<p className="mt-0.5 text-[0.7rem] text-muted-foreground">
							{allGood
								? "Everything is configured and up to date."
								: "Select a status to narrow the dashboard."}
						</p>
					</div>
					{allGood && (
						<div className="flex items-center gap-1.5 rounded-md bg-green-500/10 px-2.5 py-1.5 text-[0.7rem] font-medium text-green-700">
							<Check className="size-3.5" /> All good
						</div>
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					<HealthChip
						icon={<PackageCheck className="size-4" />}
						value={
							installedCount === state.plugins.length
								? "All installed"
								: `${installedCount} of ${state.plugins.length}`
						}
						label="plugins installed"
						good={installedCount === state.plugins.length}
						active={gridFilter === "installed"}
						onClick={() => chooseFilter("installed", "grid")}
					/>
					<HealthChip
						icon={
							missingClis === 0 ? (
								<Check className="size-4" />
							) : (
								<TerminalSquare className="size-4" />
							)
						}
						value={missingClis === 0 ? "Ready" : String(missingClis)}
						label={missingClis === 1 ? "missing CLI" : "missing CLIs"}
						good={missingClis === 0}
						active={gridFilter === "missing-cli"}
						onClick={() =>
							chooseFilter(
								missingClis > 0 ? "missing-cli" : "all",
								missingClis > 0 ? "attention" : "grid",
							)
						}
					/>
					<HealthChip
						icon={unsetEnv === 0 ? <Check className="size-4" /> : <KeyRound className="size-4" />}
						value={unsetEnv === 0 ? "Configured" : String(unsetEnv)}
						label={unsetEnv === 1 ? "unset environment key" : "unset environment keys"}
						good={unsetEnv === 0}
						active={gridFilter === "unset-env"}
						onClick={() =>
							chooseFilter(unsetEnv > 0 ? "unset-env" : "all", unsetEnv > 0 ? "attention" : "grid")
						}
					/>
					<HealthChip
						icon={
							hooksOn === hooks.length ? (
								<Check className="size-4" />
							) : (
								<CircleDot className="size-4" />
							)
						}
						value={
							hooks.length === 0
								? "None required"
								: hooksOn === hooks.length
									? "Enabled"
									: `${hooksOn} of ${hooks.length}`
						}
						label="hooks enabled"
						good={hooksOn === hooks.length}
						active={gridFilter === "hooks"}
						onClick={() => chooseFilter("hooks", "grid")}
					/>
				</div>
			</section>

			{attention.length > 0 && (
				<section ref={attentionRef} aria-labelledby="attention-heading" className="scroll-mt-20">
					<div className="mb-3">
						<h2 id="attention-heading" className="text-[0.95rem] font-semibold tracking-[-0.01em]">
							Needs attention
						</h2>
						<p className="mt-0.5 text-[0.7rem] text-muted-foreground">
							Copy a suggested command to resolve each item.
						</p>
					</div>
					<div className="grid gap-2 xl:grid-cols-2">
						{attention
							.filter((item) => {
								if (gridFilter === "missing-cli") return item.kind === "cli"
								if (gridFilter === "unset-env") return item.kind === "env"
								return true
							})
							.map((item) => (
								<AttentionCard key={item.id} item={item} />
							))}
					</div>
				</section>
			)}

			<section ref={gridRef} aria-labelledby="plugins-heading" className="scroll-mt-20">
				<div className="mb-3 flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 id="plugins-heading" className="text-[0.95rem] font-semibold tracking-[-0.01em]">
							Plugins
						</h2>
						<p className="mt-0.5 text-[0.7rem] text-muted-foreground">
							{filteredPlugins.length} of {state.plugins.length} shown
						</p>
					</div>
					<div
						className={cn(
							"flex h-8 min-w-64 items-center gap-2 rounded-md border border-border bg-input px-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15",
							shortcutFlash && "shortcut-flash",
						)}
					>
						<Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
						<input
							ref={searchRef}
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Filter plugins"
							aria-label="Filter plugins"
							className="min-w-0 flex-1 cursor-text bg-transparent text-[0.75rem] outline-none placeholder:text-muted-foreground"
						/>
						{query ? (
							<button
								type="button"
								onClick={() => setQuery("")}
								aria-label="Clear plugin filter"
								className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
							>
								<X className="size-3" />
							</button>
						) : (
							<kbd className="rounded-sm border border-border bg-background/50 px-1 py-0.5 text-[0.58rem] text-muted-foreground">
								⌘F / ⌘K
							</kbd>
						)}
					</div>
				</div>

				{gridFilter !== "all" && (
					<button
						type="button"
						onClick={() => setGridFilter("all")}
						className="mb-3 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[0.66rem] font-medium text-primary hover:bg-primary/15"
					>
						Filtered by {gridFilter.replaceAll("-", " ")} <X className="size-3" />
					</button>
				)}

				{filteredPlugins.length > 0 ? (
					<div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
						{filteredPlugins.map((plugin) => {
							const status = pluginState(plugin)
							return (
								<Card
									key={plugin.name}
									className="native-card group relative overflow-hidden transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
								>
									<button
										type="button"
										onClick={() => onSelectPlugin(plugin.name)}
										className="w-full p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
									>
										<div className="flex items-start gap-2.5">
											<DitherAvatar
												name={plugin.name}
												hue={bandedHue(plugin.name)}
												size={34}
												className="shrink-0 rounded-md bg-muted"
											/>
											<div className="min-w-0 flex-1 pr-5">
												<div className="truncate text-[0.82rem] font-semibold">{plugin.name}</div>
												<div className="mt-1 flex flex-wrap gap-1">
													<RuntimeChip runtime="claude" version={plugin.installedClaude} />
													<RuntimeChip runtime="codex" version={plugin.installedCodex} />
												</div>
											</div>
											<ChevronRight className="mt-2 size-3.5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
										</div>
										<div className="mt-3 flex items-center gap-1.5 text-[0.66rem] text-muted-foreground">
											<span
												className={cn(
													"size-2 rounded-full",
													status === "complete" && "bg-green-500",
													status === "partial" && "bg-amber-500",
													status === "missing" && "bg-zinc-400",
												)}
											/>
											{statusLabel(plugin)}
										</div>
									</button>
									{!plugin.hasSetupManifest && (
										<div className="absolute right-7 top-2.5">
											<ManifestInfo compact />
										</div>
									)}
								</Card>
							)
						})}
					</div>
				) : (
					<Card className="native-card flex min-h-36 flex-col items-center justify-center p-6 text-center">
						<Command className="mb-2 size-6 text-muted-foreground" strokeWidth={1.5} />
						<div className="text-[0.8rem] font-medium">No matching plugins</div>
						<div className="mt-1 text-[0.68rem] text-muted-foreground">
							Clear the search or status filter to show the full grid.
						</div>
						<button
							type="button"
							onClick={() => {
								setQuery("")
								setGridFilter("all")
							}}
							className="mt-3 rounded-md bg-primary px-2.5 py-1.5 text-[0.68rem] font-medium text-primary-foreground"
						>
							Clear filters
						</button>
					</Card>
				)}
			</section>

			<p className="text-[0.65rem] text-muted-foreground">
				Generated {state.generatedAt} on {state.platform}.
			</p>
		</div>
	)
}
