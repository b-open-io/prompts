"use client"

import { useEffect, useRef } from "react"
import { BAYER4, fnv1a, xorshift32 } from "@/components/dither-kit/pixel"
import styles from "./game-shell.module.css"

const PIXEL_SIZE = 4

function themeColors(): [string, string, string] {
	const root = getComputedStyle(document.documentElement)
	return [
		root.getPropertyValue("--accent").trim(),
		root.getPropertyValue("--secondary-foreground").trim(),
		root.getPropertyValue("--foreground").trim(),
	]
}

function drawSunburst(
	context: CanvasRenderingContext2D,
	width: number,
	height: number,
	color: string,
	originX: number,
	originY: number,
) {
	const radius = Math.hypot(width, height) * 1.2
	context.save()
	context.fillStyle = color
	context.globalAlpha = 0.48
	for (let index = 0; index < 24; index += 2) {
		const first = (index / 24) * Math.PI * 2
		const second = ((index + 1) / 24) * Math.PI * 2
		context.beginPath()
		context.moveTo(originX, originY)
		context.lineTo(originX + Math.cos(first) * radius, originY + Math.sin(first) * radius)
		context.lineTo(originX + Math.cos(second) * radius, originY + Math.sin(second) * radius)
		context.closePath()
		context.fill()
	}
	context.restore()
}

function drawRoundedArcs(
	context: CanvasRenderingContext2D,
	width: number,
	height: number,
	color: string,
	offset: number,
) {
	context.save()
	context.strokeStyle = color
	context.globalAlpha = 0.68
	context.lineCap = "round"
	const centerX = width * 0.78
	const floor = height * 0.78
	const maxSize = Math.max(width, height)

	for (let index = 0; index < 9; index++) {
		const radius = maxSize * (0.12 + index * 0.075) + offset
		context.lineWidth = Math.max(1.5, radius * 0.025)
		context.beginPath()
		context.moveTo(centerX - radius, floor)
		context.lineTo(centerX - radius, floor - radius * 0.55)
		context.quadraticCurveTo(
			centerX - radius,
			floor - radius,
			centerX - radius * 0.55,
			floor - radius,
		)
		context.lineTo(centerX + radius * 0.55, floor - radius)
		context.quadraticCurveTo(
			centerX + radius,
			floor - radius,
			centerX + radius,
			floor - radius * 0.55,
		)
		context.lineTo(centerX + radius, floor)
		context.stroke()
	}
	context.restore()
}

function drawWaveBands(
	context: CanvasRenderingContext2D,
	width: number,
	height: number,
	color: string,
	offset: number,
) {
	context.save()
	context.strokeStyle = color
	context.globalAlpha = 0.72
	context.lineCap = "square"

	for (let index = 0; index < 11; index++) {
		const y = height * 0.38 + index * Math.max(4, height * 0.035) + offset
		const amplitude = Math.max(5, height * (0.025 + (index % 3) * 0.008))
		context.lineWidth = Math.max(2, height * 0.012)
		context.beginPath()
		context.moveTo(-width * 0.05, y)
		context.bezierCurveTo(width * 0.2, y - amplitude, width * 0.28, y + amplitude, width * 0.5, y)
		context.bezierCurveTo(width * 0.72, y - amplitude, width * 0.8, y + amplitude, width * 1.05, y)
		context.stroke()
	}
	context.restore()
}

function drawPattern(canvas: HTMLCanvasElement, screenId: string) {
	const cssWidth = window.innerWidth
	const cssHeight = window.innerHeight
	const width = Math.max(1, Math.ceil(cssWidth / PIXEL_SIZE))
	const height = Math.max(1, Math.ceil(cssHeight / PIXEL_SIZE))
	const source = document.createElement("canvas")
	source.width = width
	source.height = height
	const sourceContext = source.getContext("2d", { willReadFrequently: true })
	const outputContext = canvas.getContext("2d")
	if (!sourceContext || !outputContext) return

	const random = xorshift32(fnv1a(screenId))
	const [accent, warm, light] = themeColors()
	const originX = width * (0.12 + random() * 0.2)
	const originY = height * (0.62 + random() * 0.2)
	drawSunburst(sourceContext, width, height, accent, originX, originY)
	drawRoundedArcs(sourceContext, width, height, warm, random() * 8)
	drawWaveBands(sourceContext, width, height, light, random() * 7)

	const sourcePixels = sourceContext.getImageData(0, 0, width, height)
	const outputPixels = outputContext.createImageData(width, height)
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const index = (y * width + x) * 4
			const density = sourcePixels.data[index + 3] / 255
			if (density <= BAYER4[y & 3][x & 3]) continue
			outputPixels.data[index] = sourcePixels.data[index]
			outputPixels.data[index + 1] = sourcePixels.data[index + 1]
			outputPixels.data[index + 2] = sourcePixels.data[index + 2]
			outputPixels.data[index + 3] = 255
		}
	}

	canvas.width = width
	canvas.height = height
	outputContext.putImageData(outputPixels, 0, 0)
}

export function PatternLayer({ screenId }: { screenId: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		let resizeFrame = 0
		const render = () => {
			const canvas = canvasRef.current
			if (canvas) drawPattern(canvas, screenId)
		}
		const onResize = () => {
			cancelAnimationFrame(resizeFrame)
			resizeFrame = requestAnimationFrame(render)
		}

		render()
		window.addEventListener("resize", onResize)
		return () => {
			window.removeEventListener("resize", onResize)
			cancelAnimationFrame(resizeFrame)
		}
	}, [screenId])

	return <canvas ref={canvasRef} className={styles.pattern} aria-hidden />
}
