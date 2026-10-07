const openAssistantSheet = jest.fn()

jest.mock("@/lib/assistant-sheet", () => ({
  openAssistantSheet: (...args: unknown[]) => openAssistantSheet(...args),
}))

import { AssistantHubEntry } from "@/components/assistant-hub-entry"
import { renderWithProviders, screen, userEvent } from "@/test/test-utils"

describe("AssistantHubEntry", () => {
  beforeEach(() => {
    openAssistantSheet.mockClear()
  })

  it("muestra el asistente y soporte", () => {
    renderWithProviders(<AssistantHubEntry />)
    expect(screen.getByText("Asistente TicoApp")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /soporte con el equipo/i })).toBeInTheDocument()
  })

  it("en compact oculta el botón de soporte", () => {
    renderWithProviders(<AssistantHubEntry compact />)
    expect(screen.queryByRole("button", { name: /soporte con el equipo/i })).not.toBeInTheDocument()
  })

  it("abre el sheet del asistente al hacer click", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssistantHubEntry />)
    await user.click(screen.getByText("Asistente TicoApp"))
    expect(openAssistantSheet).toHaveBeenCalledWith("assistant")
  })
})
