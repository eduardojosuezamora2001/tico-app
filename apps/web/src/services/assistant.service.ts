import type { AssistantChatResponse, AssistantMessage, AssistantThread } from "@workspace/shared"

import { api, getApiErrorMessage } from "@/lib/api"
import { supabase } from "@/lib/supabase"

export async function sendAssistantMessage(input: {
  threadId?: string
  message: string
  latitude?: number
  longitude?: number
}) {
  try {
    const response = await api.post<{ data: AssistantChatResponse }>("/assistant/chat", input, {
      timeout: 90_000,
    })
    return response.data.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "No se pudo consultar al asistente."))
  }
}

export async function listAssistantThreads(limit = 10) {
  const { data, error } = await supabase
    .from("assistant_threads")
    .select("id, user_id, title, last_at, created_at")
    .order("last_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(
    (row): AssistantThread => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      lastAt: row.last_at,
      createdAt: row.created_at,
    }),
  )
}

export async function listAssistantMessages(threadId: string) {
  const { data, error } = await supabase
    .from("assistant_messages")
    .select("id, thread_id, role, content, metadata, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(100)
  if (error) throw error
  return (data ?? []).map(
    (row): AssistantMessage => ({
      id: row.id,
      threadId: row.thread_id,
      role: row.role as AssistantMessage["role"],
      content: row.content,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at,
    }),
  )
}
