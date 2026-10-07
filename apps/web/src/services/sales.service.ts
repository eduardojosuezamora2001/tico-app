import type { SalesInsightRequest, SalesInsightResponse } from "@workspace/shared"

import { postData } from "@/services/http"

export async function fetchSalesInsight(businessId: string, metrics: SalesInsightRequest) {
  return postData<SalesInsightResponse, SalesInsightRequest>(
    `/businesses/${businessId}/sales-insight`,
    metrics,
  )
}
