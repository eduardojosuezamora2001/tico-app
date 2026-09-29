import type { Context } from "hono"

import type { AppEnv } from "../types.js"
import { dbFail, fail } from "./http.js"
import { supabaseAdmin } from "./supabase.js"

/** Verifica que el usuario autenticado puede editar el negocio. */
export async function requireEditableBusiness(c: Context<AppEnv>, businessId: string) {
  const userId = c.get("userId")

  const { data: business, error } = await supabaseAdmin
    .from("businesses")
    .select("id, address_id, owner_id")
    .eq("id", businessId)
    .maybeSingle()
  if (error) return { error: dbFail(c, error) }
  if (!business) return { error: fail(c, 404, "NOT_FOUND", "Negocio no encontrado") }

  if (business.owner_id === userId) {
    return { business: { id: business.id, address_id: business.address_id } }
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from("business_users")
    .select("role, permissions")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle()
  if (memberError) return { error: dbFail(c, memberError) }

  const canEdit =
    member?.role === "owner" ||
    member?.permissions?.includes("business:edit") === true

  if (!canEdit) {
    return { error: fail(c, 403, "FORBIDDEN", "No tienes permiso para editar este negocio") }
  }

  return { business: { id: business.id, address_id: business.address_id } }
}
