import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@workspace/shared"

type Db = SupabaseClient<Database>

export async function isChainAdmin(db: Db, chainId: string, userId: string) {
  const { data: admin } = await db
    .from("business_chain_admins")
    .select("chain_id")
    .eq("chain_id", chainId)
    .eq("user_id", userId)
    .maybeSingle()
  if (admin) return true

  const { data: owned } = await db
    .from("businesses")
    .select("id")
    .eq("chain_id", chainId)
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle()
  if (owned) return true

  const { data: coOwned } = await db
    .from("business_users")
    .select("business_id, businesses!inner(chain_id)")
    .eq("user_id", userId)
    .eq("role", "owner")
    .eq("businesses.chain_id", chainId)
    .limit(1)
    .maybeSingle()

  return Boolean(coOwned)
}

export async function isBusinessOwnerForChain(db: Db, businessId: string, userId: string) {
  const { data: business } = await db
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle()
  if (business?.owner_id === userId) return true

  const { data: member } = await db
    .from("business_users")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle()

  return Boolean(member)
}

export async function collectChainIdsForUser(db: Db, userId: string) {
  const ids = new Set<string>()

  const [{ data: adminRows }, { data: ownedRows }, { data: memberRows }] = await Promise.all([
    db.from("business_chain_admins").select("chain_id").eq("user_id", userId),
    db.from("businesses").select("chain_id").eq("owner_id", userId).not("chain_id", "is", null),
    db
      .from("business_users")
      .select("businesses(chain_id)")
      .eq("user_id", userId)
      .eq("role", "owner"),
  ])

  for (const row of adminRows ?? []) ids.add(row.chain_id)
  for (const row of ownedRows ?? []) {
    if (row.chain_id) ids.add(row.chain_id)
  }
  for (const row of memberRows ?? []) {
    const joined = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses
    if (joined?.chain_id) ids.add(joined.chain_id)
  }

  return [...ids]
}
