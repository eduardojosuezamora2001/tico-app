/**
 * Schemas Zod (v4) compartidos. Se usan para validar inputs en la API
 * (`zValidator`) y formularios en el frontend (`@hookform/resolvers/zod`).
 */

import { z } from "zod"

import {
  APPOINTMENT_STATUS,
  BUSINESS_ROLES,
  LANGUAGES,
  MAX_CHAT_RETENTION_DAYS,
  MAX_RATING,
  MAX_SEARCH_RADIUS_KM,
  MIN_RATING,
  MODULES,
  PERMISSIONS,
  ROLES,
} from "./constants.js"

// --------------------------------------------------------------------------
// Primitivas reutilizables
// --------------------------------------------------------------------------

export const uuidSchema = z.uuid()
export const emailSchema = z.email()
export const urlSchema = z.url()
export const isoDateSchema = z.iso.datetime({ offset: true })
/** Hora local `HH:MM` o `HH:MM:SS`. */
export const timeSchema = z.iso.time()
/** Fecha `YYYY-MM-DD`. */
export const dateOnlySchema = z.iso.date()
export const latitudeSchema = z.number().min(-90).max(90)
export const longitudeSchema = z.number().min(-180).max(180)
export const priceSchema = z.number().nonnegative().multipleOf(0.01)
/** Numero de WhatsApp en formato E.164 (p. ej. +50688887777). */
export const phoneE164Schema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "Debe estar en formato E.164, p. ej. +50688887777")

export const userRoleSchema = z.enum(Object.values(ROLES))
export const businessRoleSchema = z.enum(Object.values(BUSINESS_ROLES))
export const moduleNameSchema = z.enum(Object.values(MODULES))
export const permissionNameSchema = z.enum(Object.values(PERMISSIONS))
export const languageCodeSchema = z.enum(Object.values(LANGUAGES))
export const appointmentStatusSchema = z.enum(Object.values(APPOINTMENT_STATUS))

// --------------------------------------------------------------------------
// Usuarios
// --------------------------------------------------------------------------

export const UserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  fullName: z.string().min(1).nullable(),
  avatarUrl: urlSchema.nullable(),
  role: userRoleSchema,
  preferredLanguage: languageCodeSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

export const UpdateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  avatarUrl: urlSchema.nullable().optional(),
  preferredLanguage: languageCodeSchema.optional(),
})

export const SignUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Minimo 8 caracteres").max(72),
  fullName: z.string().trim().min(1, "Requerido").max(120),
})

export const SignInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Requerido"),
})

// --------------------------------------------------------------------------
// Negocios
// --------------------------------------------------------------------------

export const BusinessSchema = z.object({
  id: uuidSchema,
  ownerId: uuidSchema,
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  category: z.string().min(1),
  latitude: latitudeSchema.nullable(),
  longitude: longitudeSchema.nullable(),
  address: z.string().nullable(),
  whatsappNumber: phoneE164Schema.nullable(),
  website: urlSchema.nullable(),
  email: emailSchema.nullable(),
  phone: z.string().nullable(),
  logoUrl: urlSchema.nullable(),
  bannerUrl: urlSchema.nullable(),
  isActive: z.boolean(),
  chatRetentionDays: z.number().int().min(1).max(MAX_CHAT_RETENTION_DAYS),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

export const CreateBusinessSchema = z.object({
  name: z.string().trim().min(1, "Requerido").max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().min(1, "Requerido").max(60),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  address: z.string().trim().max(300).optional(),
  whatsappNumber: phoneE164Schema.optional(),
  website: urlSchema.optional(),
  email: emailSchema.optional(),
  phone: z.string().trim().max(30).optional(),
})

export const UpdateBusinessSchema = CreateBusinessSchema.partial().extend({
  logoUrl: urlSchema.nullable().optional(),
  bannerUrl: urlSchema.nullable().optional(),
  isActive: z.boolean().optional(),
  chatRetentionDays: z
    .number()
    .int()
    .min(1)
    .max(MAX_CHAT_RETENTION_DAYS)
    .optional(),
})

export const SearchBusinessesSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  radiusKm: z.number().positive().max(MAX_SEARCH_RADIUS_KM).default(10),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
})

export const BusinessModuleSchema = z.object({
  id: uuidSchema,
  businessId: uuidSchema,
  moduleName: moduleNameSchema,
  enabled: z.boolean(),
  createdAt: isoDateSchema,
})

export const ToggleBusinessModuleSchema = z.object({
  moduleName: moduleNameSchema,
  enabled: z.boolean(),
})

export const BusinessHoursSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6).nullable(),
    exceptionDate: dateOnlySchema.nullable(),
    openTime: timeSchema.nullable(),
    closeTime: timeSchema.nullable(),
    isClosed: z.boolean().default(false),
  })
  .refine((v) => (v.dayOfWeek === null) !== (v.exceptionDate === null), {
    message: "Indica dayOfWeek (horario semanal) o exceptionDate (excepcion), no ambos",
  })
  .refine((v) => v.isClosed || (v.openTime !== null && v.closeTime !== null), {
    message: "openTime y closeTime son requeridos salvo que isClosed sea true",
  })

// --------------------------------------------------------------------------
// Empleados / permisos
// --------------------------------------------------------------------------

export const PermissionSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  description: z.string().nullable(),
  module: z.string().min(1),
  action: z.string().min(1),
})

export const BusinessUserSchema = z.object({
  id: uuidSchema,
  businessId: uuidSchema,
  userId: uuidSchema,
  role: businessRoleSchema,
  permissions: z.array(permissionNameSchema),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

export const AddBusinessUserSchema = z.object({
  email: emailSchema,
  role: businessRoleSchema.exclude([BUSINESS_ROLES.OWNER]),
  permissions: z.array(permissionNameSchema).default([]),
})

export const UpdateBusinessUserSchema = z.object({
  role: businessRoleSchema.exclude([BUSINESS_ROLES.OWNER]).optional(),
  permissions: z.array(permissionNameSchema).optional(),
})

// --------------------------------------------------------------------------
// Productos
// --------------------------------------------------------------------------

export const ProductSchema = z.object({
  id: uuidSchema,
  businessId: uuidSchema,
  name: z.string().min(1),
  description: z.string().nullable(),
  price: priceSchema,
  stock: z.number().int().min(0).nullable(),
  imageUrl: urlSchema.nullable(),
  category: z.string().nullable(),
  isAvailable: z.boolean(),
  createdBy: uuidSchema.nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

export const CreateProductSchema = z.object({
  name: z.string().trim().min(1, "Requerido").max(120),
  description: z.string().trim().max(2000).optional(),
  price: z.number().positive("Debe ser mayor a 0").multipleOf(0.01),
  stock: z.number().int().min(0).optional(),
  imageUrl: urlSchema.optional(),
  category: z.string().trim().max(60).optional(),
  isAvailable: z.boolean().default(true),
})

export const UpdateProductSchema = CreateProductSchema.partial()

export const TranslationSchema = z.object({
  languageCode: languageCodeSchema,
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
})

// --------------------------------------------------------------------------
// Servicios
// --------------------------------------------------------------------------

export const CreateServiceSchema = z.object({
  name: z.string().trim().min(1, "Requerido").max(120),
  description: z.string().trim().max(2000).optional(),
  price: priceSchema.optional(),
  durationMinutes: z.number().int().positive().max(24 * 60).optional(),
  category: z.string().trim().max(60).optional(),
  imageUrl: urlSchema.optional(),
  isActive: z.boolean().default(true),
})

export const UpdateServiceSchema = CreateServiceSchema.partial()

// --------------------------------------------------------------------------
// Menu digital
// --------------------------------------------------------------------------

export const CreateMenuItemSchema = z.object({
  section: z.string().trim().max(60).optional(),
  name: z.string().trim().min(1, "Requerido").max(120),
  description: z.string().trim().max(2000).optional(),
  price: z.number().positive("Debe ser mayor a 0").multipleOf(0.01),
  imageUrl: urlSchema.optional(),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
})

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial()

// --------------------------------------------------------------------------
// Citas
// --------------------------------------------------------------------------

export const CreateAppointmentSchema = z.object({
  serviceId: uuidSchema.optional(),
  employeeId: uuidSchema.optional(),
  scheduledAt: isoDateSchema,
  durationMinutes: z.number().int().positive().max(24 * 60).optional(),
  notes: z.string().trim().max(1000).optional(),
})

export const UpdateAppointmentSchema = z.object({
  status: appointmentStatusSchema.optional(),
  scheduledAt: isoDateSchema.optional(),
  employeeId: uuidSchema.nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
})

export const CreateGalleryImageSchema = z.object({
  imageUrl: urlSchema,
  sortOrder: z.number().int().min(0).optional(),
})

// --------------------------------------------------------------------------
// Resenas y eventos
// --------------------------------------------------------------------------

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(MIN_RATING).max(MAX_RATING),
  comment: z.string().trim().max(2000).optional(),
})

export const UpdateReviewSchema = CreateReviewSchema.partial()

export const CreateEventSchema = z
  .object({
    title: z.string().trim().min(1, "Requerido").max(150),
    description: z.string().trim().max(4000).optional(),
    startsAt: isoDateSchema,
    endsAt: isoDateSchema.optional(),
    locationText: z.string().trim().max(300).optional(),
    imageUrl: urlSchema.optional(),
    rsvpEnabled: z.boolean().default(true),
    whatsappEnabled: z.boolean().default(true),
  })
  .refine((v) => !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt), {
    message: "endsAt debe ser posterior a startsAt",
    path: ["endsAt"],
  })

// --------------------------------------------------------------------------
// Chat y bitacora
// --------------------------------------------------------------------------

export const MessageSchema = z.object({
  id: uuidSchema,
  senderId: uuidSchema,
  receiverId: uuidSchema,
  businessId: uuidSchema,
  text: z.string().min(1),
  isRead: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

export const SendMessageSchema = z.object({
  businessId: uuidSchema,
  receiverId: uuidSchema,
  text: z.string().trim().min(1, "El mensaje no puede estar vacio").max(4000),
})

export const AuditLogSchema = z.object({
  id: uuidSchema,
  businessId: uuidSchema,
  userId: uuidSchema.nullable(),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().nullable(),
  changes: z.record(z.string(), z.unknown()).nullable(),
  createdAt: isoDateSchema,
})

// --------------------------------------------------------------------------
// Tipos inferidos de inputs
// --------------------------------------------------------------------------

export type SignUpInput = z.infer<typeof SignUpSchema>
export type SignInInput = z.infer<typeof SignInSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>
export type UpdateBusinessInput = z.infer<typeof UpdateBusinessSchema>
export type SearchBusinessesInput = z.infer<typeof SearchBusinessesSchema>
export type ToggleBusinessModuleInput = z.infer<typeof ToggleBusinessModuleSchema>
export type BusinessHoursInput = z.infer<typeof BusinessHoursSchema>
export type AddBusinessUserInput = z.infer<typeof AddBusinessUserSchema>
export type UpdateBusinessUserInput = z.infer<typeof UpdateBusinessUserSchema>
export type CreateProductInput = z.infer<typeof CreateProductSchema>
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>
export type TranslationInput = z.infer<typeof TranslationSchema>
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>
export type CreateMenuItemInput = z.infer<typeof CreateMenuItemSchema>
export type UpdateMenuItemInput = z.infer<typeof UpdateMenuItemSchema>
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>
export type UpdateReviewInput = z.infer<typeof UpdateReviewSchema>
export type CreateEventInput = z.infer<typeof CreateEventSchema>
export type SendMessageInput = z.infer<typeof SendMessageSchema>
