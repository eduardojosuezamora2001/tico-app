import { AssistantChatSchema } from "@workspace/shared"
import { Hono } from "hono"

import { runAssistantChat } from "../lib/assistant-engine.js"
import { fail, validationError } from "../lib/http.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import type { AppEnv } from "../types.js"

export const assistantRoutes = new Hono<AppEnv>()

assistantRoutes.use("*", requireAuth)

assistantRoutes.post("/chat", async (c) => {
  const parsed = AssistantChatSchema.safeParse(await c.req.json())
  if (!parsed.success) return validationError(c, parsed.error)

  try {
    const data = await runAssistantChat(supabaseAdmin, c.get("userId"), parsed.data)
    return c.json({ data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error del asistente"
    console.error("[assistant/chat]", message)
    return fail(c, 500, "ASSISTANT_ERROR", message)
  }
})
