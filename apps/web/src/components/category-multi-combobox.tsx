import { useCallback, useMemo, useRef, useState } from "react"
import { PRODUCT_TEMPLATES } from "@workspace/shared"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox"

const DEFAULT_CATEGORIES = [
  ...new Set([
    ...PRODUCT_TEMPLATES.map((t) => t.category),
    "Electrónica",
    "Ferretería",
    "Hogar",
    "Combos",
    "Alimentos",
    "Bebidas",
    "Ropa",
    "Salud",
    "Servicios",
  ]),
]

export function parseProductCategories(value: string | null | undefined): string[] {
  if (!value?.trim()) return []
  return [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))]
}

export function serializeProductCategories(categories: string[]): string | undefined {
  const unique = [...new Set(categories.map((c) => c.trim()).filter(Boolean))]
  if (unique.length === 0) return undefined
  return unique.join(", ")
}

type CategoryOption = { id: string; label: string }

function sameCategoryIds(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  return a.every((id, index) => id === b[index])
}

const itemToStringLabel = (item: CategoryOption) => item.label
const itemToStringValue = (item: CategoryOption) => item.id

export function CategoryMultiCombobox({
  value,
  onChange,
  label = "Categoría",
  options,
  allowCreate,
  maxItems,
  hint,
  invalid = false,
}: {
  value: string[]
  onChange: (categories: string[]) => void
  label?: string
  options?: CategoryOption[]
  allowCreate?: boolean
  maxItems?: number
  hint?: string
  invalid?: boolean
}) {
  const anchor = useComboboxAnchor()
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [draft, setDraft] = useState("")
  const canCreate = allowCreate ?? options === undefined

  const items = useMemo((): CategoryOption[] => {
    if (options) {
      const extra = value
        .filter((id) => !options.some((option) => option.id === id))
        .map((id) => ({ id, label: id }))
      if (extra.length === 0) return options
      return [...options, ...extra]
    }
    const labels = [...new Set([...DEFAULT_CATEGORIES, ...value])]
    return labels.map((item) => ({ id: item, label: item }))
  }, [options, value])

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])

  const selected = useMemo(
    () =>
      value
        .map((id) => itemById.get(id))
        .filter((item): item is CategoryOption => item != null),
    [itemById, value],
  )

  const handleValueChange = useCallback(
    (next: CategoryOption[]) => {
      const ids = next.map((item) => item.id)
      const limited = maxItems != null ? ids.slice(0, maxItems) : ids
      if (sameCategoryIds(limited, value)) return
      onChangeRef.current(limited)
    },
    [maxItems, value],
  )

  const isItemEqualToValue = useCallback(
    (item: CategoryOption, selectedItem: CategoryOption) => item.id === selectedItem.id,
    [],
  )

  const atMax = maxItems != null && value.length >= maxItems

  function addCategory(raw: string) {
    const next = raw.trim()
    if (!next || value.includes(next) || atMax) return
    onChange([...value, next])
    setDraft("")
  }

  return (
    <div className="flex flex-col gap-1.5">
    <Combobox
      multiple
      items={items}
      value={selected}
      isItemEqualToValue={isItemEqualToValue}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.id}
      onValueChange={handleValueChange}
    >
      <ComboboxChips ref={anchor} className="h-auto min-h-11 w-full rounded-xl">
        <ComboboxValue>
          {(values: CategoryOption[]) => (
            <>
              {values.map((item) => (
                <ComboboxChip key={item.id}>{item.label}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                aria-invalid={invalid || undefined}
                aria-label={label}
                placeholder={
                  atMax
                    ? ""
                    : values.length === 0
                      ? canCreate
                        ? "Buscar o escribir categoría…"
                        : "Buscar categoría…"
                      : ""
                }
                disabled={atMax}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (!canCreate || event.key !== "Enter" || atMax) return
                  event.preventDefault()
                  addCategory(draft)
                }}
                onBlur={() => {
                  if (canCreate && draft.trim() && !atMax) addCategory(draft)
                }}
              />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>{canCreate ? "Nada coincide. Enter para crear." : "Nada coincide."}</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.id} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    {maxItems != null ? (
      <p className="text-xs text-muted-foreground">
        {value.length}/{maxItems} categorías
      </p>
    ) : null}
    </div>
  )
}
