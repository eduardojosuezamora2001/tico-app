import { CatalogSuggestionSchema, SuggestCatalogSchema } from "@workspace/shared"
import { Hono } from "hono"

import { dbFail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import type { AppEnv } from "../types.js"

export const discoverRoutes = new Hono<AppEnv>()

discoverRoutes.get("/suggestions", async (c) => {
  const parsed = SuggestCatalogSchema.safeParse({
    q: c.req.query("q") || undefined,
    limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
  })
  if (!parsed.success) return validationError(c, parsed.error)

  const { data, error } = await supabaseAdmin.rpc("suggest_catalog", {
    q: parsed.data.q,
    lim: parsed.data.limit,
  })
  if (error) return dbFail(c, error)

  const suggestions = (data ?? []).flatMap((row) => {
    const item = CatalogSuggestionSchema.safeParse({
      kind: row.kind,
      id: row.id,
      label: row.label,
      hint: row.hint,
    })
    return item.success ? [item.data] : []
  })

  return c.json({ data: suggestions })
})
