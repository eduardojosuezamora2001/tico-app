jest.mock("@/services/orders.service", () => ({
  listOrders: jest.fn().mockResolvedValue([
    {
      id: "o1",
      businessId: "b1",
      conversationId: "c1",
      messageId: "m1",
      customerId: "u1",
      status: "accepted",
      fulfillmentStage: "delivered",
      businessName: "Local",
      businessSlug: "local",
      customerName: "Cliente",
      lines: [],
      subtotal: 10_000,
      total: 10_000,
      note: null,
      decidedAt: new Date().toISOString(),
      stageUpdatedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pickupCode: null,
      pickupCodeExpiresAt: null,
    },
  ]),
}))

jest.mock("@/services/sales.service", () => ({
  fetchSalesInsight: jest.fn().mockResolvedValue({
    text: "La proyección a 7 días ronda ₡70.000 con tendencia estable.",
    source: "ai",
  }),
}))

import { MerchantSalesDashboard } from "@/components/merchant-sales-dashboard"
import { fetchSalesInsight } from "@/services/sales.service"
import { renderWithProviders, screen, waitFor } from "@/test/test-utils"

describe("MerchantSalesDashboard", () => {
  it("muestra el panel de ventas", async () => {
    renderWithProviders(<MerchantSalesDashboard businessId="b1" />)
    await waitFor(() => {
      expect(screen.getByText("Ventas y proyecciones")).toBeInTheDocument()
    })
    expect(screen.getByText("Ventas aceptadas")).toBeInTheDocument()
    expect(screen.getByText("Proyección 7 días")).toBeInTheDocument()
  })

  it("muestra la predicción generada con IA", async () => {
    renderWithProviders(<MerchantSalesDashboard businessId="b1" />)
    await waitFor(() => {
      expect(
        screen.getByText("La proyección a 7 días ronda ₡70.000 con tendencia estable."),
      ).toBeInTheDocument()
    })
    expect(screen.getByText("Generado con IA")).toBeInTheDocument()
    expect(fetchSalesInsight).toHaveBeenCalled()
  })
})
