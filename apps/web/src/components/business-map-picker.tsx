import { useEffect, useRef, useState } from "react"

import { env } from "@/lib/env"
import { Input } from "@workspace/ui/components/input"

type LatLng = { lat: number; lng: number }

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (element: HTMLElement, options: Record<string, unknown>) => {
          addListener: (event: string, handler: (event: { latLng?: { lat: () => number; lng: () => number } }) => void) => void
          setCenter: (value: LatLng) => void
        }
        Marker: new (options: Record<string, unknown>) => {
          setMap: (map: unknown | null) => void
          setPosition: (value: LatLng) => void
          addListener: (event: string, handler: (event: { latLng?: { lat: () => number; lng: () => number } }) => void) => void
        }
        event: { clearInstanceListeners: (instance: unknown) => void }
        places?: {
          Autocomplete: new (input: HTMLInputElement, options: Record<string, unknown>) => {
            addListener: (event: string, handler: () => void) => void
            getPlace: () => {
              geometry?: { location?: { lat: () => number; lng: () => number } }
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
  searchPlaceholder,
  onChange,
}: {
  latitude: number | null
  longitude: number | null
  searchPlaceholder: string
  onChange: (next: LatLng) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiKey = env.VITE_GOOGLE_MAPS_API_KEY

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!apiKey || !mapRef.current) return
    let map: InstanceType<NonNullable<typeof window.google>["maps"]["Map"]> | null = null
    let marker: InstanceType<NonNullable<typeof window.google>["maps"]["Marker"]> | null = null
    let cancelled = false

    void loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !mapRef.current) return
        const center = {
          lat: latitude ?? 9.9281,
          lng: longitude ?? -84.0907,
        }
        map = new maps.Map(mapRef.current, {
          center,
          zoom: latitude != null ? 16 : 8,
          disableDefaultUI: true,
          zoomControl: true,
        })
        marker = new maps.Marker({ map, position: center, draggable: true })
        const sync = (lat: number, lng: number) => onChangeRef.current({ lat, lng })
        marker.addListener("dragend", (event) => {
          const latLng = event.latLng
          if (!latLng) return
          sync(latLng.lat(), latLng.lng())
        })
        map.addListener("click", (event) => {
          const latLng = event.latLng
          if (!latLng || !marker) return
          marker.setPosition({ lat: latLng.lat(), lng: latLng.lng() })
          sync(latLng.lat(), latLng.lng())
        })
        if (searchRef.current && maps.places) {
          const autocomplete = new maps.places.Autocomplete(searchRef.current, {
            fields: ["geometry"],
            componentRestrictions: { country: "cr" },
          })
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace()
            const location = place.geometry?.location
            if (!location || !marker || !map) return
            const next = { lat: location.lat(), lng: location.lng() }
            marker.setPosition(next)
            map.setCenter(next)
            sync(next.lat, next.lng)
          })
        }
        setReady(true)
      })
      .catch(() => setError("No se pudo cargar Google Maps. Revisa VITE_GOOGLE_MAPS_API_KEY."))

    return () => {
      cancelled = true
      if (marker && window.google?.maps) window.google.maps.event.clearInstanceListeners(marker)
      if (map && window.google?.maps) window.google.maps.event.clearInstanceListeners(map)
    }
  }, [apiKey, latitude, longitude])

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
      <div ref={mapRef} className="h-64 w-full overflow-hidden rounded-2xl border border-border bg-muted" />
      {ready && latitude != null && longitude != null ? (
        <p className="text-xs text-muted-foreground tabular-nums">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
      ) : null}
    </div>
  )
}
