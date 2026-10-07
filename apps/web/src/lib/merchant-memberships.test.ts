import {
  isCollaboratorMembership,
  isOwnerMembership,
  membershipRoleLabel,
} from "@/lib/merchant-memberships"
import type { Membership } from "@/services/types"

function membership(role: Membership["role"]): Membership {
  return {
    businessId: "b1",
    role,
    isActive: true,
    permissions: [],
    business: null,
  }
}

describe("merchant-memberships", () => {
  it("traduce roles conocidos", () => {
    expect(membershipRoleLabel("owner")).toBe("Dueño / Co-líder")
    expect(membershipRoleLabel("manager")).toBe("Encargado")
    expect(membershipRoleLabel("otro")).toBe("Colaborador")
  })

  it("detecta dueño vs colaborador", () => {
    expect(isOwnerMembership(membership("owner"))).toBe(true)
    expect(isCollaboratorMembership(membership("manager"))).toBe(true)
    expect(isCollaboratorMembership(membership("employee"))).toBe(true)
    expect(isCollaboratorMembership(membership("owner"))).toBe(false)
  })
})
