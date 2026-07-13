"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Banners } from "@/components/setup/Banners"
import { Header } from "@/components/setup/Header"
import { OverviewTab } from "@/components/setup/OverviewTab"
import { PlanPanel } from "@/components/setup/PlanPanel"
import { PluginTab } from "@/components/setup/PluginTab"
import { TabBar } from "@/components/setup/TabBar"
import { assemblePlanSelections, initAllSelections, reconcileSelections } from "@/lib/selections"
import type { HarnessState, Selections } from "@/lib/types"

type PlanResult = { markdown: string; path: string }

export default function SetupPlaygroundPage() {
	const [state, setState] = useState<HarnessState | null>(null)
	const [selections, setSelections] = useState<Selections>({})
	const [activeTab, setActiveTab] = useState("overview")
	const [selectedRuntime, setSelectedRuntime] = useState<string | null>(null)
	const [refreshing, setRefreshing] = useState(false)
	const [building, setBuilding] = useState(false)
	const [plan, setPlan] = useState<PlanResult | null>(null)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [transientErrors, setTransientErrors] = useState<string[]>([])
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
				prev !== "overview" && !newState.plugins.some((p) => p.name === prev) ? "overview" : prev,
			)
		}
	}, [])

	useEffect(() => {
		fetchState(false).catch((err) => {
			setLoadError(err instanceof Error ? err.message : String(err))
		})
	}, [fetchState])

	async function handleRefresh() {
		setRefreshing(true)
		try {
			await fetchState(true)
		} catch (err) {
			pushTransientError(`Failed to refresh: ${err instanceof Error ? err.message : String(err)}`)
		} finally {
			setRefreshing(false)
		}
	}

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

	return (
		<div className="flex min-h-screen flex-col">
			<Header
				runtimeArg={state?.runtimeArg ?? null}
				runtimeDetected={state?.runtimeDetected ?? null}
				selectedRuntime={selectedRuntime}
				onRuntimeChange={setSelectedRuntime}
				onRefresh={handleRefresh}
				onBuildPlan={handleBuildPlan}
				refreshing={refreshing}
				building={building}
			/>

			<Banners state={state} transientErrors={transientErrors} />

			<TabBar state={state} activeTab={activeTab} onSelect={setActiveTab} />

			<main className="max-w-full flex-1 p-4">
				{!state ? (
					<p className="py-2 text-[0.78rem] text-muted-foreground">
						{loadError
							? `Could not load /api/state. Is the setup server running? (${loadError})`
							: "Loading harness state…"}
					</p>
				) : activeTab === "overview" ? (
					<OverviewTab state={state} />
				) : activePlugin && selectedRuntime ? (
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

			{plan && (
				<PlanPanel markdown={plan.markdown} path={plan.path} onClose={() => setPlan(null)} />
			)}
		</div>
	)
}
