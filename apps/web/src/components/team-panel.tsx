import { useCallback, useEffect, useState } from "react"
import { PERMISSION_DEFINITIONS, type PermissionName, type TeamMember } from "@workspace/shared"

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
  { id: "view", label: "Ver", actions: ["view"] },
  { id: "create", label: "Crear", actions: ["create"] },
  { id: "manage", label: "Editar y eliminar", actions: [...manageActions] },
] as const

const extraPermissions = PERMISSION_DEFINITIONS.filter(
  (item) => !moduleRows.some((row) => row.id === item.module),
)

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
  const [role, setRole] = useState<"manager" | "employee">("employee")
  const [draft, setDraft] = useState<PermissionName[]>([])
  const [editor, setEditor] = useState<TeamMember | "draft" | null>(null)
  const [permissionsOpen, setPermissionsOpen] = useState(false)

  async function add(event: React.FormEvent) {
    event.preventDefault()
    team.setError(null)
    try {
      await addTeamMember(businessId, { email, role, permissions: draft })
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Equipo</h2>
        <p className="mt-1 text-sm text-muted-foreground">Puedes publicar el local y sumar personas después.</p>
      </div>
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
            onChange={(event) => setRole(event.target.value as "manager" | "employee")}
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
        title={editingMember ? `Permisos de ${editingMember.fullName ?? editingMember.email}` : "Permisos de la invitación"}
        description="Ver, crear y una sola opción para editar y eliminar. También puedes cambiarlos después en la sección Permisos."
        value={editingMember ? editingMember.permissions : draft}
        onOpenChange={setPermissionsOpen}
        onSave={async (permissions) => {
          if (!editingMember) {
            setDraft(permissions)
            setPermissionsOpen(false)
            return
          }
          team.setError(null)
          await updateTeamMember(businessId, editingMember.id, { permissions })
          team.reload()
          setPermissionsOpen(false)
        }}
      />
    </div>
  )
}

export function TeamPermissions({
  businessId,
  team,
}: {
  businessId: string
  team: ReturnType<typeof useBusinessTeam>
}) {
  const [member, setMember] = useState<TeamMember | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Permisos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Elige a una persona y ajusta lo que puede hacer en este local.</p>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
        {team.members.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0">
              <span className="block truncate font-medium">{item.fullName ?? item.email}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {roleLabel[item.role]} · {item.email}
              </span>
            </span>
            {item.role === "owner" ? (
              <span className="text-sm text-muted-foreground">Acceso completo</span>
            ) : (
              <Button type="button" variant="outline" onClick={() => { setMember(item); setOpen(true) }}>
                Cambiar permisos
              </Button>
            )}
          </li>
        ))}
      </ul>
      {team.error ? <p className="text-sm text-destructive">{team.error}</p> : null}
      <PermissionDialog
        open={open}
        title={member ? `Permisos de ${member.fullName ?? member.email}` : "Permisos"}
        description="Ver, crear y una sola opción para editar y eliminar en cada parte del local."
        value={member?.permissions ?? []}
        onOpenChange={setOpen}
        onSave={async (permissions) => {
          if (!member) return
          team.setError(null)
          await updateTeamMember(businessId, member.id, { permissions })
          team.reload()
          setOpen(false)
        }}
      />
    </div>
  )
}

function PermissionDialog({
  open,
  title,
  description,
  value,
  onOpenChange,
  onSave,
}: {
  open: boolean
  title: string
  description: string
  value: PermissionName[]
  onOpenChange: (open: boolean) => void
  onSave: (permissions: PermissionName[]) => Promise<void>
}) {
  const [permissions, setPermissions] = useState<PermissionName[]>(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPermissions(value)
      setError(null)
    }
  }, [open, value])

  function toggle(names: PermissionName[]) {
    setPermissions((current) => toggleGroup(current, names))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto overflow-y-hidden rounded-xl border border-border">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Categoría</th>
                {actionColumns.map((column) => (
                  <th key={column.id} className="px-2 py-2 text-center font-medium">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {moduleRows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <th className="px-3 py-2 text-left font-medium">{row.label}</th>
                  {actionColumns.map((column) => {
                    const names = namesFor(row.id, column.actions)
                    return (
                      <td key={column.id} className="px-2 py-2 text-center">
                        <Checkbox
                          className="mx-auto"
                          aria-label={`${column.label} ${row.label}`}
                          checked={groupChecked(permissions, names)}
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
        <div className="overflow-x-auto overflow-y-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Del negocio</th>
                <th className="px-3 py-2 text-center font-medium">Permitir</th>
              </tr>
            </thead>
            <tbody>
              {extraPermissions.map((item) => {
                const name = item.name as PermissionName
                return (
                  <tr key={item.name} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-center">
                      <Checkbox
                        className="mx-auto"
                        aria-label={item.description}
                        checked={permissions.includes(name)}
                        onCheckedChange={() => toggle([name])}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
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
