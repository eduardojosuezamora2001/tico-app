import type { Context } from "hono"
import type { ZodError } from "zod"

export function fail(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 500,
  code: string,
  message: string
) {
  return c.json({ error: { code, message } }, status)
}

export function validationError(c: Context, error: ZodError) {
  return fail(c, 400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Datos invalidos")
}

export function dbFail(c: Context, error: { code?: string; message: string }) {
  if (error.code === "42501") return fail(c, 403, "FORBIDDEN", "No tienes permiso para esto")
  if (error.code === "23505") return fail(c, 409, "CONFLICT", "Ese dato ya existe")
  if (error.code === "PGRST116") return fail(c, 404, "NOT_FOUND", "No encontrado")
  console.error(error)
  return fail(c, 400, "DB_ERROR", "No se pudo completar la operacion")
}
