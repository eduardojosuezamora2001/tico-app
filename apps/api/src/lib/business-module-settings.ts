import {
  MODULES,
  isPickupOtpEnabled,
  toBusinessModule,
  type Database,
  type ModuleName,
} from "@workspace/shared"
import type { SupabaseClient } from "@supabase/supabase-js"

import { supabaseAdmin } from "./supabase.js"

type Db = SupabaseClient<Database>

export async function loadBusinessModule(db: Db, businessId: string, moduleName: ModuleName) {
  const { data, error } = await db
    .from("business_modules")
    .select("*")
    .eq("business_id", businessId)
    .eq("module_name", moduleName)
    .maybeSingle()
  if (error) throw error
  return data ? toBusinessModule(data) : null
}

export async function isBusinessPickupOtpEnabled(businessId: string) {
  const mod = await loadBusinessModule(supabaseAdmin, businessId, MODULES.PRODUCTS)
  return isPickupOtpEnabled(mod)
}
