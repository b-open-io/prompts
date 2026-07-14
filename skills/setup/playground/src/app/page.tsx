"use client"

import { CheckCircle2, Hammer, LoaderCircle } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSound } from "@/components/SoundProvider"
import { Banners } from "@/components/setup/Banners"
import { OverviewTab } from "@/components/setup/OverviewTab"
import { PlanPanel } from "@/components/setup/PlanPanel"
import { PluginTab } from "@/components/setup/PluginTab"
import { Sidebar } from "@/components/setup/Sidebar"
import { Button } from "@/components/ui/button"
import { assemblePlanSelections, initAllSelections, reconcileSelections } from "@/lib/selections"
import type { HarnessState, Runtime, Selections } from "@/lib/types"

type PlanResult = { markdown: string }
type ShellMode = "standalone" | "agent-master"

const SHELL_STORAGE_KEY = "bopen-setup-shell"

export default function SetupPlaygroundPage() {
	const { play } = useSound()
	const [state, setState] = useState<HarnessState | null>(null)
	const [selections, setSelections] = useState<Selections>({})
	const [activeTab, setActiveTab] = useState("overview")
	const [selectedRuntime, setSelectedRuntime] = useState<Runtime | null>(null)
	const [refreshing, setRefreshing] = useState(false)
	const [building, setBuilding] = useState(false)
	const [plan, setPlan] = useState<PlanResult | null>(null)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [transientErrors, setTransientErrors] = useState<string[]>([])
	const [shellMode, setShellMode] = useState<ShellMode>("standalone")
	const [searchFocusToken, setSearchFocusToken] = useState(0)
	const [pluginGridFocusToken, setPluginGridFocusToken] = useState(0)
	const errorIdRef = useRef(0)

	const pushTransientError = useCallback((msg: string) => {
		const id = errorIdRef.current++
		setTransientErrors((prev) => [...prev, `${id}:${msg}`])
		setTimeout(() => {
			setTransientErrors((prev) => prev.filter((m) => !m.startsWith(`${id}:`)))
		}, 8000)
	}, [])

	const fetchState = useCallback(async (preserve: boolean) => {
		const res = await fetch("/api/state")
		if (!res.ok) throw new Error(`GET /api/state failed: ${res.status}`)
		const newState = (await res.json()) as HarnessState
		setSelections((prev) =>
			preserve ? reconcileSelections(prev, newState) : initAllSelections(newState),
		)
		setState(newState)
		if (!preserve) {
			setSelectedRuntime(newState.runtimeArg)
			setActiveTab("overview")
		} else {
			setActiveTab((prev) =>
				prev !== "overview" && prev !== "plugins" && !newState.plugins.some((p) => p.name === prev)
					? "overview"
					: prev,
			)
		}
	}, [])

	useEffect(() => {
		fetchState(false).catch((err) => {
			setLoadError(err instanceof Error ? err.message : String(err))
		})
	}, [fetchState])

	useEffect(() => {
		const shellParam = new URLSearchParams(window.location.search).get("shell")
		if (shellParam === "agent-master") {
			window.localStorage.setItem(SHELL_STORAGE_KEY, "agent-master")
			setShellMode("agent-master")
			return
		}
		if (window.localStorage.getItem(SHELL_STORAGE_KEY) === "agent-master") {
			setShellMode("agent-master")
		}
	}, [])

	useEffect(() => {
		function handleShortcut(event: KeyboardEvent) {
			if (!event.metaKey || (event.key.toLowerCase() !== "f" && event.key.toLowerCase() !== "k")) {
				return
			}
			event.preventDefault()
			setActiveTab("overview")
			setSearchFocusToken((token) => token + 1)
		}
		document.addEventListener("keydown", handleShortcut)
		return () => document.removeEventListener("keydown", handleShortcut)
	}, [])

	const handleRefresh = useCallback(async () => {
		play("LOADING_START")
		setRefreshing(true)
		try {
			await fetchState(true)
			play("LOADING_COMPLETE")
		} catch (err) {
			play("NOTIFICATION_ERROR")
			pushTransientError(`Failed to refresh: ${err instanceof Error ? err.message : String(err)}`)
		} finally {
			setRefreshing(false)
		}
	}, [fetchState, play, pushTransientError])

	const handleSelectView = useCallback((view: string) => {
		setActiveTab(view)
		if (view === "plugins") setPluginGridFocusToken((token) => token + 1)
	}, [])

	async function handleBuildPlan() {
		if (!state || !selectedRuntime) return
		setBuilding(true)
		try {
			const res = await fetch("/api/plan", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(assemblePlanSelections(state, selections, selectedRuntime)),
			})
			if (!res.ok) throw new Error(`POST /api/plan failed: ${res.status}`)
			const data = (await res.json()) as PlanResult
			setPlan(data)
		} catch (err) {
			pushTransientError(
				`Failed to build plan: ${err instanceof Error ? err.message : String(err)}`,
			)
		} finally {
			setBuilding(false)
		}
	}

	function toggleInstallPlugin(pluginName: string) {
		setSelections((prev) => ({
			...prev,
			[pluginName]: { ...prev[pluginName], installPlugin: !prev[pluginName].installPlugin },
		}))
	}

	function toggleCheck(pluginName: string, id: string) {
		setSelections((prev) => {
			const next = new Set(prev[pluginName].checks)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return { ...prev, [pluginName]: { ...prev[pluginName], checks: next } }
		})
	}

	function toggleHook(pluginName: string, hookName: string) {
		setSelections((prev) => ({
			...prev,
			[pluginName]: {
				...prev[pluginName],
				hooks: { ...prev[pluginName].hooks, [hookName]: !prev[pluginName].hooks[hookName] },
			},
		}))
	}

	const activePlugin = state?.plugins.find((p) => p.name === activeTab) ?? null
	const activeTitle = activePlugin?.name ?? (activeTab === "plugins" ? "Plugins" : "Overview")

	return (
		<div className="app-shell">
			<Sidebar
				state={state}
				activeView={activeTab}
				shellMode={shellMode}
				selectedRuntime={selectedRuntime}
				onSelect={handleSelectView}
				onRuntimeChange={setSelectedRuntime}
				onRefresh={handleRefresh}
				refreshing={refreshing}
			/>

			<Banners state={state} transientErrors={transientErrors} />

			<section className="workspace">
				<header className="workspace-toolbar">
					<div className="min-w-0 flex-1">
						<h1 className="truncate text-[0.95rem] font-semibold tracking-[-0.01em]">
							{activeTitle}
						</h1>
						<div className="truncate text-[0.65rem] text-muted-foreground">
							{activePlugin ? "Plugin setup details" : "Setup health and installed plugins"}
						</div>
					</div>
					{state && state.runtimeArg === state.runtimeDetected && (
						<div className="hidden items-center gap-1.5 text-[0.66rem] text-muted-foreground sm:flex">
							<CheckCircle2 className="size-3 text-green-600" /> Runtime {state.runtimeDetected}
						</div>
					)}
					<Button
						variant="primary"
						onClick={handleBuildPlan}
						disabled={building || !state || !selectedRuntime}
						className="h-8 rounded-md px-3 normal-case shadow-sm"
					>
						{building ? (
							<LoaderCircle className="size-3.5 animate-spin" />
						) : (
							<Hammer className="size-3.5" />
						)}
						{building ? "Building…" : "Build setup plan"}
					</Button>
				</header>

				<main className="content-view flex-1">
					{!state ? (
						<div className="native-card flex min-h-44 items-center justify-center bg-card p-6 text-center">
							<div>
								{!loadError && (
									<LoaderCircle className="mx-auto mb-2 size-5 animate-spin text-primary" />
								)}
								<p className="text-[0.78rem] text-muted-foreground">
									{loadError
										? `Could not load /api/state. Is the setup server running? (${loadError})`
										: "Checking installed runtimes and plugins…"}
								</p>
							</div>
						</div>
					) : activeTab === "overview" || activeTab === "plugins" ? (
						<OverviewTab
							state={state}
							onSelectPlugin={handleSelectView}
							searchFocusToken={searchFocusToken}
							pluginGridFocusToken={pluginGridFocusToken}
						/>
					) : activePlugin && selectedRuntime && selections[activePlugin.name] ? (
						<PluginTab
							plugin={activePlugin}
							selection={selections[activePlugin.name]}
							selectedRuntime={selectedRuntime}
							onToggleInstallPlugin={() => toggleInstallPlugin(activePlugin.name)}
							onToggleCheck={(id) => toggleCheck(activePlugin.name, id)}
							onToggleHook={(hookName) => toggleHook(activePlugin.name, hookName)}
						/>
					) : (
						<p className="py-2 text-[0.78rem] text-muted-foreground">Unknown plugin.</p>
					)}
				</main>
			</section>

			{plan && <PlanPanel markdown={plan.markdown} onClose={() => setPlan(null)} />}
		</div>
	)
}
