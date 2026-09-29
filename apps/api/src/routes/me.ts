import { toUser, UpdateProfileSchema } from "@workspace/shared"
import { Hono } from "hono"

import { dbFail, fail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

export const meRoutes = new Hono<AppEnv>()

meRoutes.use("*", requireAuth)

meRoutes.get("/", async (c) => {
  const userId = c.get("userId")
  const { data, error } = await supabaseAdmin.from("users").select("*").eq("id", userId).maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Perfil no encontrado")

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("business_users")
    .select("business_id, role, permissions, is_active")
    .eq("user_id", userId)
  if (membershipError) return dbFail(c, membershipError)

  const businessIds = [...new Set((memberships ?? []).map((row) => row.business_id))]
  const businessById = new Map<
    string,
    {
      id: string
      name: string
      slug: string
      category: string
      address: string | null
      is_active: boolean
      is_draft: boolean
      logo_url: string | null
      chain_id: string | null
    }
  >()

  if (businessIds.length > 0) {
    const withChain = await supabaseAdmin
      .from("businesses")
      .select("id, name, slug, category, address, is_active, is_draft, logo_url, chain_id")
      .in("id", businessIds)

    if (withChain.error?.code === "42703") {
      const fallback = await supabaseAdmin
        .from("businesses")
        .select("id, name, slug, category, address, is_active, is_draft, logo_url")
        .in("id", businessIds)
      if (fallback.error) return dbFail(c, fallback.error)
      for (const business of fallback.data ?? []) {
        businessById.set(business.id, { ...business, chain_id: null })
      }
    } else {
      if (withChain.error) return dbFail(c, withChain.error)
      for (const business of withChain.data ?? []) {
        businessById.set(business.id, business)
      }
    }
  }

  return c.json({
    data: {
      profile: toUser(data),
      memberships: (memberships ?? []).map((row) => {
        const joined = businessById.get(row.business_id)
        return {
          businessId: row.business_id,
          role: row.role,
          permissions: row.permissions,
          isActive: row.is_active,
          business: joined
            ? {
                id: joined.id,
                name: joined.name,
                slug: joined.slug,
                category: joined.category,
                address: joined.address,
                isActive: joined.is_active,
                isDraft: joined.is_draft,
                logoUrl: joined.logo_url,
                chainId: joined.chain_id,
              }
            : null,
        }
      }),
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
