import { useEffect, useState } from "react"
import { PERMISSION_DEFINITIONS, type PermissionName, type TeamMember } from "@workspace/shared"

import { api } from "@/lib/api"
import { Button } from "@workspace/ui/components/button"

const roleLabel = { owner: "Dueño", manager: "Encargado", employee: "Empleado" } as const

const moduleRows = [
  { id: "products", label: "Productos" },
  { id: "services", label: "Servicios" },
  { id: "menu", label: "Menú" },
  { id: "appointments", label: "Citas" },
] as const

const actionColumns = [
  { id: "view", label: "Ver" },
  { id: "create", label: "Crear" },
  { id: "edit_own", label: "Editar propios" },
  { id: "edit_all", label: "Editar todos" },
  { id: "delete_own", label: "Eliminar propios" },
  { id: "delete_all", label: "Eliminar todos" },
] as const

const extraPermissions = PERMISSION_DEFINITIONS.filter(
  (item) => !moduleRows.some((row) => row.id === item.module),
)

export function TeamPanel({ businessId }: { businessId: string }) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"manager" | "employee">("employee")
  const [permissions, setPermissions] = useState<PermissionName[]>([])
  const [error, setError] = useState<string | null>(null)

  function load() {
    void api
      .get<{ data: TeamMember[] }>(`/businesses/${businessId}/team`)
      .then((response) => {
        setMembers(response.data.data)
        setError(null)
      })
      .catch(() => setError("No se pudo cargar el equipo."))
  }

  useEffect(load, [businessId])

  function toggle(name: PermissionName) {
    setPermissions((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name],
    )
  }

  async function add(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await api.post(`/businesses/${businessId}/team`, { email, role, permissions })
      setEmail("")
      setPermissions([])
      load()
    } catch {
      setError("No se pudo agregar. La persona debe tener cuenta y no estar ya en el equipo.")
    }
  }

  async function remove(member: TeamMember) {
    setError(null)
    try {
      await api.delete(`/businesses/${businessId}/team/${member.id}`)
      load()
    } catch {
      setError("No se pudo quitar a esa persona.")
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold">Equipo</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Opcional. Puedes publicar el negocio y sumar personas después.
      </p>
      <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
        {members.map((member) => (
          <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span>
              <span className="block font-medium">{member.fullName ?? member.email}</span>
              <span className="block text-sm text-muted-foreground">
                {roleLabel[member.role]} · {member.email}
              </span>
            </span>
            {member.role === "owner" ? null : (
              <Button type="button" variant="outline" onClick={() => void remove(member)}>
                Quitar
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form className="mt-4 space-y-3" onSubmit={(event) => void add(event)}>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Correo de la persona"
          className="w-full rounded-xl border border-border bg-card px-3 py-2"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as "manager" | "employee")}
          className="w-full rounded-xl border border-border bg-card px-3 py-2"
        >
          <option value="employee">Empleado</option>
          <option value="manager">Encargado</option>
        </select>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
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
                    const name = `${row.id}:${column.id}` as PermissionName
                    return (
                      <td key={name} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${column.label} ${row.label}`}
                          checked={permissions.includes(name)}
                          onChange={() => toggle(name)}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-3 py-2 font-medium">Del negocio</th>
                <th className="px-3 py-2 text-center font-medium">Permitir</th>
              </tr>
            </thead>
            <tbody>
              {extraPermissions.map((item) => (
                <tr key={item.name} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{item.description}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      aria-label={item.description}
                      checked={permissions.includes(item.name as PermissionName)}
                      onChange={() => toggle(item.name as PermissionName)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit">Agregar al equipo</Button>
      </form>
    </section>
  )
}
