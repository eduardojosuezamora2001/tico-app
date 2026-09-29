import { UpsertBusinessHoursSchema, toBusinessHours } from "@workspace/shared"
import { Hono } from "hono"
import { z } from "zod"

import { requireEditableBusiness } from "../lib/business-access.js"
import { dbFail, fail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

export const hoursRoutes = new Hono<AppEnv>()

function businessId(c: { req: { param: (name: string) => string | undefined } }) {
  return c.req.param("id") ?? ""
}

hoursRoutes.get("/", async (c) => {
  const parsedId = z.uuid().safeParse(businessId(c))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

  const { data, error } = await supabaseAdmin
    .from("business_hours")
    .select("*")
    .eq("business_id", parsedId.data)
    .is("exception_date", null)
    .order("day_of_week", { ascending: true })
  if (error) return dbFail(c, error)

  return c.json({ data: (data ?? []).map(toBusinessHours) })
})

hoursRoutes.put("/", requireAuth, async (c) => {
  const parsedId = z.uuid().safeParse(businessId(c))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Negocio no encontrado")

  const parsed = UpsertBusinessHoursSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationError(c, parsed.error)

  const id = parsedId.data
  const access = await requireEditableBusiness(c, id)
  if ("error" in access && access.error) return access.error

  const rows = parsed.data.map((row) => ({
    business_id: id,
    day_of_week: row.dayOfWeek,
    exception_date: null,
    open_time: row.isClosed ? null : row.openTime,
    close_time: row.isClosed ? null : row.closeTime,
    is_closed: row.isClosed,
  }))

  const { error: deleteError } = await supabaseAdmin
    .from("business_hours")
    .delete()
    .eq("business_id", id)
    .is("exception_date", null)
  if (deleteError) return dbFail(c, deleteError)

  const { data, error } = await supabaseAdmin.from("business_hours").insert(rows).select("*")
  if (error) return dbFail(c, error)

  return c.json({ data: (data ?? []).map(toBusinessHours) })
})
