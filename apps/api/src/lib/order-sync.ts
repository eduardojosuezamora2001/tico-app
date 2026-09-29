import type { SupabaseClient } from "@supabase/supabase-js"
import {
  encodeOrderMessage,
  toChatOrder,
  toMessage,
  type ChatOrder,
  type Conversation,
  type Database,
  type Message,
} from "@workspace/shared"

import { emitToUser } from "./realtime.js"
import { supabaseAdmin } from "./supabase.js"

type Db = SupabaseClient<Database>
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"]

export async function syncOrderMessage(db: Db, order: ChatOrder) {
  const { error } = await db
    .from("messages")
    .update({ text: encodeOrderMessage(order) })
    .eq("id", order.messageId)
  if (error) throw error
}

export async function loadConversationOrders(db: Db, conversationId: string) {
  const { data, error } = await db
    .from("orders")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []).map(toChatOrder)
}

export async function fanOutOrderUpdate(
  row: ConversationRow,
  order: ChatOrder,
  roleOf: (userId: string, row: ConversationRow, ownerId: string) => Conversation["viewerRole"],
) {
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

  const ownerId = business?.owner_id ?? ""
  const targets = new Set<string>([row.customer_id, ...(members ?? []).map((member) => member.user_id)])
  const base = {
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
  } satisfies Omit<Conversation, "viewerRole">

  const { data: messageRow } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("id", order.messageId)
    .maybeSingle()
  const message: Message | null = messageRow ? toMessage(messageRow) : null

  for (const userId of targets) {
    const conversation: Conversation = { ...base, viewerRole: roleOf(userId, row, ownerId) }
    emitToUser(userId, "order:updated", { order, message, conversation })
    if (message) emitToUser(userId, "message:updated", { message, conversation })
  }
}
