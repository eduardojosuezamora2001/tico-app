import type { SupabaseClient } from "@supabase/supabase-js"
import {
  ReplyMessageSchema,
  SendMessageSchema,
  toConversation,
  toMessage,
  type Conversation,
  type ConversationRole,
  type Database,
  type Message,
} from "@workspace/shared"
import { Hono } from "hono"
import { z } from "zod"

import { dbFail, fail, validationError } from "../lib/http.js"
import { emitToUser } from "../lib/realtime.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

type Db = SupabaseClient<Database>
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"]

export const messageRoutes = new Hono<AppEnv>()

messageRoutes.use("*", requireAuth)

messageRoutes.get("/conversations", async (c) => {
  const { data, error } = await c.get("db").rpc("list_my_conversations")
  if (error) return dbFail(c, error)
  return c.json({ data: (data ?? []).map(toConversation) })
})

messageRoutes.get("/conversations/:id", async (c) => {
  const id = uuidParam(c.req.param("id"))
  if (!id) return fail(c, 400, "VALIDATION_ERROR", "Identificador inválido")

  const loaded = await loadVisible(c.get("db"), id, c.get("userId"))
  if (loaded.error) return dbFail(c, loaded.error)
  if (!loaded.row || !loaded.role) return fail(c, 404, "NOT_FOUND", "Conversación no encontrada")
  if (loaded.role === "member") {
    return fail(c, 403, "FORBIDDEN", "Este hilo lo atiende otra persona.")
  }

  const { data, error } = await c
    .get("db")
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200)
  if (error) return dbFail(c, error)

  if (loaded.role === "customer" || loaded.role === "assignee") {
    await c
      .get("db")
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", id)
      .neq("sender_id", c.get("userId"))
      .eq("is_read", false)
  }

  const conversation = await present(loaded.row, c.get("userId"))
  return c.json({ data: { conversation, messages: (data ?? []).map(toMessage) } })
})

messageRoutes.get("/business/:businessId", async (c) => {
  const businessId = uuidParam(c.req.param("businessId"))
  if (!businessId) return fail(c, 400, "VALIDATION_ERROR", "Identificador inválido")
  const { data, error } = await c
    .get("db")
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("customer_id", c.get("userId"))
    .maybeSingle()
  if (error) return dbFail(c, error)
  return c.json({ data: data ? { id: data.id } : null })
})

messageRoutes.post("/", async (c) => {
  const parsed = SendMessageSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationError(c, parsed.error)

  const userId = c.get("userId")
  const opened = await openOrCreate(c.get("db"), userId, parsed.data.businessId)
  if ("error" in opened) return dbFail(c, opened.error ?? { message: "No se pudo abrir el chat" })

  const sent = await insertMessage(c.get("db"), {
    businessId: opened.row.business_id,
    conversationId: opened.row.id,
    senderId: userId,
    receiverId: opened.row.assignee_id,
    text: parsed.data.text,
  })
  if (sent.error || !sent.message) return dbFail(c, sent.error ?? { message: "No se pudo enviar" })

  const fresh = (await reload(c.get("db"), opened.row.id)) ?? opened.row
  const conversation = await present(fresh, userId)
  await fanOut(fresh, sent.message)
  return c.json({ data: { message: sent.message, conversation } }, 201)
})

messageRoutes.post("/conversations/:id/reply", async (c) => {
  const id = uuidParam(c.req.param("id"))
  if (!id) return fail(c, 400, "VALIDATION_ERROR", "Identificador inválido")
  const parsed = ReplyMessageSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationError(c, parsed.error)

  const userId = c.get("userId")
  const loaded = await loadVisible(c.get("db"), id, userId)
  if (loaded.error) return dbFail(c, loaded.error)
  if (!loaded.row) return fail(c, 404, "NOT_FOUND", "Conversación no encontrada")
  if (loaded.row.assignee_id !== userId) {
    return fail(c, 403, "FORBIDDEN", "Solo quien atiende puede responder.")
  }

  const sent = await insertMessage(c.get("db"), {
    businessId: loaded.row.business_id,
    conversationId: loaded.row.id,
    senderId: userId,
    receiverId: loaded.row.customer_id,
    text: parsed.data.text,
  })
  if (sent.error || !sent.message) return dbFail(c, sent.error ?? { message: "No se pudo enviar" })

  const fresh = (await reload(c.get("db"), id)) ?? loaded.row
  const conversation = await present(fresh, userId)
  await fanOut(fresh, sent.message)
  return c.json({ data: { message: sent.message, conversation } }, 201)
})

messageRoutes.post("/conversations/:id/claim", async (c) => {
  const id = uuidParam(c.req.param("id"))
  if (!id) return fail(c, 400, "VALIDATION_ERROR", "Identificador inválido")
  const userId = c.get("userId")
  const loaded = await loadVisible(c.get("db"), id, userId)
  if (loaded.error) return dbFail(c, loaded.error)
  if (!loaded.row || !loaded.role) return fail(c, 404, "NOT_FOUND", "Conversación no encontrada")
  if (loaded.role === "customer") return fail(c, 403, "FORBIDDEN", "El cliente no atiende el chat.")

  const { data, error } = await c
    .get("db")
    .from("conversations")
    .update({ assignee_id: userId, status: "open" })
    .eq("id", id)
    .is("assignee_id", null)
    .select("*")
  if (error) return dbFail(c, error)
  const row = data?.[0]
  if (!row) return fail(c, 409, "CONFLICT", "Otro miembro ya atendió este chat.")

  const conversation = await present(row, userId)
  await fanOut(row)
  return c.json({ data: conversation })
})

messageRoutes.post("/conversations/:id/take", async (c) => {
  const id = uuidParam(c.req.param("id"))
  if (!id) return fail(c, 400, "VALIDATION_ERROR", "Identificador inválido")
  const userId = c.get("userId")
  const loaded = await loadVisible(c.get("db"), id, userId)
  if (loaded.error) return dbFail(c, loaded.error)
  if (!loaded.row || !loaded.role) return fail(c, 404, "NOT_FOUND", "Conversación no encontrada")
  if (loaded.role === "customer") return fail(c, 403, "FORBIDDEN", "El cliente no puede tomar el chat.")

  const { data, error } = await c
    .get("db")
    .from("conversations")
    .update({ assignee_id: userId, status: "open" })
    .eq("id", id)
    .select("*")
  if (error) return dbFail(c, error)
  const row = data?.[0]
  if (!row) return fail(c, 403, "FORBIDDEN", "No puedes tomar este chat.")

  const conversation = await present(row, userId)
  await fanOut(row)
  return c.json({ data: conversation })
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
  if (error) return { error, row: null, role: null as ConversationRole | null }
  if (!data) return { error: null, row: null, role: null }
  const { data: business, error: businessError } = await supabaseAdmin
    .from("businesses")
    .select("owner_id")
    .eq("id", data.business_id)
    .maybeSingle()
  if (businessError) return { error: businessError, row: null, role: null }
  return { error: null, row: data, role: roleOf(userId, data, business?.owner_id ?? "") }
}

async function openOrCreate(db: Db, userId: string, businessId: string) {
  const existing = await db
    .from("conversations")
    .select("*")
    .eq("business_id", businessId)
    .eq("customer_id", userId)
    .maybeSingle()
  if (existing.error) return { error: existing.error }
  if (existing.data) return { row: existing.data }

  const created = await db
    .from("conversations")
    .insert({ business_id: businessId, customer_id: userId })
    .select("*")
    .maybeSingle()
  if (created.error?.code === "23505") {
    const again = await db
      .from("conversations")
      .select("*")
      .eq("business_id", businessId)
      .eq("customer_id", userId)
      .maybeSingle()
    if (again.error) return { error: again.error }
    if (!again.data) return { error: created.error ?? { message: "No se pudo abrir el chat" } }
    return { row: again.data }
  }
  if (created.error || !created.data) return { error: created.error ?? { message: "No se pudo abrir el chat" } }
  return { row: created.data }
}

async function insertMessage(
  db: Db,
  input: { businessId: string; conversationId: string; senderId: string; receiverId: string | null; text: string },
) {
  const { data, error } = await db
    .from("messages")
    .insert({
      business_id: input.businessId,
      conversation_id: input.conversationId,
      sender_id: input.senderId,
      receiver_id: input.receiverId,
      text: input.text,
    })
    .select("*")
    .single()
  if (error || !data) return { error: error ?? { message: "No se pudo enviar" }, message: null }
  return { error: null, message: toMessage(data) }
}

async function reload(db: Db, id: string) {
  const { data } = await db.from("conversations").select("*").eq("id", id).maybeSingle()
  return data
}

async function snapshot(row: ConversationRow) {
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("name, slug, owner_id")
    .eq("id", row.business_id)
    .maybeSingle()
  const ids = [row.customer_id, ...(row.assignee_id ? [row.assignee_id] : [])]
  const { data: people } = await supabaseAdmin.from("users").select("id, full_name").in("id", ids)
  const nameOf = (id: string | null) => people?.find((person) => person.id === id)?.full_name ?? null
  const { data: members } = await supabaseAdmin
    .from("business_users")
    .select("user_id")
    .eq("business_id", row.business_id)
    .eq("is_active", true)
  return {
    ownerId: business?.owner_id ?? "",
    targets: new Set<string>([row.customer_id, ...(members ?? []).map((member) => member.user_id)]),
    base: {
      id: row.id,
      businessId: row.business_id,
      businessName: business?.name ?? "",
      businessSlug: business?.slug ?? "",
      customerId: row.customer_id,
      customerName: nameOf(row.customer_id),
      assigneeId: row.assignee_id,
      assigneeName: row.assignee_id ? nameOf(row.assignee_id) : null,
      status: row.status === "open" ? "open" : "waiting",
      lastText: row.last_text,
      lastAt: row.last_at,
      unreadCount: 0,
    } satisfies Omit<Conversation, "viewerRole">,
  }
}

async function present(row: ConversationRow, userId: string): Promise<Conversation> {
  const view = await snapshot(row)
  return { ...view.base, viewerRole: roleOf(userId, row, view.ownerId) }
}

async function fanOut(row: ConversationRow, message?: Message) {
  const view = await snapshot(row)
  for (const userId of view.targets) {
    const conversation: Conversation = { ...view.base, viewerRole: roleOf(userId, row, view.ownerId) }
    if (message) emitToUser(userId, "message:new", { message, conversation })
    else emitToUser(userId, "conversation:updated", conversation)
  }
}
