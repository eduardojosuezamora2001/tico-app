import {
  ORDER_FULFILLMENT_STAGE,
  ORDER_STATUS,
  OrderStageSchema,
  VerifyOrderPickupSchema,
  nextFulfillmentStage,
  toChatOrder,
  toOrderListItem,
  type ConversationRole,
  type Database,
} from "@workspace/shared"
import type { SupabaseClient } from "@supabase/supabase-js"
import { Hono } from "hono"
import { z } from "zod"

import { isBusinessPickupOtpEnabled } from "../lib/business-module-settings.js"
import { fanOutOrderUpdate, syncOrderMessage } from "../lib/order-sync.js"
import { dbFail, fail, validationError } from "../lib/http.js"
import {
  PICKUP_VERIFY_MAX_ATTEMPTS,
  generatePickupCode,
  hashPickupCode,
  verifyPickupCode,
} from "../lib/pickup-code.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

type Db = SupabaseClient<Database>
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"]
export const orderRoutes = new Hono<AppEnv>()

orderRoutes.use("*", requireAuth)

orderRoutes.get("/", async (c) => {
  const userId = c.get("userId")
  const businessId = uuidParam(c.req.query("businessId") ?? undefined)
  if (c.req.query("businessId") && !businessId) {
    return fail(c, 400, "VALIDATION_ERROR", "Identificador de negocio inválido")
  }

  let query = c
    .get("db")
    .from("orders")
    .select("*, businesses ( slug ), users!orders_customer_id_fkey ( full_name )")
    .order("created_at", { ascending: false })
    .limit(200)

  if (businessId) query = query.eq("business_id", businessId)

  const { data, error } = await query
  if (error) return dbFail(c, error)
  const rows = data ?? []
  const pickupOtpByBusiness = new Map<string, boolean>()
  for (const id of new Set(rows.map((row) => row.business_id))) {
    pickupOtpByBusiness.set(id, await isBusinessPickupOtpEnabled(id))
  }
  return c.json({
    data: rows.map((row) => {
      const isCustomer = row.customer_id === userId
      return toOrderListItem(row, {
        includePickupCode: isCustomer,
        pickupOtpEnabled: pickupOtpByBusiness.get(row.business_id),
      })
    }),
  })
})

orderRoutes.get("/conversations/:conversationId", async (c) => {
  const conversationId = uuidParam(c.req.param("conversationId"))
  if (!conversationId) return fail(c, 400, "VALIDATION_ERROR", "Identificador inválido")

  const userId = c.get("userId")
  const loaded = await loadVisible(c.get("db"), conversationId, userId)
  if (loaded.error) return dbFail(c, loaded.error)
  if (!loaded.row || !loaded.role) return fail(c, 404, "NOT_FOUND", "Conversación no encontrada")
  if (loaded.role === "member") {
    return fail(c, 403, "FORBIDDEN", "Este hilo lo atiende otra persona.")
  }

  const { data, error } = await c
    .get("db")
    .from("orders")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
  if (error) return dbFail(c, error)
  const includePickupCode = loaded.role === "customer"
  return c.json({
    data: (data ?? []).map((row) => toChatOrder(row, { includePickupCode })),
  })
})

orderRoutes.post("/:orderId/stage", async (c) => {
  const orderId = uuidParam(c.req.param("orderId"))
  if (!orderId) return fail(c, 400, "VALIDATION_ERROR", "Identificador inválido")

  const parsed = OrderStageSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationError(c, parsed.error)

  const userId = c.get("userId")
  const { data: row, error } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle()
  if (error) return dbFail(c, error)
  if (!row) return fail(c, 404, "NOT_FOUND", "Pedido no encontrado")

  const loaded = await loadVisible(supabaseAdmin, row.conversation_id, userId)
  if (loaded.error) return dbFail(c, loaded.error)
  if (!loaded.row || !loaded.role) return fail(c, 404, "NOT_FOUND", "Conversación no encontrada")
  if (loaded.role === "customer" || loaded.role === "member") {
    return fail(c, 403, "FORBIDDEN", "Solo quien atiende puede avanzar el pedido")
  }

  if (row.status !== ORDER_STATUS.accepted || !row.fulfillment_stage) {
    return fail(c, 409, "CONFLICT", "Solo pedidos aceptados pueden avanzar de etapa")
  }

  const expected = nextFulfillmentStage(row.fulfillment_stage as typeof ORDER_FULFILLMENT_STAGE.preparing)
  if (!expected || expected !== parsed.data.stage) {
    return fail(c, 400, "VALIDATION", "Etapa de pedido inválida para el estado actual")
  }

  const pickupOtp = await isBusinessPickupOtpEnabled(row.business_id)
  if (parsed.data.stage === "delivered" && pickupOtp) {
    return fail(c, 409, "CONFLICT", "Usa verificación de código para marcar entregado")
  }

  const now = new Date().toISOString()
  const patch: Database["public"]["Tables"]["orders"]["Update"] = {
    fulfillment_stage: parsed.data.stage,
    stage_updated_at: now,
  }

  if (parsed.data.stage === "ready" && pickupOtp) {
    const code = generatePickupCode()
    patch.pickup_code = code
    patch.pickup_code_hash = hashPickupCode(code, orderId)
    patch.pickup_code_issued_at = now
    patch.pickup_verify_attempts = 0
  }

  if (parsed.data.stage === "delivered") {
    patch.pickup_code = null
    patch.pickup_code_hash = null
    patch.pickup_code_issued_at = null
    patch.pickup_verify_attempts = 0
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .select("*")
    .single()
  if (updateError) return dbFail(c, updateError)

  const order = toChatOrder(updated, { includePickupCode: false })
  await syncOrderMessage(supabaseAdmin, order)
  await fanOutOrderUpdate(loaded.row, updated, roleOf)
  return c.json({ data: order })
})

orderRoutes.post("/:orderId/verify-pickup", async (c) => {
  const orderId = uuidParam(c.req.param("orderId"))
  if (!orderId) return fail(c, 400, "VALIDATION_ERROR", "Identificador inválido")

  const parsed = VerifyOrderPickupSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationError(c, parsed.error)

  const userId = c.get("userId")
  const { data: row, error } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle()
  if (error) return dbFail(c, error)
  if (!row) return fail(c, 404, "NOT_FOUND", "Pedido no encontrado")

  const loaded = await loadVisible(supabaseAdmin, row.conversation_id, userId)
  if (loaded.error) return dbFail(c, loaded.error)
  if (!loaded.row || !loaded.role) return fail(c, 404, "NOT_FOUND", "Conversación no encontrada")
  if (loaded.role === "customer" || loaded.role === "member") {
    return fail(c, 403, "FORBIDDEN", "Solo quien atiende puede verificar el retiro")
  }

  if (row.status !== ORDER_STATUS.accepted || row.fulfillment_stage !== ORDER_FULFILLMENT_STAGE.ready) {
    return fail(c, 409, "CONFLICT", "El pedido no está listo para retiro")
  }

  if (!row.pickup_code_hash) {
    return fail(c, 409, "CONFLICT", "Este pedido no requiere código de retiro")
  }

  if ((row.pickup_verify_attempts ?? 0) >= PICKUP_VERIFY_MAX_ATTEMPTS) {
    return fail(c, 409, "CONFLICT", "Demasiados intentos. Espera un momento e inténtalo de nuevo.")
  }

  const ok = verifyPickupCode(parsed.data.code, orderId, row.pickup_code_hash)
  if (!ok) {
    await supabaseAdmin
      .from("orders")
      .update({ pickup_verify_attempts: (row.pickup_verify_attempts ?? 0) + 1 })
      .eq("id", orderId)
    return fail(c, 400, "VALIDATION", "Código incorrecto")
  }

  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      fulfillment_stage: ORDER_FULFILLMENT_STAGE.delivered,
      stage_updated_at: now,
      pickup_code: null,
      pickup_code_hash: null,
      pickup_code_issued_at: null,
      pickup_verify_attempts: 0,
    })
    .eq("id", orderId)
    .select("*")
    .single()
  if (updateError) return dbFail(c, updateError)

  const order = toChatOrder(updated, { includePickupCode: false })
  await syncOrderMessage(supabaseAdmin, order)
  await fanOutOrderUpdate(loaded.row, updated, roleOf)
  return c.json({ data: order })
})

function uuidParam(value: string | undefined) {
  return z.uuid().safeParse(value).success ? value : null
}

function roleOf(
  userId: string,
  row: { customer_id: string; assignee_id: string | null },
  ownerId: string,
): ConversationRole {
  if (row.customer_id === userId) return "customer"
  if (row.assignee_id === userId) return "assignee"
  if (ownerId === userId) return "owner"
  return "member"
}

async function loadVisible(db: Db, id: string, userId: string) {
  const { data, error } = await db.from("conversations").select("*").eq("id", id).maybeSingle()
  if (error) return { error, row: null as ConversationRow | null, role: null as ConversationRole | null }
  if (!data) return { error: null, row: null, role: null }
  const { data: business, error: businessError } = await supabaseAdmin
    .from("businesses")
    .select("owner_id")
    .eq("id", data.business_id)
    .maybeSingle()
  if (businessError) return { error: businessError, row: null, role: null }
  return { error: null, row: data, role: roleOf(userId, data, business?.owner_id ?? "") }
}
