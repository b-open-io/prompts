"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import {
	HOVER_VOLUME_SCALE,
	resolveChangeSound,
	resolveClickSound,
	resolveHoverTarget,
	SOUND_STORAGE_KEY,
	UI_SOUND_VOLUME,
	UI_SOUNDS,
	type UISoundKey,
} from "@/lib/ui-sounds"

type SoundContextValue = {
	enabled: boolean
	toggle: () => void
	play: (key: UISoundKey, volumeScale?: number) => void
}

const SoundContext = createContext<SoundContextValue>({
	enabled: false,
	toggle: () => {},
	play: () => {},
})

export function useSound(): SoundContextValue {
	return useContext(SoundContext)
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
	// Server renders and first client paint use `false`; the stored/derived
	// preference lands in an effect to avoid a hydration mismatch.
	const [enabled, setEnabled] = useState(false)
	const enabledRef = useRef(enabled)
	enabledRef.current = enabled
	const contextRef = useRef<AudioContext | null>(null)
	const buffersRef = useRef<Map<UISoundKey, AudioBuffer>>(new Map())
	const warnedRef = useRef(false)

	useEffect(() => {
		const stored = window.localStorage.getItem(SOUND_STORAGE_KEY)
		if (stored === "on" || stored === "off") {
			setEnabled(stored === "on")
			return
		}
		// No stored preference: on by default, but visitors asking the OS to
		// reduce sensory feedback start muted.
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		setEnabled(!reducedMotion)
	}, [])

	useEffect(() => {
		const abortController = new AbortController()
		const warnOnce = (key: UISoundKey | null, error: unknown) => {
			if (warnedRef.current || abortController.signal.aborted) return
			warnedRef.current = true
			console.warn(
				key
					? `UI sound preload failed for ${key}; that sound will remain silent.`
					: "UI sound playback could not be initialized; sounds will remain silent.",
				error,
			)
		}

		let context: AudioContext
		try {
			// The context starts suspended under browser autoplay policies. Creating
			// it here lets every small asset fetch and decode as soon as the provider
			// mounts; the first user gesture below only has to resume it.
			context = new AudioContext({ latencyHint: "interactive" })
			contextRef.current = context
		} catch (error) {
			warnOnce(null, error)
			return () => abortController.abort()
		}

		for (const [key, path] of Object.entries(UI_SOUNDS) as [UISoundKey, string][]) {
			void fetch(path, { signal: abortController.signal })
				.then((response) => {
					if (!response.ok) {
						throw new Error(`HTTP ${response.status} for ${path}`)
					}
					return response.arrayBuffer()
				})
				.then((encoded) => context.decodeAudioData(encoded))
				.then((buffer) => {
					if (!abortController.signal.aborted) {
						buffersRef.current.set(key, buffer)
					}
				})
				.catch((error: unknown) => warnOnce(key, error))
		}

		const removeUnlockListeners = () => {
			document.removeEventListener("pointerdown", unlock, true)
			document.removeEventListener("keydown", unlock, true)
			document.removeEventListener("touchstart", unlock, true)
		}
		const unlock = () => {
			if (context.state === "running") {
				removeUnlockListeners()
				return
			}
			if (context.state !== "suspended") return
			// A failed resume is deliberately silent. Keeping the listeners allows a
			// later gesture to retry without exposing autoplay errors to consumers.
			void context
				.resume()
				.then(() => {
					if (context.state === "running") removeUnlockListeners()
				})
				.catch(() => {})
		}

		document.addEventListener("pointerdown", unlock, true)
		document.addEventListener("keydown", unlock, true)
		document.addEventListener("touchstart", unlock, {
			capture: true,
			passive: true,
		})

		return () => {
			abortController.abort()
			removeUnlockListeners()
			buffersRef.current.clear()
			if (contextRef.current === context) contextRef.current = null
			void context.close().catch(() => {})
		}
	}, [])

	const playBuffer = useCallback((key: UISoundKey, volumeScale = 1) => {
		const context = contextRef.current
		const buffer = buffersRef.current.get(key)
		// Pre-gesture and pre-decode sounds are decorative, so drop them rather
		// than queueing work that could arrive late or throwing autoplay errors.
		if (context?.state !== "running" || !buffer) return

		try {
			const source = context.createBufferSource()
			const gain = context.createGain()
			source.buffer = buffer
			gain.gain.value = UI_SOUND_VOLUME * volumeScale
			source.connect(gain)
			gain.connect(context.destination)
			source.addEventListener(
				"ended",
				() => {
					source.disconnect()
					gain.disconnect()
				},
				{ once: true },
			)
			source.start()
		} catch {
			// A closing/interrupted context is non-fatal; UI sounds are decorative.
		}
	}, [])

	const play = useCallback(
		(key: UISoundKey, volumeScale = 1) => {
			if (!enabledRef.current) return
			playBuffer(key, volumeScale)
		},
		[playBuffer],
	)

	const toggle = useCallback(() => {
		setEnabled((previous) => {
			const next = !previous
			window.localStorage.setItem(SOUND_STORAGE_KEY, next ? "on" : "off")
			if (next) {
				// play() gates on the ref, which still holds the previous value during
				// this render, so use the same Web Audio path without that gate.
				playBuffer("TOGGLE_ON")
			}
			return next
		})
	}, [playBuffer])

	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			const target = event.target
			if (!(target instanceof Element)) return
			const key = resolveClickSound(target)
			if (key) play(key)
		}
		const onChange = (event: Event) => {
			const target = event.target
			if (!(target instanceof HTMLElement)) return
			const key = resolveChangeSound(target as HTMLInputElement)
			if (key) play(key)
		}
		const onSubmit = () => play("NOTIFICATION_INFO")
		const onCopy = () => play("NOTIFICATION_BADGE")
		const onToggle = (event: Event) => {
			const target = event.target
			if (!(target instanceof HTMLDetailsElement)) return
			play(target.open ? "DROPDOWN_OPEN" : "DROPDOWN_CLOSE")
		}
		let lastHovered: unknown = null
		let lastHoverAt = 0
		const onPointerOver = (event: PointerEvent) => {
			const target = event.target
			if (!(target instanceof Element)) return
			const hoverable = resolveHoverTarget(target)
			if (!hoverable || hoverable === lastHovered) return
			lastHovered = hoverable
			// Throttle so sweeping the cursor across a menu doesn't machine-gun.
			const now = performance.now()
			if (now - lastHoverAt < 90) return
			lastHoverAt = now
			play("TOOLTIP_SHOW", HOVER_VOLUME_SCALE)
		}
		document.addEventListener("click", onClick, true)
		document.addEventListener("pointerover", onPointerOver, true)
		document.addEventListener("change", onChange, true)
		document.addEventListener("submit", onSubmit, true)
		document.addEventListener("copy", onCopy, true)
		// The details `toggle` event doesn't bubble; capture still visits it.
		document.addEventListener("toggle", onToggle, true)
		return () => {
			document.removeEventListener("click", onClick, true)
			document.removeEventListener("pointerover", onPointerOver, true)
			document.removeEventListener("change", onChange, true)
			document.removeEventListener("submit", onSubmit, true)
			document.removeEventListener("copy", onCopy, true)
			document.removeEventListener("toggle", onToggle, true)
		}
	}, [play])

	return <SoundContext.Provider value={{ enabled, toggle, play }}>{children}</SoundContext.Provider>
}
