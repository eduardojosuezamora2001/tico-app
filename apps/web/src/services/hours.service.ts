import type { BusinessHours, BusinessHoursInput } from "@workspace/shared"

import { getData, putData } from "@/services/http"

export async function getBusinessHours(businessId: string) {
  return getData<BusinessHours[]>(`/businesses/${businessId}/hours`)
}

export async function updateBusinessHours(
  businessId: string,
  hours: BusinessHoursInput[],
) {
  return putData<BusinessHours[]>(`/businesses/${businessId}/hours`, hours)
}
