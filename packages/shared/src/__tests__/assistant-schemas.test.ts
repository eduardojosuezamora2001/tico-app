import { describe, expect, it } from "vitest"

import { AssistantChatSchema, SupportSendSchema } from "../schemas.js"

describe("AssistantChatSchema", () => {
  it("accepts a valid message", () => {
    const parsed = AssistantChatSchema.safeParse({ message: "¿Hay sodas cerca?" })
    expect(parsed.success).toBe(true)
  })

  it("rejects empty message", () => {
    const parsed = AssistantChatSchema.safeParse({ message: "   " })
    expect(parsed.success).toBe(false)
  })

  it("rejects oversized message", () => {
    const parsed = AssistantChatSchema.safeParse({ message: "x".repeat(2001) })
    expect(parsed.success).toBe(false)
  })
})

describe("SupportSendSchema", () => {
  it("accepts support body", () => {
    const parsed = SupportSendSchema.safeParse({ message: "Necesito ayuda" })
    expect(parsed.success).toBe(true)
  })
})
