import { CreateReviewSchema, UpdateReviewSchema, toReview } from "@workspace/shared"
import { Hono } from "hono"
import { z } from "zod"

import { dbFail, fail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

export const reviewRoutes = new Hono<AppEnv>()

function businessId(c: { req: { param: (name: string) => string | undefined } }) {
  return c.req.param("id") ?? ""
}

reviewRoutes.get("/", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select("*, users(full_name)")
    .eq("business_id", businessId(c))
    .order("created_at", { ascending: false })
  if (error) return dbFail(c, error)

  return c.json({
    data: (data ?? []).map((row) => {
      const profile = row.users
      return toReview(row, Array.isArray(profile) ? profile[0] : profile)
    }),
  })
})

reviewRoutes.post("/", requireAuth, async (c) => {
  const id = businessId(c)
  const parsed = CreateReviewSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationError(c, parsed.error)

  const userId = c.get("userId")
  const { data, error } = await c
    .get("db")
    .from("reviews")
    .upsert(
      {
        business_id: id,
        user_id: userId,
        rating: parsed.data.rating,
        comment: parsed.data.comment?.trim() || null,
      },
      { onConflict: "business_id,user_id" },
    )
    .select("*, users(full_name)")
    .single()
  if (error) return dbFail(c, error)

  const profile = data.users
  return c.json(
    { data: toReview(data, Array.isArray(profile) ? profile[0] : profile) },
    201,
  )
})

reviewRoutes.patch("/:reviewId", requireAuth, async (c) => {
  const reviewId = c.req.param("reviewId") ?? ""
  if (!z.uuid().safeParse(reviewId).success) {
    return fail(c, 400, "VALIDATION_ERROR", "Identificador inválido")
  }
  const parsed = UpdateReviewSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationError(c, parsed.error)
  if (parsed.data.rating === undefined && parsed.data.comment === undefined) {
    return fail(c, 400, "VALIDATION_ERROR", "Nada que actualizar")
  }

  const patch: { rating?: number; comment?: string | null } = {}
  if (parsed.data.rating !== undefined) patch.rating = parsed.data.rating
  if (parsed.data.comment !== undefined) patch.comment = parsed.data.comment.trim() || null

  const { data, error } = await c
    .get("db")
    .from("reviews")
    .update(patch)
    .eq("id", reviewId)
    .eq("business_id", businessId(c))
    .eq("user_id", c.get("userId"))
    .select("*, users(full_name)")
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Reseña no encontrada")

  const profile = data.users
  return c.json({ data: toReview(data, Array.isArray(profile) ? profile[0] : profile) })
})

reviewRoutes.delete("/:reviewId", requireAuth, async (c) => {
  const reviewId = c.req.param("reviewId") ?? ""
  if (!z.uuid().safeParse(reviewId).success) {
    return fail(c, 400, "VALIDATION_ERROR", "Identificador inválido")
  }
  const { error, count } = await c
    .get("db")
    .from("reviews")
    .delete({ count: "exact" })
    .eq("id", reviewId)
    .eq("business_id", businessId(c))
    .eq("user_id", c.get("userId"))
  if (error) return dbFail(c, error)
  if (!count) return fail(c, 404, "NOT_FOUND", "Reseña no encontrada")
  return c.body(null, 204)
})
