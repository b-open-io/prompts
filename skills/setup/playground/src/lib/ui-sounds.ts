export const UI_SOUNDS = {
	BUTTON_CLICK_PRIMARY: "/audio/ui/buttons/button-click-primary.mp3",
	BUTTON_CLICK_SECONDARY: "/audio/ui/buttons/button-click-secondary.mp3",
	BUTTON_CLICK_DESTRUCTIVE: "/audio/ui/buttons/button-click-destructive.mp3",
	NAV_TAB_SWITCH: "/audio/ui/navigation/nav-tab-switch.mp3",
	NAV_BACK: "/audio/ui/navigation/nav-back.mp3",
	NAV_FORWARD: "/audio/ui/navigation/nav-forward.mp3",
	NAV_MENU_OPEN: "/audio/ui/navigation/nav-menu-open.mp3",
	NAV_MENU_CLOSE: "/audio/ui/navigation/nav-menu-close.mp3",
	NOTIFICATION_SUCCESS: "/audio/ui/feedback/notification-success.mp3",
	NOTIFICATION_ERROR: "/audio/ui/feedback/notification-error.mp3",
	NOTIFICATION_WARNING: "/audio/ui/feedback/notification-warning.mp3",
	NOTIFICATION_INFO: "/audio/ui/feedback/notification-info.mp3",
	NOTIFICATION_BADGE: "/audio/ui/feedback/notification-badge.mp3",
	TOGGLE_ON: "/audio/ui/states/toggle-on.mp3",
	TOGGLE_OFF: "/audio/ui/states/toggle-off.mp3",
	CHECKBOX_CHECK: "/audio/ui/states/checkbox-check.mp3",
	CHECKBOX_UNCHECK: "/audio/ui/states/checkbox-uncheck.mp3",
	LOADING_START: "/audio/ui/states/loading-start.mp3",
	LOADING_COMPLETE: "/audio/ui/states/loading-complete.mp3",
	MODAL_OPEN: "/audio/ui/modals/modal-open.mp3",
	MODAL_CLOSE: "/audio/ui/modals/modal-close.mp3",
	TOOLTIP_SHOW: "/audio/ui/modals/tooltip-show.mp3",
	DROPDOWN_OPEN: "/audio/ui/modals/dropdown-open.mp3",
	DROPDOWN_CLOSE: "/audio/ui/modals/dropdown-close.mp3",
} as const

export type UISoundKey = keyof typeof UI_SOUNDS

export const UI_SOUND_VOLUME = 0.3
// Hover cues play softer than clicks — they fire far more often.
export const HOVER_VOLUME_SCALE = 0.5
export const SOUND_STORAGE_KEY = "bopen-ui-sound"

// kebab-case names usable in data-sound attributes, e.g. data-sound="notification-success"
export const SOUND_NAME_TO_KEY: Record<string, UISoundKey> = Object.fromEntries(
	(Object.keys(UI_SOUNDS) as UISoundKey[]).map((key) => [
		key.toLowerCase().replace(/_/g, "-"),
		key,
	]),
) as Record<string, UISoundKey>

// Structural subset of Element so resolution stays testable without a DOM.
export interface ClickTargetLike {
	closest(selector: string): ClickTargetLike | null
	getAttribute(name: string): string | null
}

/**
 * Map a click target to a sound. Returns null for silence — either an explicit
 * opt-out (data-sound="none"), an unknown data-sound name (silence beats a
 * wrong guess), or an element another event owns (form controls sound on
 * `change`, <summary> on the details `toggle` event).
 */
export function resolveClickSound(target: ClickTargetLike): UISoundKey | null {
	const override = target.closest("[data-sound]")
	if (override) {
		const name = override.getAttribute("data-sound")
		if (!name || name === "none") return null
		return SOUND_NAME_TO_KEY[name] ?? null
	}
	if (target.closest("summary, details")) return null
	if (target.closest("input, select, textarea, label")) return null
	const link = target.closest("a")
	if (link) return "NAV_TAB_SWITCH"
	const button = target.closest('button, [role="button"]')
	if (button) {
		if (button.getAttribute("aria-expanded") === "true") return "NAV_MENU_CLOSE"
		if (button.getAttribute("aria-expanded") === "false") return "NAV_MENU_OPEN"
		return "BUTTON_CLICK_PRIMARY"
	}
	return null
}

/**
 * The interactive element a hover cue should attach to, or null. Returning the
 * element (not just a boolean) lets the caller dedupe repeated pointerover
 * events fired while moving across the same element's children.
 */
export function resolveHoverTarget(target: ClickTargetLike): ClickTargetLike | null {
	const override = target.closest("[data-sound]")
	if (override && override.getAttribute("data-sound") === "none") return null
	return target.closest('a, button, [role="button"], summary')
}

export interface ChangeTargetLike {
	tagName: string
	getAttribute(name: string): string | null
	type?: string
	checked?: boolean
}

/** Map a change-event target (form control) to a sound. */
export function resolveChangeSound(target: ChangeTargetLike): UISoundKey | null {
	const tag = target.tagName.toLowerCase()
	if (tag === "select") return "DROPDOWN_CLOSE"
	if (tag !== "input") return null
	const role = target.getAttribute("role")
	if (target.type === "checkbox") {
		if (role === "switch") return target.checked ? "TOGGLE_ON" : "TOGGLE_OFF"
		return target.checked ? "CHECKBOX_CHECK" : "CHECKBOX_UNCHECK"
	}
	if (target.type === "radio") return "CHECKBOX_CHECK"
	return null
}
