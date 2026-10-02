/**
 * Aplicacion Hono. Aqui se montan middlewares globales y rutas.
 * Fase 1: solo estructura + health check. Los endpoints llegan en Fase 2.
 */

import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"

import { env, isProduction } from "./config/env.js"
import { addressRoutes } from "./routes/addresses.js"
import { menuRoutes, serviceRoutes } from "./routes/catalog.js"
import { catalogTagRoutes } from "./routes/catalog-tags.js"
import { discoverRoutes } from "./routes/discover.js"
import { productRoutes } from "./routes/products.js"
import { businessRoutes } from "./routes/businesses.js"
import { chainRoutes } from "./routes/chains.js"
import { countryRoutes, divisionRoutes } from "./routes/countries.js"
import { eventRoutes } from "./routes/events.js"
import { galleryRoutes } from "./routes/gallery.js"
import { hoursRoutes } from "./routes/hours.js"
import { meRoutes } from "./routes/me.js"
import { messageRoutes } from "./routes/messages.js"
import { orderRoutes } from "./routes/orders.js"
import { teamRoutes } from "./routes/team.js"
import type { AppEnv } from "./types.js"

export const app = new Hono<AppEnv>().basePath("/api")

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

app.route("/me", meRoutes)
app.route("/messages", messageRoutes)
app.route("/orders", orderRoutes)
app.route("/countries", countryRoutes)
app.route("/administrative-divisions", divisionRoutes)
app.route("/addresses", addressRoutes)
app.route("/businesses", businessRoutes)
app.route("/catalog", catalogTagRoutes)
app.route("/discover", discoverRoutes)
app.route("/chains", chainRoutes)
app.route("/businesses/:id/team", teamRoutes)
app.route("/businesses/:id/products", productRoutes)
app.route("/businesses/:id/services", serviceRoutes)
app.route("/businesses/:id/menu", menuRoutes)
app.route("/businesses/:id/gallery", galleryRoutes)
app.route("/businesses/:id/hours", hoursRoutes)
app.route("/businesses/:id/events", eventRoutes)

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
