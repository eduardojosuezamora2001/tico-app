import { createMiddleware } from "hono/factory"

import { fail } from "../lib/http.js"
import { createUserClient, supabaseAdmin } from "../lib/supabase.js"
import type { AppEnv } from "../types.js"

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) return fail(c, 401, "UNAUTHORIZED", "Inicia sesion para continuar")

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return fail(c, 401, "UNAUTHORIZED", "La sesion no es valida")

  c.set("userId", data.user.id)
  c.set("accessToken", token)
  c.set("db", createUserClient(token))
  await next()
})
