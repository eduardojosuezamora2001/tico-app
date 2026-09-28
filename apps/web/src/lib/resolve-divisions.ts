import type { AdministrativeDivision } from "@workspace/shared"

import { api } from "@/lib/api"

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
}

function matchDivision(name: string, divisions: AdministrativeDivision[]) {
  const target = normalizeName(name)
  return (
    divisions.find((division) => normalizeName(division.name) === target) ??
    divisions.find((division) => normalizeName(division.name).includes(target)) ??
    divisions.find((division) => target.includes(normalizeName(division.name))) ??
    null
  )
}

/** Intenta mapear nombres del geocoder a IDs de divisiones en orden jerárquico. */
export async function resolveDivisionIds(
  countryCode: string,
  adminNames: string[],
): Promise<string[]> {
  const ids: string[] = []
  let parentId: string | null = null

  for (const name of adminNames) {
    if (!name.trim()) continue
    const response = await api.get<{ data: AdministrativeDivision[] }>(
      "/administrative-divisions",
      {
        params: {
          country: countryCode,
          ...(parentId ? { parentId } : {}),
        },
      },
    )
    const match = matchDivision(name, response.data.data)
    if (!match) break
    ids.push(match.id)
    parentId = match.id
  }

  return ids
}
