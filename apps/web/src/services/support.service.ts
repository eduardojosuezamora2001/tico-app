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
  if (!data?.threadId || !data.message?.id) {
    throw new Error("Respuesta vacía de soporte")
  }
  return {
    threadId: data.threadId,
    message: {
      id: data.message.id,
      threadId: data.message.threadId ?? data.threadId,
      senderId: data.message.senderId,
      body: data.message.body,
      isRead: Boolean(data.message.isRead),
      createdAt: data.message.createdAt,
    } satisfies SupportMessage,
  }
}

/** Une mensajes por id (envío local + realtime / refetch). */
export function upsertSupportMessage(list: SupportMessage[], next: SupportMessage) {
  if (list.some((item) => item.id === next.id)) return list
  return [...list, next].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
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

  const threads = (data ?? []).map((row) => {
    const userRaw = row.users as unknown as
      | { email: string; full_name: string | null }
      | { email: string; full_name: string | null }[]
      | null
    const user = Array.isArray(userRaw) ? userRaw[0] : userRaw
    return {
      ...mapThread(row),
      userEmail: user?.email ?? null,
      userName: user?.full_name ?? null,
      unreadCount: 0,
    } satisfies SupportThread
  })

  if (threads.length === 0) return threads

  const { data: unreadRows, error: unreadError } = await supabase
    .from("support_messages")
    .select("thread_id, sender_id")
    .eq("is_read", false)
    .in(
      "thread_id",
      threads.map((thread) => thread.id),
    )
  if (unreadError) throw unreadError

  const unreadByThread = new Map<string, number>()
  for (const row of unreadRows ?? []) {
    const thread = threads.find((item) => item.id === row.thread_id)
    if (!thread || row.sender_id !== thread.userId) continue
    unreadByThread.set(row.thread_id, (unreadByThread.get(row.thread_id) ?? 0) + 1)
  }

  return threads.map((thread) => ({
    ...thread,
    unreadCount: unreadByThread.get(thread.id) ?? 0,
  }))
}

/** Total de mensajes de usuarios aún no leídos por soporte. */
export async function countSupportUnreadForAdmin() {
  const threads = await listSupportThreadsForAdmin()
  return threads.reduce((sum, thread) => sum + (thread.unreadCount ?? 0), 0)
}

/** Marca como leídos los mensajes del usuario en el hilo (vista admin). */
export async function markSupportThreadRead(threadId: string, userId: string) {
  const { error } = await supabase
    .from("support_messages")
    .update({ is_read: true })
    .eq("thread_id", threadId)
    .eq("sender_id", userId)
    .eq("is_read", false)
  if (error) throw error
}

/** No leídos del usuario: respuestas de soporte (sender ≠ yo). */
export async function countMySupportUnread() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  const thread = await getMySupportThread()
  if (!thread) return 0

  const { count, error } = await supabase
    .from("support_messages")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", thread.id)
    .eq("is_read", false)
    .neq("sender_id", user.id)
  if (error) throw error
  return count ?? 0
}

/** Marca como leídas las respuestas del equipo en el hilo del usuario. */
export async function markMySupportRepliesRead(threadId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from("support_messages")
    .update({ is_read: true })
    .eq("thread_id", threadId)
    .neq("sender_id", user.id)
    .eq("is_read", false)
  if (error) throw error
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
