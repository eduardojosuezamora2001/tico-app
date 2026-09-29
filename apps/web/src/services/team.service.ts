import type { AddBusinessUserInput, TeamMember, UpdateBusinessUserInput } from "@workspace/shared"

import { deleteData, getData, patchData, postData } from "@/services/http"

export async function listTeamMembers(businessId: string) {
  return getData<TeamMember[]>(`/businesses/${businessId}/team`)
}

export async function addTeamMember(businessId: string, input: AddBusinessUserInput) {
  return postData<TeamMember>(`/businesses/${businessId}/team`, input)
}

export async function updateTeamMember(
  businessId: string,
  memberId: string,
  input: UpdateBusinessUserInput,
) {
  return patchData<TeamMember>(`/businesses/${businessId}/team/${memberId}`, input)
}

export async function removeTeamMember(businessId: string, memberId: string) {
  await deleteData(`/businesses/${businessId}/team/${memberId}`)
}

export async function addCoOwner(businessId: string, input: { email: string }) {
  return postData<TeamMember>(`/businesses/${businessId}/team/co-owners`, input)
}
