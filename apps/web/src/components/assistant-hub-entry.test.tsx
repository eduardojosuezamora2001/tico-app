const openAssistantSheet = jest.fn()

jest.mock("@/lib/assistant-sheet", () => ({
  openAssistantSheet: (...args: unknown[]) => openAssistantSheet(...args),
}))

jest.mock("@/stores/support-inbox-store", () => ({
  useSupportInboxStore: (selector: (state: { unread: number }) => unknown) =>
    selector({ unread: 0 }),
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
    expect(screen.getByText("Soporte TicoApp")).toBeInTheDocument()
  })

  it("en compact también muestra soporte", () => {
    renderWithProviders(<AssistantHubEntry compact />)
    expect(screen.getByText("Soporte TicoApp")).toBeInTheDocument()
  })

  it("abre el sheet del asistente al hacer click", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssistantHubEntry />)
    await user.click(screen.getByText("Asistente TicoApp"))
    expect(openAssistantSheet).toHaveBeenCalledWith("assistant")
  })

  it("abre el sheet de soporte al hacer click", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AssistantHubEntry />)
    await user.click(screen.getByText("Soporte TicoApp"))
    expect(openAssistantSheet).toHaveBeenCalledWith("support")
  })
})
