/**
 * Constantes compartidas entre frontend y backend.
 *
 * Los valores de `PERMISSION_DEFINITIONS` son la fuente de verdad del catalogo
 * de permisos; el seed SQL (`supabase/migrations/*_seed_permissions.sql`) debe
 * mantenerse sincronizado (hay un test que lo verifica).
 */

// --------------------------------------------------------------------------
// Roles
// --------------------------------------------------------------------------

/** Rol global del usuario (columna `users.role`). */
export const ROLES = {
  ADMIN: "admin",
  BUSINESS_OWNER: "business_owner",
  BUSINESS_EMPLOYEE: "business_employee",
  CLIENT: "client",
} as const

/** Rol de un usuario dentro de un negocio (columna `business_users.role`). */
export const BUSINESS_ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  EMPLOYEE: "employee",
} as const

// --------------------------------------------------------------------------
// Modulos funcionales
// --------------------------------------------------------------------------

export const MODULES = {
  PRODUCTS: "products",
  SERVICES: "services",
  MENU: "menu",
  APPOINTMENTS: "appointments",
} as const

/** Acciones granulares disponibles para cada modulo funcional. */
export const MODULE_ACTIONS = [
  "view",
  "create",
  "edit_own",
  "edit_all",
  "delete_own",
  "delete_all",
] as const

// --------------------------------------------------------------------------
// Permisos
// --------------------------------------------------------------------------

export interface PermissionDefinition {
  /** Identificador `modulo:accion`, p. ej. `products:create`. */
  readonly name: string
  readonly module: string
  readonly action: string
  readonly description: string
}

const MODULE_LABELS: Record<(typeof MODULES)[keyof typeof MODULES], string> = {
  products: "productos",
  services: "servicios",
  menu: "menu digital",
  appointments: "citas",
}

const ACTION_LABELS: Record<(typeof MODULE_ACTIONS)[number], string> = {
  view: "Ver",
  create: "Crear",
  edit_own: "Editar los propios",
  edit_all: "Editar todos",
  delete_own: "Eliminar los propios",
  delete_all: "Eliminar todos",
}

const modulePermissions: PermissionDefinition[] = Object.values(MODULES).flatMap(
  (module) =>
    MODULE_ACTIONS.map((action) => ({
      name: `${module}:${action}`,
      module,
      action,
      description: `${ACTION_LABELS[action]} ${MODULE_LABELS[module]}`,
    }))
)

const extraPermissions: PermissionDefinition[] = [
  {
    name: "business:edit",
    module: "business",
    action: "edit",
    description: "Editar el perfil del negocio (datos, logo, banner, ubicacion)",
  },
  {
    name: "employees:manage",
    module: "employees",
    action: "manage",
    description: "Invitar, editar y remover empleados y sus permisos",
  },
  {
    name: "chat:view_all",
    module: "chat",
    action: "view_all",
    description: "Ver todas las conversaciones del negocio",
  },
  {
    name: "audit:view",
    module: "audit",
    action: "view",
    description: "Ver la bitacora de cambios del negocio",
  },
  {
    name: "gallery:upload",
    module: "gallery",
    action: "upload",
    description: "Subir imagenes a la galeria del negocio",
  },
  {
    name: "events:manage",
    module: "events",
    action: "manage",
    description: "Crear, editar y eliminar eventos",
  },
  {
    name: "hours:edit",
    module: "hours",
    action: "edit",
    description: "Editar horarios y excepciones del negocio",
  },
  {
    name: "reviews:respond",
    module: "reviews",
    action: "respond",
    description: "Responder resenas de clientes",
  },
]

/** Catalogo completo de permisos (fuente de verdad para el seed SQL). */
export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  ...modulePermissions,
  ...extraPermissions,
]

export const PERMISSIONS = {
  PRODUCTS_VIEW: "products:view",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_EDIT_OWN: "products:edit_own",
  PRODUCTS_EDIT_ALL: "products:edit_all",
  PRODUCTS_DELETE_OWN: "products:delete_own",
  PRODUCTS_DELETE_ALL: "products:delete_all",

  SERVICES_VIEW: "services:view",
  SERVICES_CREATE: "services:create",
  SERVICES_EDIT_OWN: "services:edit_own",
  SERVICES_EDIT_ALL: "services:edit_all",
  SERVICES_DELETE_OWN: "services:delete_own",
  SERVICES_DELETE_ALL: "services:delete_all",

  MENU_VIEW: "menu:view",
  MENU_CREATE: "menu:create",
  MENU_EDIT_OWN: "menu:edit_own",
  MENU_EDIT_ALL: "menu:edit_all",
  MENU_DELETE_OWN: "menu:delete_own",
  MENU_DELETE_ALL: "menu:delete_all",

  APPOINTMENTS_VIEW: "appointments:view",
  APPOINTMENTS_CREATE: "appointments:create",
  APPOINTMENTS_EDIT_OWN: "appointments:edit_own",
  APPOINTMENTS_EDIT_ALL: "appointments:edit_all",
  APPOINTMENTS_DELETE_OWN: "appointments:delete_own",
  APPOINTMENTS_DELETE_ALL: "appointments:delete_all",

  BUSINESS_EDIT: "business:edit",
  EMPLOYEES_MANAGE: "employees:manage",
  CHAT_VIEW_ALL: "chat:view_all",
  AUDIT_VIEW: "audit:view",
  GALLERY_UPLOAD: "gallery:upload",
  EVENTS_MANAGE: "events:manage",
  HOURS_EDIT: "hours:edit",
  REVIEWS_RESPOND: "reviews:respond",
} as const

export const PERMISSION_NAMES = PERMISSION_DEFINITIONS.map((p) => p.name)

// --------------------------------------------------------------------------
// Idiomas
// --------------------------------------------------------------------------

export const LANGUAGES = {
  ES: "es",
  EN: "en",
} as const

export const DEFAULT_LANGUAGE = LANGUAGES.ES

// --------------------------------------------------------------------------
// Estados y tipos
// --------------------------------------------------------------------------

export const APPOINTMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const

export const NOTIFICATION_TYPES = {
  NEW_MESSAGE: "new_message",
  AUDIT_LOG: "audit_log",
  NEW_EMPLOYEE: "new_employee",
} as const

// --------------------------------------------------------------------------
// Limites de negocio (ver Planeamiento Arquitectonico)
// --------------------------------------------------------------------------

/** Retencion maxima del chat en dias (PDF seccion 6). */
export const MAX_CHAT_RETENTION_DAYS = 30
export const DEFAULT_CHAT_RETENTION_DAYS = 30

/** Radio maximo de busqueda geolocalizada en km (PDF seccion 11). */
export const MAX_SEARCH_RADIUS_KM = 50

/** Rango valido de una resena. */
export const MIN_RATING = 1
export const MAX_RATING = 5
