/**
 * Contratos de geocodificación desacoplados del proveedor concreto.
 */

export interface GeocodingResult {
  latitude: number
  longitude: number
  formattedAddress: string
  placeId?: string | null
}

export interface GeocodingProvider {
  geocode(address: string): Promise<GeocodingResult>
  reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult>
}
