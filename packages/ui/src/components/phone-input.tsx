"use client"

import * as React from "react"
import parsePhoneNumberFromString, {
  isValidPhoneNumber,
  type CountryCode,
} from "libphonenumber-js"
import { lookup } from "country-data-list"
import { z } from "zod"
import { cn } from "cn"

import {
  alpha3ForAlpha2,
  CountryDropdown,
  type Country,
} from "@workspace/ui/components/country-dropdown"
import {
  InputGroup,
  InputGroupInput,
} from "@workspace/ui/components/input-group"

export const phoneSchema = z.string().refine((value) => {
  if (!value.trim()) return true
  try {
    return isValidPhoneNumber(value)
  } catch {
    return false
  }
}, "Invalid phone number")

export type CountryData = Country

export interface PhoneInputProps extends Omit<
  React.ComponentProps<"input">,
  "onChange" | "value"
> {
  onCountryChange?: (data: CountryData | undefined) => void
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  defaultCountry?: string
  countryOptions?: CountryData[]
  /** Si true, inserta el código de marcado una vez cuando el valor está vacío. */
  prefillCallingCode?: boolean
  inline?: boolean
}

function ensureLeadingPlus(raw: string) {
  if (raw.startsWith("+")) return raw
  if (raw.startsWith("00")) return `+${raw.slice(2)}`
  return `+${raw}`
}

function emitChange(
  onChange: PhoneInputProps["onChange"],
  value: string,
  baseEvent?: React.ChangeEvent<HTMLInputElement>
) {
  if (!onChange) return
  if (baseEvent) {
    onChange({
      ...baseEvent,
      target: { ...baseEvent.target, value },
    })
  } else {
    onChange({
      target: { value },
    } as React.ChangeEvent<HTMLInputElement>)
  }
}

function countryFromAlpha2(alpha2: string | undefined): CountryData | undefined {
  if (!alpha2) return undefined
  return lookup.countries({ alpha2: alpha2.toUpperCase() })?.[0]
}

function phoneValueForCountry(value: string, country: CountryData): string {
  const dialCode = country.countryCallingCodes?.[0]
  if (!dialCode) return value

  const parsed = parsePhoneNumberFromString(value)
  if (parsed?.nationalNumber) {
    const next = parsePhoneNumberFromString(
      parsed.nationalNumber,
      country.alpha2.toUpperCase() as CountryCode
    )
    if (next?.number) return next.number
    return ensureLeadingPlus(`${dialCode}${parsed.nationalNumber}`)
  }

  return ensureLeadingPlus(dialCode)
}

function PhoneInputComponent(
  {
    className,
    onCountryChange,
    onChange,
    value = "",
    placeholder = "Enter number",
    defaultCountry = "CR",
    countryOptions,
    prefillCallingCode = false,
    inline = false,
    ...props
  }: PhoneInputProps,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  const [hasInitialized, setHasInitialized] = React.useState(false)

  const selectedAlpha3 = React.useMemo(() => {
    if (value.startsWith("+")) {
      const parsed = parsePhoneNumberFromString(value)
      if (parsed?.country) {
        return alpha3ForAlpha2(parsed.country)
      }
    }
    return alpha3ForAlpha2(defaultCountry)
  }, [defaultCountry, value])

  React.useEffect(() => {
    if (!prefillCallingCode || !defaultCountry) return
    const countryInfo = countryFromAlpha2(defaultCountry)
    if (countryInfo && !value && !hasInitialized) {
      const dialCode = countryInfo.countryCallingCodes?.[0]
      if (dialCode) {
        emitChange(onChange, dialCode)
        setHasInitialized(true)
      }
    }
  }, [defaultCountry, hasInitialized, onChange, prefillCallingCode, value])

  const handleCountrySelect = React.useCallback(
    (country: CountryData) => {
      onCountryChange?.(country)
      emitChange(onChange, phoneValueForCountry(value, country))
    },
    [onChange, onCountryChange, value]
  )

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = ensureLeadingPlus(event.target.value)

    try {
      const parsed = parsePhoneNumberFromString(normalized)
      if (parsed?.country) {
        onCountryChange?.(countryFromAlpha2(parsed.country))
        emitChange(onChange, parsed.number, event)
        return
      }
    } catch {
      // partial input while typing
    }

    onCountryChange?.(undefined)
    emitChange(onChange, normalized, event)
  }

  return (
    <InputGroup
      className={cn(inline && "rounded-l-none", className)}
      data-disabled={props.disabled ? true : undefined}
    >
      {!inline ? (
        <CountryDropdown
          slim
          options={countryOptions}
          defaultValue={selectedAlpha3}
          onChange={handleCountrySelect}
          disabled={props.disabled}
          aria-label="País del número telefónico"
          className="h-full w-auto min-w-14 shrink-0 rounded-none border-0 border-r border-input bg-transparent px-2 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
      ) : null}
      <InputGroupInput
        ref={ref}
        value={value}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        type="tel"
        autoComplete="tel"
        name="phone"
        {...props}
      />
    </InputGroup>
  )
}

PhoneInputComponent.displayName = "PhoneInput"

export const PhoneInput = React.forwardRef(PhoneInputComponent)
