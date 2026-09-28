import type { SupabaseClient } from "@supabase/supabase-js"
import {
  CreateAddressSchema,
  UpdateAddressSchema,
  toAddress,
  type Database,
} from "@workspace/shared"
import { Hono } from "hono"
import { z } from "zod"

import {
  addressInsertFromInput,
  addressPatchFromInput,
} from "../lib/address-input.js"
import {
  ensureCountryExists,
  validateDivisionChain,
} from "../lib/address-validation.js"
import { dbFail, fail, validationError } from "../lib/http.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

type ValidationIssue = {
  status: 400 | 404
  code: string
  message: string
}

export const addressRoutes = new Hono<AppEnv>()

async function validateAddressInput(
  db: SupabaseClient<Database>,
  input: { countryId?: string; administrativeDivisionId?: string | null },
  requireCountry = true,
): Promise<ValidationIssue | null> {
  const countryId = input.countryId
  if (requireCountry) {
    if (!countryId) {
      return { status: 400, code: "VALIDATION", message: "País requerido" }
    }
    const exists = await ensureCountryExists(db, countryId)
    if (!exists) {
      return { status: 404, code: "NOT_FOUND", message: "País no encontrado" }
    }
  }

  if (input.administrativeDivisionId && countryId) {
    const valid = await validateDivisionChain(
      db,
      input.administrativeDivisionId,
      countryId,
    )
    if (!valid) {
      return {
        status: 400,
        code: "VALIDATION",
        message: "División administrativa inválida para el país",
      }
    }
  }

  return null
}

addressRoutes.post("/", requireAuth, async (c) => {
  const parsed = CreateAddressSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const issue = await validateAddressInput(c.get("db"), parsed.data)
  if (issue) return fail(c, issue.status, issue.code, issue.message)

  const { data, error } = await c
    .get("db")
    .from("addresses")
    .insert(addressInsertFromInput(parsed.data))
    .select("*")
    .single()
  if (error) return dbFail(c, error)

  return c.json({ data: toAddress(data) }, 201)
})

addressRoutes.get("/:id", requireAuth, async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Dirección no encontrada")

  const { data, error } = await c
    .get("db")
    .from("addresses")
    .select("*")
    .eq("id", parsedId.data)
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Dirección no encontrada")

  return c.json({ data: toAddress(data) })
})

addressRoutes.patch("/:id", requireAuth, async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Dirección no encontrada")

  const parsed = UpdateAddressSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  const db = c.get("db")
  const { data: existing, error: existingError } = await db
    .from("addresses")
    .select("country_id")
    .eq("id", parsedId.data)
    .maybeSingle()
  if (existingError) return dbFail(c, existingError)
  if (!existing) return fail(c, 404, "NOT_FOUND", "Dirección no encontrada")

  const countryId = parsed.data.countryId ?? existing.country_id
  const issue = await validateAddressInput(
    db,
    {
      countryId,
      administrativeDivisionId: parsed.data.administrativeDivisionId,
    },
    parsed.data.countryId !== undefined,
  )
  if (issue) return fail(c, issue.status, issue.code, issue.message)

  const { data, error } = await db
    .from("addresses")
    .update(addressPatchFromInput(parsed.data))
    .eq("id", parsedId.data)
    .select("*")
    .maybeSingle()
  if (error) return dbFail(c, error)
  if (!data) return fail(c, 404, "NOT_FOUND", "Dirección no encontrada")

  return c.json({ data: toAddress(data) })
})

addressRoutes.delete("/:id", requireAuth, async (c) => {
  const parsedId = z.uuid().safeParse(c.req.param("id"))
  if (!parsedId.success) return fail(c, 404, "NOT_FOUND", "Dirección no encontrada")

  const { error } = await c.get("db").from("addresses").delete().eq("id", parsedId.data)
  if (error) return dbFail(c, error)

  return c.body(null, 204)
})
