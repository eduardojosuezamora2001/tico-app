import { UpdateBusinessSchema, type TablesUpdate } from "@workspace/shared"
import type { z } from "zod"

type BusinessInput = z.infer<typeof UpdateBusinessSchema>
type BusinessUpdate = TablesUpdate<"businesses">

function socialUrl(value: string | undefined) {
  if (value === undefined) return undefined
  return value === "" ? null : value
}

export function businessPatchFromInput(input: BusinessInput) {
  const patch: BusinessUpdate = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.tagline !== undefined) patch.tagline = input.tagline || null
  if (input.description !== undefined) patch.description = input.description || null
  if (input.category !== undefined) patch.category = input.category
  if (input.latitude !== undefined) patch.latitude = input.latitude
  if (input.longitude !== undefined) patch.longitude = input.longitude
  if (input.address !== undefined) patch.address = input.address || null
  if (input.whatsappNumber !== undefined) patch.whatsapp_number = input.whatsappNumber || null
  if (input.website !== undefined) patch.website = socialUrl(input.website)
  if (input.email !== undefined) patch.email = input.email || null
  if (input.phone !== undefined) patch.phone = input.phone || null
  if (input.facebookUrl !== undefined) patch.facebook_url = socialUrl(input.facebookUrl)
  if (input.instagramUrl !== undefined) patch.instagram_url = socialUrl(input.instagramUrl)
  if (input.tiktokUrl !== undefined) patch.tiktok_url = socialUrl(input.tiktokUrl)
  if (input.offersDelivery !== undefined) patch.offers_delivery = input.offersDelivery
  if (input.deliveryCost !== undefined) patch.delivery_cost = input.deliveryCost
  if (input.deliveryRadiusKm !== undefined) patch.delivery_radius_km = input.deliveryRadiusKm
  if (input.paymentCash !== undefined) patch.payment_cash = input.paymentCash
  if (input.paymentCard !== undefined) patch.payment_card = input.paymentCard
  if (input.paymentSinpe !== undefined) patch.payment_sinpe = input.paymentSinpe
  if (input.paymentIban !== undefined) patch.payment_iban = input.paymentIban
  if (input.sinpePhone !== undefined) patch.sinpe_phone = input.sinpePhone || null
  if (input.sinpeHolder !== undefined) patch.sinpe_holder = input.sinpeHolder || null
  if (input.iban !== undefined) patch.iban = input.iban || null
  if (input.logoUrl !== undefined) patch.logo_url = input.logoUrl
  if (input.bannerUrl !== undefined) patch.banner_url = input.bannerUrl
  if (input.isActive !== undefined) patch.is_active = input.isActive
  if (input.isDraft !== undefined) patch.is_draft = input.isDraft
  if (input.chatRetentionDays !== undefined) patch.chat_retention_days = input.chatRetentionDays
  if (input.addressId !== undefined) patch.address_id = input.addressId || null
  return patch
}
