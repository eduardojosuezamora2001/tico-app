import { SendMessageSchema, toConversation, toMessage } from "@workspace/shared"
import { Hono } from "hono"
import { z } from "zod"

import { dbFail, fail, validationError } from "../lib/http.js"
import { emitToUser } from "../lib/realtime.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

export const messageRoutes = new Hono<AppEnv>()

messageRoutes.use("*", requireAuth)

messageRoutes.get("/conversations", async (c) => {
  const { data, error } = await c.get("db").rpc("list_my_conversations")
  if (error) return dbFail(c, error)
  return c.json({ data: (data ?? []).map(toConversation) })
})

messageRoutes.get("/conversations/:businessId/:peerId", async (c) => {
  const businessId = c.req.param("businessId")
  const peerId = c.req.param("peerId")
  if (!z.uuid().safeParse(businessId).success || !z.uuid().safeParse(peerId).success) {
    return fail(c, 400, "VALIDATION_ERROR", "Identificador invalido")
  }
  const userId = c.get("userId")
  const { data, error } = await c
    .get("db")
    .from("messages")
    .select("*")
    .eq("business_id", businessId)
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${userId})`,
    )
    .order("created_at", { ascending: true })
    .limit(100)
  if (error) return dbFail(c, error)

  await c
    .get("db")
    .from("messages")
    .update({ is_read: true })
    .eq("business_id", businessId)
    .eq("sender_id", peerId)
    .eq("receiver_id", userId)
    .eq("is_read", false)

  return c.json({ data: (data ?? []).map(toMessage) })
})

messageRoutes.post("/", async (c) => {
  const parsed = SendMessageSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return validationError(c, parsed.error)

  const userId = c.get("userId")
  if (parsed.data.receiverId === userId) {
    return fail(c, 400, "VALIDATION_ERROR", "No puedes escribirte a ti mismo")
  }

  const { data, error } = await c
    .get("db")
    .from("messages")
    .insert({
      business_id: parsed.data.businessId,
      receiver_id: parsed.data.receiverId,
      sender_id: userId,
      text: parsed.data.text,
    })
    .select("*")
    .single()
  if (error) return dbFail(c, error)

  const message = toMessage(data)
  emitToUser(parsed.data.receiverId, "message:new", message)
  emitToUser(userId, "message:new", message)
  return c.json({ data: message }, 201)
})
