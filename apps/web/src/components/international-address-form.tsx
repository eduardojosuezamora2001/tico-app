import type { Country } from "@workspace/shared"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  BusinessMapPicker,
  type MapPlaceResult,
} from "@/components/business-map-picker"
import {
  useAdministrativeDivisions,
  useAdministrativeLevels,
  useCountries,
} from "@/hooks/use-address-data"
import { resolveDivisionIds } from "@/lib/resolve-divisions"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import {
  alpha3ForAlpha2,
  CountryDropdown,
  countryOptionsForAlpha2Codes,
} from "@workspace/ui/components/country-dropdown"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

type SearchComboboxOption = { id: string; label: string }

function SearchCombobox({
  label,
  items,
  value,
  onChange,
  loading = false,
  disabled = false,
  placeholder = "Seleccionar",
  loadingPlaceholder = "Cargando…",
}: {
  label: string
  items: SearchComboboxOption[]
  value: string | null
  onChange: (id: string | null) => void
  loading?: boolean
  disabled?: boolean
  placeholder?: string
  loadingPlaceholder?: string
}) {
  const selected = items.find((item) => item.id === value) ?? null

  return (
    <Combobox
      items={items}
      value={selected}
      onValueChange={(next) => onChange(next?.id ?? null)}
      isItemEqualToValue={(item, selectedItem) => item.id === selectedItem.id}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.id}
    >
      <ComboboxInput
        aria-label={label}
        placeholder={loading ? loadingPlaceholder : placeholder}
        disabled={disabled || loading}
        showClear={!!value}
        className="h-11 w-full rounded-xl"
      />
      <ComboboxContent>
        <ComboboxEmpty>Nada coincide.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.id} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export type InternationalAddressValue = {
  countryId: string | null
  countryCode: string | null
  divisionIds: string[]
  postalCode: string
  addressLine1: string
  addressLine2: string
  reference: string
  latitude: number | null
  longitude: number | null
  formattedAddress: string | null
  placeId: string | null
}

type Props = {
  value: InternationalAddressValue
  onChange: (value: InternationalAddressValue) => void
  mapSearchPlaceholder?: string
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}

function DivisionLevelSelect({
  label,
  countryCode,
  parentId,
  value,
  onChange,
}: {
  label: string
  countryCode: string
  parentId: string | null
  value: string | null
  onChange: (divisionId: string | null) => void
}) {
  const { divisions, loading, error } = useAdministrativeDivisions(countryCode, parentId)

  const items = useMemo(
    () => divisions.map((division) => ({ id: division.id, label: division.name })),
    [divisions],
  )

  return (
    <Field label={label}>
      <SearchCombobox
        label={label}
        items={items}
        value={value}
        onChange={onChange}
        loading={loading}
      />
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </Field>
  )
}

export function InternationalAddressForm({ value, onChange, mapSearchPlaceholder }: Props) {
  const { countries, loading: countriesLoading, error: countriesError } = useCountries()
  const { levels } = useAdministrativeLevels(value.countryCode)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [resolvingMap, setResolvingMap] = useState(false)
  const defaultedCountry = useRef(false)

  useEffect(() => {
    if (!value.countryId && countries.length > 0 && !defaultedCountry.current) {
      defaultedCountry.current = true
      const defaultCountry = countries.find((country) => country.code === "CR") ?? countries[0]
      onChange({
        ...value,
        countryId: defaultCountry.id,
        countryCode: defaultCountry.code,
        divisionIds: [],
      })
      return
    }
    setSelectedCountry(
      value.countryId
        ? (countries.find((country) => country.id === value.countryId) ?? null)
        : null,
    )
  }, [countries, onChange, value.countryCode, value.countryId, value])

  const sortedLevels = useMemo(
    () => [...levels].sort((a, b) => a.level - b.level),
    [levels],
  )

  const countryDropdownOptions = useMemo(
    () => countryOptionsForAlpha2Codes(countries.map((country) => country.code)),
    [countries],
  )

  const countryDropdownDefault = alpha3ForAlpha2(value.countryCode)

  function patch(partial: Partial<InternationalAddressValue>) {
    onChange({ ...value, ...partial })
  }

  function handleCountryChange(countryId: string | null) {
    const country = countryId ? countries.find((item) => item.id === countryId) : null
    patch({
      countryId: country?.id ?? null,
      countryCode: country?.code ?? null,
      divisionIds: [],
      latitude: null,
      longitude: null,
      placeId: null,
      formattedAddress: null,
    })
  }

  function handleDivisionChange(levelIndex: number, divisionId: string | null) {
    const next = value.divisionIds.slice(0, levelIndex)
    if (divisionId) next[levelIndex] = divisionId
    patch({ divisionIds: next })
  }

  async function handleMapPlace(place: MapPlaceResult) {
    setResolvingMap(true)
    try {
      let divisionIds: string[] = []
      if (value.countryCode && place.adminNames.length > 0) {
        divisionIds = await resolveDivisionIds(value.countryCode, place.adminNames)
      }
      onChange({
        ...value,
        latitude: place.lat,
        longitude: place.lng,
        addressLine1: place.addressLine1 || value.addressLine1,
        postalCode: place.postalCode || value.postalCode,
        formattedAddress: place.formattedAddress,
        placeId: place.placeId,
        divisionIds: divisionIds.length > 0 ? divisionIds : value.divisionIds,
      })
    } finally {
      setResolvingMap(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <BusinessMapPicker
        latitude={value.latitude}
        longitude={value.longitude}
        countryCode={value.countryCode}
        searchPlaceholder={
          mapSearchPlaceholder ??
          (selectedCountry ? `Buscar dirección en ${selectedCountry.nativeName}` : "Buscar dirección")
        }
        onChange={({ lat, lng }) => patch({ latitude: lat, longitude: lng })}
        onPlaceChange={(place) => void handleMapPlace(place)}
      />

      <Field label="País">
        <CountryDropdown
          options={countryDropdownOptions}
          defaultValue={countryDropdownDefault}
          onChange={(country) => {
            const match = countries.find(
              (item) => item.code.toUpperCase() === country.alpha2.toUpperCase()
            )
            handleCountryChange(match?.id ?? null)
          }}
          disabled={countriesLoading || countryDropdownOptions.length === 0}
          placeholder={
            countriesLoading ? "Cargando países…" : "Seleccionar país"
          }
          className="h-11 rounded-xl"
        />
        {countriesError ? (
          <span className="text-xs text-destructive">{countriesError}</span>
        ) : null}
        {!countriesLoading && countries.length === 0 && !countriesError ? (
          <span className="text-xs text-destructive">
            No hay países configurados. Aplica las migraciones de direcciones internacionales.
          </span>
        ) : null}
      </Field>

      {resolvingMap ? (
        <p className="text-xs text-muted-foreground">Completando provincia, cantón y dirección…</p>
      ) : null}

      {value.countryCode
        ? sortedLevels.map((level, index) => {
            const parentId = index === 0 ? null : (value.divisionIds[index - 1] ?? null)
            if (index > 0 && !parentId) return null
            return (
              <DivisionLevelSelect
                key={level.id}
                label={level.label}
                countryCode={value.countryCode!}
                parentId={parentId}
                value={value.divisionIds[index] ?? null}
                onChange={(divisionId) => handleDivisionChange(index, divisionId)}
              />
            )
          })
        : null}

      <Field label="Dirección">
        <Input
          value={value.addressLine1}
          onChange={(event) => patch({ addressLine1: event.target.value })}
          placeholder="Calle, avenida, número"
          className="h-11 rounded-xl"
          required
        />
      </Field>

      <Field label="Complemento (opcional)">
        <Input
          value={value.addressLine2}
          onChange={(event) => patch({ addressLine2: event.target.value })}
          placeholder="Edificio, apartamento, piso"
          className="h-11 rounded-xl"
        />
      </Field>

      <Field label="Código postal (opcional)">
        <Input
          value={value.postalCode}
          onChange={(event) => patch({ postalCode: event.target.value })}
          className="h-11 rounded-xl"
        />
      </Field>

      <Field label="Referencia y señas">
        <Textarea
          value={value.reference}
          onChange={(event) => patch({ reference: event.target.value })}
          placeholder="200 metros sur del parque, portón verde."
          className="min-h-24 rounded-xl"
        />
      </Field>
    </div>
  )
}

export function emptyInternationalAddress(): InternationalAddressValue {
  return {
    countryId: null,
    countryCode: null,
    divisionIds: [],
    postalCode: "",
    addressLine1: "",
    addressLine2: "",
    reference: "",
    latitude: null,
    longitude: null,
    formattedAddress: null,
    placeId: null,
  }
}

export function deepestDivisionId(value: InternationalAddressValue) {
  return value.divisionIds.at(-1) ?? null
}
