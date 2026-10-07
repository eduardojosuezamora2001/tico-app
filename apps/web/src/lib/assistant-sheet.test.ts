import {
  openAssistantSheet,
  registerAssistantSheetOpen,
} from "@/lib/assistant-sheet"

describe("assistant-sheet", () => {
  afterEach(() => {
    registerAssistantSheetOpen(null)
  })

  it("invoca el handler registrado", () => {
    const handler = jest.fn()
    registerAssistantSheetOpen(handler)
    openAssistantSheet("support")
    expect(handler).toHaveBeenCalledWith("support")
  })

  it("no falla sin handler", () => {
    expect(() => openAssistantSheet("assistant")).not.toThrow()
  })
})
