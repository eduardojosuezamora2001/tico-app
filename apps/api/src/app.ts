/**
 * Aplicacion Hono. Aqui se montan middlewares globales y rutas.
 * Fase 1: solo estructura + health check. Los endpoints llegan en Fase 2.
 */

import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"

import { env, isProduction } from "./config/env.js"

export const app = new Hono().basePath("/api")

app.use(secureHeaders())
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  })
)
if (!isProduction) {
  app.use(logger())
}

app.get("/", (c) =>
  c.json({ name: "Plaza de Comercios Digital API", version: "0.0.1" })
)

app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
)

app.notFound((c) =>
  c.json({ error: { code: "NOT_FOUND", message: "Recurso no encontrado" } }, 404)
)

app.onError((err, c) => {
  console.error(err)
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "Error interno del servidor" } },
    500
  )
})

export type AppType = typeof app
