import { describe, expect, test } from "bun:test"
import { isBearerAuthorization } from "./bopen-device"

describe("device bearer validation", () => {
	test("accepts a non-empty bearer token", () => {
		expect(isBearerAuthorization("Bearer session-token")).toBe(true)
	})

	test("rejects missing, empty, or alternate authorization schemes", () => {
		expect(isBearerAuthorization(null)).toBe(false)
		expect(isBearerAuthorization("Bearer ")).toBe(false)
		expect(isBearerAuthorization("Basic abc")).toBe(false)
	})
})
