import type { BusinessEvent } from "@workspace/shared"

import { getData } from "@/services/http"

export async function listBusinessEvents(businessId: string) {
  return getData<BusinessEvent[]>(`/businesses/${businessId}/events`)
}
