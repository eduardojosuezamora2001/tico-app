import { useEffect, useState, startTransition, useTransition } from "react"
import { Link, useSearchParams } from "react-router"
import type { AdminBusinessListItem, AdminBusinessPlatformStatus, ModuleName } from "@workspace/shared"
import {
  LinkSquare02Icon,
  PauseIcon,
  PlayIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { listAdminBusinesses, updateAdminBusinessStatus } from "@/services/admin.service"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
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

type StatusFilter = "all" | AdminBusinessPlatformStatus

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "draft", label: "Borradores" },
  { value: "suspended", label: "Suspendidos" },
]

const MODULE_LABEL: Record<ModuleName, string> = {
  products: "Productos",
  services: "Servicios",
  menu: "Menú",
  appointments: "Citas",
}

const STATUS_LABEL: Record<AdminBusinessPlatformStatus, string> = {
  active: "Activo",
  draft: "Borrador",
  suspended: "Suspendido",
}

function errorMessage(reason: unknown, fallback: string) {
  if (reason && typeof reason === "object" && "response" in reason) {
    const data = (reason as { response?: { data?: { error?: { message?: string } } } }).response
      ?.data
    if (data?.error?.message) return data.error.message
  }
  if (reason instanceof Error && reason.message) return reason.message
  return fallback
}

export function AdminComerciosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const qParam = searchParams.get("q") ?? ""
  const statusParam = (searchParams.get("status") as StatusFilter | null) ?? "all"
  const status: StatusFilter = STATUS_OPTIONS.some((o) => o.value === statusParam)
    ? statusParam
    : "all"

  const [query, setQuery] = useState(qParam)
  const [items, setItems] = useState<AdminBusinessListItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pending, startPending] = useTransition()
  const [confirm, setConfirm] = useState<AdminBusinessListItem | null>(null)

  useEffect(() => {
    setQuery(qParam)
  }, [qParam])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    void listAdminBusinesses({
      q: qParam || undefined,
      status,
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
        setError(errorMessage(reason, "No se pudieron cargar los comercios."))
        setItems([])
        setNextCursor(null)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [qParam, status])

  function setStatusFilter(next: StatusFilter) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams)
      if (next === "all") params.delete("status")
      else params.set("status", next)
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
      const page = await listAdminBusinesses({
        q: qParam || undefined,
        status,
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

  function patchLocal(updated: AdminBusinessListItem) {
    setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
  }

  function runStatus(action: "suspend" | "activate", row: AdminBusinessListItem) {
    startPending(() => {
      void toast.promise(
        updateAdminBusinessStatus(row.id, { action }).then((updated) => {
          patchLocal(updated)
          setConfirm(null)
        }),
        {
          loading: action === "suspend" ? "Suspendiendo…" : "Activando…",
          success: action === "suspend" ? "Comercio suspendido" : "Comercio activado",
          error: (reason) => errorMessage(reason, "No se pudo actualizar el estado"),
        },
      )
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">Gestión de comercios</h2>
        <p className="mt-1 text-sm text-[oklch(0.7_0.02_280)]">
          Suspender oculta el local del directorio. Activar lo vuelve a publicar (no aplica a borradores).
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ToggleGroup
          value={[status]}
          onValueChange={(value) => {
            const next = value[0] as StatusFilter | undefined
            if (next) setStatusFilter(next)
          }}
          variant="outline"
          size="sm"
          spacing={2}
          aria-label="Filtrar por estado"
          className="flex-wrap"
        >
          {STATUS_OPTIONS.map((option) => (
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
              placeholder="Buscar comercio…"
              className="text-white placeholder:text-[oklch(0.55_0.02_280)]"
            />
          </InputGroup>
        </form>
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[oklch(0.3_0.03_275)] bg-[oklch(0.2_0.03_275)]">
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-10 w-full bg-[oklch(0.28_0.03_275)]" />
            <Skeleton className="h-10 w-full bg-[oklch(0.28_0.03_275)]" />
            <Skeleton className="h-10 w-5/6 bg-[oklch(0.28_0.03_275)]" />
          </div>
        ) : items.length === 0 ? (
          <Empty className="border-0 py-12">
            <EmptyHeader>
              <EmptyTitle className="text-white">Sin comercios</EmptyTitle>
              <EmptyDescription className="text-[oklch(0.65_0.02_280)]">
                No hay registros con este filtro.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[oklch(0.3_0.03_275)] hover:bg-transparent">
                <TableHead className="text-[oklch(0.7_0.02_280)]">Comercio & provincia</TableHead>
                <TableHead className="text-[oklch(0.7_0.02_280)]">Dueño / contacto</TableHead>
                <TableHead className="text-[oklch(0.7_0.02_280)]">Estado</TableHead>
                <TableHead className="text-[oklch(0.7_0.02_280)]">Módulos</TableHead>
                <TableHead className="text-right text-[oklch(0.7_0.02_280)]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id} className="border-[oklch(0.28_0.03_275)] hover:bg-[oklch(0.24_0.03_275)]">
                  <TableCell>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium text-white">{row.name}</span>
                      <span className="truncate text-xs text-[oklch(0.6_0.02_280)]">
                        {row.locationLabel || "Sin ubicación"}
                        {" · "}
                        {row.category}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                      <span className="truncate text-white">
                        {row.owner?.fullName || "Sin nombre"}
                      </span>
                      <span className="truncate text-xs text-[oklch(0.6_0.02_280)]">
                        {row.owner?.email ?? "—"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.platformStatus} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.modules.length === 0 ? (
                        <span className="text-xs text-[oklch(0.55_0.02_280)]">Ninguno</span>
                      ) : (
                        row.modules.map((mod) => (
                          <Badge
                            key={mod}
                            variant="outline"
                            className="border-[oklch(0.35_0.04_285)] text-[oklch(0.78_0.02_280)]"
                          >
                            {MODULE_LABEL[mod] ?? mod}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-[oklch(0.8_0.02_280)]"
                        render={<Link to={`/n/${row.id}`} target="_blank" rel="noreferrer" />}
                        title="Ver página pública"
                      >
                        <HugeiconsIcon icon={LinkSquare02Icon} strokeWidth={2} />
                      </Button>
                      {row.platformStatus === "active" ? (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive"
                          title="Suspender"
                          disabled={pending}
                          onClick={() => setConfirm(row)}
                        >
                          <HugeiconsIcon icon={PauseIcon} strokeWidth={2} />
                        </Button>
                      ) : null}
                      {row.platformStatus === "suspended" ? (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-[oklch(0.78_0.1_160)]"
                          title="Activar"
                          disabled={pending}
                          onClick={() => runStatus("activate", row)}
                        >
                          {pending ? <Spinner /> : <HugeiconsIcon icon={PlayIcon} strokeWidth={2} />}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {nextCursor ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? <Spinner data-icon="inline-start" /> : null}
            Cargar más
          </Button>
        </div>
      ) : null}

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent className="border-[oklch(0.3_0.03_275)] bg-[oklch(0.18_0.03_275)] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Suspender {confirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-[oklch(0.65_0.02_280)]">
              El comercio dejará de aparecer en el directorio y en búsquedas públicas hasta que lo
              actives de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending || !confirm}
              onClick={() => {
                if (confirm) runStatus("suspend", confirm)
              }}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Suspender
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatusBadge({ status }: { status: AdminBusinessPlatformStatus }) {
  if (status === "active") {
    return (
      <Badge className="bg-[oklch(0.35_0.08_160)] text-[oklch(0.9_0.05_160)]">
        {STATUS_LABEL[status]}
      </Badge>
    )
  }
  if (status === "draft") {
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-200">
        {STATUS_LABEL[status]}
      </Badge>
    )
  }
  return <Badge variant="destructive">{STATUS_LABEL[status]}</Badge>
}
