import type { ComponentType } from "react"
import { ControlsScreen, type GameScreenProps } from "./ControlsScreen"

export const GAME_SCREEN_REGISTRY = {
	controls: {
		id: "controls",
		label: "Controls",
		component: ControlsScreen,
	},
} as const satisfies Record<
	string,
	{
		id: string
		label: string
		component: ComponentType<GameScreenProps>
	}
>

export type GameScreenId = keyof typeof GAME_SCREEN_REGISTRY
