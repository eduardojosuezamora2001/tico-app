import type { SupportMessage, SupportThread } from "@workspace/shared"

import { supabase } from "@/lib/supabase"

export async function sendSupportMessage(input: {
  threadId?: string
  message: string
  closeThread?: boolean
}) {
  const { data, error } = await supabase.functions.invoke<{
    threadId: string
    message: SupportMessage
  }>("support-send", { body: input })
  if (error) throw error
  if (!data) throw new Error("Respuesta vacía de soporte")
  return data
}

export async function getMySupportThread() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("support_threads")
    .select("id, user_id, status, assignee_admin_id, last_text, last_at")
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return mapThread(data)
}

export async function listSupportMessages(threadId: string) {
  const { data, error } = await supabase
    .from("support_messages")
    .select("id, thread_id, sender_id, body, is_read, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(200)
  if (error) throw error
  return (data ?? []).map(mapMessage)
}

export async function listSupportThreadsForAdmin() {
  const { data, error } = await supabase
    .from("support_threads")
    .select(
      "id, user_id, status, assignee_admin_id, last_text, last_at, users!support_threads_user_id_fkey(email, full_name)",
    )
    .order("last_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []).map((row) => {
    const userRaw = row.users as { email: string; full_name: string | null } | { email: string; full_name: string | null }[] | null
    const user = Array.isArray(userRaw) ? userRaw[0] : userRaw
    return {
      ...mapThread(row),
      userEmail: user?.email ?? null,
      userName: user?.full_name ?? null,
    } satisfies SupportThread
  })
}

function mapThread(row: {
  id: string
  user_id: string
  status: string
  assignee_admin_id: string | null
  last_text: string | null
  last_at: string
}): SupportThread {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status as SupportThread["status"],
    assigneeAdminId: row.assignee_admin_id,
    lastText: row.last_text,
    lastAt: row.last_at,
  }
}

function mapMessage(row: {
  id: string
  thread_id: string
  sender_id: string
  body: string
  is_read: boolean
  created_at: string
}): SupportMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    body: row.body,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}
