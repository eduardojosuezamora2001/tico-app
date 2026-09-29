import type { GalleryImage } from "@workspace/shared"

import { deleteData, getData, postData } from "@/services/http"

export async function listGalleryImages(businessId: string) {
  return getData<GalleryImage[]>(`/businesses/${businessId}/gallery`)
}

export async function addGalleryImage(businessId: string, input: { imageUrl: string }) {
  return postData<GalleryImage>(`/businesses/${businessId}/gallery`, input)
}

export async function removeGalleryImage(businessId: string, imageId: string) {
  await deleteData(`/businesses/${businessId}/gallery/${imageId}`)
}
