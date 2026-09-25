import { CreateGalleryImageSchema, toGalleryImage } from "@workspace/shared"
import { Hono } from "hono"

import { dbFail, fail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

export const galleryRoutes = new Hono<AppEnv>()

function businessId(c: { req: { param: (name: string) => string | undefined } }) {
  return c.req.param("id") ?? ""
}

galleryRoutes.get("/", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("business_gallery")
    .select("*")
    .eq("business_id", businessId(c))
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) return dbFail(c, error)
  return c.json({ data: (data ?? []).map(toGalleryImage) })
})

galleryRoutes.post("/", requireAuth, async (c) => {
  const id = businessId(c)
  const parsed = CreateGalleryImageSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationError(c, parsed.error)
  if (!parsed.data.imageUrl.includes(`/business-media/${id}/gallery/`)) {
    return fail(c, 400, "VALIDATION_ERROR", "La foto tiene que venir de la galería de este negocio")
  }

  const { data, error } = await c
    .get("db")
    .from("business_gallery")
    .insert({
      business_id: id,
      image_url: parsed.data.imageUrl,
      sort_order: parsed.data.sortOrder ?? 0,
    })
    .select("*")
    .single()
  if (error) return dbFail(c, error)
  return c.json({ data: toGalleryImage(data) }, 201)
})

galleryRoutes.delete("/:imageId", requireAuth, async (c) => {
  const { error } = await c
    .get("db")
    .from("business_gallery")
    .delete()
    .eq("id", c.req.param("imageId") ?? "")
    .eq("business_id", businessId(c))
  if (error) return dbFail(c, error)
  return c.body(null, 204)
})
