/**
 * Schemas Zod (v4) compartidos. Se usan para validar inputs en la API
 * (`zValidator`) y formularios en el frontend (`@hookform/resolvers/zod`).
 */

import { z } from "zod"

import {
  BUSINESS_CATEGORY_OPTIONS,
  MAX_BUSINESS_CATEGORIES,
  parseBusinessCategories,
} from "./business-categories.js"
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
  permissionsExceedRoleCeiling,
  type AssignableBusinessRole,
} from "./constants.js"
import { normalizeHttpUrl, normalizePhoneToE164 } from "./input-normalization.js"
import {
  BundleConfigSchema,
  MAX_BUNDLE_ITEMS,
  MAX_PRODUCT_VARIANTS,
  ProductBundleItemInputSchema,
  ProductKindSchema,
  ProductOptionGroupSchema,
  ProductVariantInputSchema,
  SpecFieldSchema,
  VariantOptionsSchema,
} from "./product-catalog.js"

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
export const countryCodeSchema = z
  .string()
  .trim()
  .length(2, "Código de país ISO de 2 letras")
  .transform((value) => value.toUpperCase())

// --------------------------------------------------------------------------
// Países y direcciones
// --------------------------------------------------------------------------

export const CountrySchema = z.object({
  id: uuidSchema,
  code: countryCodeSchema,
  name: z.string().min(1),
  nativeName: z.string().min(1),
  phoneCode: z.string().min(1),
  currencyCode: z.string().length(3),
  defaultLanguage: languageCodeSchema,
  isActive: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

export const CountryAdministrativeLevelSchema = z.object({
  id: uuidSchema,
  countryId: uuidSchema,
  level: z.number().int().min(1).max(8),
  type: z.string().min(1),
  label: z.string().min(1),
})

export const AdministrativeDivisionSchema = z.object({
  id: uuidSchema,
  countryId: uuidSchema,
  parentId: uuidSchema.nullable(),
  name: z.string().min(1),
  type: z.string().min(1),
  level: z.number().int().min(1).max(8),
  code: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

export const ListAdministrativeDivisionsSchema = z.object({
  country: countryCodeSchema,
  parentId: uuidSchema.optional(),
})

export const AddressSchema = z.object({
  id: uuidSchema,
  countryId: uuidSchema,
  administrativeDivisionId: uuidSchema.nullable(),
  postalCode: z.string().trim().max(20).nullable(),
  addressLine1: z.string().trim().min(1),
  addressLine2: z.string().trim().max(300).nullable(),
  reference: z.string().trim().max(500).nullable(),
  latitude: latitudeSchema.nullable(),
  longitude: longitudeSchema.nullable(),
  formattedAddress: z.string().trim().max(500).nullable(),
  placeId: z.string().trim().max(200).nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

const addressFieldsSchema = z.object({
  countryId: uuidSchema,
  administrativeDivisionId: uuidSchema.optional(),
  postalCode: z.string().trim().max(20).optional(),
  addressLine1: z.string().trim().min(1, "La dirección principal es requerida").max(300),
  addressLine2: z.string().trim().max(300).optional(),
  reference: z.string().trim().max(500).optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  formattedAddress: z.string().trim().max(500).optional(),
  placeId: z.string().trim().max(200).optional(),
})

function coordinatesPairRefinement<T extends { latitude?: number; longitude?: number }>(
  value: T,
) {
  return (value.latitude === undefined) === (value.longitude === undefined)
}

export const CreateAddressSchema = addressFieldsSchema.refine(coordinatesPairRefinement, {
  message: "Latitud y longitud deben enviarse juntas",
  path: ["longitude"],
})

export const UpdateAddressSchema = addressFieldsSchema
  .partial()
  .extend({ countryId: uuidSchema.optional() })
  .refine(coordinatesPairRefinement, {
    message: "Latitud y longitud deben enviarse juntas",
    path: ["longitude"],
  })

export const NearbyBusinessesSchema = z.object({
  lat: latitudeSchema,
  lng: longitudeSchema,
  radius: z.number().positive().max(50_000).default(5000),
  limit: z.number().int().min(1).max(50).default(20),
})

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

const optionalNormalizedPhoneSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return normalizePhoneToE164(trimmed)
}, phoneE164Schema.optional())

const businessSocialUrlSchema = z
  .string()
  .trim()
  .max(300)
  .transform((value) => (value === "" ? "" : normalizeHttpUrl(value)))
  .refine((value) => value === "" || z.url().safeParse(value).success, {
    message: "URL invalida",
  })

const optionalNormalizedUrlSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return value
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  if (!trimmed) return null
  return normalizeHttpUrl(trimmed)
}, urlSchema.nullable().optional())

export const CreateBusinessSchema = z.object({
  name: z.string().trim().min(1, "Requerido").max(120),
  tagline: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  category: z
    .string()
    .trim()
    .min(1, "Requerido")
    .max(2000)
    .superRefine((value, ctx) => {
      const parts = parseBusinessCategories(value)
      if (parts.length === 0) {
        ctx.addIssue({ code: "custom", message: "Requerido" })
        return
      }
      if (parts.length > MAX_BUSINESS_CATEGORIES) {
        ctx.addIssue({
          code: "custom",
          message: `Máximo ${MAX_BUSINESS_CATEGORIES} categorías`,
        })
      }
    }),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  address: z.string().trim().max(300).optional(),
  whatsappNumber: optionalNormalizedPhoneSchema,
  website: businessSocialUrlSchema.optional(),
  email: emailSchema.optional(),
  phone: z.string().trim().max(30).optional(),
  facebookUrl: businessSocialUrlSchema.optional(),
  instagramUrl: businessSocialUrlSchema.optional(),
  tiktokUrl: businessSocialUrlSchema.optional(),
  offersDelivery: z.boolean().optional(),
  deliveryCost: priceSchema.optional(),
  deliveryRadiusKm: z.number().positive().max(MAX_SEARCH_RADIUS_KM).optional(),
  paymentCash: z.boolean().optional(),
  paymentCard: z.boolean().optional(),
  paymentSinpe: z.boolean().optional(),
  paymentIban: z.boolean().optional(),
  sinpePhone: z.string().trim().max(30).optional(),
  sinpeHolder: z.string().trim().max(120).optional(),
  iban: z.string().trim().max(40).optional(),
  addressId: uuidSchema.optional(),
  chainId: uuidSchema.optional(),
  isDraft: z.boolean().optional(),
})

export const CreateBusinessChainSchema = z.object({
  name: z.string().trim().min(1, "Requerido").max(120),
  description: z.string().trim().max(500).optional(),
  logoUrl: optionalNormalizedUrlSchema,
})

export const AttachChainLocationSchema = z.object({
  businessId: uuidSchema,
})

export const UpdateBusinessSchema = CreateBusinessSchema.partial().extend({
  logoUrl: optionalNormalizedUrlSchema,
  bannerUrl: optionalNormalizedUrlSchema,
  isActive: z.boolean().optional(),
  isDraft: z.boolean().optional(),
  chatRetentionDays: z
    .number()
    .int()
    .min(1)
    .max(MAX_CHAT_RETENTION_DAYS)
    .optional(),
})

export const DiscoverMatchSchema = z.object({
  kind: z.enum(["business", "product", "service", "menu"]),
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(120),
})

export type DiscoverMatch = z.infer<typeof DiscoverMatchSchema>

const marketplaceSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(80)

export const CatalogOfferKindSchema = z.enum(["product", "service", "menu"])

export const SearchBusinessesSchema = z.object({
  q: z.string().trim().max(120).optional(),
  categories: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  businessCategorySlugs: z.array(marketplaceSlugSchema).max(8).optional(),
  marketplaceTagSlugs: z.array(marketplaceSlugSchema).max(12).optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  radiusKm: z.number().positive().max(MAX_SEARCH_RADIUS_KM).default(10),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().max(400).optional(),
  administrativeDivisionIds: z.array(uuidSchema).max(8).optional(),
  catalogKind: CatalogOfferKindSchema.optional(),
  catalogLabel: z.string().trim().min(1).max(120).optional(),
})

export const SuggestCatalogSchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.number().int().min(1).max(12).default(8),
})

export const CatalogSuggestionSchema = z.object({
  kind: z.enum(["business", "product", "service", "menu"]),
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(120),
  hint: z.string().trim().max(80).nullable(),
})

export type CatalogSuggestion = z.infer<typeof CatalogSuggestionSchema>

export const BusinessModuleSchema = z.object({
  id: uuidSchema,
  businessId: uuidSchema,
  moduleName: moduleNameSchema,
  enabled: z.boolean(),
  settings: z.record(z.string(), z.unknown()).default({}),
  createdAt: isoDateSchema,
})

export const ToggleBusinessModuleSchema = z.object({
  moduleName: moduleNameSchema,
  enabled: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

export const VerifyOrderPickupSchema = z.object({
  code: z.string().regex(/^\d{4}$/, "Ingresa 4 dígitos"),
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

export const UpsertBusinessHoursSchema = z.array(BusinessHoursSchema).min(1).max(14)

export const AddCoOwnerSchema = z.object({
  email: emailSchema,
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
  isActive: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

export const AddBusinessUserSchema = z
  .object({
    email: emailSchema,
    role: businessRoleSchema.exclude([BUSINESS_ROLES.OWNER]),
    permissions: z.array(permissionNameSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (permissionsExceedRoleCeiling(data.role as AssignableBusinessRole, data.permissions)) {
      ctx.addIssue({
        code: "custom",
        path: ["permissions"],
        message: "Hay permisos que superan el techo del rol elegido.",
      })
    }
  })

export const UpdateBusinessUserSchema = z
  .object({
    role: businessRoleSchema.exclude([BUSINESS_ROLES.OWNER]).optional(),
    permissions: z.array(permissionNameSchema).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Si solo llegan permisos sin rol, la API debe validar contra el rol actual.
    if (data.role && data.permissions && permissionsExceedRoleCeiling(data.role, data.permissions)) {
      ctx.addIssue({
        code: "custom",
        path: ["permissions"],
        message: "Hay permisos que superan el techo del rol elegido.",
      })
    }
  })

// --------------------------------------------------------------------------
// Productos
// --------------------------------------------------------------------------

export const ProductVariantSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
  price: priceSchema,
  stock: z.number().int().min(0).nullable(),
  imageUrl: urlSchema.nullable(),
  options: VariantOptionsSchema,
  sku: z.string().nullable(),
  sortOrder: z.number().int().min(0),
  isDefault: z.boolean(),
  isAvailable: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

export const ProductBundleItemSchema = z.object({
  id: uuidSchema,
  bundleProductId: uuidSchema,
  componentVariantId: uuidSchema,
  defaultQty: z.number().int().min(0),
  minQty: z.number().int().min(0),
  maxQty: z.number().int().min(1),
  sortOrder: z.number().int().min(0),
  createdAt: isoDateSchema,
})

export const CatalogTagSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  name: z.string(),
  parentId: uuidSchema.nullable().optional(),
  sortOrder: z.number().optional(),
})

export const ProductSchema = z.object({
  id: uuidSchema,
  businessId: uuidSchema,
  name: z.string().min(1),
  description: z.string().nullable(),
  price: priceSchema,
  stock: z.number().int().min(0).nullable(),
  imageUrl: urlSchema.nullable(),
  marketplaceTags: z.array(CatalogTagSchema).optional(),
  merchantTags: z.array(CatalogTagSchema).optional(),
  isAvailable: z.boolean(),
  productKind: ProductKindSchema,
  optionGroups: z.array(ProductOptionGroupSchema),
  specSchema: z.array(SpecFieldSchema),
  specifications: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  bundleConfig: BundleConfigSchema,
  variants: z.array(ProductVariantSchema).optional(),
  bundleItems: z.array(ProductBundleItemSchema).optional(),
  createdBy: uuidSchema.nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

const CreateProductBodySchema = z.object({
  name: z.string().trim().min(1, "Requerido").max(120),
  description: z.string().trim().max(2000).optional(),
  price: z.number().positive("Debe ser mayor a 0").multipleOf(0.01).optional(),
  stock: z.number().int().min(0).optional(),
  imageUrl: urlSchema.optional(),
  marketplaceTagIds: z.array(z.string().uuid()).max(12).optional(),
  merchantTagIds: z.array(z.string().uuid()).max(24).optional(),
  isAvailable: z.boolean().default(true),
  productKind: ProductKindSchema.default("simple"),
  optionGroups: z.array(ProductOptionGroupSchema).max(10).default([]),
  specSchema: z.array(SpecFieldSchema).max(30).default([]),
  specifications: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  bundleConfig: BundleConfigSchema.default({ pricingMode: "fixed" }),
  variants: z.array(ProductVariantInputSchema).max(MAX_PRODUCT_VARIANTS).optional(),
  bundleItems: z.array(ProductBundleItemInputSchema).max(MAX_BUNDLE_ITEMS).optional(),
})

function refineProductCreateInput(
  data: z.infer<typeof CreateProductBodySchema>,
  ctx: z.RefinementCtx,
) {
  if (data.productKind === "variant" && (!data.variants || data.variants.length === 0)) {
    if (data.price === undefined) {
      ctx.addIssue({ code: "custom", message: "Indica precio o al menos una variante.", path: ["price"] })
    }
  }
  if (data.productKind === "bundle" && (!data.bundleItems || data.bundleItems.length === 0)) {
    ctx.addIssue({ code: "custom", message: "Un combo necesita al menos un componente.", path: ["bundleItems"] })
  }
  if (data.productKind === "simple" && data.price === undefined && !data.variants?.length) {
    ctx.addIssue({ code: "custom", message: "El precio es requerido.", path: ["price"] })
  }
}

export const CreateProductSchema = CreateProductBodySchema.superRefine(refineProductCreateInput)

/** PATCH: campos opcionales; reglas de negocio extra en la API al combinar con el producto existente. */
export const UpdateProductSchema = CreateProductBodySchema.partial()

export const ValidateProductSelectionSchema = z.object({
  options: VariantOptionsSchema.optional(),
  bundleQuantities: z.record(z.string().uuid(), z.number().int().min(0).max(99)).optional(),
})

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
  category: z
    .string()
    .trim()
    .max(2000)
    .superRefine((value, ctx) => {
      if (!value) return
      const parts = parseBusinessCategories(value)
      if (parts.length > MAX_BUSINESS_CATEGORIES) {
        ctx.addIssue({
          code: "custom",
          message: `Máximo ${MAX_BUSINESS_CATEGORIES} categorías`,
        })
      }
      const allowed = new Set<string>(BUSINESS_CATEGORY_OPTIONS)
      if (parts.some((part) => !allowed.has(part))) {
        ctx.addIssue({
          code: "custom",
          message: "Usa una categoría del catálogo de rubros.",
        })
      }
    })
    .optional(),
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
  receiverId: uuidSchema.nullable(),
  businessId: uuidSchema,
  conversationId: uuidSchema,
  text: z.string().min(1),
  isRead: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

export const SendMessageSchema = z
  .object({
    businessId: uuidSchema,
    text: z.string().trim().max(4000).optional(),
    order: z
      .object({
        businessName: z.string().trim().min(1).max(120),
        lines: z
          .array(
            z.object({
              productId: z.string().min(1),
              name: z.string().trim().min(1).max(160),
              quantity: z.number().int().positive().max(99),
              price: z.number().nonnegative(),
            }),
          )
          .min(1)
          .max(40),
      })
      .optional(),
  })
  .refine((value) => Boolean(value.text?.trim()) || value.order, {
    message: "El mensaje no puede estar vacío",
    path: ["text"],
  })

export const ChatOrderDecisionSchema = z.object({
  decision: z.enum(["accept", "deny"]),
})

export const ReplyMessageSchema = z.object({
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
// Admin — taxonomía marketplace (solo super admin)
// --------------------------------------------------------------------------

/** Slug URL-safe: `comida-rapida`, `videojuegos`. */
export const taxonomySlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug invalido (solo a-z, 0-9 y guiones)")

export const CreateMarketplaceBusinessCategorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  slug: taxonomySlugSchema.optional(),
  legacyLabel: z.string().trim().min(1, "La etiqueta legacy es obligatoria").max(60),
  parentId: uuidSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const UpdateMarketplaceBusinessCategorySchema =
  CreateMarketplaceBusinessCategorySchema.partial()

export const CreateMarketplaceCatalogTagSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  slug: taxonomySlugSchema.optional(),
  parentId: uuidSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const UpdateMarketplaceCatalogTagSchema = CreateMarketplaceCatalogTagSchema.partial()

export const AdminBusinessStatusFilterSchema = z.enum(["all", "active", "draft", "suspended"])

export const AdminBusinessStatusActionSchema = z.object({
  action: z.enum(["suspend", "activate"]),
})

export const ListAdminBusinessesSchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: AdminBusinessStatusFilterSchema.optional().default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(40),
  cursor: z.string().trim().min(1).optional(),
})

export const AdminUserRoleFilterSchema = z.enum([
  "all",
  ROLES.ADMIN,
  ROLES.BUSINESS_OWNER,
  ROLES.BUSINESS_EMPLOYEE,
  ROLES.CLIENT,
])

export const ListAdminUsersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: AdminUserRoleFilterSchema.optional().default("all"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(40),
  cursor: z.string().trim().min(1).optional(),
})

export const AdminUpdateUserRoleSchema = z.object({
  role: userRoleSchema,
})

export const AdminCreateUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Minimo 8 caracteres").max(72),
  fullName: z.string().trim().min(1, "Requerido").max(120),
  role: userRoleSchema.optional().default(ROLES.CLIENT),
  emailConfirm: z.boolean().optional().default(true),
})

// --------------------------------------------------------------------------
// Tipos inferidos de inputs
// --------------------------------------------------------------------------

export type CreateAddressInput = z.infer<typeof CreateAddressSchema>
export type UpdateAddressInput = z.infer<typeof UpdateAddressSchema>
export type NearbyBusinessesInput = z.infer<typeof NearbyBusinessesSchema>
export type SignUpInput = z.infer<typeof SignUpSchema>
export type SignInInput = z.infer<typeof SignInSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>
export type CreateBusinessChainInput = z.infer<typeof CreateBusinessChainSchema>
export type AttachChainLocationInput = z.infer<typeof AttachChainLocationSchema>
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
export type ChatOrderDecisionInput = z.infer<typeof ChatOrderDecisionSchema>
export type CreateMarketplaceBusinessCategoryInput = z.infer<
  typeof CreateMarketplaceBusinessCategorySchema
>
export type UpdateMarketplaceBusinessCategoryInput = z.infer<
  typeof UpdateMarketplaceBusinessCategorySchema
>
export type CreateMarketplaceCatalogTagInput = z.infer<typeof CreateMarketplaceCatalogTagSchema>
export type UpdateMarketplaceCatalogTagInput = z.infer<typeof UpdateMarketplaceCatalogTagSchema>
export type AdminBusinessStatusActionInput = z.infer<typeof AdminBusinessStatusActionSchema>
export type ListAdminBusinessesInput = z.infer<typeof ListAdminBusinessesSchema>
export type ListAdminUsersInput = z.infer<typeof ListAdminUsersSchema>
export type AdminUpdateUserRoleInput = z.infer<typeof AdminUpdateUserRoleSchema>
export type AdminCreateUserInput = z.infer<typeof AdminCreateUserSchema>
export type AssistantChatInput = z.infer<typeof AssistantChatSchema>
export type SupportSendInput = z.infer<typeof SupportSendSchema>
export type AssistantEmbedSyncInput = z.infer<typeof AssistantEmbedSyncSchema>

// --------------------------------------------------------------------------
// Asistente RAG + soporte
// --------------------------------------------------------------------------

export const AssistantChatSchema = z.object({
  threadId: z.uuid().optional(),
  message: z.string().trim().min(1).max(2000),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
})

export const SupportSendSchema = z.object({
  threadId: z.uuid().optional(),
  message: z.string().trim().min(1).max(4000),
  closeThread: z.boolean().optional(),
})

export const AssistantEmbedSyncSchema = z.object({
  limit: z.coerce.number().int().min(1).max(2000).optional().default(500),
})
