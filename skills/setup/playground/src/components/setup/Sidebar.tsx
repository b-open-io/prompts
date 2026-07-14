"use client"

import {
	Boxes,
	CheckCircle2,
	ChevronRight,
	Circle,
	LoaderCircle,
	Puzzle,
	RefreshCw,
} from "lucide-react"
import Image from "next/image"
import { useState } from "react"
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
import { type HarnessState, RUNTIMES, type Runtime } from "@/lib/types"
import { cn } from "@/lib/utils"

type InstallState = "complete" | "partial" | "missing"

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

export function Sidebar({
	state,
	activeView,
	shellMode,
	selectedRuntime,
	onSelect,
	onRuntimeChange,
	onRefresh,
	refreshing,
}: {
	state: HarnessState | null
	activeView: string
	shellMode: "standalone" | "agent-master"
	selectedRuntime: Runtime | null
	onSelect: (view: string) => void
	onRuntimeChange: (runtime: Runtime) => void
	onRefresh: () => void
	refreshing: boolean
}) {
	const [pluginsExpanded, setPluginsExpanded] = useState(true)
	const { play } = useSound()

	function selectRuntime(runtime: string) {
		const entry = RUNTIMES.find((candidate) => candidate.id === runtime)
		if (!entry) return
		play("DROPDOWN_CLOSE")
		onRuntimeChange(entry.id)
	}

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
					onClick={() => onSelect("overview")}
					data-sound="nav-tab-switch"
					aria-current={activeView === "overview" ? "page" : undefined}
					className={cn(
						"mb-4 flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[0.78rem] font-medium",
						activeView === "overview"
							? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_0.5px_var(--sidebar-border)]"
							: "text-sidebar-foreground hover:bg-sidebar-accent/60",
					)}
				>
					<Boxes className="size-4" strokeWidth={1.7} aria-hidden="true" />
					Overview
				</button>

				<button
					type="button"
					onClick={() => {
						setPluginsExpanded(true)
						onSelect("plugins")
					}}
					onKeyDown={(event) => {
						if (event.key === "ArrowRight") {
							event.preventDefault()
							setPluginsExpanded(true)
						} else if (event.key === "ArrowLeft") {
							event.preventDefault()
							setPluginsExpanded(false)
						}
					}}
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
				<div id="setup-plugin-navigation" hidden={!pluginsExpanded}>
					{state?.plugins.map((plugin) => {
						const active = activeView === plugin.name
						return (
							<div key={plugin.name} className="relative">
								<button
									type="button"
									onClick={() => onSelect(plugin.name)}
									data-sound="nav-tab-switch"
									aria-current={active ? "page" : undefined}
									className={cn(
										"group flex h-8 w-full items-center gap-2 rounded-md px-2 pr-14 text-left text-[0.76rem]",
										active
											? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_0.5px_var(--sidebar-border)]"
											: "text-sidebar-foreground hover:bg-sidebar-accent/60",
									)}
								>
									<PluginIcon
										name={plugin.name}
										size={18}
										className="shrink-0 rounded-sm bg-background/35"
									/>
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
					})}
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
}
