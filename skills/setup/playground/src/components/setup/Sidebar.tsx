"use client"

import {
	BookOpen,
	Boxes,
	CheckCircle2,
	ChevronRight,
	Circle,
	ExternalLink,
	LoaderCircle,
	LockKeyhole,
	PackageCheck,
	Puzzle,
	RefreshCw,
} from "lucide-react"
import Image from "next/image"
import { memo, useCallback, useEffect, useState } from "react"
import { DitherGradient } from "@/components/dither-kit/gradient"
import { useSound } from "@/components/SoundProvider"
import { SoundToggle } from "@/components/SoundToggle"
import { ManifestInfo } from "@/components/setup/ManifestInfo"
import { PluginIcon } from "@/components/setup/PluginIcon"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { PACK_CATALOG } from "@/lib/pack-catalog"
import { type HarnessState, type PluginState, RUNTIMES, type Runtime } from "@/lib/types"
import { cn } from "@/lib/utils"

type InstallState = "complete" | "partial" | "missing"

const PLUGINS_EXPANDED_STORAGE_KEY = "bopen-setup-plugins-expanded"

function installState(installedClaude: string | null, installedCodex: string | null): InstallState {
	if (installedClaude && installedCodex) return "complete"
	if (installedClaude || installedCodex) return "partial"
	return "missing"
}

function StateDot({ state }: { state: InstallState }) {
	const label =
		state === "complete"
			? "Installed in all detected runtimes"
			: state === "partial"
				? "Partially installed"
				: "Not installed"
	return (
		<span
			role="img"
			aria-label={label}
			title={label}
			className={cn(
				"size-2 shrink-0 rounded-full shadow-[0_0_0_1px_color-mix(in_srgb,currentColor_22%,transparent)]",
				state === "complete" && "bg-green-500 text-green-600",
				state === "partial" && "bg-amber-500 text-amber-600",
				state === "missing" && "bg-zinc-400 text-zinc-500",
			)}
		/>
	)
}

function AgentMasterBrand() {
	const [iconFailed, setIconFailed] = useState(false)
	return (
		<div className="flex items-center gap-2.5">
			<div className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-[linear-gradient(145deg,#2b120a,#557f99)] shadow-sm">
				<div className="absolute inset-[7px] rounded-sm border border-white/45 bg-[radial-gradient(circle_at_35%_30%,#e38f1a_0_12%,transparent_13%),linear-gradient(135deg,transparent_34%,#8cb4cb_35%_63%,transparent_64%)]" />
				{!iconFailed && (
					<Image
						src="/agent-master-icon.png"
						alt=""
						width={36}
						height={36}
						unoptimized
						className="absolute inset-0 size-full object-cover"
						onError={() => setIconFailed(true)}
					/>
				)}
			</div>
			<div className="min-w-0">
				<div className="truncate text-[0.9rem] font-semibold tracking-[-0.01em]">Agent Master</div>
				<div className="text-[0.68rem] text-muted-foreground">by bOpen</div>
			</div>
		</div>
	)
}

const SidebarPluginRow = memo(function SidebarPluginRow({
	plugin,
	active,
	onSelect,
}: {
	plugin: PluginState
	active: boolean
	onSelect: (view: string) => void
}) {
	const handleSelect = useCallback(() => onSelect(plugin.name), [onSelect, plugin.name])

	return (
		<div className="relative">
			<button
				type="button"
				onClick={handleSelect}
				data-sound="nav-tab-switch"
				aria-current={active ? "page" : undefined}
				className={cn(
					"group flex h-8 w-full items-center gap-2 rounded-md px-2 pr-14 text-left text-[0.76rem]",
					active
						? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_0.5px_var(--sidebar-border)]"
						: "text-sidebar-foreground hover:bg-sidebar-accent/60",
				)}
			>
				<PluginIcon name={plugin.name} size={18} className="shrink-0 rounded-sm bg-background/35" />
				<span className="min-w-0 flex-1 truncate">{plugin.name}</span>
			</button>
			{!plugin.hasSetupManifest && (
				<div className="absolute right-6 top-1.5">
					<ManifestInfo compact />
				</div>
			)}
			<div className="pointer-events-none absolute right-2 top-3">
				<StateDot state={installState(plugin.installedClaude, plugin.installedCodex)} />
			</div>
		</div>
	)
})

export const Sidebar = memo(function Sidebar({
	state,
	activeView,
	shellMode,
	selectedRuntime,
	onSelect,
	onRuntimeChange,
	onRefresh,
	refreshing,
	packAccess,
	onOpenStore,
}: {
	state: HarnessState | null
	activeView: string
	shellMode: "standalone" | "agent-master"
	selectedRuntime: Runtime | null
	onSelect: (view: string) => void
	onRuntimeChange: (runtime: Runtime) => void
	onRefresh: () => void
	refreshing: boolean
	packAccess: string[] | null
	onOpenStore: (slug: string) => void
}) {
	const [pluginsExpanded, setPluginsExpanded] = useState(true)
	const { play } = useSound()
	const unlockedPacks = new Set(packAccess ?? [])
	const orderedPacks = [...PACK_CATALOG].sort(
		(a, b) => Number(unlockedPacks.has(b.slug)) - Number(unlockedPacks.has(a.slug)),
	)

	useEffect(() => {
		const stored = window.localStorage.getItem(PLUGINS_EXPANDED_STORAGE_KEY)
		if (stored === "true" || stored === "false") {
			setPluginsExpanded(stored === "true")
		}
	}, [])

	const setPluginsDisclosure = useCallback((expanded: boolean) => {
		setPluginsExpanded(expanded)
		window.localStorage.setItem(PLUGINS_EXPANDED_STORAGE_KEY, String(expanded))
	}, [])

	const handleOverviewSelect = useCallback(() => onSelect("overview"), [onSelect])

	const handlePluginsSelect = useCallback(() => {
		setPluginsDisclosure(!pluginsExpanded)
		onSelect("plugins")
	}, [onSelect, pluginsExpanded, setPluginsDisclosure])

	const handlePluginsKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLButtonElement>) => {
			if (event.key === "ArrowRight") {
				event.preventDefault()
				setPluginsDisclosure(true)
			} else if (event.key === "ArrowLeft") {
				event.preventDefault()
				setPluginsDisclosure(false)
			}
		},
		[setPluginsDisclosure],
	)

	const selectRuntime = useCallback(
		(runtime: string) => {
			const entry = RUNTIMES.find((candidate) => candidate.id === runtime)
			if (!entry) return
			play("DROPDOWN_CLOSE")
			onRuntimeChange(entry.id)
		},
		[onRuntimeChange, play],
	)

	return (
		<aside className="setup-sidebar">
			<div className="relative min-h-[72px] overflow-hidden px-4 pb-3 pt-4">
				<DitherGradient
					from="blue"
					to="transparent"
					direction="right"
					cell={4}
					opacity={0.38}
					className="opacity-35"
				/>
				<div className="relative">
					{shellMode === "agent-master" ? (
						<AgentMasterBrand />
					) : (
						<div className="py-2 font-mono text-[0.82rem] font-bold tracking-[0.06em]">
							[ bOpen SETUP ]
						</div>
					)}
				</div>
			</div>

			<nav aria-label="Setup navigation" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
				<button
					type="button"
					onClick={handleOverviewSelect}
					data-sound="nav-tab-switch"
					aria-current={activeView === "overview" ? "page" : undefined}
					className={cn(
						"mb-2 flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[0.78rem] font-medium",
						activeView === "overview"
							? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_0.5px_var(--sidebar-border)]"
							: "text-sidebar-foreground hover:bg-sidebar-accent/60",
					)}
				>
					<Boxes className="size-4" strokeWidth={1.7} aria-hidden="true" />
					Overview
				</button>

				{shellMode === "agent-master" && (
					<div className="mb-3 border-b border-sidebar-border pb-3">
						<button
							type="button"
							onClick={() => onSelect("packs")}
							data-sound="nav-tab-switch"
							aria-current={activeView === "packs" ? "page" : undefined}
							className={cn(
								"mb-1 flex h-8 w-full items-center gap-2 rounded-md px-2 text-left font-mono text-[0.65rem] font-semibold tracking-[0.1em]",
								activeView === "packs"
									? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_0.5px_var(--sidebar-border)]"
									: "text-sidebar-foreground hover:bg-sidebar-accent/60",
							)}
						>
							<BookOpen className="size-4" strokeWidth={1.7} aria-hidden="true" />
							<span className="flex-1">MY PACKS</span>
							{packAccess && (
								<span className="text-[0.58rem] text-muted-foreground">{packAccess.length}</span>
							)}
						</button>
						{packAccess === null ? (
							<button
								type="button"
								onClick={() => onSelect("packs")}
								className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[0.68rem] text-muted-foreground hover:bg-sidebar-accent/50"
							>
								<LockKeyhole className="size-3.5" /> Sign in to view purchases
							</button>
						) : (
							<div className="space-y-0.5">
								{orderedPacks.map((pack) => {
									const unlocked = unlockedPacks.has(pack.slug)
									const view = `pack:${pack.slug}`
									return (
										<button
											type="button"
											key={pack.slug}
											onClick={() => (unlocked ? onSelect(view) : onOpenStore(pack.slug))}
											aria-current={activeView === view ? "page" : undefined}
											aria-label={unlocked ? `Open ${pack.name}` : `View ${pack.name} in the store`}
											className={cn(
												"flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[0.69rem]",
												activeView === view
													? "bg-sidebar-accent text-sidebar-accent-foreground"
													: "text-sidebar-foreground hover:bg-sidebar-accent/50",
											)}
										>
											{unlocked ? (
												<PackageCheck className="size-3.5 shrink-0 text-green-600" />
											) : (
												<LockKeyhole className="size-3.5 shrink-0 text-muted-foreground" />
											)}
											<span className="min-w-0 flex-1 truncate">{pack.name}</span>
											{!unlocked && (
												<ExternalLink className="size-3 shrink-0 text-muted-foreground" />
											)}
										</button>
									)
								})}
							</div>
						)}
					</div>
				)}

				<button
					type="button"
					onClick={handlePluginsSelect}
					onKeyDown={handlePluginsKeyDown}
					aria-current={activeView === "plugins" ? "page" : undefined}
					aria-expanded={pluginsExpanded}
					aria-controls="setup-plugin-navigation"
					data-sound="nav-tab-switch"
					className={cn(
						"mb-1 flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[0.78rem] font-medium",
						activeView === "plugins"
							? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_0.5px_var(--sidebar-border)]"
							: "text-sidebar-foreground hover:bg-sidebar-accent/60",
					)}
				>
					<Puzzle className="size-4" strokeWidth={1.7} aria-hidden="true" />
					<span className="flex-1">Plugins</span>
					<ChevronRight
						className={cn("size-3.5 transition-transform", pluginsExpanded && "rotate-90")}
						aria-hidden="true"
					/>
				</button>
				<div id="setup-plugin-navigation" hidden={!pluginsExpanded} className="space-y-1">
					{state?.plugins.map((plugin) => (
						<SidebarPluginRow
							key={plugin.name}
							plugin={plugin}
							active={activeView === plugin.name}
							onSelect={onSelect}
						/>
					))}
				</div>
				{!state && (
					<div className="flex items-center gap-2 px-2 py-2 text-[0.72rem] text-muted-foreground">
						<LoaderCircle className="size-3.5 animate-spin" /> Loading…
					</div>
				)}
			</nav>

			<div className="border-t border-sidebar-border p-3">
				<div className="mb-2 flex items-center justify-between gap-2">
					<span className="font-mono text-[0.61rem] uppercase tracking-[0.1em] text-muted-foreground">
						Plan for
					</span>
					<Select value={selectedRuntime ?? undefined} onValueChange={selectRuntime}>
						<SelectTrigger className="h-7 rounded-md bg-background/60 px-2 py-0">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="rounded-md">
							{RUNTIMES.map((runtime) => (
								<SelectItem key={runtime.id} value={runtime.id} className="rounded-sm">
									<span>{runtime.label}</span>
									{runtime.tier === "experimental" && (
										<span className="ml-1 normal-case text-muted-foreground">experimental</span>
									)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="mb-2 flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
					{state && state.runtimeArg === state.runtimeDetected ? (
						<CheckCircle2 className="size-3 text-green-600" aria-hidden="true" />
					) : (
						<Circle className="size-3 text-amber-600" aria-hidden="true" />
					)}
					<span className="truncate">
						Detected {state?.runtimeDetected ?? "…"}
						{state && state.runtimeArg !== state.runtimeDetected
							? ` · requested ${state.runtimeArg}`
							: ""}
					</span>
				</div>
				<Button
					onClick={onRefresh}
					disabled={refreshing}
					data-sound="none"
					className="h-7 w-full rounded-md normal-case"
				>
					<RefreshCw className={cn("size-3", refreshing && "animate-spin")} aria-hidden="true" />
					{refreshing ? "Re-checking…" : "Refresh"}
				</Button>
				<div className="mt-2 flex items-center justify-between gap-2 text-[0.65rem] text-muted-foreground">
					<span>Interface sound</span>
					<SoundToggle />
				</div>
			</div>
		</aside>
	)
})
