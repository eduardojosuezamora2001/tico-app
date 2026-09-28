import type { GeocodingProvider, GeocodingResult } from "@workspace/shared"

import { env } from "../config/env.js"

class GoogleGeocodingProvider implements GeocodingProvider {
  constructor(private apiKey: string) {}

  async geocode(address: string): Promise<GeocodingResult> {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json")
    url.searchParams.set("address", address)
    url.searchParams.set("key", this.apiKey)
    const response = await fetch(url)
    const payload = (await response.json()) as {
      status: string
      results?: Array<{
        formatted_address: string
        place_id: string
        geometry: { location: { lat: number; lng: number } }
      }>
    }
    const result = payload.results?.[0]
    if (!result) throw new Error("No se encontró la dirección")
    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
    }
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResult> {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json")
    url.searchParams.set("latlng", `${latitude},${longitude}`)
    url.searchParams.set("key", this.apiKey)
    const response = await fetch(url)
    const payload = (await response.json()) as {
      status: string
      results?: Array<{
        formatted_address: string
        place_id: string
        geometry: { location: { lat: number; lng: number } }
      }>
    }
    const result = payload.results?.[0]
    if (!result) throw new Error("No se encontró la dirección")
    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      placeId: result.place_id,
    }
  }
}

class UnconfiguredGeocodingProvider implements GeocodingProvider {
  geocode(): Promise<GeocodingResult> {
    return Promise.reject(new Error("Geocodificación no configurada"))
  }

  reverseGeocode(): Promise<GeocodingResult> {
    return Promise.reject(new Error("Geocodificación no configurada"))
  }
}

export class GeocodingService {
  constructor(private provider: GeocodingProvider) {}

  geocode(address: string) {
    return this.provider.geocode(address)
  }

  reverseGeocode(latitude: number, longitude: number) {
    return this.provider.reverseGeocode(latitude, longitude)
  }
}

export const geocodingService = new GeocodingService(
  env.GOOGLE_MAPS_API_KEY
    ? new GoogleGeocodingProvider(env.GOOGLE_MAPS_API_KEY)
    : new UnconfiguredGeocodingProvider(),
)
