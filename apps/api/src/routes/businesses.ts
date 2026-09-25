import {
  CreateBusinessSchema,
  SearchBusinessesSchema,
  ToggleBusinessModuleSchema,
  UpdateBusinessSchema,
  toBusiness,
  toBusinessModule,
} from "@workspace/shared"
import { Hono } from "hono"
import { z } from "zod"

import { env } from "../config/env.js"
import { dbFail, fail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

const cursorSeparator = "\u001f"

function csv(value: string | undefined, itemMax: number, countMax: number) {
  if (!value) return undefined
  const items = [...new Set(value.split(",").map((part) => part.trim()).filter(Boolean))]
    .slice(0, countMax)
    .map((part) => part.slice(0, itemMax))
  return items.length > 0 ? items : undefined
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

businessRoutes.get("/", async (c) => {
  const parsed = SearchBusinessesSchema.safeParse({
    q: c.req.query("q") || undefined,
    categories: csv(c.req.query("category"), 60, 12),
    latitude: c.req.query("latitude") ? Number(c.req.query("latitude")) : undefined,
    longitude: c.req.query("longitude") ? Number(c.req.query("longitude")) : undefined,
    radiusKm: c.req.query("radiusKm") ? Number(c.req.query("radiusKm")) : undefined,
    limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
    cursor: c.req.query("cursor") || undefined,
    provinces: csv(c.req.query("province"), 40, 8),
  })
  if (!parsed.success) return validationError(c, parsed.error)

  const cursor = decodeCursor(parsed.data.cursor)
  if (cursor === null) return fail(c, 400, "VALIDATION", "Cursor inválido")

  const { data, error } = await supabaseAdmin.rpc("search_businesses", {
    q: parsed.data.q ?? null,
    categories: parsed.data.categories ?? null,
    lat: parsed.data.latitude ?? null,
    lng: parsed.data.longitude ?? null,
    radius_km: parsed.data.radiusKm,
    lim: parsed.data.limit + 1,
    cursor_distance: cursor.distance,
    cursor_name: cursor.name,
    cursor_id: cursor.id,
    provinces: parsed.data.provinces ?? null,
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
    })),
  })
})

businessRoutes.get("/:id", async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("id", parsedId.data)
    .eq("is_active", true)
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

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

  const { data, error } = await c
    .get("db")
    .from("businesses")
    .insert({
      owner_id: c.get("userId"),
      name: input.name,
      description: input.description ?? null,
      category: input.category,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      address: input.address ?? null,
      whatsapp_number: input.whatsappNumber ?? null,
      website: input.website ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
    })
    .select("*")
    .single()
  if (error) return dbFail(c, error)
  return c.json({ data: toBusiness(data) }, 201)
})

businessRoutes.patch("/:id", requireAuth, async (c) => {
  const parsed = UpdateBusinessSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)
  const input = parsed.data
  const patch: {
    name?: string
    description?: string | null
    category?: string
    latitude?: number | null
    longitude?: number | null
    address?: string | null
    whatsapp_number?: string | null
    website?: string | null
    email?: string | null
    phone?: string | null
    logo_url?: string | null
    banner_url?: string | null
    is_active?: boolean
    chat_retention_days?: number
  } = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.description !== undefined) patch.description = input.description
  if (input.category !== undefined) patch.category = input.category
  if (input.latitude !== undefined) patch.latitude = input.latitude
  if (input.longitude !== undefined) patch.longitude = input.longitude
  if (input.address !== undefined) patch.address = input.address
  if (input.whatsappNumber !== undefined) patch.whatsapp_number = input.whatsappNumber
  if (input.website !== undefined) patch.website = input.website
  if (input.email !== undefined) patch.email = input.email
  if (input.phone !== undefined) patch.phone = input.phone
  if (input.logoUrl !== undefined) patch.logo_url = input.logoUrl
  if (input.bannerUrl !== undefined) patch.banner_url = input.bannerUrl
  if (input.isActive !== undefined) patch.is_active = input.isActive
  if (input.chatRetentionDays !== undefined) patch.chat_retention_days = input.chatRetentionDays

  const { data, error } = await c
    .get("db")
    .from("businesses")
    .update(patch)
    .eq("id", c.req.param("id"))
    .select("*")
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")
  return c.json({ data: toBusiness(data) })
})

businessRoutes.put("/:id/modules/:module", requireAuth, async (c) => {
  const parsed = ToggleBusinessModuleSchema.safeParse({
    moduleName: c.req.param("module"),
    enabled: (await c.req.json()).enabled,
  })
  if (!parsed.success) return validationError(c, parsed.error)
  const businessId = c.req.param("id")

  const { data, error } = await c
    .get("db")
    .from("business_modules")
    .upsert(
      {
        business_id: businessId,
        module_name: parsed.data.moduleName,
        enabled: parsed.data.enabled,
      },
      { onConflict: "business_id,module_name" }
    )
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
