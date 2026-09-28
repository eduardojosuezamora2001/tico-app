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
    .eq("is_active", true)
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")
  if (data.is_draft) {
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
  const { data, error } = await c
    .get("db")
    .from("businesses")
    .insert({
      owner_id: c.get("userId"),
      name: input.name,
      category: input.category,
      ...insert,
      is_draft: input.isDraft ?? false,
      is_active: input.isDraft ? false : true,
    })
    .select("*")
    .single()
  if (error) return dbFail(c, error)
  return c.json({ data: toBusiness(data) }, 201)
})

businessRoutes.patch("/:id", requireAuth, async (c) => {
  const parsed = UpdateBusinessSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)
  const patch = businessPatchFromInput(parsed.data)

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

businessRoutes.post("/:id/publish", requireAuth, async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

  const { data, error } = await c
    .get("db")
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
