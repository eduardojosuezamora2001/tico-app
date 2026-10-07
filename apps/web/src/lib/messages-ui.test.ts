import {
  formatColones,
  orderNumberFromConversation,
  orderProgress,
  orderShortId,
  whatsappUrl,
  wazeUrl,
} from "@/lib/messages-ui"

describe("messages-ui helpers", () => {
  it("formatea montos y ids cortos", () => {
    expect(formatColones(2500)).toMatch(/2.?500/)
    expect(orderShortId("abcdef12-3456-7890")).toBe("7890")
    expect(orderNumberFromConversation("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toEqual(expect.any(String))
  })

  it("calcula progreso de pasos como porcentaje", () => {
    expect(
      orderProgress([
        { id: "a", label: "A", state: "done" },
        { id: "b", label: "B", state: "current" },
        { id: "c", label: "C", state: "pending" },
      ]),
    ).toBe(50)
  })

  it("arma urls de contacto", () => {
    expect(whatsappUrl("+50688887777")).toContain("wa.me")
    expect(wazeUrl("San José")).toContain("waze.com")
    expect(whatsappUrl(null)).toBeNull()
    expect(wazeUrl(null)).toBeNull()
  })
})
