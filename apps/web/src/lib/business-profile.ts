import {
  COUNTRY_PHONE_CODES,
  normalizeHttpUrl,
  normalizePhoneToE164,
  type Business,
  type BusinessHours,
  type BusinessModule,
  type ModuleName,
} from "@workspace/shared"

import type { InternationalAddressValue } from "@/components/international-address-form"
import { emptyInternationalAddress } from "@/components/international-address-form"
import {
  defaultModuleSelection,
  defaultScheduleGroups,
  ONBOARDING_CATEGORIES,
  type ScheduleGroup,
} from "@/lib/business-onboarding"
import { getAddress } from "@/services/addresses.service"
import { getBusiness } from "@/services/businesses.service"
import { getDivisionChain, listCountries } from "@/services/countries.service"
import { getBusinessHours } from "@/services/hours.service"
import { listBusinessModules, syncBusinessModules } from "@/services/modules.service"

export const PROFILE_STEPS = [
  { id: 1, label: "Identidad y propuesta" },
  { id: 2, label: "Ubicación y señas" },
  { id: 3, label: "Contacto y pagos" },
  { id: 4, label: "Fotos y módulos" },
] as const

export type BusinessProfileFormState = {
  name: string
  tagline: string
  category: string
  description: string
  coOwnerEmails: string[]
  addressId: string | null
  address: InternationalAddressValue
  whatsappNumber: string
  phone: string
  facebookUrl: string
  instagramUrl: string
  tiktokUrl: string
  website: string
  offersDelivery: boolean
  deliveryCost: string
  deliveryRadiusKm: string
  schedules: ScheduleGroup[]
  paymentCash: boolean
  paymentCard: boolean
  paymentSinpe: boolean
  paymentIban: boolean
  sinpePhone: string
  sinpeHolder: string
  iban: string
  bannerUrl: string
  modules: Record<ModuleName, boolean>
  isDraft: boolean
}

export function initialBusinessProfileForm(): BusinessProfileFormState {
  return {
    name: "",
    tagline: "",
    category: ONBOARDING_CATEGORIES[0],
    description: "",
    coOwnerEmails: [""],
    addressId: null,
    address: emptyInternationalAddress(),
    whatsappNumber: "",
    phone: "",
    facebookUrl: "",
    instagramUrl: "",
    tiktokUrl: "",
    website: "",
    offersDelivery: false,
    deliveryCost: "",
    deliveryRadiusKm: "",
    schedules: defaultScheduleGroups(),
    paymentCash: true,
    paymentCard: false,
    paymentSinpe: false,
    paymentIban: false,
    sinpePhone: "",
    sinpeHolder: "",
    iban: "",
    bannerUrl: "",
    modules: defaultModuleSelection(),
    isDraft: true,
  }
}

function formatTimeForInput(time: string | null): string {
  if (!time) return "08:00"
  return time.slice(0, 5)
}

export function hoursToScheduleGroups(hours: BusinessHours[]): ScheduleGroup[] {
  const defaults = defaultScheduleGroups()
  const weekly = hours.filter((row) => row.dayOfWeek !== null && row.exceptionDate === null)
  if (weekly.length === 0) return defaults

  return defaults.map((group) => {
    const sample = weekly.find((row) => group.days.includes(row.dayOfWeek ?? -1))
    if (!sample) return group
    return {
      ...group,
      open: formatTimeForInput(sample.openTime),
      close: formatTimeForInput(sample.closeTime),
      closed: sample.isClosed,
    }
  })
}

export function businessToProfileForm(business: Business): BusinessProfileFormState {
  const base = initialBusinessProfileForm()
  return {
    ...base,
    name: business.name,
    tagline: business.tagline ?? "",
    category: business.category,
    description: business.description ?? "",
    addressId: business.addressId,
    address: {
      ...base.address,
      addressLine1: business.address ?? "",
      latitude: business.latitude,
      longitude: business.longitude,
    },
    whatsappNumber: business.whatsappNumber ?? "",
    phone: business.phone ?? "",
    facebookUrl: business.facebookUrl ?? "",
    instagramUrl: business.instagramUrl ?? "",
    tiktokUrl: business.tiktokUrl ?? "",
    website: business.website ?? "",
    offersDelivery: business.offersDelivery,
    deliveryCost: business.deliveryCost != null ? String(business.deliveryCost) : "",
    deliveryRadiusKm: business.deliveryRadiusKm != null ? String(business.deliveryRadiusKm) : "",
    paymentCash: business.paymentCash,
    paymentCard: business.paymentCard,
    paymentSinpe: business.paymentSinpe,
    paymentIban: business.paymentIban,
    sinpePhone: business.sinpePhone ?? "",
    sinpeHolder: business.sinpeHolder ?? "",
    iban: business.iban ?? "",
    bannerUrl: business.bannerUrl ?? "",
    isDraft: business.isDraft,
  }
}

export function payloadFromProfileForm(
  form: BusinessProfileFormState,
  options?: { partial?: boolean; preserveDraftStatus?: boolean },
) {
  const dialCode = COUNTRY_PHONE_CODES[form.address.countryCode ?? "CR"] ?? "+506"
  const whatsapp = form.whatsappNumber.trim()
  const deliveryCost = Number(form.deliveryCost)
  const deliveryRadiusKm = Number(form.deliveryRadiusKm)
  const body: Record<string, unknown> = {
    name: form.name.trim(),
    tagline: form.tagline.trim() || undefined,
    category: form.category,
    description: form.description.trim() || undefined,
    latitude: form.address.latitude ?? undefined,
    longitude: form.address.longitude ?? undefined,
    address: form.address.addressLine1.trim() || undefined,
    whatsappNumber: whatsapp ? normalizePhoneToE164(whatsapp, dialCode) : undefined,
    phone: form.phone.trim() || undefined,
    facebookUrl: form.facebookUrl.trim() ? normalizeHttpUrl(form.facebookUrl) : undefined,
    instagramUrl: form.instagramUrl.trim() ? normalizeHttpUrl(form.instagramUrl) : undefined,
    tiktokUrl: form.tiktokUrl.trim() ? normalizeHttpUrl(form.tiktokUrl) : undefined,
    website: form.website.trim() ? normalizeHttpUrl(form.website) : undefined,
    offersDelivery: form.offersDelivery,
    deliveryCost:
      form.deliveryCost && Number.isFinite(deliveryCost) ? deliveryCost : undefined,
    deliveryRadiusKm:
      form.deliveryRadiusKm && Number.isFinite(deliveryRadiusKm)
        ? deliveryRadiusKm
        : undefined,
    paymentCash: form.paymentCash,
    paymentCard: form.paymentCard,
    paymentSinpe: form.paymentSinpe,
    paymentIban: form.paymentIban,
    sinpePhone: form.sinpePhone.trim() || undefined,
    sinpeHolder: form.sinpeHolder.trim() || undefined,
    iban: form.iban.trim() || undefined,
    bannerUrl: form.bannerUrl.trim() ? normalizeHttpUrl(form.bannerUrl) : undefined,
  }

  if (options?.preserveDraftStatus) {
    body.isDraft = form.isDraft
  } else {
    body.isDraft = true
  }

  if (options?.partial && !form.name.trim()) delete body.name
  return body
}

export async function loadBusinessProfileForm(businessId: string) {
  const [detail, hours, moduleRows] = await Promise.all([
    getBusiness(businessId),
    getBusinessHours(businessId).catch(() => [] as BusinessHours[]),
    listBusinessModules(businessId).catch(() => [] as BusinessModule[]),
  ])

  const business = detail.business
  const form = businessToProfileForm(business)
  form.schedules = hoursToScheduleGroups(hours)

  const modules = defaultModuleSelection()
  for (const row of moduleRows) {
    modules[row.moduleName] = row.enabled
  }
  form.modules = modules

  if (business.addressId) {
    try {
      const saved = await getAddress(business.addressId)
      let divisionIds: string[] = []
      let countryCode: string | null = null
      if (saved.administrativeDivisionId) {
        const chain = await getDivisionChain(saved.administrativeDivisionId)
        divisionIds = chain.map((division) => division.id)
      }
      const countries = await listCountries()
      countryCode =
        countries.find((country) => country.id === saved.countryId)?.code ?? null
      form.address = {
        countryId: saved.countryId,
        countryCode,
        divisionIds,
        postalCode: saved.postalCode ?? "",
        addressLine1: saved.addressLine1,
        addressLine2: saved.addressLine2 ?? "",
        reference: saved.reference ?? "",
        latitude: saved.latitude,
        longitude: saved.longitude,
        formattedAddress: saved.formattedAddress,
        placeId: saved.placeId,
      }
    } catch {
      // Mantener datos legados si la dirección no es legible aún.
    }
  }

  return { business, form }
}

export async function syncModulesForBusiness(
  businessId: string,
  modules: Record<ModuleName, boolean>,
) {
  await syncBusinessModules(businessId, modules)
}
