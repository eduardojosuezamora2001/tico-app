import type {
  AdminBusinessListItem,
  AdminBusinessStatusActionInput,
  AdminStats,
  CreateMarketplaceBusinessCategoryInput,
  CreateMarketplaceCatalogTagInput,
  ListAdminBusinessesInput,
  MarketplaceBusinessCategory,
  MarketplaceTag,
  UpdateMarketplaceBusinessCategoryInput,
  UpdateMarketplaceCatalogTagInput,
} from "@workspace/shared"

import { deleteData, getData, getPage, patchData, postData } from "@/services/http"

export function getAdminStats() {
  return getData<AdminStats>("/admin/stats")
}

export function listAdminBusinesses(params?: Partial<ListAdminBusinessesInput>) {
  return getPage<AdminBusinessListItem[]>("/admin/businesses", params)
}

export function updateAdminBusinessStatus(id: string, input: AdminBusinessStatusActionInput) {
  return patchData<AdminBusinessListItem>(`/admin/businesses/${id}/status`, input)
}

export function listAdminBusinessCategories() {
  return getData<MarketplaceBusinessCategory[]>("/admin/business-categories")
}

export function createAdminBusinessCategory(input: CreateMarketplaceBusinessCategoryInput) {
  return postData<MarketplaceBusinessCategory>("/admin/business-categories", input)
}

export function updateAdminBusinessCategory(
  id: string,
  input: UpdateMarketplaceBusinessCategoryInput,
) {
  return patchData<MarketplaceBusinessCategory>(`/admin/business-categories/${id}`, input)
}

export function deactivateAdminBusinessCategory(id: string) {
  return deleteData(`/admin/business-categories/${id}`)
}

export function listAdminMarketplaceTags() {
  return getData<MarketplaceTag[]>("/admin/marketplace-tags")
}

export function createAdminMarketplaceTag(input: CreateMarketplaceCatalogTagInput) {
  return postData<MarketplaceTag>("/admin/marketplace-tags", input)
}

export function updateAdminMarketplaceTag(id: string, input: UpdateMarketplaceCatalogTagInput) {
  return patchData<MarketplaceTag>(`/admin/marketplace-tags/${id}`, input)
}

export function deactivateAdminMarketplaceTag(id: string) {
  return deleteData(`/admin/marketplace-tags/${id}`)
}
