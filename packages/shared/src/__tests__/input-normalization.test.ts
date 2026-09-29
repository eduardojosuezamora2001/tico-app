import { describe, expect, it } from "vitest"

import { normalizeHttpUrl, normalizePhoneToE164 } from "../input-normalization.js"

describe("normalizePhoneToE164", () => {
  it("adds the Costa Rica dial code to local numbers", () => {
    expect(normalizePhoneToE164("88887777")).toBe("+50688887777")
    expect(normalizePhoneToE164("50688887777")).toBe("+50688887777")
    expect(normalizePhoneToE164("+50688887777")).toBe("+50688887777")
  })
})

describe("normalizeHttpUrl", () => {
  it("adds https when the scheme is missing", () => {
    expect(normalizeHttpUrl("instagram.com/local")).toBe("https://instagram.com/local")
    expect(normalizeHttpUrl("https://instagram.com/local")).toBe("https://instagram.com/local")
  })
})
