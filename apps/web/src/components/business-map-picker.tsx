import { useEffect, useRef, useState } from "react"

import { mapCenterForCountry } from "@/lib/country-map-centers"
import { env } from "@/lib/env"
import { parseGoogleGeocodeResult } from "@/lib/parse-google-geocode"
import { Input } from "@workspace/ui/components/input"

type LatLng = { lat: number; lng: number }

export type MapPlaceResult = {
  lat: number
  lng: number
  formattedAddress: string | null
  placeId: string | null
  addressLine1: string
  postalCode: string
  adminNames: string[]
}

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (element: HTMLElement, options: Record<string, unknown>) => {
          addListener: (event: string, handler: (event: { latLng?: { lat: () => number; lng: () => number } }) => void) => void
          setCenter: (value: LatLng) => void
          setZoom: (zoom: number) => void
        }
        Marker: new (options: Record<string, unknown>) => {
          setMap: (map: unknown | null) => void
          setPosition: (value: LatLng) => void
          addListener: (event: string, handler: (event: { latLng?: { lat: () => number; lng: () => number } }) => void) => void
        }
        Geocoder: new () => {
          geocode: (
            request: { location?: LatLng; placeId?: string },
            callback: (
              results: Array<{
                formatted_address?: string
                place_id?: string
                address_components?: Array<{ long_name: string; short_name: string; types: string[] }>
              }> | null,
              status: string,
            ) => void,
          ) => void
        }
        event: { clearInstanceListeners: (instance: unknown) => void }
        places?: {
          Autocomplete: new (input: HTMLInputElement, options: Record<string, unknown>) => {
            addListener: (event: string, handler: () => void) => void
            getPlace: () => {
              formatted_address?: string
              place_id?: string
              geometry?: { location?: { lat: () => number; lng: () => number } }
              address_components?: Array<{ long_name: string; short_name: string; types: string[] }>
            }
          }
        }
      }
    }
  }
}

function loadGoogleMaps(apiKey: string) {
  const existing = document.querySelector('script[data-google-maps="true"]')
  if (existing) {
    return window.google?.maps
      ? Promise.resolve(window.google.maps)
      : new Promise<NonNullable<typeof window.google>["maps"]>((resolve, reject) => {
          existing.addEventListener("load", () => resolve(window.google!.maps))
          existing.addEventListener("error", () => reject(new Error("maps")))
        })
  }

  return new Promise<NonNullable<typeof window.google>["maps"]>((resolve, reject) => {
    const script = document.createElement("script")
    script.dataset.googleMaps = "true"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`
    script.async = true
    script.onload = () => resolve(window.google!.maps)
    script.onerror = () => reject(new Error("maps"))
    document.head.appendChild(script)
  })
}

export function BusinessMapPicker({
  latitude,
  longitude,
  countryCode,
  searchPlaceholder,
  onChange,
  onPlaceChange,
}: {
  latitude: number | null
  longitude: number | null
  countryCode?: string | null
  searchPlaceholder: string
  onChange: (next: LatLng) => void
  onPlaceChange?: (place: MapPlaceResult) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const mapInstance = useRef<InstanceType<NonNullable<typeof window.google>["maps"]["Map"]> | null>(null)
  const markerInstance = useRef<InstanceType<NonNullable<typeof window.google>["maps"]["Marker"]> | null>(null)
  const geocoderRef = useRef<InstanceType<NonNullable<typeof window.google>["maps"]["Geocoder"]> | null>(null)
  const autocompleteRef = useRef<InstanceType<NonNullable<typeof window.google>["maps"]["places"]["Autocomplete"]> | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const apiKey = env.VITE_GOOGLE_MAPS_API_KEY

  const onChangeRef = useRef(onChange)
  const onPlaceChangeRef = useRef(onPlaceChange)
  onChangeRef.current = onChange
  onPlaceChangeRef.current = onPlaceChange

  function reverseGeocode(lat: number, lng: number) {
    if (!geocoderRef.current || !onPlaceChangeRef.current) {
      onChangeRef.current({ lat, lng })
      return
    }
    setGeocoding(true)
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      setGeocoding(false)
      onChangeRef.current({ lat, lng })
      if (status !== "OK" || !results?.[0]) {
        onPlaceChangeRef.current?.({
          lat,
          lng,
          formattedAddress: null,
          placeId: null,
          addressLine1: "",
          postalCode: "",
          adminNames: [],
        })
        return
      }
      const parsed = parseGoogleGeocodeResult(results[0])
      onPlaceChangeRef.current?.({
        lat,
        lng,
        formattedAddress: parsed.formattedAddress,
        placeId: parsed.placeId,
        addressLine1: parsed.addressLine1,
        postalCode: parsed.postalCode,
        adminNames: parsed.adminNames,
      })
    })
  }

  function applyPlace(lat: number, lng: number, place?: {
    formatted_address?: string
    place_id?: string
    address_components?: Array<{ long_name: string; short_name: string; types: string[] }>
  }) {
    if (markerInstance.current) markerInstance.current.setPosition({ lat, lng })
    if (mapInstance.current) {
      mapInstance.current.setCenter({ lat, lng })
      mapInstance.current.setZoom(16)
    }
    if (place && onPlaceChangeRef.current) {
      const parsed = parseGoogleGeocodeResult(place)
      onChangeRef.current({ lat, lng })
      onPlaceChangeRef.current({
        lat,
        lng,
        formattedAddress: parsed.formattedAddress,
        placeId: parsed.placeId,
        addressLine1: parsed.addressLine1,
        postalCode: parsed.postalCode,
        adminNames: parsed.adminNames,
      })
      return
    }
    reverseGeocode(lat, lng)
  }

  useEffect(() => {
    if (!apiKey || !mapRef.current) return
    let cancelled = false

    void loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !mapRef.current) return
        const centerConfig = mapCenterForCountry(countryCode)
        const center = {
          lat: latitude ?? centerConfig.lat,
          lng: longitude ?? centerConfig.lng,
        }
        const map = new maps.Map(mapRef.current, {
          center,
          zoom: latitude != null ? 16 : centerConfig.zoom,
          disableDefaultUI: true,
          zoomControl: true,
        })
        const marker = new maps.Marker({
          map,
          position: center,
          draggable: true,
          visible: latitude != null && longitude != null,
        })
        geocoderRef.current = new maps.Geocoder()
        mapInstance.current = map
        markerInstance.current = marker

        marker.addListener("dragend", (event) => {
          const latLng = event.latLng
          if (!latLng) return
          applyPlace(latLng.lat(), latLng.lng())
        })
        map.addListener("click", (event) => {
          const latLng = event.latLng
          if (!latLng) return
          marker.setPosition({ lat: latLng.lat(), lng: latLng.lng() })
          marker.setVisible(true)
          applyPlace(latLng.lat(), latLng.lng())
        })

        if (searchRef.current && maps.places) {
          autocompleteRef.current = new maps.places.Autocomplete(searchRef.current, {
            fields: ["geometry", "formatted_address", "place_id", "address_components"],
            ...(countryCode ? { componentRestrictions: { country: countryCode.toLowerCase() } } : {}),
          })
          autocompleteRef.current.addListener("place_changed", () => {
            const place = autocompleteRef.current?.getPlace()
            const location = place?.geometry?.location
            if (!location) return
            applyPlace(location.lat(), location.lng(), place)
          })
        }

        setReady(true)
      })
      .catch(() => setError("No se pudo cargar Google Maps. Revisa VITE_GOOGLE_MAPS_API_KEY."))

    return () => {
      cancelled = true
      if (markerInstance.current && window.google?.maps) {
        window.google.maps.event.clearInstanceListeners(markerInstance.current)
      }
      if (mapInstance.current && window.google?.maps) {
        window.google.maps.event.clearInstanceListeners(mapInstance.current)
      }
      if (autocompleteRef.current && window.google?.maps) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
      mapInstance.current = null
      markerInstance.current = null
      geocoderRef.current = null
      autocompleteRef.current = null
    }
  }, [apiKey])

  useEffect(() => {
    if (!mapInstance.current || !markerInstance.current) return
    const centerConfig = mapCenterForCountry(countryCode)

    if (latitude != null && longitude != null) {
      markerInstance.current.setPosition({ lat: latitude, lng: longitude })
      markerInstance.current.setVisible(true)
      mapInstance.current.setCenter({ lat: latitude, lng: longitude })
      return
    }

    mapInstance.current.setCenter({ lat: centerConfig.lat, lng: centerConfig.lng })
    mapInstance.current.setZoom(centerConfig.zoom)
    markerInstance.current.setVisible(false)
  }, [countryCode, latitude, longitude])

  useEffect(() => {
    if (!searchRef.current || !window.google?.maps?.places || !ready) return
    if (autocompleteRef.current && window.google.maps) {
      window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
    }
    autocompleteRef.current = new window.google.maps.places.Autocomplete(searchRef.current, {
      fields: ["geometry", "formatted_address", "place_id", "address_components"],
      ...(countryCode ? { componentRestrictions: { country: countryCode.toLowerCase() } } : {}),
    })
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace()
      const location = place?.geometry?.location
      if (!location) return
      applyPlace(location.lat(), location.lng(), place)
    })
  }, [countryCode, ready])

  if (!apiKey) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Agrega VITE_GOOGLE_MAPS_API_KEY en tu .env para usar el mapa. Mientras tanto, puedes escribir coordenadas manualmente.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={latitude ?? ""}
            onChange={(event) => onChange({ lat: Number(event.target.value), lng: longitude ?? -84.0907 })}
            placeholder="Latitud"
            inputMode="decimal"
            aria-label="Latitud"
            className="h-11 rounded-xl"
          />
          <Input
            value={longitude ?? ""}
            onChange={(event) => onChange({ lat: latitude ?? 9.9281, lng: Number(event.target.value) })}
            placeholder="Longitud"
            inputMode="decimal"
            aria-label="Longitud"
            className="h-11 rounded-xl"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        ref={searchRef}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="h-11 rounded-xl"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div ref={mapRef} className="h-72 w-full overflow-hidden rounded-2xl border border-border bg-muted" />
      {geocoding ? (
        <p className="text-xs text-muted-foreground">Obteniendo dirección del punto seleccionado…</p>
      ) : null}
      {ready && latitude != null && longitude != null ? (
        <p className="text-xs text-muted-foreground tabular-nums">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Haz clic en el mapa o arrastra el marcador para fijar la ubicación.</p>
      )}
    </div>
  )
}
