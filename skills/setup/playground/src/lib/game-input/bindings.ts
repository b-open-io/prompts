export type GameInputActionId = "open-controls" | "close-screen"

export type KeyboardBinding = {
	code: string
	label: string
}

export type GamepadBinding = {
	button: number
	glyph: string
	label: string
}

export type GameInputBinding = {
	id: GameInputActionId
	label: string
	behavior: "hold" | "press"
	holdMs?: number
	screen?: string
	keyboard: readonly KeyboardBinding[]
	gamepad: readonly GamepadBinding[]
}

/**
 * The single source of truth for site-wide game-shell input. A future screen
 * only needs another record here plus a screen renderer in the shell registry.
 */
export const GAME_INPUT_BINDINGS = [
	{
		id: "open-controls",
		label: "Open controls",
		behavior: "hold",
		holdMs: 450,
		screen: "controls",
		keyboard: [{ code: "Backquote", label: "`" }],
		gamepad: [{ button: 9, glyph: "☰", label: "Start" }],
	},
	{
		id: "close-screen",
		label: "Close active screen",
		behavior: "press",
		keyboard: [{ code: "Escape", label: "Esc" }],
		gamepad: [{ button: 1, glyph: "Ⓑ", label: "B" }],
	},
] as const satisfies readonly GameInputBinding[]

export const GAME_INPUT_BINDING_BY_ID = Object.fromEntries(
	GAME_INPUT_BINDINGS.map((binding) => [binding.id, binding]),
) as Record<GameInputActionId, (typeof GAME_INPUT_BINDINGS)[number]>
