import { toBusinessEvent } from "@workspace/shared"
import { Hono } from "hono"

import { dbFail } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import type { AppEnv } from "../types.js"

export const eventRoutes = new Hono<AppEnv>()

eventRoutes.get("/", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .eq("business_id", c.req.param("id") ?? "")
    .order("starts_at", { ascending: true })
  if (error) return dbFail(c, error)
  return c.json({ data: (data ?? []).map(toBusinessEvent) })
})
