/**
 * Carga y valida las variables de entorno del backend.
 *
 * El `.env` vive en la raiz del monorepo y se comparte con `apps/web`.
 * Falla rapido al arrancar si falta algo obligatorio.
 */

import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { config as loadDotenv } from "dotenv"
import { z } from "zod"

// apps/api/src/config -> raiz del monorepo
const monorepoRoot = resolve(fileURLToPath(import.meta.url), "../../../../..")
loadDotenv({ path: resolve(monorepoRoot, ".env"), quiet: true })

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  /** Solo backend. Bypassa RLS: nunca enviarla al cliente. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Integraciones de fases posteriores (opcionales en Fase 1).
  REDIS_URL: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n")
    throw new Error(
      `Variables de entorno invalidas o faltantes (revisa .env en la raiz):\n${issues}`
    )
  }
  return parsed.data
}

export const env = loadEnv()

export const isProduction = env.NODE_ENV === "production"
