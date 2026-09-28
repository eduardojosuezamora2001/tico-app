import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@workspace/shared"

type Db = SupabaseClient<Database>

export async function ensureCountryExists(db: Db, countryId: string) {
  const { data, error } = await db
    .from("countries")
    .select("id")
    .eq("id", countryId)
    .eq("is_active", true)
    .maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function ensureDivisionBelongsToCountry(
  db: Db,
  divisionId: string,
  countryId: string,
) {
  const { data, error } = await db
    .from("administrative_divisions")
    .select("id, country_id, parent_id, level")
    .eq("id", divisionId)
    .eq("is_active", true)
    .maybeSingle()
  if (error) throw error
  if (!data || data.country_id !== countryId) return null
  return data
}

/** Verifica que cada padre en la cadena pertenece al país y respeta niveles ascendentes. */
export async function validateDivisionChain(
  db: Db,
  divisionId: string,
  countryId: string,
) {
  const division = await ensureDivisionBelongsToCountry(db, divisionId, countryId)
  if (!division) return false

  let current = division
  while (current.parent_id) {
    const { data: parent, error } = await db
      .from("administrative_divisions")
      .select("id, country_id, parent_id, level")
      .eq("id", current.parent_id)
      .maybeSingle()
    if (error) throw error
    if (!parent || parent.country_id !== countryId || parent.level >= current.level) {
      return false
    }
    current = parent
  }

  return true
}
