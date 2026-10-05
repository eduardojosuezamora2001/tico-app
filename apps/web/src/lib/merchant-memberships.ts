import { PERMISSION_DEFINITIONS, type BusinessChain } from "@workspace/shared"

import type { Membership } from "@/services/types"

export type MerchantSectionFilter = "all" | "chains" | "owned" | "collaborator"

export type MerchantMembershipGroups = {
  owned: Membership[]
  collaborator: Membership[]
  chains: BusinessChain[]
}

const roleLabels: Record<string, string> = {
  owner: "Dueño / Co-líder",
  manager: "Encargado",
  employee: "Empleado",
}

const permissionLabels = new Map(
  PERMISSION_DEFINITIONS.map((item) => [item.name, item.description]),
)

export function membershipRoleLabel(role: string) {
  return roleLabels[role] ?? "Colaborador"
}

export function isOwnerMembership(membership: Membership) {
  return membership.role === "owner"
}

export function isCollaboratorMembership(membership: Membership) {
  return membership.role === "manager" || membership.role === "employee"
}

export function isActiveMemberOfBusiness(memberships: Membership[], businessId: string) {
  return memberships.some((row) => row.businessId === businessId && row.isActive)
}

function isShownInChains(membership: Membership, chainBusinessIds: Set<string>) {
  return chainBusinessIds.has(membership.businessId)
}

export function groupMemberships(
  memberships: Membership[],
  chains: BusinessChain[] = [],
): MerchantMembershipGroups {
  const chainBusinessIds = new Set(
    chains.flatMap((chain) => chain.locations.map((location) => location.businessId)),
  )

  const owned: Membership[] = []
  const collaborator: Membership[] = []

  for (const row of memberships) {
    if (isOwnerMembership(row)) {
      if (!isShownInChains(row, chainBusinessIds)) owned.push(row)
    } else if (isCollaboratorMembership(row)) {
      collaborator.push(row)
    }
  }

  return { owned, collaborator, chains }
}

export function eligibleBusinessesForChain(memberships: Membership[]) {
  return memberships.filter(
    (row) => isOwnerMembership(row) && row.business && !row.business.chainId,
  )
}

export function filterMemberships(
  memberships: Membership[],
  query: string,
): Membership[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return memberships

  return memberships.filter((row) => {
    const business = row.business
    if (!business) return false
    const haystack = [business.name, business.category, business.address, business.slug, row.role]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return haystack.includes(needle)
  })
}

export function filterChains(chains: BusinessChain[], query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return chains

  return chains
    .map((chain) => ({
      ...chain,
      locations: chain.locations.filter((location) => {
        const haystack = [chain.name, location.name, location.category, location.address, location.slug]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return haystack.includes(needle)
      }),
    }))
    .filter(
      (chain) =>
        chain.name.toLowerCase().includes(needle) ||
        chain.slug.toLowerCase().includes(needle) ||
        chain.locations.length > 0,
    )
}

export function permissionSummary(permissions: string[], limit = 4) {
  return permissions.slice(0, limit).map((name) => ({
    name,
    label: permissionLabels.get(name) ?? name,
  }))
}

export function collaboratorRestrictions(permissions: string[]) {
  const granted = new Set(permissions)
  return [
    {
      label: "Eliminar o transferir el local",
      allowed: false,
    },
    {
      label: "Gestionar equipo y permisos",
      allowed: granted.has("employees:manage"),
    },
    {
      label: "Editar ficha del negocio",
      allowed: granted.has("business:edit"),
    },
  ]
}

export function merchantCounts(groups: MerchantMembershipGroups) {
  const branchCount = groups.chains.reduce((sum, chain) => sum + chain.locations.length, 0)
  const ownedCount = groups.owned.length
  const collaboratorCount = groups.collaborator.length
  return {
    all: branchCount + ownedCount + collaboratorCount,
    chains: groups.chains.length,
    owned: ownedCount,
    collaborator: collaboratorCount,
  }
}
