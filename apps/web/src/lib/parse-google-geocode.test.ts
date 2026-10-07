import { parseGoogleGeocodeResult } from "@/lib/parse-google-geocode"

describe("parseGoogleGeocodeResult", () => {
  it("extrae calle y niveles administrativos", () => {
    const parsed = parseGoogleGeocodeResult({
      formatted_address: "Av. Central, San José",
      place_id: "abc",
      address_components: [
        { long_name: "Central", short_name: "Central", types: ["route"] },
        { long_name: "100", short_name: "100", types: ["street_number"] },
        { long_name: "San José", short_name: "SJ", types: ["administrative_area_level_1"] },
        { long_name: "10101", short_name: "10101", types: ["postal_code"] },
      ],
    })
    expect(parsed.addressLine1).toBe("Central 100")
    expect(parsed.adminNames[0]).toBe("San José")
    expect(parsed.postalCode).toBe("10101")
    expect(parsed.placeId).toBe("abc")
  })
})
