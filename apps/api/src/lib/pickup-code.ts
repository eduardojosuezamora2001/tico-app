import { createHash, randomInt, timingSafeEqual } from "node:crypto"

import { env } from "../config/env.js"

export function generatePickupCode(): string {
  return String(randomInt(1000, 10000))
}

export function hashPickupCode(code: string, orderId: string): string {
  return createHash("sha256")
    .update(`${env.PICKUP_CODE_PEPPER}:${orderId}:${code}`)
    .digest("hex")
}

export function verifyPickupCode(code: string, orderId: string, storedHash: string | null): boolean {
  if (!storedHash) return false
  const computed = hashPickupCode(code, orderId)
  try {
    return timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(storedHash, "utf8"))
  } catch {
    return false
  }
}

export const PICKUP_VERIFY_MAX_ATTEMPTS = 5
