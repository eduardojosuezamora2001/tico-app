import {
  ORDER_FULFILLMENT_STAGE,
  ORDER_STATUS,
  OrderStageSchema,
  nextFulfillmentStage,
  toChatOrder,
  toOrderListItem,
  type ConversationRole,
  type Database,
} from "@workspace/shared"
import type { SupabaseClient } from "@supabase/supabase-js"
import { Hono } from "hono"
import { z } from "zod"

import { fanOutOrderUpdate, syncOrderMessage } from "../lib/order-sync.js"
import { dbFail, fail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

type Db = SupabaseClient<Database>
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"]

export const orderRoutes = new Hono<AppEnv>()

orderRoutes.use("*", requireAuth)

orderRoutes.get("/", async (c) => {
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
  return c.json({ data: (data ?? []).map(toOrderListItem) })
})

orderRoutes.get("/conversations/:conversationId", async (c) => {
  const conversationId = uuidParam(c.req.param("conversationId"))
  if (!conversationId) return fail(c, 400, "VALIDATION_ERROR", "Identificador inválido")

  const loaded = await loadVisible(c.get("db"), conversationId, c.get("userId"))
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
  return c.json({ data: (data ?? []).map(toChatOrder) })
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

  const now = new Date().toISOString()
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      fulfillment_stage: parsed.data.stage,
      stage_updated_at: now,
    })
    .eq("id", orderId)
    .select("*")
    .single()
  if (updateError) return dbFail(c, updateError)

  const order = toChatOrder(updated)
  await syncOrderMessage(supabaseAdmin, order)
  await fanOutOrderUpdate(loaded.row, order, roleOf)
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
