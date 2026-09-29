/** Códigos telefónicos por país ISO (onboarding CR/CO/MX). */
export const COUNTRY_PHONE_CODES: Record<string, string> = {
  CR: "+506",
  CO: "+57",
  MX: "+52",
}

/** Normaliza entradas locales a E.164 (p. ej. 88887777 → +50688887777). */
export function normalizePhoneToE164(
  value: string,
  defaultDialCode = "+506",
): string {
  const trimmed = value.trim()
  const digitsOnly = trimmed.replace(/\D/g, "")
  if (!digitsOnly) return ""

  if (trimmed.startsWith("+")) return `+${digitsOnly}`

  const dialDigits = defaultDialCode.replace(/\D/g, "")
  if (digitsOnly.startsWith(dialDigits)) return `+${digitsOnly}`

  return `${defaultDialCode}${digitsOnly}`
}

/** Agrega https:// cuando el usuario omite el esquema. */
export function normalizeHttpUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
