import { createServer } from "node:http"
import { createClient } from "redis"
import { Server, type Socket } from "socket.io"
import { createAdapter } from "@socket.io/redis-adapter"
import { getRequestListener } from "@hono/node-server"

import { app } from "./app.js"
import { env } from "./config/env.js"
import { setIo, socketUserId } from "./lib/realtime.js"
import { supabaseAdmin } from "./lib/supabase.js"

const server = createServer(getRequestListener(app.fetch))
const io = new Server(server, {
  cors: { origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()) },
})

io.use(async (socket, next) => {
  const userId = await socketUserId(socket.handshake.auth.token)
  if (!userId) {
    next(new Error("unauthorized"))
    return
  }
  socket.data.userId = userId
  next()
})

io.on("connection", (socket) => {
  const userId = socket.data.userId as string
  void socket.join(`user:${userId}`)
  void watchPresence(socket, userId)
})

async function watchPresence(socket: Socket, userId: string) {
  const businessIds: string[] = []
  const staffIds = new Set<string>()

  const publishOffline = () => {
    void io.in(`user:${userId}`).fetchSockets().then((sockets) => {
      if (sockets.length > 0) return
      for (const businessId of businessIds) {
        if (!staffIds.has(businessId)) continue
        io.to(`business:${businessId}`).emit("presence", { userId, online: false })
      }
    })
  }

  const publishState = async () => {
    const online = new Set<string>()
    for (const businessId of businessIds) {
      const sockets = await io.in(`business:${businessId}`).fetchSockets()
      for (const peer of sockets) {
        const id = peer.data.userId
        if (typeof id === "string") online.add(id)
      }
    }
    socket.emit("presence:state", { userIds: [...online] })
  }

  socket.on("disconnect", publishOffline)
  socket.on("presence:hello", () => {
    void publishState()
  })

  const [{ data: memberships }, { data: threads }] = await Promise.all([
    supabaseAdmin.from("business_users").select("business_id").eq("user_id", userId).eq("is_active", true),
    supabaseAdmin.from("conversations").select("business_id").eq("customer_id", userId),
  ])
  for (const row of memberships ?? []) staffIds.add(row.business_id)
  const ids = new Set<string>([...staffIds, ...(threads ?? []).map((row) => row.business_id)])
  for (const businessId of ids) {
    businessIds.push(businessId)
    await socket.join(`business:${businessId}`)
    if (staffIds.has(businessId)) io.to(`business:${businessId}`).emit("presence", { userId, online: true })
  }
  if (socket.connected) await publishState()
}

setIo(io)

if (env.REDIS_URL) {
  const pub = createClient({
    url: env.REDIS_URL,
    socket: { connectTimeout: 5_000 },
  })
  const sub = pub.duplicate()
  void Promise.all([pub.connect(), sub.connect()])
    .then(() => {
      io.adapter(createAdapter(pub, sub))
      console.log("Socket.io usando Redis")
    })
    .catch((error: unknown) => {
      console.error("Redis no disponible; el chat queda en este proceso", error)
    })
}

const hourMs = 60 * 60 * 1000
setInterval(() => {
  void supabaseAdmin.rpc("purge_expired_messages").then(({ error }) => {
    if (error) console.error("No se pudo aplicar la retencion del chat", error.message)
  })
}, hourMs)

server.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}/api`)
})
