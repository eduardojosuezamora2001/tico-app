/**
 * Tipos de dominio compartidos entre frontend y backend.
 *
 * Convenciones:
 * - Propiedades en camelCase (la BD usa snake_case; el mapeo ocurre en la API).
 * - Fechas como `ISODateString` (los payloads JSON no transportan `Date`).
 * - Los tipos de fila crudos de Supabase viven en `database.types.ts`.
 */

import type {
  APPOINTMENT_STATUS,
  BUSINESS_ROLES,
  LANGUAGES,
  MODULES,
  MODULE_ACTIONS,
  NOTIFICATION_TYPES,
  PERMISSIONS,
  ROLES,
} from "./constants.js"
import type { BundleConfig, ProductKind, ProductOptionGroup, SpecField } from "./product-catalog.js"

/** Fecha/hora serializada en formato ISO 8601 (p. ej. `2026-09-24T14:00:00.000Z`). */
export type ISODateString = string

// --------------------------------------------------------------------------
// Roles, modulos y permisos
// --------------------------------------------------------------------------

export type UserRole = (typeof ROLES)[keyof typeof ROLES]
export type BusinessRole = (typeof BUSINESS_ROLES)[keyof typeof BUSINESS_ROLES]
export type ModuleName = (typeof MODULES)[keyof typeof MODULES]
export type ModuleAction = (typeof MODULE_ACTIONS)[number]
export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
export type LanguageCode = (typeof LANGUAGES)[keyof typeof LANGUAGES]
export type AppointmentStatus =
  (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS]
export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES]

// --------------------------------------------------------------------------
// Usuarios
// --------------------------------------------------------------------------

export interface User {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  role: UserRole
  preferredLanguage: LanguageCode
  createdAt: ISODateString
  updatedAt: ISODateString
}

// --------------------------------------------------------------------------
// Negocios
// --------------------------------------------------------------------------

export interface Country {
  id: string
  code: string
  name: string
  nativeName: string
  phoneCode: string
  currencyCode: string
  defaultLanguage: string
  isActive: boolean
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface CountryAdministrativeLevel {
  id: string
  countryId: string
  level: number
  type: string
  label: string
}

export interface AdministrativeDivision {
  id: string
  countryId: string
  parentId: string | null
  name: string
  type: string
  level: number
  code: string | null
  isActive: boolean
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface Address {
  id: string
  countryId: string
  administrativeDivisionId: string | null
  postalCode: string | null
  addressLine1: string
  addressLine2: string | null
  reference: string | null
  latitude: number | null
  longitude: number | null
  formattedAddress: string | null
  placeId: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface NearbyBusiness {
  id: string
  slug: string
  name: string
  category: string
  address: string | null
  latitude: number | null
  longitude: number | null
  distanceM: number
}

export interface BusinessChain {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  createdBy: string
  createdAt: ISODateString
  updatedAt: ISODateString
  locations: ChainLocation[]
}

export interface ChainLocation {
  businessId: string
  name: string
  slug: string
  category: string
  address: string | null
  isActive: boolean
  isDraft: boolean
  logoUrl: string | null
  role: BusinessRole | string
}

export interface Business {
  id: string
  ownerId: string
  chainId: string | null
  slug: string
  name: string
  tagline: string | null
  description: string | null
  category: string
  latitude: number | null
  longitude: number | null
  province: string | null
  canton: string | null
  district: string | null
  address: string | null
  whatsappNumber: string | null
  website: string | null
  email: string | null
  phone: string | null
  facebookUrl: string | null
  instagramUrl: string | null
  tiktokUrl: string | null
  logoUrl: string | null
  bannerUrl: string | null
  offersDelivery: boolean
  deliveryCost: number | null
  deliveryRadiusKm: number | null
  paymentCash: boolean
  paymentCard: boolean
  paymentSinpe: boolean
  paymentIban: boolean
  sinpePhone: string | null
  sinpeHolder: string | null
  iban: string | null
  addressId: string | null
  isDraft: boolean
  isActive: boolean
  chatRetentionDays: number
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface BusinessModule {
  id: string
  businessId: string
  moduleName: ModuleName
  enabled: boolean
  settings: Record<string, unknown>
  createdAt: ISODateString
}

export interface BusinessUser {
  id: string
  businessId: string
  userId: string
  role: BusinessRole
  permissions: PermissionName[]
  isActive: boolean
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface TeamMember extends BusinessUser {
  fullName: string | null
  email: string
}

export interface BusinessHours {
  id: string
  businessId: string
  /** 0 = domingo ... 6 = sabado. `null` cuando la fila es una excepcion por fecha. */
  dayOfWeek: number | null
  /** Fecha concreta (YYYY-MM-DD) cuando la fila es una excepcion al horario semanal. */
  exceptionDate: string | null
  /** Hora local `HH:MM` o `HH:MM:SS`. */
  openTime: string | null
  closeTime: string | null
  isClosed: boolean
  createdAt: ISODateString
}

export interface BusinessTranslation {
  id: string
  businessId: string
  languageCode: LanguageCode
  name: string | null
  description: string | null
  createdAt: ISODateString
}

// --------------------------------------------------------------------------
// Permisos
// --------------------------------------------------------------------------

export interface Permission {
  id: string
  name: string
  description: string | null
  module: string
  action: string
  createdAt: ISODateString
}

// --------------------------------------------------------------------------
// Modulo: Productos
// --------------------------------------------------------------------------

export type { ProductKind }

export interface ProductVariant {
  id: string
  productId: string
  price: number
  stock: number | null
  imageUrl: string | null
  options: Record<string, string>
  sku: string | null
  sortOrder: number
  isDefault: boolean
  isAvailable: boolean
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface ProductBundleItem {
  id: string
  bundleProductId: string
  componentVariantId: string
  defaultQty: number
  minQty: number
  maxQty: number
  sortOrder: number
  createdAt: ISODateString
}

export interface MarketplaceTag {
  id: string
  slug: string
  name: string
}

export interface Product {
  id: string
  businessId: string
  name: string
  description: string | null
  price: number
  stock: number | null
  imageUrl: string | null
  category: string | null
  marketplaceTags?: MarketplaceTag[]
  isAvailable: boolean
  productKind: ProductKind
  optionGroups: ProductOptionGroup[]
  specSchema: SpecField[]
  specifications: Record<string, string | number | boolean>
  bundleConfig: BundleConfig
  variants?: ProductVariant[]
  bundleItems?: ProductBundleItem[]
  createdBy: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface ProductTranslation {
  id: string
  productId: string
  languageCode: LanguageCode
  name: string | null
  description: string | null
  createdAt: ISODateString
}

// --------------------------------------------------------------------------
// Modulo: Servicios
// --------------------------------------------------------------------------

export interface Service {
  id: string
  businessId: string
  name: string
  description: string | null
  price: number | null
  durationMinutes: number | null
  category: string | null
  imageUrl: string | null
  isActive: boolean
  createdBy: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

// --------------------------------------------------------------------------
// Modulo: Menu digital (una fila por plato/item)
// --------------------------------------------------------------------------

export interface MenuItem {
  id: string
  businessId: string
  /** Seccion del menu, p. ej. "Desayunos", "Bebidas". */
  section: string | null
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  isAvailable: boolean
  sortOrder: number
  createdBy: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

// --------------------------------------------------------------------------
// Modulo: Citas / Reservas
// --------------------------------------------------------------------------

export interface Appointment {
  id: string
  businessId: string
  clientId: string
  serviceId: string | null
  employeeId: string | null
  scheduledAt: ISODateString
  durationMinutes: number | null
  status: AppointmentStatus
  notes: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

// --------------------------------------------------------------------------
// Resenas, eventos
// --------------------------------------------------------------------------

export interface Review {
  id: string
  businessId: string
  userId: string
  /** 1..5 */
  rating: number
  comment: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface GalleryImage {
  id: string
  businessId: string
  imageUrl: string
  sortOrder: number
  createdAt: ISODateString
}

export interface BusinessEvent {
  id: string
  businessId: string
  title: string
  description: string | null
  startsAt: ISODateString
  endsAt: ISODateString | null
  locationText: string | null
  imageUrl: string | null
  rsvpEnabled: boolean
  whatsappEnabled: boolean
  createdBy: string | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

// --------------------------------------------------------------------------
// Chat, bitacora, notificaciones
// --------------------------------------------------------------------------

export type ConversationRole = "customer" | "assignee" | "owner" | "member"
export type ConversationStatus = "waiting" | "open"

export interface Message {
  id: string
  senderId: string
  receiverId: string | null
  businessId: string
  conversationId: string
  text: string
  isRead: boolean
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface Conversation {
  id: string
  businessId: string
  businessName: string
  businessSlug: string
  customerId: string
  customerName: string | null
  assigneeId: string | null
  assigneeName: string | null
  status: ConversationStatus
  lastText: string
  lastAt: ISODateString
  unreadCount: number
  viewerRole: ConversationRole
}

export interface AuditLog {
  id: string
  businessId: string
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  changes: Record<string, unknown> | null
  createdAt: ISODateString
}

/** Notificacion enviada por SSE (no persistida en Fase 1). */
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: ISODateString
}

// --------------------------------------------------------------------------
// Respuestas de la API
// --------------------------------------------------------------------------

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface Paginated<T> {
  data: T[]
  nextCursor: string | null
}
