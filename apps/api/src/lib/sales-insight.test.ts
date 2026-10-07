import { describe, expect, it } from "vitest"

process.env.SUPABASE_URL ??= "https://example.supabase.co"
process.env.SUPABASE_PUBLISHABLE_KEY ??= "test-publishable-key"
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key"
process.env.NODE_ENV = "test"

const { buildHeuristicSalesInsight, buildSalesInsightPrompt } = await import("./sales-insight.js")

const sampleMetrics = {
  acceptedSales: 150_000,
  acceptedOrders: 12,
  pendingSales: 25_000,
  pendingOrders: 2,
  deniedOrders: 1,
  avgDailySales: 10_000,
  projectedNext7: 80_000,
  projectedMonth: 300_000,
  conversionRate: 0.92,
}

describe("sales-insight", () => {
  it("buildHeuristicSalesInsight explica proyección y tendencia", () => {
    const text = buildHeuristicSalesInsight(sampleMetrics)
    expect(text).toContain("7 días")
    expect(text).toMatch(/₡|CRC/)
    expect(text).toContain("92%")
    expect(text).toContain("2 pedidos pendientes")
  })

  it("buildHeuristicSalesInsight maneja negocio sin pedidos", () => {
    const text = buildHeuristicSalesInsight({
      ...sampleMetrics,
      acceptedSales: 0,
      acceptedOrders: 0,
      pendingSales: 0,
      pendingOrders: 0,
      deniedOrders: 0,
      avgDailySales: 0,
      projectedNext7: 0,
      projectedMonth: 0,
      conversionRate: 0,
    })
    expect(text.toLowerCase()).toContain("todavía no hay pedidos")
  })

  it("buildSalesInsightPrompt incluye métricas enviadas", () => {
    const prompt = buildSalesInsightPrompt(sampleMetrics)
    expect(prompt).toContain("Proyección 7 días")
    expect(prompt).toContain("Proyección mensual")
    expect(prompt).toContain("92%")
    expect(prompt).toContain("Tendencia calculada")
  })
})
