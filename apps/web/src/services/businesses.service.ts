import type {
  Business,
  CreateAddressInput,
  CreateBusinessInput,
  UpdateBusinessInput,
} from "@workspace/shared"

import { getData, getPage, patchData, postData, putData } from "@/services/http"
import type { BusinessDetail, BusinessSummary, MediaUploadUrl } from "@/services/types"

export async function searchBusinesses(params: Record<string, unknown>) {
  return getPage<BusinessSummary[]>("/businesses", params)
}

export async function getBusiness(businessId: string) {
  return getData<BusinessDetail>(`/businesses/${businessId}`)
}

export async function createBusiness(input: CreateBusinessInput) {
  return postData<Business>("/businesses", input)
}

export async function updateBusiness(businessId: string, input: UpdateBusinessInput) {
  return patchData<Business>(`/businesses/${businessId}`, input)
}

export async function publishBusiness(businessId: string) {
  return postData<Business>(`/businesses/${businessId}/publish`)
}

export async function upsertBusinessAddress(businessId: string, input: CreateAddressInput) {
  return putData<{ id: string }>(`/businesses/${businessId}/address`, input)
}

export async function createMediaUploadUrl(
  businessId: string,
  input: { kind: "gallery" | "banner"; contentType: string },
) {
  return postData<MediaUploadUrl>(`/businesses/${businessId}/media/upload-url`, input)
}
