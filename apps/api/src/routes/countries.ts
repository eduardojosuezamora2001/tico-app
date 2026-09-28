import {
  ListAdministrativeDivisionsSchema,
  toAdministrativeDivision,
  toCountry,
  toCountryAdministrativeLevel,
  type Tables,
} from "@workspace/shared"
import { Hono } from "hono"
import { z } from "zod"

import { dbFail, fail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import type { AppEnv } from "../types.js"

export const countryRoutes = new Hono<AppEnv>()

countryRoutes.get("/", async (c) => {
  const { data, error } = await supabaseAdmin
    .from("countries")
    .select("*")
    .eq("is_active", true)
    .order("name")
  if (error) return dbFail(c, error)
  return c.json({ data: (data ?? []).map(toCountry) })
})

countryRoutes.get("/:countryCode/administrative-levels", async (c) => {
  const parsed = ListAdministrativeDivisionsSchema.safeParse({
    country: c.req.param("countryCode"),
  })
  if (!parsed.success) return validationError(c, parsed.error)

  const { data: country, error: countryError } = await supabaseAdmin
    .from("countries")
    .select("id")
    .eq("code", parsed.data.country)
    .eq("is_active", true)
    .maybeSingle()
  if (countryError) return dbFail(c, countryError)
  if (!country) return fail(c, 404, "NOT_FOUND", "País no encontrado")

  const { data, error } = await supabaseAdmin
    .from("country_administrative_levels")
    .select("*")
    .eq("country_id", country.id)
    .order("level")
  if (error) return dbFail(c, error)

  return c.json({ data: (data ?? []).map(toCountryAdministrativeLevel) })
})

async function fetchDivisionChain(startId: string) {
  const chain: ReturnType<typeof toAdministrativeDivision>[] = []
  let nextId: string | undefined = startId

  for (let depth = 0; depth < 8 && nextId; depth += 1) {
    const divisionId: string = nextId
    const { data, error } = await supabaseAdmin
      .from("administrative_divisions")
      .select("*")
      .eq("id", divisionId)
      .maybeSingle()
    if (error) throw error
    const row = data as Tables<"administrative_divisions"> | null
    if (!row) break
    chain.unshift(toAdministrativeDivision(row))
    nextId = row.parent_id ?? undefined
  }

  return chain
}

export const divisionRoutes = new Hono<AppEnv>()

divisionRoutes.get("/chain/:id", async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "División no encontrada")

  try {
    const chain = await fetchDivisionChain(parsedId.data)
    if (chain.length === 0) return fail(c, 404, "NOT_FOUND", "División no encontrada")
    return c.json({ data: chain })
  } catch (error) {
    return dbFail(c, error as { message: string; code?: string })
  }
})

divisionRoutes.get("/", async (c) => {
  const parsed = ListAdministrativeDivisionsSchema.safeParse({
    country: c.req.query("country"),
    parentId: c.req.query("parentId") || undefined,
  })
  if (!parsed.success) return validationError(c, parsed.error)

  const { data: country, error: countryError } = await supabaseAdmin
    .from("countries")
    .select("id")
    .eq("code", parsed.data.country)
    .eq("is_active", true)
    .maybeSingle()
  if (countryError) return dbFail(c, countryError)
  if (!country) return fail(c, 404, "NOT_FOUND", "País no encontrado")

  let query = supabaseAdmin
    .from("administrative_divisions")
    .select("*")
    .eq("country_id", country.id)
    .eq("is_active", true)
    .order("name")

  if (parsed.data.parentId) {
    query = query.eq("parent_id", parsed.data.parentId)
  } else {
    query = query.is("parent_id", null)
  }

  const { data, error } = await query
  if (error) return dbFail(c, error)

  return c.json({ data: (data ?? []).map(toAdministrativeDivision) })
})
