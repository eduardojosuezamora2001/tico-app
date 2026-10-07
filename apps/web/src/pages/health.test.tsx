import { renderWithProviders, screen, waitFor } from "@/test/test-utils"

import { HealthPage } from "@/pages/health"

describe("HealthPage", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "ok", timestamp: "2026-01-01T00:00:00.000Z" }),
    }) as jest.Mock
  })

  it("muestra el JSON y el código HTTP del proxy", async () => {
    renderWithProviders(<HealthPage />, { route: "/health" })
    await waitFor(() => {
      expect(screen.getByText(/· OK/)).toBeInTheDocument()
    })
    expect(screen.getByText("200")).toBeInTheDocument()
    expect(screen.getByText(/"status": "ok"/)).toBeInTheDocument()
  })
})
