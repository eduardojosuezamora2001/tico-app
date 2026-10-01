"use client"

import * as React from "react"
import { CircleFlag } from "react-circle-flags"
import { countries, lookup } from "country-data-list"
import { cn } from "cn"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  GlobeIcon,
} from "@hugeicons/core-free-icons"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"

export interface Country {
  alpha2: string
  alpha3: string
  countryCallingCodes: string[]
  currencies: string[]
  emoji?: string
  ioc: string
  languages: string[]
  name: string
  status: string
}

const defaultCountryOptions = countries.all.filter(
  (country: Country) =>
    country.emoji && country.status !== "deleted" && country.ioc !== "PRK"
)

/** Opciones del dropdown limitadas a códigos ISO alpha-2 (p. ej. desde la API). */
export function countryOptionsForAlpha2Codes(codes: string[]): Country[] {
  const allowed = new Set(codes.map((code) => code.toUpperCase()))
  return defaultCountryOptions.filter((country) =>
    allowed.has(country.alpha2.toUpperCase())
  )
}

export function alpha3ForAlpha2(
  alpha2: string | null | undefined
): string | undefined {
  if (!alpha2) return undefined
  return lookup.countries({ alpha2: alpha2.toUpperCase() })?.[0]?.alpha3
}

export interface CountryDropdownProps extends Omit<
  React.ComponentProps<"button">,
  "onChange" | "defaultValue"
> {
  options?: Country[]
  onChange?: (country: Country) => void
  defaultValue?: string
  disabled?: boolean
  placeholder?: string
  slim?: boolean
  popoverClassName?: string
}

function CountryDropdownComponent(
  {
    options = defaultCountryOptions,
    onChange,
    defaultValue,
    disabled = false,
    placeholder = "Select a country",
    slim = false,
    popoverClassName,
    className,
    ...props
  }: CountryDropdownProps,
  ref: React.ForwardedRef<HTMLButtonElement>
) {
  const [open, setOpen] = React.useState(false)
  const [selectedCountry, setSelectedCountry] = React.useState<
    Country | undefined
  >(undefined)

  React.useEffect(() => {
    if (defaultValue) {
      const initialCountry = options.find(
        (country) => country.alpha3 === defaultValue
      )
      setSelectedCountry(initialCountry)
    } else {
      setSelectedCountry(undefined)
    }
  }, [defaultValue, options])

  const handleSelect = React.useCallback(
    (country: Country) => {
      setSelectedCountry(country)
      onChange?.(country)
      setOpen(false)
    },
    [onChange]
  )

  const triggerClasses = cn(
    "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
    slim && "w-20",
    className
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        ref={ref}
        disabled={disabled}
        className={triggerClasses}
        {...props}
      >
        {selectedCountry ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <div className="inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
              <CircleFlag
                countryCode={selectedCountry.alpha2.toLowerCase()}
                height={20}
              />
            </div>
            {!slim && (
              <span className="truncate">{selectedCountry.name}</span>
            )}
          </div>
        ) : (
          <span className="flex min-w-0 flex-1 items-center text-muted-foreground">
            {slim ? (
              <HugeiconsIcon icon={GlobeIcon} strokeWidth={2} className="size-5" />
            ) : (
              placeholder
            )}
          </span>
        )}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          strokeWidth={2}
          className="size-4 shrink-0 text-muted-foreground"
        />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className={cn(
          slim ? "w-72 min-w-72" : "w-(--anchor-width) max-w-(--available-width)",
          "p-0",
          popoverClassName
        )}
      >
        <Command className="max-h-[200px] w-full sm:max-h-[270px]">
          <CommandList>
            <div className="sticky top-0 bg-popover">
              <CommandInput placeholder="Buscar país…" />
            </div>
            <CommandEmpty>No se encontró el país.</CommandEmpty>
            <CommandGroup>
              {options
                .filter((option) => option.name)
                .map((option) => (
                  <CommandItem
                    key={option.alpha3}
                    value={option.name}
                    data-checked={option.alpha3 === selectedCountry?.alpha3}
                    className="flex w-full items-center gap-2"
                    onSelect={() => handleSelect(option)}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                      <div className="inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full">
                        <CircleFlag
                          countryCode={option.alpha2.toLowerCase()}
                          height={20}
                        />
                      </div>
                      <span className="truncate">{option.name}</span>
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

CountryDropdownComponent.displayName = "CountryDropdown"

export const CountryDropdown = React.forwardRef(CountryDropdownComponent)
