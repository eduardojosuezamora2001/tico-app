import {
  UpdateAddressSchema,
  type CreateAddressInput,
  type TablesInsert,
  type TablesUpdate,
} from "@workspace/shared"
import type { z } from "zod"

type AddressInput = z.infer<typeof UpdateAddressSchema>
type AddressInsert = TablesInsert<"addresses">
type AddressUpdate = TablesUpdate<"addresses">

export function addressInsertFromInput(input: CreateAddressInput): AddressInsert {
  return {
    country_id: input.countryId,
    administrative_division_id: input.administrativeDivisionId ?? null,
    postal_code: input.postalCode ?? null,
    address_line_1: input.addressLine1,
    address_line_2: input.addressLine2 ?? null,
    reference: input.reference ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    formatted_address: input.formattedAddress ?? null,
    place_id: input.placeId ?? null,
  }
}

export function addressPatchFromInput(input: AddressInput): AddressUpdate {
  const patch: AddressUpdate = {}
  if (input.countryId !== undefined) patch.country_id = input.countryId
  if (input.administrativeDivisionId !== undefined) {
    patch.administrative_division_id = input.administrativeDivisionId ?? null
  }
  if (input.postalCode !== undefined) patch.postal_code = input.postalCode || null
  if (input.addressLine1 !== undefined) patch.address_line_1 = input.addressLine1
  if (input.addressLine2 !== undefined) patch.address_line_2 = input.addressLine2 || null
  if (input.reference !== undefined) patch.reference = input.reference || null
  if (input.latitude !== undefined) patch.latitude = input.latitude ?? null
  if (input.longitude !== undefined) patch.longitude = input.longitude ?? null
  if (input.formattedAddress !== undefined) {
    patch.formatted_address = input.formattedAddress || null
  }
  if (input.placeId !== undefined) patch.place_id = input.placeId || null
  return patch
}
