import { z } from "zod"

/**
 * Variables de entorno del frontend (solo las que empiezan por VITE_ llegan
 * al navegador). Se validan al arrancar para fallar rapido en desarrollo.
 */
const envSchema = z.object({
  VITE_API_URL: z.url().default("http://localhost:3001"),
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_GOOGLE_MAPS_API_KEY: z.string().optional(),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ")
  throw new Error(
    `Variables VITE_* invalidas o faltantes en .env (raiz del monorepo): ${issues}`
  )
}

export const env = parsed.data
