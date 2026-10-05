import { createMiddleware } from "hono/factory"

import { ROLES } from "@workspace/shared"

import { fail } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import type { AppEnv } from "../types.js"

/** Requiere sesion + `users.role = admin`. Usar despues de `requireAuth`. */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const userId = c.get("userId")
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.error(error)
    return fail(c, 500, "INTERNAL_ERROR", "No se pudo verificar el rol")
  }
  if (!data || data.role !== ROLES.ADMIN) {
    return fail(c, 403, "FORBIDDEN", "Solo el super admin puede hacer esto")
  }

  await next()
})
