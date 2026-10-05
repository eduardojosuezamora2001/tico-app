import {
  CreateAddressSchema,
  CreateBusinessSchema,
  DiscoverMatchSchema,
  NearbyBusinessesSchema,
  SearchBusinessesSchema,
  ToggleBusinessModuleSchema,
  UpdateBusinessSchema,
  mergeModuleSettings,
  type Database,
  type Json,
  type ModuleName,
  toAddress,
  toBusiness,
  toBusinessModule,
  toNearbyBusiness,
} from "@workspace/shared"
import { Hono } from "hono"
import { z } from "zod"

import {
  addressInsertFromInput,
  addressPatchFromInput,
} from "../lib/address-input.js"
import {
  expandBusinessCategoryLabels,
  expandMarketplaceTagSlugs,
} from "../lib/marketplace-taxonomy.js"
import {
  ensureCountryExists,
  validateDivisionChain,
} from "../lib/address-validation.js"
import { env } from "../config/env.js"
import { discoverBusinesses, logCatalogList } from "../lib/discovery-engine.js"
import { isChainAdmin } from "../lib/chain-access.js"
import { requireEditableBusiness } from "../lib/business-access.js"
import { businessPatchFromInput } from "../lib/business-input.js"
import { dbFail, fail, validationError } from "../lib/http.js"
import { createUserClient, supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

async function canViewDraftBusiness(businessId: string, token: string | null) {
  if (!token) return false
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return false
  const { data: member } = await createUserClient(token)
    .from("business_users")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", data.user.id)
    .maybeSingle()
  return Boolean(member)
}

const cursorSeparator = "\u001f"

function csv(value: string | undefined, itemMax: number, countMax: number) {
  if (!value) return undefined
  const items = [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))]
    .slice(0, countMax)
    .map((part) => part.slice(0, itemMax))
  return items.length > 0 ? items : undefined
}

function csvUuids(value: string | undefined, countMax: number) {
  if (!value) return undefined
  const items = [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))].slice(
    0,
    countMax,
  )
  const uuids = items.flatMap((part) => {
    const parsed = z.uuid().safeParse(part)
    return parsed.success ? [parsed.data] : []
  })
  return uuids.length > 0 ? uuids : undefined
}

function decodeCursor(cursor: string | undefined) {
  if (!cursor) return { distance: null, name: null, id: null }
  const [distanceRaw, name, id] = cursor.split(cursorSeparator)
  if (!name || !z.uuid().safeParse(id).success) return null
  if (distanceRaw === "") return { distance: null, name, id: id ?? null }
  const distance = Number(distanceRaw)
  if (!Number.isFinite(distance)) return null
  return { distance, name, id: id ?? null }
}

const uploadSchema = z.object({
  kind: z.enum(["logo", "banner", "product", "service", "menu", "gallery"]),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
})

export const businessRoutes = new Hono<AppEnv>()

businessRoutes.get("/nearby", async (c) => {
  const parsed = NearbyBusinessesSchema.safeParse({
    lat: c.req.query("lat") ? Number(c.req.query("lat")) : undefined,
    lng: c.req.query("lng") ? Number(c.req.query("lng")) : undefined,
    radius: c.req.query("radius") ? Number(c.req.query("radius")) : undefined,
    limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
  })
  if (!parsed.success) return validationError(c, parsed.error)

  const { data, error } = await supabaseAdmin.rpc("find_businesses_nearby", {
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    radius_m: parsed.data.radius,
    lim: parsed.data.limit,
  })
  if (error) return dbFail(c, error)

  return c.json({ data: (data ?? []).map(toNearbyBusiness) })
})

function parseMatches(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const parsed = DiscoverMatchSchema.safeParse(item)
    return parsed.success ? [parsed.data] : []
  })
}

businessRoutes.get("/", async (c) => {
  const parsed = SearchBusinessesSchema.safeParse({
    q: c.req.query("q") || undefined,
    categories: csv(c.req.query("category"), 60, 12),
    businessCategorySlugs: csv(c.req.query("bcat"), 80, 8),
    marketplaceTagSlugs: csv(c.req.query("tag"), 80, 12),
    latitude: c.req.query("latitude") ? Number(c.req.query("latitude")) : undefined,
    longitude: c.req.query("longitude") ? Number(c.req.query("longitude")) : undefined,
    radiusKm: c.req.query("radiusKm") ? Number(c.req.query("radiusKm")) : undefined,
    limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
    cursor: c.req.query("cursor") || undefined,
    administrativeDivisionIds: csvUuids(c.req.query("divisionId"), 8),
    catalogKind: c.req.query("catalogKind") || undefined,
    catalogLabel: c.req.query("catalogLabel") || undefined,
  })
  if (!parsed.success) return validationError(c, parsed.error)

  const cursor = decodeCursor(parsed.data.cursor)
  if (cursor === null) return fail(c, 400, "VALIDATION", "Cursor inválido")

  let categories = parsed.data.categories ?? []
  if (parsed.data.businessCategorySlugs?.length) {
    try {
      const expanded = await expandBusinessCategoryLabels(parsed.data.businessCategorySlugs)
      categories = [...new Set([...categories, ...expanded])]
    } catch (error) {
      return dbFail(c, error as { message: string })
    }
  }

  let marketplaceTagSlugs = parsed.data.marketplaceTagSlugs ?? []
  if (marketplaceTagSlugs.length > 0) {
    try {
      marketplaceTagSlugs = await expandMarketplaceTagSlugs(marketplaceTagSlugs)
    } catch (error) {
      return dbFail(c, error as { message: string })
    }
  }

  const { data, error } = await discoverBusinesses({
    q: parsed.data.q ?? null,
    marketplace_tag_slugs: marketplaceTagSlugs.length > 0 ? marketplaceTagSlugs : null,
    categories: categories.length > 0 ? categories : null,
    lat: parsed.data.latitude ?? null,
    lng: parsed.data.longitude ?? null,
    radius_km: parsed.data.radiusKm,
    lim: parsed.data.limit + 1,
    cursor_distance: cursor.distance,
    cursor_name: cursor.name,
    cursor_id: cursor.id,
    administrative_division_ids: parsed.data.administrativeDivisionIds ?? null,
    catalog_kind: parsed.data.catalogKind ?? null,
    catalog_label: parsed.data.catalogLabel ?? null,
  })
  if (error) return dbFail(c, error)

  const rows = data ?? []
  const page = rows.slice(0, parsed.data.limit)
  const last = page.at(-1)
  const nextCursor =
    rows.length > parsed.data.limit && last
      ? [last.distance_m ?? "", last.name, last.id].join("\u001f")
      : null

  return c.json({
    nextCursor,
    data: page.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      category: row.category,
      address: row.address,
      whatsappNumber: row.whatsapp_number,
      logoUrl: row.logo_url,
      bannerUrl: row.banner_url,
      latitude: row.latitude,
      longitude: row.longitude,
      distanceKm: row.distance_m === null ? null : Math.round((row.distance_m / 1000) * 10) / 10,
      matches: parseMatches(row.matches),
    })),
  })
})

function decodeCatalogCursor(cursor: string | undefined) {
  if (!cursor) return { updatedAt: null as string | null, itemType: null as string | null, itemId: null as string | null }
  const [updatedAt, itemType, itemId] = cursor.split(cursorSeparator)
  if (!updatedAt || !itemType || !itemId) return null
  if (!["product", "service", "menu"].includes(itemType)) return null
  if (!z.uuid().safeParse(itemId).success) return null
  if (Number.isNaN(Date.parse(updatedAt))) return null
  return { updatedAt, itemType, itemId }
}

businessRoutes.get("/:id/catalog", requireAuth, async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

  const limit = Math.min(Number(c.req.query("limit") ?? 50) || 50, 100)
  const cursor = decodeCatalogCursor(c.req.query("cursor") || undefined)
  if (cursor === null) return fail(c, 400, "VALIDATION", "Cursor inválido")

  const started = performance.now()
  const { data, error } = await supabaseAdmin.rpc("list_business_catalog", {
    p_business_id: parsedId.data,
    lim: limit + 1,
    cursor_updated_at: cursor.updatedAt,
    cursor_item_type: cursor.itemType,
    cursor_item_id: cursor.itemId,
  })
  logCatalogList(parsedId.data, started, "sellable")
  if (error) return dbFail(c, error)

  const rows = data ?? []
  const page = rows.slice(0, limit)
  const last = page.at(-1)
  const nextCursor =
    rows.length > limit && last
      ? [last.updated_at, last.item_type, last.item_id].join(cursorSeparator)
      : null

  return c.json({
    nextCursor,
    data: page.map((row) => ({
      itemType: row.item_type,
      itemId: row.item_id,
      name: row.name,
      price: row.price === null ? null : Number(row.price),
      groupLabel: row.group_label,
      listed: row.listed,
      updatedAt: row.updated_at,
    })),
  })
})

businessRoutes.get("/:id/modules", requireAuth, async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

  const { data, error } = await c
    .get("db")
    .from("business_modules")
    .select("*")
    .eq("business_id", parsedId.data)
  if (error) return dbFail(c, error)

  return c.json({ data: (data ?? []).map(toBusinessModule) })
})

businessRoutes.get("/:id", async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("id", parsedId.data)
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

  const isPublicListing = data.is_active && !data.is_draft
  if (!isPublicListing) {
    const header = c.req.header("Authorization")
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null
    if (!(await canViewDraftBusiness(data.id, token))) {
      return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")
    }
  }

  const { data: modules, error: moduleError } = await supabaseAdmin
    .from("business_modules")
    .select("*")
    .eq("business_id", data.id)
    .eq("enabled", true)
  if (moduleError) return dbFail(c, moduleError)

  return c.json({
    data: {
      business: toBusiness(data),
      modules: (modules ?? []).map(toBusinessModule),
    },
  })
})

businessRoutes.post("/", requireAuth, async (c) => {
  const parsed = CreateBusinessSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const input = parsed.data
  const insert = businessPatchFromInput(input)
  const ownerId = c.get("userId")

  if (input.chainId) {
    const allowed = await isChainAdmin(supabaseAdmin, input.chainId, ownerId)
    if (!allowed) {
      return fail(c, 403, "FORBIDDEN", "No tienes permiso para crear sedes en esta cadena")
    }
  }

  // Service role: el JWT del usuario no siempre propaga auth.uid() a PostgREST en el
  // backend, y además INSERT+RETURNING choca con RLS/column grants en borradores.
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .insert({
      owner_id: ownerId,
      name: input.name,
      category: input.category,
      chain_id: input.chainId ?? null,
      ...insert,
      is_draft: input.isDraft ?? false,
      is_active: input.isDraft ? false : true,
    })
    .select("*")
    .single()
  if (error) return dbFail(c, error)
  return c.json({ data: toBusiness(data) }, 201)
})

businessRoutes.put("/:id/address", requireAuth, async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

  const parsed = CreateAddressSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const access = await requireEditableBusiness(c, parsedId.data)
  if ("error" in access && access.error) return access.error
  const business = access.business!

  const countryId = parsed.data.countryId
  const countryExists = await ensureCountryExists(supabaseAdmin, countryId)
  if (!countryExists) return fail(c, 404, "NOT_FOUND", "País no encontrado")

  if (parsed.data.administrativeDivisionId) {
    const valid = await validateDivisionChain(
      supabaseAdmin,
      parsed.data.administrativeDivisionId,
      countryId,
    )
    if (!valid) {
      return fail(c, 400, "VALIDATION", "División administrativa inválida para el país")
    }
  }

  if (business.address_id) {
    const { data, error } = await supabaseAdmin
      .from("addresses")
      .update(addressPatchFromInput(parsed.data))
      .eq("id", business.address_id)
      .select("*")
      .maybeSingle()
    if (error) return dbFail(c, error)
    if (!data) return fail(c, 404, "NOT_FOUND", "Dirección no encontrada")
    return c.json({ data: toAddress(data) })
  }

  const { data: created, error: insertError } = await supabaseAdmin
    .from("addresses")
    .insert(addressInsertFromInput(parsed.data))
    .select("*")
    .single()
  if (insertError) return dbFail(c, insertError)

  const { error: linkError } = await supabaseAdmin
    .from("businesses")
    .update({ address_id: created.id })
    .eq("id", business.id)
  if (linkError) return dbFail(c, linkError)

  return c.json({ data: toAddress(created) })
})

businessRoutes.patch("/:id", requireAuth, async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

  const parsed = UpdateBusinessSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)
  const patch = businessPatchFromInput(parsed.data)

  const access = await requireEditableBusiness(c, parsedId.data)
  if ("error" in access && access.error) return access.error

  const { data, error } = await supabaseAdmin
    .from("businesses")
    .update(patch)
    .eq("id", parsedId.data)
    .select("*")
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")
  return c.json({ data: toBusiness(data) })
})

businessRoutes.post("/:id/publish", requireAuth, async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

  const access = await requireEditableBusiness(c, parsedId.data)
  if ("error" in access && access.error) return access.error

  const { data, error } = await supabaseAdmin
    .from("businesses")
    .update({ is_draft: false, is_active: true })
    .eq("id", parsedId.data)
    .select("*")
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")
  return c.json({ data: toBusiness(data) })
})

businessRoutes.put("/:id/modules/:module", requireAuth, async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

  const body = await c.req.json().catch(() => ({}))
  const parsed = ToggleBusinessModuleSchema.safeParse({
    moduleName: c.req.param("module"),
    ...body,
  })
  if (!parsed.success) return validationError(c, parsed.error)
  if (parsed.data.enabled === undefined && parsed.data.settings === undefined) {
    return fail(c, 400, "VALIDATION_ERROR", "Indica enabled o settings")
  }

  const access = await requireEditableBusiness(c, parsedId.data)
  if ("error" in access && access.error) return access.error

  const moduleName = parsed.data.moduleName as ModuleName
  let enabled = parsed.data.enabled
  let settings: Record<string, unknown> | undefined

  if (parsed.data.settings !== undefined) {
    const { data: existing } = await supabaseAdmin
      .from("business_modules")
      .select("settings, enabled")
      .eq("business_id", parsedId.data)
      .eq("module_name", moduleName)
      .maybeSingle()
    settings = mergeModuleSettings(moduleName, existing?.settings ?? {}, parsed.data.settings)
    if (enabled === undefined) enabled = existing?.enabled ?? false
  }

  const upsertRow: Database["public"]["Tables"]["business_modules"]["Insert"] = {
    business_id: parsedId.data,
    module_name: moduleName,
    enabled: enabled ?? false,
  }
  if (settings !== undefined) upsertRow.settings = settings as Json

  const { data, error } = await supabaseAdmin
    .from("business_modules")
    .upsert(upsertRow, { onConflict: "business_id,module_name" })
    .select("*")
    .single()
  if (error) return dbFail(c, error)
  return c.json({ data: toBusinessModule(data) })
})

businessRoutes.post("/:id/media/upload-url", requireAuth, async (c) => {
  const parsed = uploadSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)
  const businessId = c.req.param("id")
  const userId = c.get("userId")

  const { data: business, error: businessError } = await c
    .get("db")
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle()
  if (businessError) return dbFail(c, businessError)
  if (!business) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

  const { data: member } = await c
    .get("db")
    .from("business_users")
    .select("role, permissions")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle()

  const permissions = member?.permissions ?? []
  const allowed =
    business.owner_id === userId ||
    member?.role === "owner" ||
    permissions.includes("gallery:upload") ||
    permissions.includes("business:edit")
  if (!allowed) return fail(c, 403, "FORBIDDEN", "No puedes subir archivos a este negocio")

  const extension = parsed.data.contentType === "image/png" ? "png" : parsed.data.contentType === "image/webp" ? "webp" : "jpg"
  const path = `${businessId}/${parsed.data.kind}/${crypto.randomUUID()}.${extension}`
  const { data, error } = await supabaseAdmin.storage.from("business-media").createSignedUploadUrl(path)
  if (error || !data) return fail(c, 500, "INTERNAL_ERROR", "No se pudo preparar la subida")

  const { data: publicUrl } = supabaseAdmin.storage.from("business-media").getPublicUrl(path)
  return c.json({
    data: {
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicUrl.publicUrl,
      supabaseUrl: env.SUPABASE_URL,
    },
  })
})
