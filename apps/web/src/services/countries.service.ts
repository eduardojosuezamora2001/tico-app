import type {
  AdministrativeDivision,
  Country,
  CountryAdministrativeLevel,
} from "@workspace/shared"

import { getData } from "@/services/http"

export async function listCountries() {
  return getData<Country[]>("/countries")
}

export async function listAdministrativeLevels(countryCode: string) {
  return getData<CountryAdministrativeLevel[]>(
    `/countries/${countryCode}/administrative-levels`,
  )
}

export async function listAdministrativeDivisions(params: {
  country: string
  parentId?: string
}) {
  return getData<AdministrativeDivision[]>("/administrative-divisions", params)
}

export async function getDivisionChain(divisionId: string) {
  return getData<Array<{ id: string }>>(`/administrative-divisions/chain/${divisionId}`)
}
