import { useCallback, useEffect, useState } from "react"
import {
  BUSINESS_ROLES,
  BUSINESS_ROLE_PERMISSION_CEILINGS,
  PERMISSION_DEFINITIONS,
  clampPermissionsToRoleCeiling,
  isPermissionAllowedForRole,
  type AssignableBusinessRole,
  type PermissionName,
  type TeamMember,
} from "@workspace/shared"

import {
  addTeamMember,
  listTeamMembers,
  removeTeamMember,
  updateTeamMember,
} from "@/services/team.service"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"

const roleLabel = { owner: "Dueño", manager: "Encargado", employee: "Empleado" } as const

const moduleRows = [
  { id: "products", label: "Productos" },
  { id: "services", label: "Servicios" },
  { id: "menu", label: "Menú" },
  { id: "appointments", label: "Citas" },
] as const

const manageActions = ["edit_own", "edit_all", "delete_own", "delete_all"] as const

const actionColumns = [
  {
    id: "view",
    label: "Ver",
    actions: ["view"],
    roleHint: "Empleado y encargado",
  },
  {
    id: "create",
    label: "Crear",
    actions: ["create"],
    roleHint: "Empleado y encargado",
  },
  {
    id: "manage",
    label: "Editar y eliminar",
    actions: [...manageActions],
    roleHint: "Empleado y encargado",
  },
] as const

const extraPermissions = PERMISSION_DEFINITIONS.filter(
  (item) => !moduleRows.some((row) => row.id === item.module),
)

function permissionRoleHint(permission: string) {
  const forEmployee = isPermissionAllowedForRole(BUSINESS_ROLES.EMPLOYEE, permission)
  const forManager = isPermissionAllowedForRole(BUSINESS_ROLES.MANAGER, permission)
  if (forEmployee && forManager) return "Empleado y encargado"
  if (forManager) return "Solo encargado"
  return "No asignable"
}

function namesFor(moduleId: string, actions: readonly string[]) {
  return actions.map((action) => `${moduleId}:${action}` as PermissionName)
}

function groupChecked(permissions: PermissionName[], names: PermissionName[]) {
  return names.some((name) => permissions.includes(name))
}

function toggleGroup(permissions: PermissionName[], names: PermissionName[]) {
  const enabled = groupChecked(permissions, names)
  return enabled
    ? permissions.filter((name) => !names.includes(name))
    : [...permissions, ...names.filter((name) => !permissions.includes(name))]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?"
}

export function useBusinessTeam(businessId: string) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    if (!businessId) return
    void listTeamMembers(businessId)
      .then((rows) => {
        setMembers(rows)
        setError(null)
      })
      .catch(() => setError("No se pudo cargar el equipo."))
  }, [businessId])

  useEffect(() => {
    reload()
  }, [reload])

  return { members, error, setError, reload }
}

export function TeamRoster({
  businessId,
  team,
}: {
  businessId: string
  team: ReturnType<typeof useBusinessTeam>
}) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<AssignableBusinessRole>(BUSINESS_ROLES.EMPLOYEE)
  const [draft, setDraft] = useState<PermissionName[]>([])
  const [editor, setEditor] = useState<TeamMember | "draft" | null>(null)
  const [permissionsOpen, setPermissionsOpen] = useState(false)

  function changeInviteRole(next: AssignableBusinessRole) {
    setRole(next)
    setDraft((current) => clampPermissionsToRoleCeiling(next, current) as PermissionName[])
  }

  async function add(event: React.FormEvent) {
    event.preventDefault()
    team.setError(null)
    try {
      await addTeamMember(businessId, {
        email,
        role,
        permissions: clampPermissionsToRoleCeiling(role, draft) as PermissionName[],
      })
      setEmail("")
      setDraft([])
      team.reload()
    } catch {
      team.setError("No se pudo agregar. La persona debe tener cuenta y no estar ya en el equipo.")
    }
  }

  async function setActive(member: TeamMember, isActive: boolean) {
    team.setError(null)
    try {
      await updateTeamMember(businessId, member.id, { isActive })
      team.reload()
    } catch {
      team.setError(isActive ? "No se pudo activar a esa persona." : "No se pudo desactivar a esa persona.")
    }
  }

  async function changeMemberRole(member: TeamMember, next: AssignableBusinessRole) {
    if (member.role === next) return
    team.setError(null)
    try {
      await updateTeamMember(businessId, member.id, { role: next })
      if (editor && editor !== "draft" && editor.id === member.id) {
        setEditor({ ...editor, role: next, permissions: clampPermissionsToRoleCeiling(next, editor.permissions) as PermissionName[] })
      }
      team.reload()
    } catch {
      team.setError("No se pudo cambiar el rol.")
    }
  }

  async function remove(member: TeamMember) {
    team.setError(null)
    try {
      await removeTeamMember(businessId, member.id)
      team.reload()
    } catch {
      team.setError("No se pudo quitar a esa persona.")
    }
  }

  const editingMember = editor && editor !== "draft" ? editor : null
  const dialogRole: AssignableBusinessRole = editingMember
    ? (editingMember.role as AssignableBusinessRole)
    : role

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Equipo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invita personas, elige su rol y asigna permisos. El empleado no puede superar el techo del encargado.
        </p>
      </div>

      <RolePermissionGuide />

      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
        {team.members.map((member) => {
          const label = member.fullName ?? member.email
          return (
            <li key={member.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback>{initials(label)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{label}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {roleLabel[member.role]} · {member.email}
                  </span>
                </span>
              </div>
              {member.role === "owner" ? (
                <span className="text-sm text-muted-foreground">Acceso completo</span>
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  <select
                    value={member.role}
                    aria-label={`Rol de ${label}`}
                    onChange={(event) =>
                      void changeMemberRole(member, event.target.value as AssignableBusinessRole)
                    }
                    className="h-9 rounded-xl border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="employee">Empleado</option>
                    <option value="manager">Encargado</option>
                  </select>
                  <Button
                    type="button"
                    variant={member.isActive ? "secondary" : "outline"}
                    aria-pressed={member.isActive}
                    onClick={() => void setActive(member, !member.isActive)}
                  >
                    {member.isActive ? "Activo" : "Inactivo"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setEditor(member); setPermissionsOpen(true) }}>
                    Permisos
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void remove(member)}>
                    Quitar
                  </Button>
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <form className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4" onSubmit={(event) => void add(event)}>
        <h3 className="font-medium">Invitar a alguien</h3>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <Input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Correo de la persona"
            aria-label="Correo de la persona"
            className="h-11 rounded-xl"
          />
          <select
            value={role}
            onChange={(event) => changeInviteRole(event.target.value as AssignableBusinessRole)}
            aria-label="Rol"
            className="h-11 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="employee">Empleado</option>
            <option value="manager">Encargado</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => { setEditor("draft"); setPermissionsOpen(true) }}>
            Permisos{draft.length ? ` · ${draft.length}` : ""}
          </Button>
          <Button type="submit" className="rounded-full px-5">
            Agregar al equipo
          </Button>
        </div>
      </form>
      {team.error ? <p className="text-sm text-destructive">{team.error}</p> : null}

      <PermissionDialog
        open={permissionsOpen}
        role={dialogRole}
        title={editingMember ? `Permisos de ${editingMember.fullName ?? editingMember.email}` : "Permisos de la invitación"}
        description={
          dialogRole === BUSINESS_ROLES.EMPLOYEE
            ? "Techo de empleado: operaciones del día a día. No incluye administrar equipo ni editar el perfil del local."
            : "Techo de encargado: puede recibir casi todos los permisos del catálogo."
        }
        value={editingMember ? editingMember.permissions : draft}
        onOpenChange={setPermissionsOpen}
        onSave={async (permissions) => {
          const clamped = clampPermissionsToRoleCeiling(dialogRole, permissions) as PermissionName[]
          if (!editingMember) {
            setDraft(clamped)
            setPermissionsOpen(false)
            return
          }
          team.setError(null)
          await updateTeamMember(businessId, editingMember.id, { permissions: clamped })
          team.reload()
          setPermissionsOpen(false)
        }}
      />
    </div>
  )
}

function RolePermissionGuide() {
  const employeeCeiling = new Set(BUSINESS_ROLE_PERMISSION_CEILINGS.employee)
  const managerOnly = PERMISSION_DEFINITIONS.filter((item) => !employeeCeiling.has(item.name))
  const employeeExtras = PERMISSION_DEFINITIONS.filter(
    (item) =>
      employeeCeiling.has(item.name) && !moduleRows.some((row) => row.id === item.module),
  )

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="font-medium">Qué puede tener cada rol</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        El rol fija el techo máximo. Luego marcas en cada persona solo lo que necesita.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-sm font-semibold">Dueño</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
            <li>Acceso completo al local (implícito).</li>
            <li>No se limitan permisos desde esta pantalla.</li>
            <li>Puede invitar encargados y empleados.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-sm font-semibold">Encargado</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
            <li>Puede recibir cualquier permiso del catálogo.</li>
            <li>Incluye administrar equipo, editar ficha, bitácora, horarios y eventos.</li>
            <li>Puede ver, crear, editar y eliminar todo el catálogo.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-sm font-semibold">Empleado</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
            <li>Productos, servicios, menú y citas: ver, crear, editar y eliminar (todo el catálogo).</li>
            {employeeExtras.map((item) => (
              <li key={item.name}>{item.description}.</li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fuera de techo (solo encargado)
          </p>
          <ul className="mt-1.5 flex flex-col gap-1 text-sm text-muted-foreground">
            {managerOnly.map((item) => (
              <li key={item.name}>{item.description}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function PermissionDialog({
  open,
  role,
  title,
  description,
  value,
  onOpenChange,
  onSave,
}: {
  open: boolean
  role: AssignableBusinessRole
  title: string
  description: string
  value: PermissionName[]
  onOpenChange: (open: boolean) => void
  onSave: (permissions: PermissionName[]) => Promise<void>
}) {
  const [permissions, setPermissions] = useState<PermissionName[]>(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const roleName = roleLabel[role]

  useEffect(() => {
    if (open) {
      setPermissions(clampPermissionsToRoleCeiling(role, value) as PermissionName[])
      setError(null)
    }
  }, [open, value, role])

  function toggle(names: PermissionName[]) {
    const allowed = names.filter((name) => isPermissionAllowedForRole(role, name))
    if (allowed.length === 0) return
    setPermissions((current) => toggleGroup(current, allowed))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,56rem)] w-full flex-col gap-4 overflow-hidden sm:!max-w-2xl lg:!max-w-3xl">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description} Editando como <span className="font-medium text-foreground">{roleName}</span>:
            las casillas fuera de su techo quedan deshabilitadas.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="rounded-xl border border-border">
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[36%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-3 py-2.5 font-medium">Categoría</th>
                  {actionColumns.map((column) => (
                    <th key={column.id} className="px-2 py-2.5 text-center font-medium">
                      <span className="block">{column.label}</span>
                      <span className="mt-1 block text-[11px] font-normal leading-snug text-muted-foreground">
                        {column.roleHint}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {moduleRows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <th className="px-3 py-2.5 text-left font-medium">{row.label}</th>
                    {actionColumns.map((column) => {
                      const names = namesFor(row.id, column.actions).filter((name) =>
                        isPermissionAllowedForRole(role, name),
                      )
                      const allowed = names.length > 0
                      return (
                        <td key={column.id} className="px-2 py-2.5 text-center align-middle">
                          <Checkbox
                            className="mx-auto"
                            aria-label={`${column.label} ${row.label}`}
                            checked={allowed && groupChecked(permissions, names)}
                            disabled={!allowed}
                            onCheckedChange={() => toggle(names)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-3 py-2.5 font-medium">Del negocio</th>
                  <th className="w-28 px-3 py-2.5 text-center font-medium sm:w-36">
                    <span className="block">Permitir</span>
                    <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                      Según rol
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {extraPermissions.map((item) => {
                  const name = item.name as PermissionName
                  const allowed = isPermissionAllowedForRole(role, name)
                  const hint = permissionRoleHint(name)
                  return (
                    <tr key={item.name} className="border-b border-border last:border-0">
                      <td className="px-3 py-2.5">
                        <p>{item.description}</p>
                        <p
                          className={
                            allowed
                              ? "mt-1 text-[11px] text-muted-foreground"
                              : "mt-1 text-[11px] text-amber-700 dark:text-amber-400"
                          }
                        >
                          {hint}
                          {!allowed ? ` · no disponible para ${roleName.toLowerCase()}` : null}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <Checkbox
                          className="mx-auto"
                          aria-label={item.description}
                          checked={permissions.includes(name)}
                          disabled={!allowed}
                          onCheckedChange={() => toggle([name])}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {error ? <p className="shrink-0 text-sm text-destructive">{error}</p> : null}
        <DialogFooter className="shrink-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="rounded-full px-5"
            disabled={saving}
            onClick={() => {
              setSaving(true)
              setError(null)
              void onSave(permissions)
                .catch(() => setError("No se pudieron guardar los permisos."))
                .finally(() => setSaving(false))
            }}
          >
            {saving ? "Guardando…" : "Guardar permisos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
