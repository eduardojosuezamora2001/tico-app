import { Hono } from "hono"

import { dbFail } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import type { AppEnv } from "../types.js"

export const catalogTagRoutes = new Hono<AppEnv>()

catalogTagRoutes.get("/marketplace-tags", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("catalog_tags")
    .select("id, slug, name, sort_order, parent_id")
    .eq("scope", "marketplace")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
  if (error) return dbFail(c, error)

  return c.json({
    data: (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      sortOrder: row.sort_order,
      parentId: row.parent_id,
    })),
  })
})

catalogTagRoutes.get("/business-categories", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("marketplace_business_categories")
    .select("id, slug, name, legacy_label, sort_order, parent_id")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
  if (error) return dbFail(c, error)

  return c.json({
    data: (data ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      legacyLabel: row.legacy_label,
      sortOrder: row.sort_order,
      parentId: row.parent_id,
    })),
  })
})
