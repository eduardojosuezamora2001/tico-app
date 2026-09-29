import type { Address, CreateAddressInput, UpdateAddressInput } from "@workspace/shared"

import { deleteData, getData, patchData, postData } from "@/services/http"

export async function getAddress(addressId: string) {
  return getData<Address>(`/addresses/${addressId}`)
}

export async function createAddress(input: CreateAddressInput) {
  return postData<Address>("/addresses", input)
}

export async function updateAddress(addressId: string, input: UpdateAddressInput) {
  return patchData<Address>(`/addresses/${addressId}`, input)
}

export async function deleteAddress(addressId: string) {
  await deleteData(`/addresses/${addressId}`)
}
