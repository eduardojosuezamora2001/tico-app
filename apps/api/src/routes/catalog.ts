import {
  CreateMenuItemSchema,
  CreateProductSchema,
  CreateServiceSchema,
  UpdateMenuItemSchema,
  UpdateProductSchema,
  UpdateServiceSchema,
  toMenuItem,
  toProduct,
  toService,
} from "@workspace/shared"
import { Hono } from "hono"
import type { ZodType } from "zod"

import { dbFail, fail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

type TableName = "products" | "services" | "menus"

async function assertModule(c: { get: (key: "db") => AppEnv["Variables"]["db"]; req: { param: (name: string) => string } }, moduleName: string) {
  const { data, error } = await c
    .get("db")
    .from("business_modules")
    .select("enabled")
    .eq("business_id", c.req.param("id"))
    .eq("module_name", moduleName)
    .maybeSingle()
  if (error) return { error }
  if (!data?.enabled) return { disabled: true as const }
  return { disabled: false as const }
}

function catalogRoutes(options: {
  table: TableName
  moduleName: "products" | "services" | "menu"
  createSchema: ZodType
  updateSchema: ZodType
  toRow: (row: never) => unknown
  toInsert: (input: Record<string, unknown>, businessId: string) => Record<string, unknown>
  toPatch: (input: Record<string, unknown>) => Record<string, unknown>
}) {
  const routes = new Hono<AppEnv>()

  routes.get("/", async (c) => {
    const includeUnavailable = c.req.query("includeUnavailable") === "true"
    const businessId = c.req.param("id") ?? ""
    let query = supabaseAdmin.from(options.table).select("*").eq("business_id", businessId) as unknown as {
      eq: (column: string, value: boolean) => typeof query
      order: (
        column: string,
        opts: { ascending: boolean }
      ) => Promise<{ data: unknown[] | null; error: { code?: string; message: string } | null }>
    }
    if (!includeUnavailable && options.table === "services") query = query.eq("is_active", true)
    if (!includeUnavailable && options.table !== "services") query = query.eq("is_available", true)
    const { data, error } = await query.order("created_at", { ascending: false })
    if (error) return dbFail(c, error)
    return c.json({ data: (data ?? []).map((row) => options.toRow(row as never)) })
  })

  routes.post("/", requireAuth, async (c) => {
    const parsed = options.createSchema.safeParse(await c.req.json())
    if (!parsed.success) return validationError(c, parsed.error)
    const gate = await assertModule(c, options.moduleName)
    if ("error" in gate && gate.error) return dbFail(c, gate.error)
    if (gate.disabled) return fail(c, 409, "MODULE_DISABLED", "Activa el modulo antes de publicar")

    const { data, error } = await c
      .get("db")
      .from(options.table)
      .insert(options.toInsert(parsed.data as Record<string, unknown>, c.req.param("id") ?? "") as never)
      .select("*")
      .single()
    if (error) return dbFail(c, error)
    return c.json({ data: options.toRow(data as never) }, 201)
  })

  routes.patch("/:itemId", requireAuth, async (c) => {
    const parsed = options.updateSchema.safeParse(await c.req.json())
    if (!parsed.success) return validationError(c, parsed.error)
    const { data, error } = await c
      .get("db")
      .from(options.table)
      .update(options.toPatch(parsed.data as Record<string, unknown>) as never)
      .eq("id", c.req.param("itemId") ?? "")
      .eq("business_id", c.req.param("id") ?? "")
      .select("*")
      .maybeSingle()
    if (error) return dbFail(c, error)
    if (!data) return fail(c, 404, "NOT_FOUND", "No encontrado")
    return c.json({ data: options.toRow(data as never) })
  })

  routes.delete("/:itemId", requireAuth, async (c) => {
    const { error } = await c
      .get("db")
      .from(options.table)
      .delete()
      .eq("id", c.req.param("itemId") ?? "")
      .eq("business_id", c.req.param("id") ?? "")
    if (error) return dbFail(c, error)
    return c.json({ data: { ok: true } })
  })

  return routes
}

const optional = (value: unknown) => (value === undefined ? undefined : value)

export const productRoutes = catalogRoutes({
  table: "products",
  moduleName: "products",
  createSchema: CreateProductSchema,
  updateSchema: UpdateProductSchema,
  toRow: toProduct,
  toInsert: (input, businessId) => ({
    business_id: businessId,
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    stock: input.stock ?? null,
    image_url: input.imageUrl ?? null,
    category: input.category ?? null,
    is_available: input.isAvailable ?? true,
  }),
  toPatch: (input) => ({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(optional(input.description) !== undefined ? { description: input.description } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.stock !== undefined ? { stock: input.stock } : {}),
    ...(input.imageUrl !== undefined ? { image_url: input.imageUrl } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.isAvailable !== undefined ? { is_available: input.isAvailable } : {}),
  }),
})

export const serviceRoutes = catalogRoutes({
  table: "services",
  moduleName: "services",
  createSchema: CreateServiceSchema,
  updateSchema: UpdateServiceSchema,
  toRow: toService,
  toInsert: (input, businessId) => ({
    business_id: businessId,
    name: input.name,
    description: input.description ?? null,
    price: input.price ?? null,
    duration_minutes: input.durationMinutes ?? null,
    category: input.category ?? null,
    image_url: input.imageUrl ?? null,
    is_active: input.isActive ?? true,
  }),
  toPatch: (input) => ({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.durationMinutes !== undefined ? { duration_minutes: input.durationMinutes } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.imageUrl !== undefined ? { image_url: input.imageUrl } : {}),
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
  }),
})

export const menuRoutes = catalogRoutes({
  table: "menus",
  moduleName: "menu",
  createSchema: CreateMenuItemSchema,
  updateSchema: UpdateMenuItemSchema,
  toRow: toMenuItem,
  toInsert: (input, businessId) => ({
    business_id: businessId,
    section: input.section ?? null,
    name: input.name,
    description: input.description ?? null,
    price: input.price,
    image_url: input.imageUrl ?? null,
    is_available: input.isAvailable ?? true,
    sort_order: input.sortOrder ?? 0,
  }),
  toPatch: (input) => ({
    ...(input.section !== undefined ? { section: input.section } : {}),
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.imageUrl !== undefined ? { image_url: input.imageUrl } : {}),
    ...(input.isAvailable !== undefined ? { is_available: input.isAvailable } : {}),
    ...(input.sortOrder !== undefined ? { sort_order: input.sortOrder } : {}),
  }),
})
