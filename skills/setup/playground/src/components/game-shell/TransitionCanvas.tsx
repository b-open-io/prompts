"use client"

import { useEffect, useRef } from "react"
import { fnv1a, xorshift32 } from "@/components/dither-kit/pixel"
import styles from "./game-shell.module.css"

export type ShellPhase = "idle" | "charge" | "solidify" | "grow" | "screen" | "close"

type Square = {
	bandX: number
	bandOffsetY: number
	offX: number
	offY: number
	arc: number
	delay: number
}

const BAND_ANGLE = (-8 * Math.PI) / 180
const BAND_SLOPE = Math.tan(BAND_ANGLE)
const BAND_HEIGHT = 144
const SOLIDIFY_MS = 120
const GROW_MS = 360
const CLOSE_COLLAPSE_MS = 220
const CLOSE_SHATTER_MS = 180

function clamp01(value: number) {
	return Math.max(0, Math.min(1, value))
}

function easeOutCubic(value: number) {
	return 1 - (1 - value) ** 3
}

function easeInOutCubic(value: number) {
	return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2
}

function makeSquareSprite(): HTMLCanvasElement {
	// Intentionally duplicates HeroCanvas's exact 32px amber square recipe so
	// the hero implementation remains completely untouched.
	const sprite = document.createElement("canvas")
	sprite.width = 32
	sprite.height = 32
	const context = sprite.getContext("2d")
	if (context) {
		context.strokeStyle = "#d97706"
		context.lineWidth = 2
		context.strokeRect(4, 4, 24, 24)
	}
	return sprite
}

function createSquares(width: number, height: number): Square[] {
	const random = xorshift32(fnv1a(`controls:${width}x${height}`))
	const count = Math.max(48, Math.min(110, Math.ceil(width / 22)))
	return Array.from({ length: count }, (_, index) => {
		const bandX = ((index + 0.5) / count) * (width + 160) - 80
		const bandOffsetY = (random() - 0.5) * (BAND_HEIGHT - 32)
		const side = index % 4
		const margin = 48 + random() * 180
		const offX = side === 0 ? -margin : side === 1 ? width + margin : random() * width
		const offY = side === 2 ? -margin : side === 3 ? height + margin : random() * height
		return {
			bandX,
			bandOffsetY,
			offX,
			offY,
			arc: (random() - 0.5) * Math.min(width, height) * 0.42,
			delay: random() * 0.18,
		}
	})
}

function bandCenterY(x: number, width: number, height: number) {
	return height / 2 + (x - width / 2) * BAND_SLOPE
}

function drawBand(
	context: CanvasRenderingContext2D,
	width: number,
	height: number,
	halfHeight: number,
	color: string,
	alpha = 1,
) {
	const leftCenter = bandCenterY(0, width, height)
	const rightCenter = bandCenterY(width, width, height)
	context.save()
	context.globalAlpha = alpha
	context.fillStyle = color
	context.beginPath()
	context.moveTo(0, leftCenter - halfHeight)
	context.lineTo(width, rightCenter - halfHeight)
	context.lineTo(width, rightCenter + halfHeight)
	context.lineTo(0, leftCenter + halfHeight)
	context.closePath()
	context.fill()
	context.restore()
}

function drawSquares(
	context: CanvasRenderingContext2D,
	squares: readonly Square[],
	sprite: HTMLCanvasElement,
	width: number,
	height: number,
	rawProgress: number,
) {
	for (const square of squares) {
		const local = clamp01((rawProgress - square.delay) / (1 - square.delay))
		const progress = easeOutCubic(local)
		const targetY = bandCenterY(square.bandX, width, height) + square.bandOffsetY
		const x = square.offX + (square.bandX - square.offX) * progress
		const y =
			square.offY + (targetY - square.offY) * progress + Math.sin(progress * Math.PI) * square.arc
		context.globalAlpha = 0.3 + progress * 0.7
		context.drawImage(sprite, Math.round(x - 16), Math.round(y - 16))
	}
	context.globalAlpha = 1
}

export function TransitionCanvas({
	phase,
	phaseStartedAt,
	chargeProgress,
	reducedMotion,
}: {
	phase: ShellPhase
	phaseStartedAt: number
	chargeProgress: number
	reducedMotion: boolean
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const targetChargeRef = useRef(chargeProgress)
	const visualChargeRef = useRef(0)

	targetChargeRef.current = chargeProgress

	useEffect(() => {
		const canvas = canvasRef.current
		const context = canvas?.getContext("2d")
		if (!canvas || !context) return

		let frame = 0
		let previousTime = performance.now()
		let width = window.innerWidth
		let height = window.innerHeight
		let dpr = Math.min(window.devicePixelRatio || 1, 2)
		let squares = createSquares(width, height)
		const sprite = makeSquareSprite()
		let primary = ""

		const resize = () => {
			width = window.innerWidth
			height = window.innerHeight
			dpr = Math.min(window.devicePixelRatio || 1, 2)
			canvas.width = Math.max(1, Math.floor(width * dpr))
			canvas.height = Math.max(1, Math.floor(height * dpr))
			canvas.style.width = `${width}px`
			canvas.style.height = `${height}px`
			context.setTransform(dpr, 0, 0, dpr, 0, 0)
			primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()
			squares = createSquares(width, height)
		}

		const draw = (now: number) => {
			const delta = Math.min(40, now - previousTime)
			previousTime = now
			context.setTransform(dpr, 0, 0, dpr, 0, 0)
			context.clearRect(0, 0, width, height)

			if (!reducedMotion) {
				if (phase === "charge") {
					const target = targetChargeRef.current
					const rate = target < visualChargeRef.current ? 0.014 : 0.025
					visualChargeRef.current += (target - visualChargeRef.current) * Math.min(1, delta * rate)
					if (Math.abs(target - visualChargeRef.current) < 0.002) {
						visualChargeRef.current = target
					}
					drawSquares(context, squares, sprite, width, height, visualChargeRef.current)
				} else if (phase === "solidify") {
					visualChargeRef.current = 1
					const progress = clamp01((now - phaseStartedAt) / SOLIDIFY_MS)
					drawSquares(context, squares, sprite, width, height, 1)
					drawBand(context, width, height, BAND_HEIGHT / 2, primary, easeOutCubic(progress))
				} else if (phase === "grow") {
					const progress = easeInOutCubic(clamp01((now - phaseStartedAt) / GROW_MS))
					const cover = height + Math.abs(BAND_SLOPE * width)
					const rawHalfHeight = BAND_HEIGHT / 2 + (cover - BAND_HEIGHT / 2) * progress
					const steppedHalfHeight = Math.ceil(rawHalfHeight / 8) * 8
					drawBand(context, width, height, steppedHalfHeight, primary)
				} else if (phase === "screen") {
					context.fillStyle = primary
					context.fillRect(0, 0, width, height)
				} else if (phase === "close") {
					const elapsed = now - phaseStartedAt
					if (elapsed < CLOSE_COLLAPSE_MS) {
						const progress = easeInOutCubic(clamp01(elapsed / CLOSE_COLLAPSE_MS))
						const cover = height + Math.abs(BAND_SLOPE * width)
						const rawHalfHeight = cover - (cover - BAND_HEIGHT / 2) * progress
						drawBand(context, width, height, Math.ceil(rawHalfHeight / 8) * 8, primary)
					} else {
						const shatter = clamp01((elapsed - CLOSE_COLLAPSE_MS) / CLOSE_SHATTER_MS)
						drawBand(context, width, height, BAND_HEIGHT / 2, primary, 1 - easeOutCubic(shatter))
						drawSquares(context, squares, sprite, width, height, 1 - shatter)
					}
				}
			}

			const chargeIsSettling =
				phase === "charge" && Math.abs(targetChargeRef.current - visualChargeRef.current) > 0.002
			if (phase !== "idle" || chargeIsSettling) {
				frame = requestAnimationFrame(draw)
			}
		}

		resize()
		window.addEventListener("resize", resize)
		frame = requestAnimationFrame(draw)
		return () => {
			window.removeEventListener("resize", resize)
			cancelAnimationFrame(frame)
		}
	}, [phase, phaseStartedAt, reducedMotion])

	return <canvas ref={canvasRef} className={styles.transition} aria-hidden />
}
