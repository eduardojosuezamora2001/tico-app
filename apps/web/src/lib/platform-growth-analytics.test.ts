import {
  buildGrowthSeries,
  buildGrowthSummary,
  percentLabel,
} from "@/lib/platform-growth-analytics"

describe("platform-growth-analytics", () => {
  it("resume ceros sin altas", () => {
    const zeros = Array.from({ length: 14 }, () => 0)
    const summary = buildGrowthSummary({
      clientsByDay: zeros,
      ownersByDay: zeros,
      businessesByDay: zeros,
    })
    expect(summary.clientsLast14).toBe(0)
    expect(summary.projectedClientsNext7).toBe(0)
    expect(summary.clientsGrowthRate).toBe(0)
  })

  it("proyecta a partir de una tendencia al alza", () => {
    const clientsByDay = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]
    const ownersByDay = Array.from({ length: 14 }, () => 1)
    const businessesByDay = Array.from({ length: 14 }, () => 0)
    const summary = buildGrowthSummary({ clientsByDay, ownersByDay, businessesByDay })
    expect(summary.clientsLast14).toBe(56)
    expect(summary.projectedClientsNext7).toBeGreaterThan(summary.avgDailyClients * 6)
    expect(summary.clientsGrowthRate).toBeGreaterThan(0)
  })

  it("genera historial + proyección", () => {
    const values = Array.from({ length: 14 }, () => 2)
    const series = buildGrowthSeries({
      clientsByDay: values,
      ownersByDay: values,
      businessesByDay: values,
    })
    expect(series).toHaveLength(21)
    expect(series.filter((point) => point.isProjection)).toHaveLength(7)
  })

  it("formatea porcentaje con signo", () => {
    expect(percentLabel(0.12)).toBe("+12%")
    expect(percentLabel(-0.05)).toBe("-5%")
  })
})
