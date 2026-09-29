import type { Business, BusinessModule, User } from "@workspace/shared"

export type AccountBusiness = {
  id: string
  name: string
  slug: string
  category: string
  address: string | null
  isActive: boolean
  isDraft?: boolean
  logoUrl: string | null
  chainId?: string | null
}

export type Membership = {
  businessId: string
  role: string
  permissions: string[]
  isActive: boolean
  business: AccountBusiness | null
}

export type MePayload = {
  profile: User
  memberships: Membership[]
}

export type BusinessSummary = {
  id: string
  name: string
  description: string | null
  category: string
  address: string | null
  whatsappNumber: string | null
  bannerUrl: string | null
  distanceKm: number | null
}

export type BusinessDetail = {
  business: Business
  modules: BusinessModule[]
}

export type MediaUploadUrl = {
  path: string
  token: string
  publicUrl: string
}

export type CatalogKind = "products" | "services" | "menu"
