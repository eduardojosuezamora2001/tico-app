import { toUser, UpdateProfileSchema } from "@workspace/shared"
import { Hono } from "hono"

import { dbFail, fail, validationError } from "../lib/http.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

export const meRoutes = new Hono<AppEnv>()

meRoutes.use("*", requireAuth)

meRoutes.get("/", async (c) => {
  const db = c.get("db")
  const userId = c.get("userId")
  const { data, error } = await db.from("users").select("*").eq("id", userId).maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Perfil no encontrado")

  const { data: memberships, error: membershipError } = await db
    .from("business_users")
    .select("business_id, role, permissions, businesses(id, name, slug)")
    .eq("user_id", userId)
  if (membershipError) return dbFail(c, membershipError)

  return c.json({
    data: {
      profile: toUser(data),
      memberships: (memberships ?? []).map((row) => ({
        businessId: row.business_id,
        role: row.role,
        permissions: row.permissions,
        business: row.businesses,
      })),
    },
  })
})

meRoutes.patch("/", async (c) => {
  const parsed = UpdateProfileSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const patch: { full_name?: string; avatar_url?: string | null; preferred_language?: string } = {}
  if (parsed.data.fullName !== undefined) patch.full_name = parsed.data.fullName
  if (parsed.data.avatarUrl !== undefined) patch.avatar_url = parsed.data.avatarUrl
  if (parsed.data.preferredLanguage !== undefined) patch.preferred_language = parsed.data.preferredLanguage

  const { data, error } = await c
    .get("db")
    .from("users")
    .update(patch)
    .eq("id", c.get("userId"))
    .select("*")
    .single()
  if (error) return dbFail(c, error)
  return c.json({ data: toUser(data) })
})
