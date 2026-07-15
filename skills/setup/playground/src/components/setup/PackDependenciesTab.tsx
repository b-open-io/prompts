"use client"

import { CheckCircle2, Circle, LoaderCircle, PackageCheck, Play, TriangleAlert } from "lucide-react"
import { useMemo, useState } from "react"
import { CopyButton } from "@/components/setup/CopyButton"
import { Button } from "@/components/ui/button"
import type { PackRuntime, PackState, Runtime } from "@/lib/types"
import { cn } from "@/lib/utils"

const RUNTIMES: Array<{ id: PackRuntime; label: string }> = [
	{ id: "claude", label: "Claude Code" },
	{ id: "codex", label: "Codex" },
	{ id: "grok", label: "Grok Build" },
]

export function PackDependenciesTab({
	pack,
	selectedRuntime,
	onInstallComplete,
}: {
	pack: PackState
	selectedRuntime: Runtime
	onInstallComplete: () => Promise<void>
}) {
	const [installing, setInstalling] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const activeRuntime = RUNTIMES.some((entry) => entry.id === selectedRuntime)
		? (selectedRuntime as PackRuntime)
		: null
	const missingForActive = useMemo(
		() =>
			activeRuntime
				? pack.dependencies.filter((dependency) => !dependency.runtimes[activeRuntime].installed)
				: [],
		[activeRuntime, pack.dependencies],
	)

	async function installMissing() {
		if (!activeRuntime) return
		setInstalling(true)
		setError(null)
		try {
			const response = await fetch("/api/pack/install", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ runtime: activeRuntime }),
			})
			const body = (await response.json()) as { error?: string }
			if (!response.ok) throw new Error(body.error ?? `Install failed (${response.status})`)
			await onInstallComplete()
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : String(reason))
		} finally {
			setInstalling(false)
		}
	}

	return (
		<div className="space-y-4">
			<section className="native-card rounded-xl border border-border bg-card p-4 shadow-sm">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex items-start gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<PackageCheck className="size-5" />
						</div>
						<div>
							<h2 className="text-[0.9rem] font-semibold">{pack.name}</h2>
							<p className="mt-0.5 text-[0.68rem] text-muted-foreground">
								{pack.dependencies.length} required plugins · {pack.skillIds.length || "manifest"}{" "}
								skill
								{pack.skillIds.length === 1 ? "" : "s"} · input: {pack.inputKind}
							</p>
						</div>
					</div>
					<Button
						variant="primary"
						onClick={installMissing}
						disabled={!activeRuntime || missingForActive.length === 0 || installing}
						className="h-8 rounded-md px-3 normal-case"
					>
						{installing ? (
							<LoaderCircle className="size-3.5 animate-spin" />
						) : (
							<Play className="size-3.5" />
						)}
						{installing
							? "Installing…"
							: missingForActive.length
								? `Install ${missingForActive.length} missing`
								: "Dependencies ready"}
					</Button>
				</div>
				{!activeRuntime && (
					<p className="mt-3 flex items-center gap-1.5 text-[0.68rem] text-amber-700">
						<TriangleAlert className="size-3.5" /> Select Claude Code, Codex, or Grok Build to run
						installs.
					</p>
				)}
				{error && <p className="mt-3 text-[0.68rem] text-destructive">{error}</p>}
			</section>

			<section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
				<div className="grid grid-cols-[minmax(150px,1.25fr)_repeat(3,minmax(180px,1fr))] border-b border-border bg-muted/40 px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
					<div>Dependency</div>
					{RUNTIMES.map((runtime) => (
						<div key={runtime.id}>{runtime.label}</div>
					))}
				</div>
				<div className="divide-y divide-border">
					{pack.dependencies.map((dependency) => (
						<div
							key={`${dependency.marketplace}:${dependency.name}`}
							className="grid grid-cols-[minmax(150px,1.25fr)_repeat(3,minmax(180px,1fr))] px-3 py-3"
						>
							<div className="min-w-0 pr-3">
								<div className="truncate text-[0.76rem] font-semibold">{dependency.name}</div>
								<div className="truncate font-mono text-[0.59rem] text-muted-foreground">
									{dependency.marketplace}
								</div>
							</div>
							{RUNTIMES.map((runtime) => {
								const state = dependency.runtimes[runtime.id]
								return (
									<div
										key={runtime.id}
										className={cn(
											"min-w-0 border-l border-border px-3",
											runtime.id === activeRuntime && "bg-primary/[0.035]",
										)}
									>
										<div className="flex items-center gap-1.5 text-[0.65rem]">
											{state.installed ? (
												<CheckCircle2 className="size-3.5 text-green-600" />
											) : (
												<Circle className="size-3.5 text-zinc-400" />
											)}
											<span>
												{state.installed ? (state.installedVersion ?? "installed") : "missing"}
											</span>
										</div>
										{!state.installed && (
											<div className="mt-2 flex min-w-0 items-start gap-1.5 rounded-md bg-muted px-2 py-1.5">
												<code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-[0.58rem] leading-4 text-muted-foreground">
													{state.installCommand}
												</code>
												<CopyButton text={state.installCommand} className="shrink-0" />
											</div>
										)}
									</div>
								)
							})}
						</div>
					))}
				</div>
			</section>
		</div>
	)
}
