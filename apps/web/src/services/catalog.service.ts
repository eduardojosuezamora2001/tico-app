import type {
  CreateMenuItemInput,
  CreateProductInput,
  CreateServiceInput,
  MenuItem,
  Product,
  Service,
  UpdateMenuItemInput,
  UpdateProductInput,
  UpdateServiceInput,
} from "@workspace/shared"

import { deleteData, getData, patchData, postData } from "@/services/http"
import type { CatalogKind } from "@/services/types"

export async function listProducts(
  businessId: string,
  options?: { includeUnavailable?: boolean },
) {
  return getData<Product[]>(`/businesses/${businessId}/products`, options)
}

export async function createProduct(businessId: string, input: CreateProductInput) {
  return postData<Product>(`/businesses/${businessId}/products`, input)
}

export async function updateProduct(
  businessId: string,
  itemId: string,
  input: UpdateProductInput,
) {
  return patchData<Product>(`/businesses/${businessId}/products/${itemId}`, input)
}

export async function deleteProduct(businessId: string, itemId: string) {
  await deleteData(`/businesses/${businessId}/products/${itemId}`)
}

export async function listServices(businessId: string) {
  return getData<Service[]>(`/businesses/${businessId}/services`)
}

export async function createService(businessId: string, input: CreateServiceInput) {
  return postData<Service>(`/businesses/${businessId}/services`, input)
}

export async function updateService(
  businessId: string,
  itemId: string,
  input: UpdateServiceInput,
) {
  return patchData<Service>(`/businesses/${businessId}/services/${itemId}`, input)
}

export async function deleteService(businessId: string, itemId: string) {
  await deleteData(`/businesses/${businessId}/services/${itemId}`)
}

export async function listMenuItems(businessId: string) {
  return getData<MenuItem[]>(`/businesses/${businessId}/menu`)
}

export async function createMenuItem(businessId: string, input: CreateMenuItemInput) {
  return postData<MenuItem>(`/businesses/${businessId}/menu`, input)
}

export async function updateMenuItem(
  businessId: string,
  itemId: string,
  input: UpdateMenuItemInput,
) {
  return patchData<MenuItem>(`/businesses/${businessId}/menu/${itemId}`, input)
}

export async function deleteMenuItem(businessId: string, itemId: string) {
  await deleteData(`/businesses/${businessId}/menu/${itemId}`)
}

export async function deleteCatalogItem(businessId: string, kind: CatalogKind, itemId: string) {
  await deleteData(`/businesses/${businessId}/${kind}/${itemId}`)
}

export async function updateCatalogItem(
  businessId: string,
  kind: CatalogKind,
  itemId: string,
  input: UpdateProductInput | UpdateServiceInput | UpdateMenuItemInput,
) {
  return patchData<Product | Service | MenuItem>(
    `/businesses/${businessId}/${kind}/${itemId}`,
    input,
  )
}
