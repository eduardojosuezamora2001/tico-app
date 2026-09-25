import { createServer } from "node:http"
import { createClient } from "redis"
import { Server } from "socket.io"
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
})

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
