import { serviceClient, userClient } from "../_shared/client.ts"
import { jsonResponse, optionsResponse } from "../_shared/cors.ts"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse()
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405)

  try {
    const authHeader = req.headers.get("Authorization")
    const userDb = userClient(authHeader)
    const {
      data: { user },
      error: authError,
    } = await userDb.auth.getUser()
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401)

    const body = await req.json()
    const text = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : ""
    if (!text) return jsonResponse({ error: "Mensaje vacío" }, 400)

    const db = serviceClient()
    const { data: profile } = await db.from("users").select("role").eq("id", user.id).maybeSingle()
    const isAdmin = profile?.role === "admin"

    let threadId = typeof body.threadId === "string" ? body.threadId : undefined

    if (isAdmin && threadId) {
      const { data: thread } = await db.from("support_threads").select("id").eq("id", threadId).maybeSingle()
      if (!thread) return jsonResponse({ error: "Hilo no encontrado" }, 404)
    } else if (!isAdmin) {
      const { data: own } = await db
        .from("support_threads")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
      threadId = own?.id
      if (!threadId) {
        const { data: created, error: createError } = await db
          .from("support_threads")
          .insert({
            user_id: user.id,
            status: "open",
            last_text: text,
            last_at: new Date().toISOString(),
          })
          .select("id")
          .single()
        if (createError) return jsonResponse({ error: createError.message }, 500)
        threadId = created.id
      }
    } else {
      return jsonResponse({ error: "threadId requerido para admin" }, 400)
    }

    const { data: msg, error: msgError } = await db
      .from("support_messages")
      .insert({
        thread_id: threadId,
        sender_id: user.id,
        body: text,
        is_read: false,
      })
      .select("id, thread_id, sender_id, body, is_read, created_at")
      .single()
    if (msgError) return jsonResponse({ error: msgError.message }, 500)

    const patch: Record<string, unknown> = {
      last_text: text,
      last_at: new Date().toISOString(),
      status: "open",
    }
    if (isAdmin) {
      patch.assignee_admin_id = user.id
      patch.status = "assigned"
    }
    if (body.closeThread === true && isAdmin) {
      patch.status = "closed"
    }

    await db.from("support_threads").update(patch).eq("id", threadId)

    return jsonResponse({
      threadId,
      message: {
        id: msg.id,
        threadId: msg.thread_id,
        senderId: msg.sender_id,
        body: msg.body,
        isRead: msg.is_read,
        createdAt: msg.created_at,
      },
    })
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Support send failed" },
      500,
    )
  }
})
