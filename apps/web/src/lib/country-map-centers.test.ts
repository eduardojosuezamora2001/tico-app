import { mapCenterForCountry } from "@/lib/country-map-centers"

describe("country-map-centers", () => {
  it("usa Costa Rica como fallback sin código", () => {
    expect(mapCenterForCountry(null).lat).toBeCloseTo(9.9281)
  })

  it("resuelve centros conocidos", () => {
    expect(mapCenterForCountry("CR").zoom).toBe(8)
    expect(mapCenterForCountry("mx").lat).toBeCloseTo(19.4326)
  })

  it("usa zoom genérico para países desconocidos", () => {
    expect(mapCenterForCountry("ZZ").zoom).toBe(3)
  })
})
