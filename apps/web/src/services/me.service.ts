import type { UpdateProfileInput, User } from "@workspace/shared"

import { getData, patchData } from "@/services/http"
import type { MePayload } from "@/services/types"

export async function getMe() {
  return getData<MePayload>("/me")
}

export async function updateProfile(input: UpdateProfileInput) {
  return patchData<User>("/me", input)
}
