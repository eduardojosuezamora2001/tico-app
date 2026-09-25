import { AddBusinessUserSchema, toTeamMember, UpdateBusinessUserSchema } from "@workspace/shared"
import type { Context } from "hono"
import { Hono } from "hono"
import { z } from "zod"

import { dbFail, fail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

export const teamRoutes = new Hono<AppEnv>()

teamRoutes.use("*", requireAuth)

function businessId(c: { req: { param: (name: string) => string | undefined } }) {
  return c.req.param("id") ?? ""
}

teamRoutes.get("/", async (c) => {
  const { data, error } = await c
    .get("db")
    .from("business_users")
    .select("*, users(full_name, email)")
    .eq("business_id", businessId(c))
  if (error) return dbFail(c, error)

  return c.json({
    data: (data ?? []).flatMap((row) => {
      const profile = row.users
      if (!profile || Array.isArray(profile)) return []
      return [toTeamMember(row, profile)]
    }),
  })
})

teamRoutes.post("/", async (c) => {
  const id = businessId(c)
  const parsed = AddBusinessUserSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationError(c, parsed.error)
  if (!(await callerCanManage(c, id))) {
    return fail(c, 403, "FORBIDDEN", "No puedes administrar el equipo de este negocio")
  }

  const { data: account, error: accountError } = await supabaseAdmin
    .from("users")
    .select("id, full_name, email")
    .eq("email", parsed.data.email)
    .maybeSingle()
  if (accountError) return dbFail(c, accountError)
  if (!account) return fail(c, 404, "NOT_FOUND", "No hay una cuenta con ese correo")

  const { data, error } = await c
    .get("db")
    .from("business_users")
    .insert({
      business_id: id,
      user_id: account.id,
      role: parsed.data.role,
      permissions: parsed.data.permissions,
    })
    .select("*")
    .single()
  if (error) return dbFail(c, error)
  return c.json({ data: toTeamMember(data, account) }, 201)
})

teamRoutes.patch("/:memberId", async (c) => {
  const memberId = c.req.param("memberId")
  if (!z.uuid().safeParse(memberId).success) {
    return fail(c, 400, "VALIDATION_ERROR", "Identificador invalido")
  }
  const parsed = UpdateBusinessUserSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationError(c, parsed.error)

  const patch: { role?: "manager" | "employee"; permissions?: string[] } = {}
  if (parsed.data.role) patch.role = parsed.data.role
  if (parsed.data.permissions) patch.permissions = parsed.data.permissions

  const { data, error } = await c
    .get("db")
    .from("business_users")
    .update(patch)
    .eq("id", memberId)
    .eq("business_id", businessId(c))
    .select("*, users(full_name, email)")
    .single()
  if (error) return dbFail(c, error)
  const profile = data.users
  if (!profile || Array.isArray(profile)) return fail(c, 404, "NOT_FOUND", "Miembro no encontrado")
  return c.json({ data: toTeamMember(data, profile) })
})

teamRoutes.delete("/:memberId", async (c) => {
  const memberId = c.req.param("memberId")
  if (!z.uuid().safeParse(memberId).success) {
    return fail(c, 400, "VALIDATION_ERROR", "Identificador invalido")
  }
  const { error } = await c
    .get("db")
    .from("business_users")
    .delete()
    .eq("id", memberId)
    .eq("business_id", businessId(c))
  if (error) return dbFail(c, error)
  return c.json({ data: { id: memberId } })
})

async function callerCanManage(c: Context<AppEnv>, businessId: string) {
  const { data, error } = await c
    .get("db")
    .from("business_users")
    .select("role, permissions")
    .eq("business_id", businessId)
    .eq("user_id", c.get("userId"))
    .maybeSingle()
  if (error || !data) return false
  return data.role === "owner" || data.permissions.includes("employees:manage")
}
