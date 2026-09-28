import type {
  AdministrativeDivision,
  Country,
  CountryAdministrativeLevel,
} from "@workspace/shared"
import { useCallback, useEffect, useState } from "react"

import { api } from "@/lib/api"

export function useCountries() {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    void api
      .get<{ data: Country[] }>("/countries")
      .then((response) => {
        setCountries(response.data.data)
        setError(null)
      })
      .catch((err: unknown) => {
        console.error("countries fetch failed", err)
        setError("No se pudieron cargar los países. Verifica que la API esté corriendo.")
      })
      .finally(() => setLoading(false))
  }, [])

  return { countries, loading, error }
}

export function useAdministrativeLevels(countryCode: string | null) {
  const [levels, setLevels] = useState<CountryAdministrativeLevel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!countryCode) {
      setLevels([])
      return
    }
    setLoading(true)
    void api
      .get<{ data: CountryAdministrativeLevel[] }>(
        `/countries/${countryCode}/administrative-levels`,
      )
      .then((response) => {
        setLevels(response.data.data)
        setError(null)
      })
      .catch(() => setError("No se pudieron cargar los niveles administrativos"))
      .finally(() => setLoading(false))
  }, [countryCode])

  return { levels, loading, error }
}

export function useAdministrativeDivisions(countryCode: string | null, parentId: string | null) {
  const [divisions, setDivisions] = useState<AdministrativeDivision[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!countryCode) {
      setDivisions([])
      return Promise.resolve()
    }
    setLoading(true)
    return api
      .get<{ data: AdministrativeDivision[] }>("/administrative-divisions", {
        params: {
          country: countryCode,
          ...(parentId ? { parentId } : {}),
        },
      })
      .then((response) => {
        setDivisions(response.data.data)
        setError(null)
      })
      .catch(() => setError("No se pudieron cargar las divisiones"))
      .finally(() => setLoading(false))
  }, [countryCode, parentId])

  useEffect(() => {
    void reload()
  }, [reload])

  return { divisions, loading, error, reload }
}
