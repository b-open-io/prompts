// Selection init/reconcile — ported from skills/setup/assets/ui.html's
// initPluginSelection/initAllSelections/reconcileSelections so Refresh
// preserves in-progress selections against fresh detected state.

import type { HarnessState, PlanSelections, PluginState, Selections } from "./types"

export function initPluginSelection(plugin: PluginState): Selections[string] {
	const checks = new Set<string>()
	for (const c of plugin.checks ?? []) {
		if (c.installed) checks.add(c.id)
	}
	const hooks: Record<string, boolean> = {}
	for (const h of plugin.hooks ?? []) {
		hooks[h.name] = !!h.enabled
	}
	return { installPlugin: false, checks, hooks }
}

export function initAllSelections(state: HarnessState): Selections {
	const out: Selections = {}
	for (const p of state.plugins) out[p.name] = initPluginSelection(p)
	return out
}

export function reconcileSelections(oldSel: Selections, newState: HarnessState): Selections {
	const out: Selections = {}
	for (const p of newState.plugins) {
		const fresh = initPluginSelection(p)
		const old = oldSel[p.name]
		if (!old) {
			out[p.name] = fresh
			continue
		}
		fresh.installPlugin = old.installPlugin
		for (const c of p.checks ?? []) {
			if (c.installed || old.checks.has(c.id)) fresh.checks.add(c.id)
			else fresh.checks.delete(c.id)
		}
		for (const h of p.hooks ?? []) {
			if (Object.hasOwn(old.hooks, h.name)) fresh.hooks[h.name] = old.hooks[h.name]
		}
		out[p.name] = fresh
	}
	return out
}

export function assemblePlanSelections(
	state: HarnessState,
	selections: Selections,
	runtime: string,
): PlanSelections {
	return {
		runtime: runtime as PlanSelections["runtime"],
		plugins: state.plugins.map((p) => {
			const s = selections[p.name]
			return {
				name: p.name,
				installPlugin: s.installPlugin,
				checks: Array.from(s.checks),
				hooks: { ...s.hooks },
			}
		}),
	}
}
