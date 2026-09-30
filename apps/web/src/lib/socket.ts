import { io, type Socket } from "socket.io-client"

import { env } from "@/lib/env"
import { supabase } from "@/lib/supabase"

let socket: Socket | null = null
let opening: Promise<Socket | null> | null = null

function socketToken(current: Socket) {
  const auth = current.auth
  if (auth && typeof auth === "object" && "token" in auth) return String(auth.token)
  return undefined
}

async function accessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function openSocket(): Promise<Socket | null> {
  const token = await accessToken()
  if (!token) {
    socket?.disconnect()
    socket = null
    return null
  }

  if (!socket) {
    socket = io(env.VITE_API_URL, { auth: { token } })
    return socket
  }

  if (socketToken(socket) !== token) {
    socket.auth = { token }
    socket.disconnect()
    socket.connect()
  } else if (!socket.connected) {
    socket.connect()
  }

  return socket
}

/** Una sola conexión compartida. No reemplaza el socket: los listeners sobreviven reconexiones y renovación de token. */
export function chatSocket(): Promise<Socket | null> {
  if (!opening) {
    opening = openSocket().finally(() => {
      opening = null
    })
  }
  return opening
}
