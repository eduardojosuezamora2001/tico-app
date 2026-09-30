import {
  ORDER_FULFILLMENT_STAGE,
  ORDER_STATUS,
  type Database,
} from "@workspace/shared"

import { isBusinessPickupOtpEnabled } from "./business-module-settings.js"
import { generatePickupCode, hashPickupCode } from "./pickup-code.js"
import { supabaseAdmin } from "./supabase.js"

type OrderRow = Database["public"]["Tables"]["orders"]["Row"]

/** Emite código si el pedido está listo, OTP activo y aún no hay código (p. ej. listo antes de activar OTP). */
export async function ensureOrderPickupCode(row: OrderRow): Promise<OrderRow> {
  if (row.status !== ORDER_STATUS.accepted || row.fulfillment_stage !== ORDER_FULFILLMENT_STAGE.ready) {
    return row
  }
  if (row.pickup_code && row.pickup_code_hash) return row

  const otpOn = await isBusinessPickupOtpEnabled(row.business_id)
  if (!otpOn) return row

  const code = generatePickupCode()
  const now = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({
      pickup_code: code,
      pickup_code_hash: hashPickupCode(code, row.id),
      pickup_code_issued_at: row.pickup_code_issued_at ?? now,
      pickup_verify_attempts: 0,
    })
    .eq("id", row.id)
    .select("*")
    .single()

  if (error || !data) return row
  return data
}

export async function ensureOrderPickupCodes(rows: OrderRow[], forCustomerId: string) {
  return Promise.all(
    rows.map(async (row) => (row.customer_id === forCustomerId ? ensureOrderPickupCode(row) : row)),
  )
}
