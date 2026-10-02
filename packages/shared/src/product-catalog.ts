import { z } from "zod"

export const PRODUCT_KINDS = ["simple", "variant", "bundle"] as const
export type ProductKind = (typeof PRODUCT_KINDS)[number]

export const ProductKindSchema = z.enum(PRODUCT_KINDS)

export const ProductOptionValueSchema = z.object({
  value: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  swatch: z.string().trim().max(20).optional(),
  imageUrl: z.string().url().optional(),
})

export const ProductOptionGroupSchema = z.object({
  key: z.string().trim().min(1).max(40).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(1).max(80),
  type: z.enum(["select", "color"]).default("select"),
  values: z.array(ProductOptionValueSchema).min(1).max(30),
})

export const SpecFieldSchema = z.object({
  key: z.string().trim().min(1).max(40).regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().trim().min(1).max(80),
  type: z.enum(["string", "number", "boolean"]).default("string"),
})

export const BundleConfigSchema = z.object({
  pricingMode: z.enum(["fixed", "sum_components"]).default("fixed"),
})

export const VariantOptionsSchema = z.record(z.string(), z.string().trim().min(1).max(60))

export const ProductVariantInputSchema = z.object({
  id: z.string().uuid().optional(),
  price: z.number().positive().multipleOf(0.01),
  stock: z.number().int().min(0).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  options: VariantOptionsSchema.default({}),
  sku: z.string().trim().max(60).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
})

export const ProductBundleItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  componentVariantId: z.string().uuid(),
  defaultQty: z.number().int().min(0).default(1),
  minQty: z.number().int().min(0).default(0),
  maxQty: z.number().int().min(1).max(99).default(99),
  sortOrder: z.number().int().min(0).default(0),
})

export const MAX_PRODUCT_VARIANTS = 50
export const MAX_BUNDLE_ITEMS = 20

export type ProductOptionGroup = z.infer<typeof ProductOptionGroupSchema>
export type SpecField = z.infer<typeof SpecFieldSchema>
export type BundleConfig = z.infer<typeof BundleConfigSchema>
export type ProductVariantInput = z.infer<typeof ProductVariantInputSchema>
export type ProductBundleItemInput = z.infer<typeof ProductBundleItemInputSchema>

export type ProductCatalogShape = {
  productKind: ProductKind
  optionGroups: ProductOptionGroup[]
  specSchema: SpecField[]
  specifications: Record<string, string | number | boolean>
  bundleConfig: BundleConfig
}

export function validateSpecifications(
  specSchema: SpecField[],
  specifications: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  const allowed = new Set(specSchema.map((f) => f.key))
  for (const [key, value] of Object.entries(specifications)) {
    if (!allowed.has(key)) continue
    const field = specSchema.find((f) => f.key === key)!
    if (field.type === "number" && typeof value === "number") out[key] = value
    else if (field.type === "boolean" && typeof value === "boolean") out[key] = value
    else if (field.type === "string" && typeof value === "string") out[key] = value.trim().slice(0, 500)
  }
  return out
}

export function validateVariantOptions(
  optionGroups: ProductOptionGroup[],
  options: Record<string, string>,
): { ok: true; options: Record<string, string> } | { ok: false; message: string } {
  if (optionGroups.length === 0) {
    if (Object.keys(options).length === 0) return { ok: true, options: {} }
    return { ok: false, message: "Este producto no admite opciones." }
  }
  const normalized: Record<string, string> = {}
  for (const group of optionGroups) {
    const picked = options[group.key]
    if (!picked) {
      return { ok: false, message: `Falta la opción "${group.label}".` }
    }
    const valid = group.values.some((v) => v.value === picked)
    if (!valid) {
      return { ok: false, message: `Valor inválido para "${group.label}".` }
    }
    normalized[group.key] = picked
  }
  for (const key of Object.keys(options)) {
    if (!optionGroups.some((g) => g.key === key)) {
      return { ok: false, message: `Opción desconocida: ${key}.` }
    }
  }
  return { ok: true, options: normalized }
}

export function optionsKey(options: Record<string, string>) {
  return Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join("|")
}

export function findVariantByOptions(
  variants: { id: string; options: Record<string, string>; isAvailable: boolean }[],
  options: Record<string, string>,
) {
  const key = optionsKey(options)
  return variants.find((v) => optionsKey(v.options) === key && v.isAvailable) ?? null
}

export function formatVariantLabel(
  optionGroups: ProductOptionGroup[],
  options: Record<string, string>,
) {
  if (Object.keys(options).length === 0) return ""
  const parts: string[] = []
  for (const group of optionGroups) {
    const value = options[group.key]
    if (!value) continue
    const meta = group.values.find((v) => v.value === value)
    parts.push(meta?.label ?? value)
  }
  return parts.join(" · ")
}

export function computeBundleStock(
  bundleItems: { componentVariantId: string; minQty: number; maxQty: number }[],
  variantStockById: Map<string, number | null>,
) {
  if (bundleItems.length === 0) return null
  let minBundles: number | null = null
  for (const item of bundleItems) {
    const stock = variantStockById.get(item.componentVariantId)
    if (stock === null || stock === undefined) continue
    const need = Math.max(item.minQty, 1)
    const available = Math.floor(stock / need)
    minBundles = minBundles === null ? available : Math.min(minBundles, available)
  }
  return minBundles
}

export const PRODUCT_TEMPLATES: {
  id: string
  label: string
  category: string
  productKind: ProductKind
  specSchema: SpecField[]
  optionGroups: ProductOptionGroup[]
}[] = [
  {
    id: "electronics",
    label: "Electrónica (computadora)",
    category: "Electrónica",
    productKind: "variant",
    specSchema: [
      { key: "pantalla_pulg", label: "Pantalla (pulg)", type: "number" },
      { key: "procesador", label: "Procesador", type: "string" },
    ],
    optionGroups: [
      {
        key: "ram",
        label: "Memoria RAM",
        type: "select",
        values: [
          { value: "8gb", label: "8 GB" },
          { value: "16gb", label: "16 GB" },
        ],
      },
      {
        key: "color",
        label: "Color",
        type: "color",
        values: [
          { value: "negro", label: "Negro", swatch: "#111" },
          { value: "plata", label: "Plata", swatch: "#ccc" },
        ],
      },
    ],
  },
  {
    id: "hardware",
    label: "Ferretería (tornillo)",
    category: "Ferretería",
    productKind: "variant",
    specSchema: [
      { key: "rosca", label: "Rosca", type: "string" },
      { key: "material", label: "Material", type: "string" },
    ],
    optionGroups: [
      {
        key: "longitud",
        label: "Longitud",
        type: "select",
        values: [
          { value: "20mm", label: "20 mm" },
          { value: "40mm", label: "40 mm" },
        ],
      },
    ],
  },
  {
    id: "appliance",
    label: "Electrodoméstico (microondas)",
    category: "Hogar",
    productKind: "simple",
    specSchema: [
      { key: "potencia_w", label: "Potencia (W)", type: "number" },
      { key: "capacidad_l", label: "Capacidad (L)", type: "number" },
    ],
    optionGroups: [],
  },
  {
    id: "bundle_combo",
    label: "Combo / paquete",
    category: "Combos",
    productKind: "bundle",
    specSchema: [],
    optionGroups: [],
  },
]
