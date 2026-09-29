import {
  AttachChainLocationSchema,
  CreateBusinessChainSchema,
  toBusiness,
  toBusinessChain,
} from "@workspace/shared"
import { Hono } from "hono"
import { z } from "zod"

import {
  collectChainIdsForUser,
  isBusinessOwnerForChain,
  isChainAdmin,
} from "../lib/chain-access.js"
import { dbFail, fail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

export const chainRoutes = new Hono<AppEnv>()

chainRoutes.use("*", requireAuth)

chainRoutes.get("/", async (c) => {
  const userId = c.get("userId")
  const chainIds = await collectChainIdsForUser(supabaseAdmin, userId)
  if (chainIds.length === 0) return c.json({ data: [] })

  const [{ data: chains, error: chainsError }, { data: locations, error: locationsError }] =
    await Promise.all([
      supabaseAdmin.from("business_chains").select("*").in("id", chainIds).order("name"),
      supabaseAdmin
        .from("businesses")
        .select("id, name, slug, category, address, is_active, is_draft, logo_url, chain_id, owner_id")
        .in("chain_id", chainIds)
        .order("name"),
    ])

  if (chainsError) return dbFail(c, chainsError)
  if (locationsError) return dbFail(c, locationsError)

  const locationIds = (locations ?? []).map((row) => row.id)
  const { data: roles, error: rolesError } =
    locationIds.length > 0
      ? await supabaseAdmin
          .from("business_users")
          .select("business_id, role")
          .eq("user_id", userId)
          .in("business_id", locationIds)
      : { data: [], error: null }
  if (rolesError) return dbFail(c, rolesError)

  const roleByBusiness = new Map((roles ?? []).map((row) => [row.business_id, row.role]))

  const payload = (chains ?? []).map((chain) => {
    const base = toBusinessChain(chain)
    return {
      ...base,
      locations: (locations ?? [])
        .filter((location) => location.chain_id === chain.id)
        .map((location) => ({
          businessId: location.id,
          name: location.name,
          slug: location.slug,
          category: location.category,
          address: location.address,
          isActive: location.is_active,
          isDraft: location.is_draft,
          logoUrl: location.logo_url,
          role:
            roleByBusiness.get(location.id) ??
            (location.owner_id === userId ? "owner" : "owner"),
        })),
    }
  })

  return c.json({ data: payload })
})

chainRoutes.post("/", async (c) => {
  const parsed = CreateBusinessChainSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const userId = c.get("userId")
  const { data, error } = await supabaseAdmin
    .from("business_chains")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      logo_url: parsed.data.logoUrl ?? null,
      created_by: userId,
    })
    .select("*")
    .single()
  if (error) return dbFail(c, error)

  return c.json({ data: { ...toBusinessChain(data), locations: [] } }, 201)
})

chainRoutes.post("/:id/locations", async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Cadena no encontrada")

  const parsed = AttachChainLocationSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const userId = c.get("userId")
  const chainId = parsedId.data
  const businessId = parsed.data.businessId

  if (!(await isChainAdmin(supabaseAdmin, chainId, userId))) {
    return fail(c, 403, "FORBIDDEN", "No tienes permiso para administrar esta cadena")
  }

  if (!(await isBusinessOwnerForChain(supabaseAdmin, businessId, userId))) {
    return fail(c, 403, "FORBIDDEN", "Solo puedes vincular locales donde eres dueño o co-líder")
  }

  const { data: business, error: businessError } = await supabaseAdmin
    .from("businesses")
    .select("id, chain_id")
    .eq("id", businessId)
    .maybeSingle()
  if (businessError) return dbFail(c, businessError)
  if (!business) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

  if (business.chain_id && business.chain_id !== chainId) {
    return fail(c, 409, "CONFLICT", "Este local ya pertenece a otra cadena")
  }
  if (business.chain_id === chainId) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single()
    if (existingError) return dbFail(c, existingError)
    return c.json({ data: toBusiness(existing) })
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("businesses")
    .update({ chain_id: chainId })
    .eq("id", businessId)
    .select("*")
    .single()
  if (updateError) return dbFail(c, updateError)

  return c.json({ data: toBusiness(updated) })
})
