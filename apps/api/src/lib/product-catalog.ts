import {
  computeBundleStock,
  findVariantByOptions,
  formatVariantLabel,
  optionsKey,
  validateSpecifications,
  validateVariantOptions,
  type ProductBundleItemInput,
  type ProductKind,
  type ProductOptionGroup,
  type ProductVariantInput,
  type SpecField,
} from "@workspace/shared"
import type { Tables } from "@workspace/shared"

export function productRowPatch(input: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.description !== undefined) patch.description = input.description ?? null
  if (input.category !== undefined) patch.category = input.category ?? null
  if (input.isAvailable !== undefined) patch.is_available = input.isAvailable
  if (input.productKind !== undefined) patch.product_kind = input.productKind
  if (input.optionGroups !== undefined) patch.option_groups = input.optionGroups
  if (input.specSchema !== undefined) patch.spec_schema = input.specSchema
  if (input.specifications !== undefined) {
    patch.specifications = input.specifications
  }
  if (input.bundleConfig !== undefined) patch.bundle_config = input.bundleConfig
  if (input.price !== undefined) patch.price = input.price
  if (input.stock !== undefined) patch.stock = input.stock ?? null
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl ?? null
  return patch
}

export function normalizeVariantsForKind(
  productKind: ProductKind,
  optionGroups: ProductOptionGroup[],
  variants: ProductVariantInput[] | undefined,
  fallback?: { price: number; stock?: number | null; imageUrl?: string | null },
): ProductVariantInput[] {
  if (variants && variants.length > 0) {
    const keys = new Set<string>()
    for (const variant of variants) {
      const validated = validateVariantOptions(optionGroups, variant.options ?? {})
      if (!validated.ok) throw new Error(validated.message)
      const key = optionsKey(validated.options)
      if (keys.has(key)) throw new Error("Hay variantes duplicadas con las mismas opciones.")
      keys.add(key)
    }
    if (!variants.some((v) => v.isDefault)) {
      variants[0]!.isDefault = true
    }
    return variants
  }

  if (productKind === "variant") {
    throw new Error("Un producto con variantes necesita al menos una variante.")
  }

  if (!fallback?.price) {
    throw new Error("El precio es requerido.")
  }

  return [
    {
      price: fallback.price,
      stock: fallback.stock ?? null,
      imageUrl: fallback.imageUrl ?? null,
      options: {},
      isDefault: true,
      isAvailable: true,
      sortOrder: 0,
    },
  ]
}

export function validateBundleItems(
  businessId: string,
  items: ProductBundleItemInput[],
  componentRows: { id: string; product_id: string; business_id: string }[],
) {
  if (items.length === 0) throw new Error("Un combo necesita al menos un componente.")
  for (const item of items) {
    const row = componentRows.find((r) => r.id === item.componentVariantId)
    if (!row) throw new Error("Componente de combo inválido.")
    if (row.business_id !== businessId) {
      throw new Error("Los componentes del combo deben ser del mismo negocio.")
    }
    if (item.minQty > item.defaultQty || item.defaultQty > item.maxQty) {
      throw new Error("Cantidades del combo inválidas.")
    }
  }
}

export async function fetchVariantComponents(
  variantIds: string[],
): Promise<{ id: string; product_id: string; business_id: string }[]> {
  if (variantIds.length === 0) return []
  const { supabaseAdmin } = await import("./supabase.js")
  const { data: variants, error: vErr } = await supabaseAdmin
    .from("product_variants")
    .select("id, product_id")
    .in("id", variantIds)
  if (vErr) throw new Error(vErr.message)
  const productIds = [...new Set((variants ?? []).map((v) => v.product_id))]
  const { data: products, error: pErr } = await supabaseAdmin
    .from("products")
    .select("id, business_id")
    .in("id", productIds)
  if (pErr) throw new Error(pErr.message)
  const businessByProduct = new Map((products ?? []).map((p) => [p.id, p.business_id] as const))
  return (variants ?? []).map((v) => ({
    id: v.id,
    product_id: v.product_id,
    business_id: businessByProduct.get(v.product_id) ?? "",
  }))
}

export function applySpecValidation(specSchema: SpecField[], specifications: Record<string, unknown>) {
  return validateSpecifications(specSchema, specifications)
}

export function resolveSelection(params: {
  product: Tables<"products">
  variants: Tables<"product_variants">[]
  bundleItems: Tables<"product_bundle_items">[]
  options?: Record<string, string>
  bundleQuantities?: Record<string, number>
}) {
  const optionGroups = (params.product.option_groups ?? []) as ProductOptionGroup[]
  const kind = (params.product.product_kind ?? "simple") as ProductKind

  if (kind === "bundle") {
    const lines = params.bundleItems.map((item) => {
      const qty =
        params.bundleQuantities?.[item.component_variant_id] ??
        item.default_qty
      if (qty < item.min_qty || qty > item.max_qty) {
        throw new Error("Cantidad fuera de rango en el combo.")
      }
      return { item, qty }
    })
    const defaultVariant =
      params.variants.find((v) => v.is_default) ?? params.variants[0]
    if (!defaultVariant) throw new Error("Combo sin variante de precio.")
    const stockMap = new Map(
      params.variants.map((v) => [v.id, v.stock] as const),
    )
    const stock = computeBundleStock(
      lines.map((l) => ({
        componentVariantId: l.item.component_variant_id,
        minQty: l.item.min_qty,
        maxQty: l.item.max_qty,
      })),
      stockMap,
    )
    return {
      variant: defaultVariant,
      price: Number(defaultVariant.price),
      stock,
      label: "",
      bundleLines: lines.map((l) => ({
        variantId: l.item.component_variant_id,
        quantity: l.qty,
      })),
    }
  }

  const variantRows = params.variants.map((v) => ({
    id: v.id,
    options: (v.options ?? {}) as Record<string, string>,
    isAvailable: v.is_available && params.product.is_available,
  }))

  if (kind === "simple" || optionGroups.length === 0) {
    const def = variantRows.find((v) => params.variants.find((r) => r.id === v.id)?.is_default)
      ?? variantRows[0]
    if (!def) throw new Error("Producto sin variante.")
    const row = params.variants.find((r) => r.id === def.id)!
    return {
      variant: row,
      price: Number(row.price),
      stock: row.stock,
      label: "",
      bundleLines: undefined,
    }
  }

  if (!params.options) throw new Error("Selecciona todas las opciones.")
  const validated = validateVariantOptions(optionGroups, params.options)
  if (!validated.ok) throw new Error(validated.message)
  const match = findVariantByOptions(variantRows, validated.options)
  if (!match) throw new Error("Combinación no disponible.")
  const row = params.variants.find((r) => r.id === match.id)!
  return {
    variant: row,
    price: Number(row.price),
    stock: row.stock,
    label: formatVariantLabel(optionGroups, validated.options),
    bundleLines: undefined,
  }
}
