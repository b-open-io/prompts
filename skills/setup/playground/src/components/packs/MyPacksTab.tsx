"use client"

import {
	Check,
	CircleAlert,
	ExternalLink,
	KeyRound,
	LoaderCircle,
	LockKeyhole,
	LogOut,
	PackageCheck,
	PackageOpen,
	RefreshCw,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ClassChip } from "@/components/packs/ClassChip"
import { CopyButton } from "@/components/setup/CopyButton"
import { Button } from "@/components/ui/button"
import {
	deleteSessionToken,
	loadSessionToken,
	openExternalUrl,
	storeSessionToken,
	supportsCredentialStore,
} from "@/lib/native-sdk"
import { PACK_BY_SLUG, PACK_CATALOG, type PackCatalogEntry } from "@/lib/pack-catalog"
import { diffPackDependencies } from "@/lib/pack-dependencies"
import type { HarnessState, Runtime } from "@/lib/types"

type AuthState = "checking" | "signed-out" | "authorizing" | "signed-in" | "blocked" | "error"
type EntitlementsResponse = {
	entitlements: Array<{ productId: string; slug: string | null; name: string; purchasedAt: string }>
	unlockedSlugs: string[]
}
type DeviceCode = {
	device_code: string
	user_code: string
	verification_uri: string
	verification_uri_complete?: string
	expires_in: number
	interval: number
}

const STORE_URL = "https://bopen.ai/premium"

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function PackCard({
	pack,
	unlocked,
	onOpen,
	onStore,
}: {
	pack: PackCatalogEntry
	unlocked: boolean
	onOpen: () => void
	onStore: () => void
}) {
	return (
		<div className="native-card flex min-h-36 flex-col bg-card p-4">
			<div className="mb-3 flex items-start justify-between gap-3">
				<div>
					<div className="text-[0.84rem] font-semibold">{pack.name}</div>
					<p className="mt-1 text-[0.69rem] leading-relaxed text-muted-foreground">
						{pack.tagline}
					</p>
				</div>
				{unlocked ? (
					<PackageCheck className="size-4 shrink-0 text-green-600" aria-label="Purchased" />
				) : (
					<LockKeyhole
						className="size-4 shrink-0 text-muted-foreground"
						aria-label="Not purchased"
					/>
				)}
			</div>
			<div className="mt-auto flex items-center justify-between gap-3">
				<span className="font-mono text-[0.61rem] uppercase tracking-[0.08em] text-muted-foreground">
					{pack.playbooks.length} playbooks · {pack.plugins.length} dependencies
				</span>
				<Button
					size="sm"
					variant={unlocked ? "default" : "outline"}
					onClick={unlocked ? onOpen : onStore}
					className="h-7 rounded-md normal-case"
				>
					{unlocked ? <PackageOpen className="size-3" /> : <ExternalLink className="size-3" />}
					{unlocked ? "Open" : "View store"}
				</Button>
			</div>
		</div>
	)
}

export function MyPacksTab({
	state,
	runtime,
	selectedSlug,
	onSelectPack,
	onAccessChange,
}: {
	state: HarnessState
	runtime: Runtime
	selectedSlug: string | null
	onSelectPack: (slug: string) => void
	onAccessChange: (slugs: string[] | null) => void
}) {
	const [authState, setAuthState] = useState<AuthState>("checking")
	const [entitlements, setEntitlements] = useState<EntitlementsResponse | null>(null)
	const [deviceCode, setDeviceCode] = useState<DeviceCode | null>(null)
	const [message, setMessage] = useState<string | null>(null)
	const pollGeneration = useRef(0)

	const acceptEntitlements = useCallback(
		(value: EntitlementsResponse) => {
			setEntitlements(value)
			setAuthState("signed-in")
			setMessage(null)
			onAccessChange(value.unlockedSlugs)
		},
		[onAccessChange],
	)

	const fetchPacks = useCallback(
		async (token: string) => {
			const response = await fetch("/api/agent-master/packs", {
				headers: { Authorization: `Bearer ${token}` },
				cache: "no-store",
			})
			if (response.status === 401) {
				await deleteSessionToken()
				setEntitlements(null)
				setAuthState("signed-out")
				onAccessChange(null)
				return
			}
			if (!response.ok) throw new Error(`Pack library request failed (${response.status})`)
			acceptEntitlements((await response.json()) as EntitlementsResponse)
		},
		[acceptEntitlements, onAccessChange],
	)

	useEffect(() => {
		let cancelled = false
		async function restoreSession() {
			if (!(await supportsCredentialStore())) {
				if (!cancelled) {
					setAuthState("blocked")
					setMessage(
						"This Native SDK build does not expose an OS credential store. Sign-in is disabled; no plaintext fallback will be used.",
					)
				}
				return
			}
			const token = await loadSessionToken()
			if (cancelled) return
			if (!token) {
				setAuthState("signed-out")
				onAccessChange(null)
				return
			}
			try {
				await fetchPacks(token)
			} catch (error) {
				if (!cancelled) {
					setAuthState("error")
					setMessage(error instanceof Error ? error.message : String(error))
				}
			}
		}
		restoreSession().catch((error) => {
			if (!cancelled) {
				setAuthState("error")
				setMessage(error instanceof Error ? error.message : String(error))
			}
		})
		return () => {
			cancelled = true
			pollGeneration.current += 1
		}
	}, [fetchPacks, onAccessChange])

	async function pollForToken(code: DeviceCode, generation: number) {
		let intervalSeconds = Math.max(code.interval || 5, 1)
		const expiresAt = Date.now() + code.expires_in * 1000
		while (generation === pollGeneration.current && Date.now() < expiresAt) {
			await delay(intervalSeconds * 1000)
			if (generation !== pollGeneration.current) return
			const response = await fetch("/api/agent-master/device/token", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ deviceCode: code.device_code }),
				cache: "no-store",
			})
			const result = (await response.json()) as {
				access_token?: string
				error?: string
				error_description?: string
			}
			if (response.ok && result.access_token) {
				const token = result.access_token
				await storeSessionToken(token)
				setDeviceCode(null)
				await fetchPacks(token)
				return
			}
			if (result.error === "authorization_pending") continue
			if (result.error === "slow_down") {
				intervalSeconds += 5
				continue
			}
			throw new Error(
				result.error_description ||
					result.error ||
					`Device authorization failed (${response.status})`,
			)
		}
		if (generation === pollGeneration.current)
			throw new Error("The sign-in code expired. Start again for a new code.")
	}

	async function startSignIn() {
		setAuthState("authorizing")
		setMessage(null)
		setDeviceCode(null)
		pollGeneration.current += 1
		const generation = pollGeneration.current
		try {
			const response = await fetch("/api/agent-master/device/code", {
				method: "POST",
				cache: "no-store",
			})
			const result = (await response.json()) as DeviceCode & { error_description?: string }
			if (!response.ok)
				throw new Error(result.error_description || `Could not start sign-in (${response.status})`)
			setDeviceCode(result)
			await openExternalUrl(result.verification_uri_complete || result.verification_uri)
			await pollForToken(result, generation)
		} catch (error) {
			if (generation !== pollGeneration.current) return
			setAuthState("error")
			setMessage(error instanceof Error ? error.message : String(error))
		}
	}

	async function signOut() {
		pollGeneration.current += 1
		await deleteSessionToken()
		setDeviceCode(null)
		setEntitlements(null)
		setAuthState("signed-out")
		onAccessChange(null)
	}

	const selectedPack = selectedSlug ? PACK_BY_SLUG.get(selectedSlug) : undefined
	const unlocked = new Set(entitlements?.unlockedSlugs ?? [])
	const dependencies = useMemo(
		() => (selectedPack ? diffPackDependencies(selectedPack, state, runtime) : []),
		[selectedPack, state, runtime],
	)
	const missing = dependencies.filter((dependency) => !dependency.installed)

	if (authState === "checking") {
		return (
			<div className="native-card flex min-h-48 items-center justify-center bg-card">
				<LoaderCircle className="size-5 animate-spin text-primary" />
			</div>
		)
	}

	if (authState === "blocked") {
		return (
			<div className="native-card border-destructive/40 bg-card p-5">
				<div className="flex gap-3">
					<CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
					<div>
						<h2 className="text-sm font-semibold">Secure sign-in unavailable</h2>
						<p className="mt-1 text-[0.74rem] leading-relaxed text-muted-foreground">{message}</p>
					</div>
				</div>
			</div>
		)
	}

	if (authState === "signed-out" || authState === "authorizing" || authState === "error") {
		return (
			<div className="mx-auto max-w-xl">
				<div className="native-card overflow-hidden bg-card">
					<div className="border-b border-border bg-[linear-gradient(115deg,color-mix(in_srgb,#8cb4cb_18%,transparent),transparent_55%),linear-gradient(18deg,color-mix(in_srgb,#e38f1a_12%,transparent),transparent_65%)] p-6">
						<KeyRound className="mb-3 size-5 text-primary" />
						<h2 className="text-base font-semibold tracking-[-0.02em]">
							Sign in to your pack library
						</h2>
						<p className="mt-1.5 max-w-md text-[0.74rem] leading-relaxed text-muted-foreground">
							Approve Agent Master in your browser. The resulting session is stored only in your OS
							keychain.
						</p>
					</div>
					<div className="p-6">
						{deviceCode ? (
							<div>
								<div className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
									Your code
								</div>
								<div className="my-3 select-all font-mono text-3xl font-semibold tracking-[0.18em] text-foreground">
									{deviceCode.user_code}
								</div>
								<p className="text-[0.71rem] text-muted-foreground">
									Waiting for approval at {deviceCode.verification_uri}
								</p>
								<div className="mt-4 flex gap-2">
									<Button
										onClick={() =>
											openExternalUrl(
												deviceCode.verification_uri_complete || deviceCode.verification_uri,
											)
										}
										className="rounded-md normal-case"
									>
										<ExternalLink className="size-3.5" /> Open browser
									</Button>
									<Button
										variant="outline"
										onClick={() => startSignIn()}
										className="rounded-md normal-case"
									>
										<RefreshCw className="size-3.5" /> New code
									</Button>
								</div>
							</div>
						) : (
							<Button
								onClick={startSignIn}
								disabled={authState === "authorizing"}
								className="rounded-md normal-case"
							>
								{authState === "authorizing" ? (
									<LoaderCircle className="size-3.5 animate-spin" />
								) : (
									<KeyRound className="size-3.5" />
								)}
								{authState === "authorizing" ? "Starting secure sign-in…" : "Sign in with bopen.ai"}
							</Button>
						)}
						{message && <p className="mt-4 text-[0.71rem] text-destructive">{message}</p>}
					</div>
				</div>
			</div>
		)
	}

	if (selectedPack && unlocked.has(selectedPack.slug)) {
		return (
			<div className="space-y-5">
				<div className="native-card bg-card p-5">
					<div className="flex items-start justify-between gap-4">
						<div>
							<div className="mb-1 flex items-center gap-2">
								<PackageCheck className="size-4 text-green-600" />
								<span className="font-mono text-[0.61rem] uppercase tracking-[0.12em] text-green-700 dark:text-green-400">
									Purchased
								</span>
							</div>
							<h2 className="text-lg font-semibold tracking-[-0.02em]">{selectedPack.name}</h2>
							<p className="mt-1 text-[0.74rem] text-muted-foreground">{selectedPack.tagline}</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={signOut}
							className="rounded-md normal-case"
						>
							<LogOut className="size-3" /> Sign out
						</Button>
					</div>
				</div>

				<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
					<section className="native-card bg-card p-5">
						<div className="mb-4 flex items-end justify-between gap-4">
							<div>
								<div className="font-mono text-[0.61rem] uppercase tracking-[0.12em] text-muted-foreground">
									What’s paid for
								</div>
								<h3 className="mt-1 text-sm font-semibold">
									{selectedPack.playbooks.length} playbooks
								</h3>
							</div>
						</div>
						<div className="space-y-2.5">
							{selectedPack.playbooks.map((playbook) => (
								<details
									key={playbook.id}
									className="group rounded-md border border-border bg-background/40 p-3"
								>
									<summary className="list-none cursor-pointer">
										<div className="flex items-start gap-3">
											<ClassChip value={playbook.class} />
											<span className="min-w-0 flex-1 text-[0.76rem] font-medium leading-snug">
												{playbook.title}
											</span>
										</div>
									</summary>
									<div className="mt-3 border-t border-border pt-3">
										<p className="text-[0.7rem] leading-relaxed text-muted-foreground">
											{playbook.summary}
										</p>
										<p className="mt-2 font-mono text-[0.59rem] text-muted-foreground">
											Agents: {playbook.agents.join(" · ")}
										</p>
									</div>
								</details>
							))}
						</div>
					</section>

					<aside className="native-card h-fit bg-card p-4 lg:sticky lg:top-20">
						<div className="font-mono text-[0.61rem] uppercase tracking-[0.12em] text-muted-foreground">
							What’s installed
						</div>
						<div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
							{dependencies.length - missing.length}
							<span className="text-sm font-normal text-muted-foreground">
								{" "}
								/ {dependencies.length}
							</span>
						</div>
						<p className="mt-1 text-[0.68rem] leading-relaxed text-muted-foreground">
							Checked against the {runtime} harness on this machine.
						</p>
						<div className="mt-4 space-y-2">
							{dependencies.map((dependency) => (
								<div key={dependency.name} className="flex items-center gap-2 text-[0.7rem]">
									<span
										className={`flex size-4 items-center justify-center rounded-full ${dependency.installed ? "bg-green-500/12 text-green-600" : "bg-amber-500/12 text-amber-600"}`}
									>
										{dependency.installed ? <Check className="size-3" /> : "!"}
									</span>
									<span className="min-w-0 flex-1 truncate">{dependency.name}</span>
									{dependency.installedVersion && (
										<span className="font-mono text-[0.57rem] text-muted-foreground">
											{dependency.installedVersion}
										</span>
									)}
								</div>
							))}
						</div>
					</aside>
				</div>

				<section className="native-card bg-card p-5">
					<div className="mb-4">
						<div className="font-mono text-[0.61rem] uppercase tracking-[0.12em] text-muted-foreground">
							Dependency check
						</div>
						<h3 className="mt-1 text-sm font-semibold">
							{missing.length === 0
								? "Everything this pack needs is installed"
								: `${missing.length} missing ${missing.length === 1 ? "dependency" : "dependencies"}`}
						</h3>
					</div>
					{missing.length === 0 ? (
						<div className="flex items-center gap-2 rounded-md border border-green-500/20 bg-green-500/8 p-3 text-[0.73rem] text-green-700 dark:text-green-400">
							<Check className="size-4" /> Ready to run.
						</div>
					) : (
						<div className="space-y-3">
							{missing.map((dependency) => (
								<div
									key={dependency.name}
									className="rounded-md border border-border bg-background/45 p-3"
								>
									<div className="mb-2 flex items-center justify-between gap-3">
										<div>
											<div className="text-[0.75rem] font-semibold">{dependency.name}</div>
											<div className="font-mono text-[0.58rem] text-muted-foreground">
												{dependency.marketplace}
											</div>
										</div>
										<CopyButton
											text={dependency.installCommand}
											label="copy command"
											className="h-7"
										/>
									</div>
									<pre className="overflow-x-auto whitespace-pre-wrap rounded bg-foreground/[0.04] p-2.5 font-mono text-[0.65rem] leading-relaxed">
										{dependency.installCommand}
									</pre>
								</div>
							))}
						</div>
					)}
				</section>
			</div>
		)
	}

	if (selectedPack) {
		return (
			<div className="native-card max-w-2xl bg-card p-6">
				<LockKeyhole className="mb-3 size-5 text-muted-foreground" />
				<h2 className="text-base font-semibold">{selectedPack.name}</h2>
				<p className="mt-1 text-[0.74rem] text-muted-foreground">{selectedPack.tagline}</p>
				<p className="mt-4 text-[0.72rem] leading-relaxed text-muted-foreground">
					This pack is not in your library yet. Purchase it once to unlock the playbooks and
					dependency check here.
				</p>
				<Button
					onClick={() => openExternalUrl(`${STORE_URL}/${selectedPack.slug}`)}
					className="mt-4 rounded-md normal-case"
				>
					<ExternalLink className="size-3.5" /> View on bopen.ai
				</Button>
			</div>
		)
	}

	const orderedPacks = [...PACK_CATALOG].sort(
		(a, b) => Number(unlocked.has(b.slug)) - Number(unlocked.has(a.slug)),
	)
	return (
		<div className="space-y-5">
			<div className="flex items-center justify-between gap-4">
				<div>
					<div className="font-mono text-[0.61rem] uppercase tracking-[0.12em] text-muted-foreground">
						Library
					</div>
					<h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
						Your purchased packs, matched to this machine
					</h2>
				</div>
				<Button variant="outline" size="sm" onClick={signOut} className="rounded-md normal-case">
					<LogOut className="size-3" /> Sign out
				</Button>
			</div>
			<div className="grid gap-3 md:grid-cols-2">
				{orderedPacks.map((pack) => (
					<PackCard
						key={pack.slug}
						pack={pack}
						unlocked={unlocked.has(pack.slug)}
						onOpen={() => onSelectPack(pack.slug)}
						onStore={() => openExternalUrl(`${STORE_URL}/${pack.slug}`)}
					/>
				))}
			</div>
		</div>
	)
}
