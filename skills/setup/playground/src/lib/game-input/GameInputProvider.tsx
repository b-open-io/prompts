"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { GAME_INPUT_BINDING_BY_ID, GAME_INPUT_BINDINGS, type GameInputActionId } from "./bindings"

export type GameInputMode = "keyboard" | "gamepad"

export type GameInputActionState = {
	pressed: boolean
	progress: number
	triggerCount: number
}

export type GamepadState = {
	connected: boolean
	id: string | null
	buttons: readonly boolean[]
	axes: readonly number[]
	pressedButtons: readonly number[]
	releasedButtons: readonly number[]
	edgeSequence: number
}

export type GameInputContextValue = {
	mode: GameInputMode
	isGamepadMode: boolean
	gamepad: GamepadState
	actions: Record<GameInputActionId, GameInputActionState>
}

export type HoldActionState = GameInputActionState & {
	holdMs: number
}

const INITIAL_GAMEPAD: GamepadState = {
	connected: false,
	id: null,
	buttons: [],
	axes: [],
	pressedButtons: [],
	releasedButtons: [],
	edgeSequence: 0,
}

function createInitialActions(): Record<GameInputActionId, GameInputActionState> {
	return Object.fromEntries(
		GAME_INPUT_BINDINGS.map((binding) => [
			binding.id,
			{ pressed: false, progress: 0, triggerCount: 0 },
		]),
	) as Record<GameInputActionId, GameInputActionState>
}

const GameInputContext = createContext<GameInputContextValue | null>(null)

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false
	return Boolean(
		target.closest("input, textarea, select, [contenteditable='true']") || target.isContentEditable,
	)
}

function hasBlockingDialog(): boolean {
	const dialogs = document.querySelectorAll(
		"dialog[open], [role='dialog'][data-state='open'], [aria-modal='true']",
	)
	return Array.from(dialogs).some((dialog) => !dialog.closest("[data-game-shell-root]"))
}

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
	return left.length === right.length && left.every((value, index) => value === right[index])
}

export function GameInputProvider({ children }: { children: React.ReactNode }) {
	const [mode, setMode] = useState<GameInputMode>("keyboard")
	const [actions, setActions] = useState(createInitialActions)
	const [gamepad, setGamepad] = useState<GamepadState>(INITIAL_GAMEPAD)

	const actionsRef = useRef(actions)
	const gamepadRef = useRef(gamepad)
	const actionSourcesRef = useRef(new Map<GameInputActionId, Set<string>>())
	const holdStartsRef = useRef(new Map<GameInputActionId, number>())
	const completedHoldsRef = useRef(new Set<GameInputActionId>())
	const holdFrameRef = useRef(0)
	const gamepadFrameRef = useRef(0)
	const connectedGamepadsRef = useRef(new Set<number>())
	const previousButtonsRef = useRef(new Map<number, boolean[]>())
	const edgeSequenceRef = useRef(0)

	const publishAction = useCallback((id: GameInputActionId, next: GameInputActionState) => {
		const current = actionsRef.current[id]
		if (
			current.pressed === next.pressed &&
			current.progress === next.progress &&
			current.triggerCount === next.triggerCount
		) {
			return
		}
		const updated = { ...actionsRef.current, [id]: next }
		actionsRef.current = updated
		setActions(updated)
	}, [])

	const ensureHoldLoop = useCallback(() => {
		if (holdFrameRef.current) return

		const tick = (now: number) => {
			let hasActiveHold = false

			for (const binding of GAME_INPUT_BINDINGS) {
				if (binding.behavior !== "hold") continue
				const sources = actionSourcesRef.current.get(binding.id)
				if (!sources?.size) continue

				hasActiveHold = true
				const startedAt = holdStartsRef.current.get(binding.id) ?? now
				const holdMs = binding.holdMs
				const progress = Math.min(1, (now - startedAt) / holdMs)
				const current = actionsRef.current[binding.id]
				let triggerCount = current.triggerCount

				if (progress >= 1 && !completedHoldsRef.current.has(binding.id)) {
					completedHoldsRef.current.add(binding.id)
					triggerCount += 1
				}

				publishAction(binding.id, {
					pressed: true,
					progress,
					triggerCount,
				})
			}

			if (hasActiveHold) {
				holdFrameRef.current = requestAnimationFrame(tick)
			} else {
				holdFrameRef.current = 0
			}
		}

		holdFrameRef.current = requestAnimationFrame(tick)
	}, [publishAction])

	const pressSource = useCallback(
		(id: GameInputActionId, source: string) => {
			const binding = GAME_INPUT_BINDING_BY_ID[id]
			let sources = actionSourcesRef.current.get(id)
			if (!sources) {
				sources = new Set()
				actionSourcesRef.current.set(id, sources)
			}
			if (sources.has(source)) return
			sources.add(source)

			const current = actionsRef.current[id]
			if (binding.behavior === "press") {
				publishAction(id, {
					pressed: true,
					progress: 1,
					triggerCount: current.triggerCount + 1,
				})
				return
			}

			if (sources.size === 1) {
				holdStartsRef.current.set(id, performance.now())
				completedHoldsRef.current.delete(id)
				publishAction(id, {
					pressed: true,
					progress: 0,
					triggerCount: current.triggerCount,
				})
			}
			ensureHoldLoop()
		},
		[ensureHoldLoop, publishAction],
	)

	const releaseSource = useCallback(
		(id: GameInputActionId, source: string) => {
			const sources = actionSourcesRef.current.get(id)
			if (!sources?.delete(source)) return
			if (sources.size > 0) return

			holdStartsRef.current.delete(id)
			completedHoldsRef.current.delete(id)
			const current = actionsRef.current[id]
			publishAction(id, {
				pressed: false,
				progress: 0,
				triggerCount: current.triggerCount,
			})
		},
		[publishAction],
	)

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.repeat || isEditableTarget(event.target) || hasBlockingDialog()) {
				return
			}

			const binding = GAME_INPUT_BINDINGS.find((candidate) =>
				candidate.keyboard.some((key) => key.code === event.code),
			)
			if (!binding) return

			event.preventDefault()
			setMode("keyboard")
			pressSource(binding.id, `keyboard:${event.code}`)
		}

		const onKeyUp = (event: KeyboardEvent) => {
			const binding = GAME_INPUT_BINDINGS.find((candidate) =>
				candidate.keyboard.some((key) => key.code === event.code),
			)
			if (!binding) return
			releaseSource(binding.id, `keyboard:${event.code}`)
		}

		window.addEventListener("keydown", onKeyDown)
		window.addEventListener("keyup", onKeyUp)
		return () => {
			window.removeEventListener("keydown", onKeyDown)
			window.removeEventListener("keyup", onKeyUp)
		}
	}, [pressSource, releaseSource])

	useEffect(() => {
		const publishGamepad = (next: GamepadState) => {
			const current = gamepadRef.current
			if (
				current.connected === next.connected &&
				current.id === next.id &&
				current.edgeSequence === next.edgeSequence &&
				arraysEqual(current.buttons, next.buttons) &&
				arraysEqual(current.axes, next.axes) &&
				arraysEqual(current.pressedButtons, next.pressedButtons) &&
				arraysEqual(current.releasedButtons, next.releasedButtons)
			) {
				return
			}
			gamepadRef.current = next
			setGamepad(next)
		}

		const releaseGamepadSources = (index: number) => {
			for (const binding of GAME_INPUT_BINDINGS) {
				for (const button of binding.gamepad) {
					releaseSource(binding.id, `gamepad:${index}:button:${button.button}`)
				}
			}
			previousButtonsRef.current.delete(index)
		}

		const pollGamepads = () => {
			if (connectedGamepadsRef.current.size === 0) {
				gamepadFrameRef.current = 0
				return
			}

			const pads = navigator.getGamepads()
			const connected = Array.from(connectedGamepadsRef.current)
				.map((index) => pads[index])
				.filter((pad): pad is Gamepad => Boolean(pad?.connected))
			const primary = connected[0] ?? null
			const pressedButtons: number[] = []
			const releasedButtons: number[] = []

			for (const pad of connected) {
				const currentButtons = pad.buttons.map((button) => button.pressed)
				const previousButtons = previousButtonsRef.current.get(pad.index) ?? []

				currentButtons.forEach((pressed, buttonIndex) => {
					const wasPressed = previousButtons[buttonIndex] ?? false
					if (pressed === wasPressed) return
					if (pressed) {
						pressedButtons.push(buttonIndex)
						setMode("gamepad")
					} else {
						releasedButtons.push(buttonIndex)
					}

					for (const binding of GAME_INPUT_BINDINGS) {
						if (!binding.gamepad.some((item) => item.button === buttonIndex)) {
							continue
						}
						const source = `gamepad:${pad.index}:button:${buttonIndex}`
						if (pressed) pressSource(binding.id, source)
						else releaseSource(binding.id, source)
					}
				})

				previousButtonsRef.current.set(pad.index, currentButtons)
			}

			const hasEdges = pressedButtons.length > 0 || releasedButtons.length > 0
			if (hasEdges) edgeSequenceRef.current += 1
			publishGamepad({
				connected: Boolean(primary),
				id: primary?.id ?? null,
				buttons: primary?.buttons.map((button) => button.pressed) ?? [],
				axes: primary?.axes.slice() ?? [],
				pressedButtons,
				releasedButtons,
				edgeSequence: edgeSequenceRef.current,
			})

			gamepadFrameRef.current = requestAnimationFrame(pollGamepads)
		}

		const ensureGamepadLoop = () => {
			if (gamepadFrameRef.current || connectedGamepadsRef.current.size === 0) {
				return
			}
			gamepadFrameRef.current = requestAnimationFrame(pollGamepads)
		}

		const onConnected = (event: GamepadEvent) => {
			connectedGamepadsRef.current.add(event.gamepad.index)
			publishGamepad({ ...gamepadRef.current, connected: true })
			ensureGamepadLoop()
		}

		const onDisconnected = (event: GamepadEvent) => {
			connectedGamepadsRef.current.delete(event.gamepad.index)
			releaseGamepadSources(event.gamepad.index)
			if (connectedGamepadsRef.current.size === 0) {
				cancelAnimationFrame(gamepadFrameRef.current)
				gamepadFrameRef.current = 0
				publishGamepad(INITIAL_GAMEPAD)
			}
		}

		window.addEventListener("gamepadconnected", onConnected)
		window.addEventListener("gamepaddisconnected", onDisconnected)

		for (const pad of navigator.getGamepads()) {
			if (pad?.connected) connectedGamepadsRef.current.add(pad.index)
		}
		if (connectedGamepadsRef.current.size > 0) {
			publishGamepad({ ...gamepadRef.current, connected: true })
			ensureGamepadLoop()
		}

		return () => {
			window.removeEventListener("gamepadconnected", onConnected)
			window.removeEventListener("gamepaddisconnected", onDisconnected)
			cancelAnimationFrame(gamepadFrameRef.current)
			gamepadFrameRef.current = 0
			for (const index of connectedGamepadsRef.current) {
				releaseGamepadSources(index)
			}
			connectedGamepadsRef.current.clear()
		}
	}, [pressSource, releaseSource])

	useEffect(
		() => () => {
			cancelAnimationFrame(holdFrameRef.current)
			cancelAnimationFrame(gamepadFrameRef.current)
		},
		[],
	)

	const value = useMemo<GameInputContextValue>(
		() => ({
			mode,
			isGamepadMode: mode === "gamepad",
			gamepad,
			actions,
		}),
		[actions, gamepad, mode],
	)

	return <GameInputContext.Provider value={value}>{children}</GameInputContext.Provider>
}

export function useGameInput(): GameInputContextValue {
	const context = useContext(GameInputContext)
	if (!context) {
		throw new Error("useGameInput must be used inside GameInputProvider")
	}
	return context
}

export function useHoldAction(id: GameInputActionId): HoldActionState {
	const context = useGameInput()
	const binding = GAME_INPUT_BINDING_BY_ID[id]
	if (binding.behavior !== "hold") {
		throw new Error(`${id} is not registered as a hold action`)
	}
	return { ...context.actions[id], holdMs: binding.holdMs }
}
