import {
  CreateProductSchema,
  type MarketplaceTag,
  toProduct,
  toProductBundleItem,
  toProductVariant,
  UpdateProductSchema,
  ValidateProductSelectionSchema,
} from "@workspace/shared"
import { Hono } from "hono"

import {
  applySpecValidation,
  fetchVariantComponents,
  normalizeVariantsForKind,
  productRowPatch,
  resolveSelection,
  validateBundleItems,
} from "../lib/product-catalog.js"
import { logCatalogList } from "../lib/discovery-engine.js"
import { dbFail, fail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

async function assertModule(c: { get: (key: "db") => AppEnv["Variables"]["db"]; req: { param: (name: string) => string } }) {
  const { data, error } = await c
    .get("db")
    .from("business_modules")
    .select("enabled")
    .eq("business_id", c.req.param("id"))
    .eq("module_name", "products")
    .maybeSingle()
  if (error) return { error }
  if (!data?.enabled) return { disabled: true as const }
  return { disabled: false as const }
}

function expandRequested(expand: string | undefined) {
  const parts = new Set((expand ?? "").split(",").map((s) => s.trim()).filter(Boolean))
  return {
    variants: parts.has("variants") || parts.has("all"),
    bundle: parts.has("bundle") || parts.has("all"),
  }
}

async function loadProductGraph(productIds: string[], expand: { variants: boolean; bundle: boolean }) {
  const variantsByProduct = new Map<string, ReturnType<typeof toProductVariant>[]>()
  const bundlesByProduct = new Map<string, ReturnType<typeof toProductBundleItem>[]>()

  if (expand.variants || expand.bundle) {
    const { data: variantRows, error: vErr } = await supabaseAdmin
      .from("product_variants")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true })
    if (vErr) throw vErr
    for (const row of variantRows ?? []) {
      const list = variantsByProduct.get(row.product_id) ?? []
      list.push(toProductVariant(row))
      variantsByProduct.set(row.product_id, list)
    }
  }

  if (expand.bundle) {
    const { data: bundleRows, error: bErr } = await supabaseAdmin
      .from("product_bundle_items")
      .select("*")
      .in("bundle_product_id", productIds)
      .order("sort_order", { ascending: true })
    if (bErr) throw bErr
    for (const row of bundleRows ?? []) {
      const list = bundlesByProduct.get(row.bundle_product_id) ?? []
      list.push(toProductBundleItem(row))
      bundlesByProduct.set(row.bundle_product_id, list)
    }
  }

  return { variantsByProduct, bundlesByProduct }
}

async function replaceVariants(productId: string, variants: ReturnType<typeof normalizeVariantsForKind>) {
  await supabaseAdmin.from("product_variants").delete().eq("product_id", productId)
  const rows = variants.map((v) => ({
    product_id: productId,
    price: v.price,
    stock: v.stock ?? null,
    image_url: v.imageUrl ?? null,
    options: v.options ?? {},
    sku: v.sku ?? null,
    sort_order: v.sortOrder ?? 0,
    is_default: v.isDefault ?? false,
    is_available: v.isAvailable ?? true,
  }))
  const { error } = await supabaseAdmin.from("product_variants").insert(rows)
  if (error) throw error
}

async function loadProductTags(productIds: string[]) {
  const marketplace = new Map<string, MarketplaceTag[]>()
  const merchant = new Map<string, MarketplaceTag[]>()
  if (productIds.length === 0) return { marketplace, merchant }

  const { data, error } = await supabaseAdmin
    .from("product_catalog_tags")
    .select("product_id, catalog_tags!inner(id, slug, name, scope)")
    .in("product_id", productIds)
  if (error) throw error

  for (const row of data ?? []) {
    const tag = row.catalog_tags
    if (!tag) continue
    const bucket = tag.scope === "merchant" ? merchant : tag.scope === "marketplace" ? marketplace : null
    if (!bucket) continue
    const list = bucket.get(row.product_id) ?? []
    list.push({ id: tag.id, slug: tag.slug, name: tag.name })
    bucket.set(row.product_id, list)
  }
  return { marketplace, merchant }
}

async function assertMarketplaceTags(ids: string[]) {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return [] as { id: string; name: string }[]
  const { data, error } = await supabaseAdmin
    .from("catalog_tags")
    .select("id, name")
    .eq("scope", "marketplace")
    .eq("is_active", true)
    .in("id", unique)
  if (error) throw error
  if ((data ?? []).length !== unique.length) {
    throw new Error("Hay etiquetas de catálogo que no existen.")
  }
  return data ?? []
}

async function assertMerchantTags(businessId: string, ids: string[]) {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return [] as { id: string; name: string }[]
  const { data, error } = await supabaseAdmin
    .from("catalog_tags")
    .select("id, name")
    .eq("scope", "merchant")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .in("id", unique)
  if (error) throw error
  if ((data ?? []).length !== unique.length) {
    throw new Error("Hay etiquetas del local que no existen.")
  }
  return data ?? []
}

async function replaceTags(productId: string, ids: string[], scope: "marketplace" | "merchant", businessId?: string) {
  let query = supabaseAdmin.from("catalog_tags").select("id").eq("scope", scope)
  if (scope === "merchant") {
    query = query.eq("business_id", businessId ?? "")
  }
  const { data: tags, error: listError } = await query
  if (listError) throw listError
  const tagIds = (tags ?? []).map((row) => row.id)
  if (tagIds.length > 0) {
    const { error: deleteError } = await supabaseAdmin
      .from("product_catalog_tags")
      .delete()
      .eq("product_id", productId)
      .in("tag_id", tagIds)
    if (deleteError) throw deleteError
  }
  if (ids.length === 0) return
  const { error: insertError } = await supabaseAdmin.from("product_catalog_tags").insert(
    ids.map((tagId) => ({ product_id: productId, tag_id: tagId })),
  )
  if (insertError) throw insertError
}

function replaceMarketplaceTags(productId: string, ids: string[]) {
  return replaceTags(productId, ids, "marketplace")
}

function replaceMerchantTags(productId: string, businessId: string, ids: string[]) {
  return replaceTags(productId, ids, "merchant", businessId)
}

async function replaceBundleItems(productId: string, items: { componentVariantId: string; defaultQty: number; minQty: number; maxQty: number; sortOrder: number }[]) {
  await supabaseAdmin.from("product_bundle_items").delete().eq("bundle_product_id", productId)
  if (items.length === 0) return
  const rows = items.map((item) => ({
    bundle_product_id: productId,
    component_variant_id: item.componentVariantId,
    default_qty: item.defaultQty,
    min_qty: item.minQty,
    max_qty: item.maxQty,
    sort_order: item.sortOrder,
  }))
  const { error } = await supabaseAdmin.from("product_bundle_items").insert(rows)
  if (error) throw error
}

export const productRoutes = new Hono<AppEnv>()

productRoutes.get("/", async (c) => {
  const businessId = c.req.param("id") ?? ""
  const includeUnavailable = c.req.query("includeUnavailable") === "true"
  const expand = expandRequested(c.req.query("expand"))

  let query = supabaseAdmin.from("products").select("*").eq("business_id", businessId)
  if (!includeUnavailable) query = query.eq("is_available", true)
  const { data, error } = await query.order("created_at", { ascending: false })
  if (error) return dbFail(c, error)

  const rows = data ?? []
  const ids = rows.map((r) => r.id)
  let graph = { variantsByProduct: new Map(), bundlesByProduct: new Map() }
  let tags = { marketplace: new Map<string, MarketplaceTag[]>(), merchant: new Map<string, MarketplaceTag[]>() }
  const started = performance.now()
  try {
    graph = await loadProductGraph(ids, expand)
    tags = await loadProductTags(ids)
  } catch (e) {
    return dbFail(c, e as { message: string })
  }
  logCatalogList(businessId, started, "products")

  const payload = rows.map((row) =>
    toProduct(row, {
      variants: graph.variantsByProduct.get(row.id),
      bundleItems: graph.bundlesByProduct.get(row.id),
      marketplaceTags: tags.marketplace.get(row.id) ?? [],
      merchantTags: tags.merchant.get(row.id) ?? [],
    }),
  )

  return c.json({ data: payload })
})

productRoutes.post("/", requireAuth, async (c) => {
  const parsed = CreateProductSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const gate = await assertModule(c)
  if ("error" in gate && gate.error) return dbFail(c, gate.error)
  if (gate.disabled) return fail(c, 409, "MODULE_DISABLED", "Activa el modulo antes de publicar")

  const businessId = c.req.param("id") ?? ""
  const input = parsed.data

  let variants
  try {
    variants = normalizeVariantsForKind(input.productKind, input.optionGroups, input.variants, {
      price: input.price ?? 0,
      stock: input.stock ?? null,
      imageUrl: input.imageUrl ?? null,
    })
  } catch (e) {
    return fail(c, 400, "INVALID_VARIANTS", (e as Error).message)
  }

  const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0]!
  const specifications = applySpecValidation(input.specSchema, input.specifications)

  if (input.marketplaceTagIds !== undefined) {
    try {
      await assertMarketplaceTags(input.marketplaceTagIds)
    } catch (e) {
      return fail(c, 400, "INVALID_TAGS", (e as Error).message)
    }
  }
  if (input.merchantTagIds !== undefined) {
    try {
      await assertMerchantTags(businessId, input.merchantTagIds)
    } catch (e) {
      return fail(c, 400, "INVALID_TAGS", (e as Error).message)
    }
  }

  if (input.productKind === "bundle" && input.bundleItems) {
    try {
      const components = await fetchVariantComponents(input.bundleItems.map((i) => i.componentVariantId))
      validateBundleItems(businessId, input.bundleItems, components)
    } catch (e) {
      return fail(c, 400, "INVALID_BUNDLE", (e as Error).message)
    }
  }

  const { data: product, error } = await c
    .get("db")
    .from("products")
    .insert({
      business_id: businessId,
      name: input.name,
      description: input.description ?? null,
      is_available: input.isAvailable ?? true,
      product_kind: input.productKind,
      option_groups: input.optionGroups,
      spec_schema: input.specSchema,
      specifications,
      bundle_config: input.bundleConfig,
      price: defaultVariant.price,
      stock: defaultVariant.stock ?? null,
      image_url: defaultVariant.imageUrl ?? null,
    })
    .select("*")
    .single()

  if (error) return dbFail(c, error)

  try {
    await replaceVariants(product.id, variants)
    if (input.productKind === "bundle" && input.bundleItems) {
      await replaceBundleItems(product.id, input.bundleItems)
    }
    if (input.marketplaceTagIds !== undefined) {
      await replaceMarketplaceTags(product.id, input.marketplaceTagIds)
    }
    if (input.merchantTagIds !== undefined) {
      await replaceMerchantTags(product.id, businessId, input.merchantTagIds)
    }
  } catch (e) {
    await supabaseAdmin.from("products").delete().eq("id", product.id)
    return dbFail(c, e as { message: string })
  }

  const graph = await loadProductGraph([product.id], { variants: true, bundle: true })
  const tags = await loadProductTags([product.id])
  return c.json(
    {
      data: toProduct(product, {
        variants: graph.variantsByProduct.get(product.id),
        bundleItems: graph.bundlesByProduct.get(product.id),
        marketplaceTags: tags.marketplace.get(product.id) ?? [],
        merchantTags: tags.merchant.get(product.id) ?? [],
      }),
    },
    201,
  )
})

productRoutes.patch("/:itemId", requireAuth, async (c) => {
  const parsed = UpdateProductSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const businessId = c.req.param("id") ?? ""
  const productId = c.req.param("itemId") ?? ""
  const input = parsed.data

  const { data: existing, error: loadErr } = await c
    .get("db")
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("business_id", businessId)
    .maybeSingle()
  if (loadErr) return dbFail(c, loadErr)
  if (!existing) return fail(c, 404, "NOT_FOUND", "Producto no encontrado")

  const productKind = (input.productKind ?? existing.product_kind) as typeof input.productKind
  const optionGroups =
    input.optionGroups ?? (existing.option_groups as unknown as typeof input.optionGroups) ?? []
  const specSchema =
    input.specSchema ?? (existing.spec_schema as unknown as typeof input.specSchema) ?? []

  const patch = productRowPatch({
    ...input,
    productKind,
    specifications:
      input.specifications !== undefined
        ? applySpecValidation(specSchema, input.specifications)
        : undefined,
  })

  if (input.marketplaceTagIds !== undefined) {
    try {
      await assertMarketplaceTags(input.marketplaceTagIds)
    } catch (e) {
      return fail(c, 400, "INVALID_TAGS", (e as Error).message)
    }
  }
  if (input.merchantTagIds !== undefined) {
    try {
      await assertMerchantTags(businessId, input.merchantTagIds)
    } catch (e) {
      return fail(c, 400, "INVALID_TAGS", (e as Error).message)
    }
  }

  if (input.variants || input.price !== undefined || input.productKind !== undefined) {
    try {
      const variants = normalizeVariantsForKind(productKind!, optionGroups!, input.variants, {
        price: input.price ?? Number(existing.price),
        stock: input.stock ?? existing.stock,
        imageUrl: input.imageUrl ?? existing.image_url,
      })
      const def = variants.find((v) => v.isDefault) ?? variants[0]!
      patch.price = def.price
      patch.stock = def.stock ?? null
      patch.image_url = def.imageUrl ?? null
      await replaceVariants(productId, variants)
    } catch (e) {
      return fail(c, 400, "INVALID_VARIANTS", (e as Error).message)
    }
  }

  if (input.bundleItems) {
    try {
      const components = await fetchVariantComponents(input.bundleItems.map((i) => i.componentVariantId))
      validateBundleItems(businessId, input.bundleItems, components)
      await replaceBundleItems(productId, input.bundleItems)
    } catch (e) {
      return fail(c, 400, "INVALID_BUNDLE", (e as Error).message)
    }
  }

  let data = existing
  if (Object.keys(patch).length > 0) {
    const updated = await c
      .get("db")
      .from("products")
      .update(patch as never)
      .eq("id", productId)
      .eq("business_id", businessId)
      .select("*")
      .single()
    if (updated.error) return dbFail(c, updated.error)
    data = updated.data
  }

  if (input.marketplaceTagIds !== undefined) {
    try {
      await replaceMarketplaceTags(productId, input.marketplaceTagIds)
    } catch (e) {
      return dbFail(c, e as { message: string })
    }
  }
  if (input.merchantTagIds !== undefined) {
    try {
      await replaceMerchantTags(productId, businessId, input.merchantTagIds)
    } catch (e) {
      return dbFail(c, e as { message: string })
    }
  }

  const graph = await loadProductGraph([productId], { variants: true, bundle: true })
  const tags = await loadProductTags([productId])
  return c.json({
    data: toProduct(data, {
      variants: graph.variantsByProduct.get(productId),
      bundleItems: graph.bundlesByProduct.get(productId),
      marketplaceTags: tags.marketplace.get(productId) ?? [],
      merchantTags: tags.merchant.get(productId) ?? [],
    }),
  })
})

productRoutes.post("/:itemId/validate-selection", async (c) => {
  const parsed = ValidateProductSelectionSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const businessId = c.req.param("id") ?? ""
  const productId = c.req.param("itemId") ?? ""

  const { data: product, error: pErr } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("business_id", businessId)
    .maybeSingle()
  if (pErr) return dbFail(c, pErr)
  if (!product) return fail(c, 404, "NOT_FOUND", "Producto no encontrado")

  const { data: variants, error: vErr } = await supabaseAdmin
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
  if (vErr) return dbFail(c, vErr)

  const { data: bundleItems, error: bErr } = await supabaseAdmin
    .from("product_bundle_items")
    .select("*")
    .eq("bundle_product_id", productId)
  if (bErr) return dbFail(c, bErr)

  try {
    const resolved = resolveSelection({
      product,
      variants: variants ?? [],
      bundleItems: bundleItems ?? [],
      options: parsed.data.options,
      bundleQuantities: parsed.data.bundleQuantities,
    })
    return c.json({
      data: {
        variantId: resolved.variant.id,
        price: resolved.price,
        stock: resolved.stock,
        label: resolved.label,
        bundleLines: resolved.bundleLines,
      },
    })
  } catch (e) {
    return fail(c, 400, "INVALID_SELECTION", (e as Error).message)
  }
})

productRoutes.delete("/:itemId", requireAuth, async (c) => {
  const { error } = await c
    .get("db")
    .from("products")
    .delete()
    .eq("id", c.req.param("itemId") ?? "")
    .eq("business_id", c.req.param("id") ?? "")
  if (error) return dbFail(c, error)
  return c.json({ data: { ok: true } })
})
