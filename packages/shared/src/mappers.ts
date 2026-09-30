import type { Tables } from "./database.types.js"
import type {
  Address,
  AdministrativeDivision,
  Business,
  BusinessChain,
  BusinessEvent,
  BusinessHours,
  BusinessModule,
  BusinessRole,
  Conversation,
  Country,
  CountryAdministrativeLevel,
  GalleryImage,
  MenuItem,
  Message,
  NearbyBusiness,
  PermissionName,
  Product,
  Service,
  TeamMember,
  User,
} from "./types.js"

export function toCountry(row: Tables<"countries">): Country {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    nativeName: row.native_name,
    phoneCode: row.phone_code,
    currencyCode: row.currency_code,
    defaultLanguage: row.default_language,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toCountryAdministrativeLevel(
  row: Tables<"country_administrative_levels">,
): CountryAdministrativeLevel {
  return {
    id: row.id,
    countryId: row.country_id,
    level: row.level,
    type: row.type,
    label: row.label,
  }
}

export function toAdministrativeDivision(
  row: Tables<"administrative_divisions">,
): AdministrativeDivision {
  return {
    id: row.id,
    countryId: row.country_id,
    parentId: row.parent_id,
    name: row.name,
    type: row.type,
    level: row.level,
    code: row.code,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toAddress(row: Tables<"addresses">): Address {
  return {
    id: row.id,
    countryId: row.country_id,
    administrativeDivisionId: row.administrative_division_id,
    postalCode: row.postal_code,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    reference: row.reference,
    latitude: row.latitude,
    longitude: row.longitude,
    formattedAddress: row.formatted_address,
    placeId: row.place_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toNearbyBusiness(row: {
  id: string
  slug: string
  name: string
  category: string
  address: string | null
  latitude: number | null
  longitude: number | null
  distance_m: number
}): NearbyBusiness {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    distanceM: row.distance_m,
  }
}

export function toUser(row: Tables<"users">): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role as User["role"],
    preferredLanguage: row.preferred_language as User["preferredLanguage"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toBusinessChain(row: Tables<"business_chains">): Omit<BusinessChain, "locations"> {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logoUrl: row.logo_url,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toBusiness(row: Tables<"businesses">): Business {
  return {
    id: row.id,
    ownerId: row.owner_id,
    chainId: row.chain_id ?? null,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? null,
    description: row.description,
    category: row.category,
    latitude: row.latitude,
    longitude: row.longitude,
    province: row.province ?? null,
    canton: row.canton ?? null,
    district: row.district ?? null,
    address: row.address,
    whatsappNumber: row.whatsapp_number,
    website: row.website,
    email: row.email,
    phone: row.phone,
    facebookUrl: row.facebook_url ?? null,
    instagramUrl: row.instagram_url ?? null,
    tiktokUrl: row.tiktok_url ?? null,
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    offersDelivery: row.offers_delivery ?? false,
    deliveryCost: row.delivery_cost ?? null,
    deliveryRadiusKm: row.delivery_radius_km ?? null,
    paymentCash: row.payment_cash ?? false,
    paymentCard: row.payment_card ?? false,
    paymentSinpe: row.payment_sinpe ?? false,
    paymentIban: row.payment_iban ?? false,
    sinpePhone: row.sinpe_phone ?? null,
    sinpeHolder: row.sinpe_holder ?? null,
    iban: row.iban ?? null,
    addressId: row.address_id ?? null,
    isDraft: row.is_draft ?? false,
    isActive: row.is_active,
    chatRetentionDays: row.chat_retention_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toBusinessHours(row: Tables<"business_hours">): BusinessHours {
  return {
    id: row.id,
    businessId: row.business_id,
    dayOfWeek: row.day_of_week,
    exceptionDate: row.exception_date,
    openTime: row.open_time,
    closeTime: row.close_time,
    isClosed: row.is_closed,
    createdAt: row.created_at,
  }
}

export function toBusinessModule(row: Tables<"business_modules">): BusinessModule {
  return {
    id: row.id,
    businessId: row.business_id,
    moduleName: row.module_name as BusinessModule["moduleName"],
    enabled: row.enabled,
    settings: (row.settings ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  }
}

export function toProduct(row: Tables<"products">): Product {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    stock: row.stock,
    imageUrl: row.image_url,
    category: row.category,
    isAvailable: row.is_available,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toService(row: Tables<"services">): Service {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    price: row.price === null ? null : Number(row.price),
    durationMinutes: row.duration_minutes,
    category: row.category,
    imageUrl: row.image_url,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toGalleryImage(row: Tables<"business_gallery">): GalleryImage {
  return {
    id: row.id,
    businessId: row.business_id,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

export function toBusinessEvent(row: Tables<"events">): BusinessEvent {
  return {
    id: row.id,
    businessId: row.business_id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    locationText: row.location_text,
    imageUrl: row.image_url,
    rsvpEnabled: row.rsvp_enabled,
    whatsappEnabled: row.whatsapp_enabled,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toTeamMember(
  row: Tables<"business_users">,
  profile: { full_name: string | null; email: string },
): TeamMember {
  return {
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id,
    role: row.role as BusinessRole,
    permissions: row.permissions as PermissionName[],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fullName: profile.full_name,
    email: profile.email,
  }
}

export function toMessage(row: Tables<"messages">): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    businessId: row.business_id,
    conversationId: row.conversation_id,
    text: row.text,
    isRead: row.is_read,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toConversation(row: {
  id: string
  business_id: string
  business_name: string
  business_slug: string
  customer_id: string
  customer_name: string | null
  assignee_id: string | null
  assignee_name: string | null
  status: string
  last_text: string
  last_at: string
  unread_count: number
  viewer_role: string
}): Conversation {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_name,
    businessSlug: row.business_slug,
    customerId: row.customer_id,
    customerName: row.customer_name,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee_name,
    status: row.status === "open" ? "open" : "waiting",
    lastText: row.last_text,
    lastAt: row.last_at,
    unreadCount: row.unread_count,
    viewerRole:
      row.viewer_role === "customer" || row.viewer_role === "assignee" || row.viewer_role === "owner"
        ? row.viewer_role
        : "member",
  }
}

export function toMenuItem(row: Tables<"menus">): MenuItem {
  return {
    id: row.id,
    businessId: row.business_id,
    section: row.section,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    imageUrl: row.image_url,
    isAvailable: row.is_available,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
