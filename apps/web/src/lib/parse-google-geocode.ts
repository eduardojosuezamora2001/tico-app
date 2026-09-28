type AddressComponent = {
  long_name: string
  short_name: string
  types: string[]
}

function pick(components: AddressComponent[], ...types: string[]) {
  for (const type of types) {
    const match = components.find((component) => component.types.includes(type))
    if (match) return match.long_name
  }
  return ""
}

export type ParsedGoogleAddress = {
  formattedAddress: string
  placeId: string | null
  addressLine1: string
  postalCode: string
  /** Nombres administrativos de mayor a menor (provincia, cantón, distrito…). */
  adminNames: string[]
}

export function parseGoogleGeocodeResult(result: {
  formatted_address?: string
  place_id?: string
  address_components?: AddressComponent[]
}): ParsedGoogleAddress {
  const components = result.address_components ?? []
  const route = pick(components, "route", "street_address")
  const number = pick(components, "street_number")
  const addressLine1 = [route, number].filter(Boolean).join(" ").trim()

  const level1 = pick(components, "administrative_area_level_1")
  const level2 = pick(
    components,
    "administrative_area_level_2",
    "locality",
    "sublocality_level_1",
  )
  const level3 = pick(
    components,
    "administrative_area_level_3",
    "sublocality",
    "sublocality_level_2",
    "neighborhood",
  )

  const adminNames = [level1, level2, level3].filter(Boolean)

  return {
    formattedAddress: result.formatted_address ?? addressLine1,
    placeId: result.place_id ?? null,
    addressLine1: addressLine1 || result.formatted_address?.split(",")[0]?.trim() || "",
    postalCode: pick(components, "postal_code"),
    adminNames,
  }
}
