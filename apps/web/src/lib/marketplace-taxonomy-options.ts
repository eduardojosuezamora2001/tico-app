import type { MarketplaceBusinessCategory, MarketplaceTag } from "@workspace/shared"

type ComboOption = { id: string; label: string }

function sortTaxonomy<T extends { name: string; sortOrder?: number }>(rows: T[]) {
  return [...rows].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "es"),
  )
}

/** Opciones de rubro: value = legacyLabel (businesses.category), label con jerarquía. */
export function businessCategoryComboOptions(
  rows: MarketplaceBusinessCategory[],
): ComboOption[] {
  const byId = new Map(rows.map((row) => [row.id, row]))
  const options: ComboOption[] = []
  const seen = new Set<string>()

  for (const row of sortTaxonomy(rows)) {
    const id = row.legacyLabel.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const parent = row.parentId ? byId.get(row.parentId) : null
    options.push({
      id,
      label: parent ? `${parent.name} › ${row.name}` : row.name,
    })
  }

  return options
}

/** Opciones de tag de producto: value = id UUID, label con jerarquía. */
export function marketplaceTagComboOptions(rows: MarketplaceTag[]): ComboOption[] {
  const byId = new Map(rows.map((row) => [row.id, row]))
  return sortTaxonomy(rows).map((row) => {
    const parent = row.parentId ? byId.get(row.parentId) : null
    return {
      id: row.id,
      label: parent ? `${parent.name} › ${row.name}` : row.name,
    }
  })
}
