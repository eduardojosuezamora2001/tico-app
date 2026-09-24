/**
 * Clientes de Supabase para el backend.
 *
 * - `supabaseAdmin`: service_role. Bypassa RLS. Usar solo para operaciones del
 *   sistema (bitacora, retencion de chat, tareas admin) tras autorizar en la API.
 * - `createUserClient(accessToken)`: cliente que actua en nombre del usuario
 *   autenticado; RLS aplica con su identidad. Preferirlo en endpoints normales.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@workspace/shared"

import { env } from "../config/env.js"

export type TypedSupabaseClient = SupabaseClient<Database>

export const supabaseAdmin: TypedSupabaseClient = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

export function createUserClient(accessToken: string): TypedSupabaseClient {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
