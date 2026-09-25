import { io, type Socket } from "socket.io-client"

import { env } from "@/lib/env"
import { supabase } from "@/lib/supabase"

let socket: Socket | null = null

function socketToken(current: Socket) {
  const auth = current.auth
  if (auth && typeof auth === "object" && "token" in auth) return String(auth.token)
  return undefined
}

export async function chatSocket(): Promise<Socket | null> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    socket?.disconnect()
    socket = null
    return null
  }
  if (socket?.connected && socketToken(socket) === token) return socket
  socket?.disconnect()
  socket = io(env.VITE_API_URL, { auth: { token } })
  return socket
}
