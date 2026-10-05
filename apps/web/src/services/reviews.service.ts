import type { CreateReviewInput, Review, UpdateReviewInput } from "@workspace/shared"

import { deleteData, getData, patchData, postData } from "@/services/http"

export async function listBusinessReviews(businessId: string) {
  return getData<Review[]>(`/businesses/${businessId}/reviews`)
}

export async function upsertBusinessReview(businessId: string, input: CreateReviewInput) {
  return postData<Review, CreateReviewInput>(`/businesses/${businessId}/reviews`, input)
}

export async function updateBusinessReview(
  businessId: string,
  reviewId: string,
  input: UpdateReviewInput,
) {
  return patchData<Review, UpdateReviewInput>(
    `/businesses/${businessId}/reviews/${reviewId}`,
    input,
  )
}

export async function removeBusinessReview(businessId: string, reviewId: string) {
  await deleteData(`/businesses/${businessId}/reviews/${reviewId}`)
}
