import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@workspace/shared"

export type AppEnv = {
  Variables: {
    userId: string
    accessToken: string
    db: SupabaseClient<Database>
  }
}
