/** Centro aproximado del mapa por código ISO del país. */
export const COUNTRY_MAP_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  CR: { lat: 9.9281, lng: -84.0907, zoom: 8 },
  CO: { lat: 4.711, lng: -74.0721, zoom: 6 },
  MX: { lat: 19.4326, lng: -99.1332, zoom: 5 },
}

export function mapCenterForCountry(countryCode: string | null | undefined) {
  if (!countryCode) return { lat: 9.9281, lng: -84.0907, zoom: 3 }
  return COUNTRY_MAP_CENTERS[countryCode.toUpperCase()] ?? { lat: 0, lng: 0, zoom: 3 }
}
