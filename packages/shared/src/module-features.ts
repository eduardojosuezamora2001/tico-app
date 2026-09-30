import { z } from "zod"

import { MODULES } from "./constants.js"
import type { ModuleName } from "./types.js"

export const MODULE_FEATURE_KEYS = {
  [MODULES.PRODUCTS]: {
    PICKUP_OTP: "pickup_otp",
  },
  [MODULES.SERVICES]: {},
  [MODULES.MENU]: {},
  [MODULES.APPOINTMENTS]: {},
} as const

export type ProductsModuleFeatureKey =
  (typeof MODULE_FEATURE_KEYS)[typeof MODULES.PRODUCTS][keyof (typeof MODULE_FEATURE_KEYS)[typeof MODULES.PRODUCTS]]

export const ProductsModuleSettingsSchema = z.object({
  pickup_otp: z.boolean().optional(),
})

export const ServicesModuleSettingsSchema = z.object({})
export const MenuModuleSettingsSchema = z.object({})
export const AppointmentsModuleSettingsSchema = z.object({})

export type ProductsModuleSettings = z.infer<typeof ProductsModuleSettingsSchema>
export type ModuleSettings = ProductsModuleSettings | Record<string, never>

const settingsByModule: Record<ModuleName, z.ZodType<Record<string, unknown>>> = {
  [MODULES.PRODUCTS]: ProductsModuleSettingsSchema,
  [MODULES.SERVICES]: ServicesModuleSettingsSchema,
  [MODULES.MENU]: MenuModuleSettingsSchema,
  [MODULES.APPOINTMENTS]: AppointmentsModuleSettingsSchema,
}

export function parseModuleSettings(moduleName: ModuleName, raw: unknown): Record<string, unknown> {
  const schema = settingsByModule[moduleName]
  const parsed = schema.safeParse(raw ?? {})
  if (!parsed.success) return {}
  return parsed.data
}

export function mergeModuleSettings(
  moduleName: ModuleName,
  current: unknown,
  patch: unknown,
): Record<string, unknown> {
  const base = parseModuleSettings(moduleName, current)
  const next = parseModuleSettings(moduleName, { ...base, ...(patch as object) })
  return next
}

export function isPickupOtpEnabled(
  module:
    | { moduleName: ModuleName; enabled: boolean; settings?: unknown }
    | null
    | undefined,
) {
  if (!module || module.moduleName !== MODULES.PRODUCTS || !module.enabled) return false
  const settings = parseModuleSettings(MODULES.PRODUCTS, module.settings) as ProductsModuleSettings
  return settings.pickup_otp === true
}
