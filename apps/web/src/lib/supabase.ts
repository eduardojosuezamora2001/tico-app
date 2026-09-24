import { createClient } from "@supabase/supabase-js"
import type { Database } from "@workspace/shared"

import { env } from "@/lib/env"

/**
 * Cliente de Supabase para el navegador (publishable key, RLS aplica).
 * La sesion se persiste en localStorage y se refresca automaticamente.
 */
export const supabase = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  }
)
