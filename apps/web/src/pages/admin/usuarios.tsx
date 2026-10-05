import { useEffect, useState, startTransition, useTransition } from "react"
import { Link, useSearchParams } from "react-router"
import type { AdminUserListItem, UserRole } from "@workspace/shared"
import { ROLES } from "@workspace/shared"
import { Add01Icon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { createAdminUser, listAdminUsers, updateAdminUserRole } from "@/services/admin.service"
import { Badge } from "@workspace/ui/components/badge"
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
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group"

type RoleFilter = "all" | UserRole

const ROLE_FILTER_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: ROLES.ADMIN, label: "Admins" },
  { value: ROLES.BUSINESS_OWNER, label: "Dueños" },
  { value: ROLES.BUSINESS_EMPLOYEE, label: "Equipo" },
  { value: ROLES.CLIENT, label: "Clientes" },
]

const ROLE_LABEL: Record<UserRole, string> = {
  [ROLES.ADMIN]: "Super Admin",
  [ROLES.BUSINESS_OWNER]: "Dueño",
  [ROLES.BUSINESS_EMPLOYEE]: "Empleado",
  [ROLES.CLIENT]: "Cliente",
}

const ASSIGNABLE_ROLES: UserRole[] = [
  ROLES.CLIENT,
  ROLES.BUSINESS_EMPLOYEE,
  ROLES.BUSINESS_OWNER,
  ROLES.ADMIN,
]

function errorMessage(reason: unknown, fallback: string) {
  if (reason && typeof reason === "object" && "response" in reason) {
    const data = (reason as { response?: { data?: { error?: { message?: string } } } }).response
      ?.data
    if (data?.error?.message) return data.error.message
  }
  if (reason instanceof Error && reason.message) return reason.message
  return fallback
}

function RoleBadge({ role }: { role: UserRole }) {
  const variant =
    role === ROLES.ADMIN
      ? "default"
      : role === ROLES.BUSINESS_OWNER
        ? "secondary"
        : "outline"
  return (
    <Badge
      variant={variant}
      className={
        role === ROLES.ADMIN
          ? "bg-[oklch(0.55_0.22_285)] text-white"
          : "border-[oklch(0.35_0.04_285)] text-[oklch(0.78_0.02_280)]"
      }
    >
      {ROLE_LABEL[role]}
    </Badge>
  )
}

export function AdminUsuariosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const qParam = searchParams.get("q") ?? ""
  const roleParam = (searchParams.get("role") as RoleFilter | null) ?? "all"
  const role: RoleFilter = ROLE_FILTER_OPTIONS.some((o) => o.value === roleParam)
    ? roleParam
    : "all"

  const [query, setQuery] = useState(qParam)
  const [items, setItems] = useState<AdminUserListItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [, startPending] = useTransition()

  useEffect(() => {
    setQuery(qParam)
  }, [qParam])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void listAdminUsers({
      q: qParam || undefined,
      role,
      limit: 40,
    })
      .then((page) => {
        if (!active) return
        setItems(page.data)
        setNextCursor(page.nextCursor)
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(errorMessage(reason, "No se pudieron cargar los usuarios."))
        setItems([])
        setNextCursor(null)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [qParam, role])

  function setRoleFilter(next: RoleFilter) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      if (next === "all") params.delete("role")
      else params.set("role", next)
      setSearchParams(params, { replace: true })
    })
  }

  function applySearch() {
    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      const trimmed = query.trim()
      if (trimmed) params.set("q", trimmed)
      else params.delete("q")
      setSearchParams(params, { replace: true })
    })
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await listAdminUsers({
        q: qParam || undefined,
        role,
        limit: 40,
        cursor: nextCursor,
      })
      setItems((prev) => [...prev, ...page.data])
      setNextCursor(page.nextCursor)
    } catch (reason) {
      toast.error(errorMessage(reason, "No se pudo cargar más."))
    } finally {
      setLoadingMore(false)
    }
  }

  function patchLocal(updated: AdminUserListItem) {
    setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
  }

  function changeRole(row: AdminUserListItem, nextRole: UserRole) {
    if (row.role === nextRole) return
    startPending(() => {
      void toast.promise(
        updateAdminUserRole(row.id, { role: nextRole }).then((updated) => {
          patchLocal(updated)
        }),
        {
          loading: "Actualizando rol…",
          success: "Rol actualizado",
          error: (reason) => errorMessage(reason, "No se pudo cambiar el rol"),
        },
      )
    })
  }

  function handleCreated(user: AdminUserListItem) {
    setItems((prev) => [user, ...prev.filter((row) => row.id !== user.id)])
    setCreateOpen(false)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Usuarios & dueños</h2>
          <p className="mt-1 text-sm text-[oklch(0.7_0.02_280)]">
            Cuentas de la plataforma, roles globales y negocios que cada dueño tiene registrados.
          </p>
        </div>
        <Button
          type="button"
          className="rounded-full bg-[oklch(0.55_0.22_285)] text-white hover:bg-[oklch(0.5_0.22_285)]"
          onClick={() => setCreateOpen(true)}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
          Crear cuenta
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          value={[role]}
          onValueChange={(value) => {
            const next = value[0] as RoleFilter | undefined
            if (next) setRoleFilter(next)
          }}
          variant="outline"
          size="sm"
          spacing={2}
          aria-label="Filtrar por rol"
          className="flex-wrap"
        >
          {ROLE_FILTER_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <form
          className="w-full sm:max-w-sm"
          onSubmit={(event) => {
            event.preventDefault()
            applySearch()
          }}
        >
          <InputGroup className="border-[oklch(0.32_0.03_275)] bg-[oklch(0.2_0.03_275)]">
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por email o nombre"
              className="text-[oklch(0.96_0.01_280)] placeholder:text-[oklch(0.55_0.02_280)]"
            />
          </InputGroup>
        </form>
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[oklch(0.3_0.03_275)]">
        <Table>
          <TableHeader>
            <TableRow className="border-[oklch(0.3_0.03_275)] hover:bg-transparent">
              <TableHead className="text-[oklch(0.65_0.02_280)]">Usuario</TableHead>
              <TableHead className="text-[oklch(0.65_0.02_280)]">Rol</TableHead>
              <TableHead className="text-[oklch(0.65_0.02_280)]">Negocios</TableHead>
              <TableHead className="text-[oklch(0.65_0.02_280)]">Alta</TableHead>
              <TableHead className="text-right text-[oklch(0.65_0.02_280)]">Rol plataforma</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index} className="border-[oklch(0.28_0.03_275)]">
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full bg-[oklch(0.28_0.03_275)]" />
                    </TableCell>
                  </TableRow>
                ))
              : null}
            {!loading && items.length === 0 ? (
              <TableRow className="border-[oklch(0.28_0.03_275)] hover:bg-transparent">
                <TableCell colSpan={5}>
                  <Empty className="py-10">
                    <EmptyHeader>
                      <EmptyTitle className="text-white">Sin resultados</EmptyTitle>
                      <EmptyDescription className="text-[oklch(0.65_0.02_280)]">
                        Probá otro filtro o término de búsqueda.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : null}
            {!loading
              ? items.map((row) => (
                  <TableRow key={row.id} className="border-[oklch(0.28_0.03_275)]">
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-white">
                          {row.fullName?.trim() || "Sin nombre"}
                        </span>
                        <span className="text-xs text-[oklch(0.65_0.02_280)]">{row.email}</span>
                        <span className="font-mono text-[10px] text-[oklch(0.5_0.02_280)]">{row.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={row.role} />
                    </TableCell>
                    <TableCell>
                      {row.ownedBusinessCount > 0 ? (
                        <Link
                          to={`/admin/comercios?q=${encodeURIComponent(row.email)}`}
                          className="text-sm text-[oklch(0.75_0.1_285)] hover:underline"
                        >
                          {row.ownedBusinessCount} local{row.ownedBusinessCount === 1 ? "" : "es"}
                        </Link>
                      ) : (
                        <span className="text-sm text-[oklch(0.55_0.02_280)]">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-[oklch(0.7_0.02_280)]">
                      {new Date(row.createdAt).toLocaleDateString("es-CR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <select
                        value={row.role}
                        onChange={(event) => changeRole(row, event.target.value as UserRole)}
                        className="rounded-lg border border-[oklch(0.35_0.04_285)] bg-[oklch(0.18_0.03_275)] px-2 py-1.5 text-sm text-[oklch(0.92_0.01_280)]"
                        aria-label={`Cambiar rol de ${row.email}`}
                      >
                        {ASSIGNABLE_ROLES.map((value) => (
                          <option key={value} value={value}>
                            {ROLE_LABEL[value]}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </div>

      {nextCursor ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="border-[oklch(0.35_0.04_285)] text-[oklch(0.85_0.02_280)]"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? <Spinner className="size-4" /> : "Cargar más"}
          </Button>
        </div>
      ) : null}

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  )
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (user: AdminUserListItem) => void
}) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>(ROLES.CLIENT)
  const [emailConfirm, setEmailConfirm] = useState(true)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setFullName("")
    setEmail("")
    setPassword("")
    setRole(ROLES.CLIENT)
    setEmailConfirm(true)
    setFormError(null)
    setPending(false)
  }, [open])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setFormError(null)
    try {
      const created = await createAdminUser({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        emailConfirm,
      })
      toast.success("Cuenta creada")
      onCreated(created)
    } catch (reason) {
      setFormError(errorMessage(reason, "No se pudo crear la cuenta"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(100%-2rem,28rem)] border-[oklch(0.3_0.03_275)] bg-[oklch(0.18_0.03_275)] text-[oklch(0.96_0.01_280)]">
        <DialogHeader>
          <DialogTitle className="text-white">Crear cuenta</DialogTitle>
          <DialogDescription className="text-[oklch(0.7_0.02_280)]">
            Alta manual en Auth y perfil de plataforma. La persona podrá iniciar sesión con el
            correo y la contraseña que indiques.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="admin-create-name">Nombre</FieldLabel>
              <Input
                id="admin-create-name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="border-[oklch(0.35_0.04_285)] bg-[oklch(0.2_0.03_275)]"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-create-email">Correo</FieldLabel>
              <Input
                id="admin-create-email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-[oklch(0.35_0.04_285)] bg-[oklch(0.2_0.03_275)]"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-create-password">Contraseña</FieldLabel>
              <Input
                id="admin-create-password"
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-[oklch(0.35_0.04_285)] bg-[oklch(0.2_0.03_275)]"
              />
              <FieldDescription className="text-[oklch(0.6_0.02_280)]">
                Mínimo 8 caracteres.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-create-role">Rol de plataforma</FieldLabel>
              <select
                id="admin-create-role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="h-9 w-full rounded-lg border border-[oklch(0.35_0.04_285)] bg-[oklch(0.2_0.03_275)] px-3 text-sm"
              >
                {ASSIGNABLE_ROLES.map((value) => (
                  <option key={value} value={value}>
                    {ROLE_LABEL[value]}
                  </option>
                ))}
              </select>
            </Field>
            <Field orientation="horizontal" className="items-start">
              <Checkbox
                checked={emailConfirm}
                onCheckedChange={(checked) => setEmailConfirm(checked === true)}
                aria-label="Confirmar correo automáticamente"
                className="mt-0.5"
              />
              <div className="flex flex-col gap-1">
                <FieldLabel className="font-normal">Confirmar correo automáticamente</FieldLabel>
                <FieldDescription className="text-[oklch(0.6_0.02_280)]">
                  Si está activo, la cuenta puede entrar sin verificar el email.
                </FieldDescription>
              </div>
            </Field>
          </FieldGroup>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="text-[oklch(0.85_0.02_280)]"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="rounded-full bg-[oklch(0.55_0.22_285)] text-white"
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {pending ? "Creando…" : "Crear cuenta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
