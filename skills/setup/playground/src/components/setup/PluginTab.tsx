import { CopyButton } from "@/components/setup/CopyButton"
import { ExternalLink, Linkify } from "@/components/setup/ExternalLink"
import { GlyphToggle } from "@/components/setup/GlyphToggle"
import { HookToggle } from "@/components/setup/HookToggle"
import { ManifestInfo } from "@/components/setup/ManifestInfo"
import { SkillActivityBadge } from "@/components/setup/SkillActivityBadge"
import { Card } from "@/components/ui/card"
import { isSkillSlug, pluginBopenUrl, pluginInstallCommand, skillBopenUrl } from "@/lib/links"
import type { CheckKind, PluginState, Selections } from "@/lib/types"

const CHECK_SECTIONS: Array<{ kind: CheckKind; label: string }> = [
	{ kind: "codex-agents", label: "AGENTS" },
	{ kind: "cli", label: "CLI DEPENDENCIES" },
	{ kind: "env", label: "ENV KEYS" },
	{ kind: "third-party-skill", label: "THIRD-PARTY SKILLS" },
]

function SectionShell({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<section className="mb-6">
			<span className="mb-1.5 block font-mono text-[0.72rem] uppercase tracking-wide text-accent">
				[ {label} ]
			</span>
			<Card className="native-card overflow-hidden">{children}</Card>
		</section>
	)
}

function Row({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-11 flex-wrap items-start gap-2.5 border-b border-border p-3 transition-colors duration-200 last:border-b-0 hover:bg-muted/45">
			{children}
		</div>
	)
}

function UsedByLine({ pluginName, usedBy }: { pluginName: string; usedBy: string[] }) {
	return (
		<div className="mt-0.5 text-[0.68rem] text-muted-foreground">
			used by:{" "}
			{usedBy.map((name, i) => (
				<span key={name}>
					{i > 0 && ", "}
					{isSkillSlug(name) ? (
						<a
							href={skillBopenUrl(pluginName, name)}
							target="_blank"
							rel="noopener noreferrer"
							className="hover:underline"
						>
							{name}
						</a>
					) : (
						name
					)}
				</span>
			))}
		</div>
	)
}

function PluginInstallSection({
	plugin,
	selection,
	selectedRuntime,
	onToggleInstallPlugin,
}: {
	plugin: PluginState
	selection: Selections[string]
	selectedRuntime: string
	onToggleInstallPlugin: () => void
}) {
	const rows: Array<["claude" | "codex", string | null]> = [
		["claude", plugin.installedClaude],
		["codex", plugin.installedCodex],
	]

	return (
		<section className="mb-6">
			<span className="mb-1.5 flex items-center font-mono text-[0.72rem] uppercase tracking-wide text-accent">
				[ PLUGIN ]
				<ExternalLink
					href={pluginBopenUrl(plugin.name)}
					label={`Open ${plugin.name} on bopen.ai`}
				/>
				{!plugin.hasSetupManifest && <ManifestInfo />}
			</span>
			<Card className="native-card overflow-hidden">
				{rows.map(([runtime, version]) => {
					const installed = version !== null
					const applicable = runtime === selectedRuntime
					const checked = installed || (applicable && selection.installPlugin)
					const inert = installed || !applicable
					const detail = installed
						? `v${version}`
						: `not installed${applicable ? " — check the box to include install in the plan" : " — not the active plan runtime"}`
					const cmd = !installed ? pluginInstallCommand(plugin.name, runtime) : null
					return (
						<Row key={runtime}>
							<GlyphToggle
								checked={checked}
								inert={inert}
								onToggle={inert ? undefined : onToggleInstallPlugin}
								label={`${runtime} install`}
							/>
							<div className="min-w-48 flex-1">
								<div>{runtime}</div>
								<div className="text-[0.75rem] text-muted-foreground">{detail}</div>
							</div>
							<div className="flex flex-none items-center gap-1.5">
								{cmd && <CopyButton text={cmd} />}
							</div>
						</Row>
					)
				})}
				<Row>
					<div className="text-[0.75rem] text-muted-foreground">
						marketplace:{" "}
						{plugin.marketplaceVersion !== null ? `v${plugin.marketplaceVersion}` : "unavailable"}
					</div>
				</Row>
			</Card>
		</section>
	)
}

function CheckSection({
	plugin,
	kind,
	label,
	selection,
	onToggleCheck,
}: {
	plugin: PluginState
	kind: CheckKind
	label: string
	selection: Selections[string]
	onToggleCheck: (id: string) => void
}) {
	const checks = (plugin.checks ?? []).filter((c) => c.kind === kind)
	if (checks.length === 0) return null

	return (
		<SectionShell label={label}>
			{checks.map((c) => {
				const checked = selection.checks.has(c.id)
				const inert = c.installed
				const activity =
					kind === "setup-script" ? plugin.skillActivity?.[`${plugin.name}:${c.name}`] : undefined
				const nameNode =
					kind === "setup-script" && isSkillSlug(c.name) ? (
						<a
							href={skillBopenUrl(plugin.name, c.name)}
							target="_blank"
							rel="noopener noreferrer"
							className="hover:underline"
						>
							{c.name}
						</a>
					) : (
						c.name
					)
				return (
					<Row key={c.id}>
						<GlyphToggle
							checked={checked}
							inert={inert}
							onToggle={inert ? undefined : () => onToggleCheck(c.id)}
							label={c.name}
						/>
						<div className="min-w-48 flex-1">
							<div className="flex flex-wrap items-center gap-2">
								{nameNode}
								{activity && <SkillActivityBadge activity={activity} />}
							</div>
							{c.detail && <div className="text-[0.75rem] text-muted-foreground">{c.detail}</div>}
							{kind === "env" && c.obtain && (
								<div className="text-[0.75rem] text-muted-foreground">
									obtain: <Linkify text={c.obtain} />
								</div>
							)}
							{c.usedBy && c.usedBy.length > 0 && (
								<UsedByLine pluginName={plugin.name} usedBy={c.usedBy} />
							)}
						</div>
						<div className="flex flex-none items-center gap-1.5">
							{!c.installed && c.install && <CopyButton text={c.install} />}
						</div>
					</Row>
				)
			})}
		</SectionShell>
	)
}

function HooksSection({
	plugin,
	selection,
	onToggleHook,
}: {
	plugin: PluginState
	selection: Selections[string]
	onToggleHook: (hookName: string) => void
}) {
	const hooks = plugin.hooks ?? []
	if (hooks.length === 0) return null

	return (
		<SectionShell label="HOOKS">
			{hooks.map((h) => {
				const on = !!selection.hooks[h.name]
				return (
					<Row key={h.name}>
						<div className="min-w-48 flex-1">
							<div>{h.name}</div>
							<div className="text-[0.75rem] text-muted-foreground">{h.summary}</div>
							<div className="mt-0.5 text-[0.68rem] text-muted-foreground">
								runtimes: {(h.runtimes ?? []).join(", ")}
							</div>
						</div>
						<div className="flex flex-none items-center">
							<HookToggle on={on} onToggle={() => onToggleHook(h.name)} />
						</div>
					</Row>
				)
			})}
		</SectionShell>
	)
}

export function PluginTab({
	plugin,
	selection,
	selectedRuntime,
	onToggleInstallPlugin,
	onToggleCheck,
	onToggleHook,
}: {
	plugin: PluginState
	selection: Selections[string]
	selectedRuntime: string
	onToggleInstallPlugin: () => void
	onToggleCheck: (id: string) => void
	onToggleHook: (hookName: string) => void
}) {
	return (
		<div className="max-w-4xl">
			<PluginInstallSection
				plugin={plugin}
				selection={selection}
				selectedRuntime={selectedRuntime}
				onToggleInstallPlugin={onToggleInstallPlugin}
			/>

			{plugin.hasSetupManifest && (
				<>
					{CHECK_SECTIONS.map(({ kind, label }) => (
						<CheckSection
							key={kind}
							plugin={plugin}
							kind={kind}
							label={label}
							selection={selection}
							onToggleCheck={onToggleCheck}
						/>
					))}
					<HooksSection plugin={plugin} selection={selection} onToggleHook={onToggleHook} />
					<CheckSection
						plugin={plugin}
						kind="setup-script"
						label="SKILL SETUP SCRIPTS"
						selection={selection}
						onToggleCheck={onToggleCheck}
					/>
				</>
			)}
		</div>
	)
}
