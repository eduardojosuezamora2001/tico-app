import { ORDER_STATUS, type OrderListItem } from "@workspace/shared"

import {
  buildSalesSeries,
  buildSalesSummary,
  colones,
} from "@/lib/sales-analytics"

function makeOrder(partial: Partial<OrderListItem> & Pick<OrderListItem, "status" | "total">): OrderListItem {
  return {
    id: "o1",
    businessId: "b1",
    conversationId: "c1",
    messageId: "m1",
    customerId: "u1",
    fulfillmentStage: null,
    businessName: "Local",
    lines: [],
    subtotal: partial.total,
    decidedAt: null,
    stageUpdatedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    businessSlug: "local",
    customerName: "Cliente",
    ...partial,
  }
}

describe("sales-analytics", () => {
  it("formatea colones en CRC", () => {
    expect(colones(1500)).toMatch(/1.?500/)
  })

  it("resume pedidos vacíos en ceros", () => {
    const summary = buildSalesSummary([])
    expect(summary.acceptedSales).toBe(0)
    expect(summary.acceptedOrders).toBe(0)
    expect(summary.conversionRate).toBe(0)
  })

  it("cuenta ventas aceptadas y pendientes", () => {
    const summary = buildSalesSummary([
      makeOrder({ id: "1", status: ORDER_STATUS.accepted, total: 1000 }),
      makeOrder({ id: "2", status: ORDER_STATUS.pending, total: 500 }),
      makeOrder({ id: "3", status: ORDER_STATUS.denied, total: 200 }),
    ])
    expect(summary.acceptedSales).toBe(1000)
    expect(summary.acceptedOrders).toBe(1)
    expect(summary.pendingSales).toBe(500)
    expect(summary.deniedOrders).toBe(1)
    expect(summary.conversionRate).toBe(0.5)
  })

  it("genera historial + proyección por defecto", () => {
    const series = buildSalesSeries([])
    expect(series).toHaveLength(21)
    expect(series.filter((point) => point.isProjection)).toHaveLength(7)
  })
})
