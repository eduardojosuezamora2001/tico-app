import { useEffect, useState } from "react"
import { Link } from "react-router"
import type { AdminStats } from "@workspace/shared"
import {
  Building03Icon,
  FolderTreeIcon,
  Package01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { getAdminStats } from "@/services/admin.service"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

function errorMessage(reason: unknown, fallback: string) {
  if (reason && typeof reason === "object" && "response" in reason) {
    const data = (reason as { response?: { data?: { error?: { message?: string } } } }).response
      ?.data
    if (data?.error?.message) return data.error.message
  }
  if (reason instanceof Error && reason.message) return reason.message
  return fallback
}

export function AdminResumenPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void getAdminStats()
      .then((data) => {
        if (!active) return
        setStats(data)
        setLoading(false)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(errorMessage(reason, "No se pudieron cargar las métricas."))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-[oklch(0.65_0.08_180)] uppercase">
            Control total
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Consola Master SuperAdmin
          </h2>
          <p className="mt-1 text-sm text-[oklch(0.7_0.02_280)]">
            Métricas globales. La taxonomía vive en Catálogo; los locales se gestionan en Comercios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" render={<Link to="/admin/comercios" />}>
            <HugeiconsIcon icon={Building03Icon} strokeWidth={2} data-icon="inline-start" />
            Gestión de comercios
          </Button>
          <Button size="sm" variant="outline" render={<Link to="/admin/catalogo" />}>
            <HugeiconsIcon icon={FolderTreeIcon} strokeWidth={2} data-icon="inline-start" />
            Catálogo global
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Building03Icon}
          title="Comercios registrados"
          loading={loading}
          value={stats?.businesses.total}
          lines={[
            `Activos ${stats?.businesses.active ?? "–"}`,
            `Borradores ${stats?.businesses.draft ?? "–"}`,
            `Suspendidos ${stats?.businesses.inactive ?? "–"}`,
          ]}
        />
        <KpiCard
          icon={UserGroupIcon}
          title="Usuarios & dueños"
          loading={loading}
          value={stats?.users.total}
          lines={[
            `Dueños ${stats?.users.businessOwner ?? "–"}`,
            `Equipo ${stats?.users.businessEmployee ?? "–"}`,
            `Clientes ${stats?.users.client ?? "–"}`,
          ]}
        />
        <KpiCard
          icon={Package01Icon}
          title="Catálogo nacional"
          loading={loading}
          value={
            stats
              ? stats.catalog.products + stats.catalog.services + stats.catalog.menuItems
              : undefined
          }
          lines={[
            `Productos ${stats?.catalog.products ?? "–"}`,
            `Servicios ${stats?.catalog.services ?? "–"}`,
            `Menú ${stats?.catalog.menuItems ?? "–"}`,
          ]}
        />
        <KpiCard
          icon={FolderTreeIcon}
          title="Taxonomía"
          loading={loading}
          value={
            stats
              ? stats.catalog.businessCategories + stats.catalog.marketplaceTags
              : undefined
          }
          lines={[
            `Rubros ${stats?.catalog.businessCategories ?? "–"}`,
            `Tags producto ${stats?.catalog.marketplaceTags ?? "–"}`,
            `Admins ${stats?.users.admin ?? "–"}`,
          ]}
        />
      </div>
    </div>
  )
}

function KpiCard({
  icon,
  title,
  value,
  lines,
  loading,
}: {
  icon: typeof Building03Icon
  title: string
  value?: number
  lines: string[]
  loading: boolean
}) {
  return (
    <Card className="border-[oklch(0.3_0.03_275)] bg-[oklch(0.2_0.03_275)] text-white shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-[oklch(0.78_0.02_280)]">{title}</CardTitle>
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4 text-[oklch(0.65_0.12_285)]" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-20 bg-[oklch(0.28_0.03_275)]" />
        ) : (
          <p className="text-3xl font-semibold tracking-tight">{value ?? "–"}</p>
        )}
        <CardDescription className="mt-3 flex flex-col gap-1 text-xs text-[oklch(0.65_0.02_280)]">
          {lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </CardDescription>
      </CardContent>
    </Card>
  )
}
