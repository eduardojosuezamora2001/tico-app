import type { Server } from "socket.io"

import { supabaseAdmin } from "./supabase.js"

let io: Server | null = null

export function setIo(server: Server) {
  io = server
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload)
}

export async function socketUserId(token: unknown): Promise<string | null> {
  if (typeof token !== "string" || token.length === 0) return null
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}
