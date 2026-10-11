import { useEffect, useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import type { PlatformGrowthInsightResponse, PlatformGrowthSeries } from "@workspace/shared"
import {
  AnalyticsUpIcon,
  ChartIncreaseIcon,
  UserGroupIcon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  buildGrowthSeries,
  buildGrowthSummary,
  percentLabel,
} from "@/lib/platform-growth-analytics"
import { fetchPlatformGrowthInsight, getAdminGrowthSeries } from "@/services/admin.service"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { Skeleton } from "@workspace/ui/components/skeleton"

const chartConfig = {
  clients: {
    label: "Clientes",
    color: "oklch(0.72 0.14 285)",
  },
  owners: {
    label: "Dueños",
    color: "oklch(0.72 0.12 180)",
  },
  clientsProjected: {
    label: "Proy. clientes",
    color: "oklch(0.55 0.08 285)",
  },
  ownersProjected: {
    label: "Proy. dueños",
    color: "oklch(0.55 0.08 180)",
  },
} satisfies ChartConfig

function formatCount(value: number) {
  return new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(Math.round(value))
}

export function AdminGrowthDashboard() {
  const [seriesPayload, setSeriesPayload] = useState<PlatformGrowthSeries | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [insight, setInsight] = useState<PlatformGrowthInsightResponse | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setInsight(null)
    void getAdminGrowthSeries()
      .then((data) => {
        if (!active) return
        setSeriesPayload(data)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError("No se pudo cargar el crecimiento de la plataforma.")
        setSeriesPayload(null)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const summary = useMemo(() => {
    if (!seriesPayload) return null
    return buildGrowthSummary({
      clientsByDay: seriesPayload.clientsByDay,
      ownersByDay: seriesPayload.ownersByDay,
      businessesByDay: seriesPayload.businessesByDay,
    })
  }, [seriesPayload])

  const series = useMemo(() => {
    if (!seriesPayload) return []
    return buildGrowthSeries({
      clientsByDay: seriesPayload.clientsByDay,
      ownersByDay: seriesPayload.ownersByDay,
      businessesByDay: seriesPayload.businessesByDay,
      historyDays: seriesPayload.historyDays,
      projectionDays: 7,
    })
  }, [seriesPayload])

  const hasGrowth = Boolean(
    summary && (summary.clientsLast14 > 0 || summary.ownersLast14 > 0 || summary.businessesLast14 > 0),
  )

  useEffect(() => {
    if (loading || error || !summary || !seriesPayload || !hasGrowth) {
      setInsight(null)
      setInsightLoading(false)
      return
    }

    let active = true
    setInsightLoading(true)
    setInsight(null)
    void fetchPlatformGrowthInsight({
      clientsTotal: seriesPayload.clientsTotal,
      ownersTotal: seriesPayload.ownersTotal,
      businessesTotal: seriesPayload.businessesTotal,
      clientsLast14: summary.clientsLast14,
      ownersLast14: summary.ownersLast14,
      businessesLast14: summary.businessesLast14,
      avgDailyClients: summary.avgDailyClients,
      avgDailyOwners: summary.avgDailyOwners,
      projectedClientsNext7: summary.projectedClientsNext7,
      projectedOwnersNext7: summary.projectedOwnersNext7,
      projectedClientsMonth: summary.projectedClientsMonth,
      projectedOwnersMonth: summary.projectedOwnersMonth,
      clientsGrowthRate: summary.clientsGrowthRate,
      ownersGrowthRate: summary.ownersGrowthRate,
    })
      .then((data) => {
        if (!active) return
        setInsight(data)
        setInsightLoading(false)
      })
      .catch(() => {
        if (!active) return
        setInsight(null)
        setInsightLoading(false)
      })

    return () => {
      active = false
    }
  }, [loading, error, hasGrowth, summary, seriesPayload])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl bg-[oklch(0.28_0.03_275)]" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl bg-[oklch(0.28_0.03_275)]" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    )
  }

  if (!summary || !seriesPayload) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Crecimiento y proyecciones</h2>
        <p className="mt-1 text-sm text-[oklch(0.7_0.02_280)]">
          Altas de clientes y dueños en los últimos 14 días, con proyección a 7 días según la
          tendencia lineal actual.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={UserIcon}
          label="Clientes (14 días)"
          value={formatCount(summary.clientsLast14)}
          hint={`${formatCount(summary.avgDailyClients)} / día · total ${formatCount(seriesPayload.clientsTotal)}`}
        />
        <MetricCard
          icon={UserGroupIcon}
          label="Dueños (14 días)"
          value={formatCount(summary.ownersLast14)}
          hint={`${formatCount(summary.avgDailyOwners)} / día · total ${formatCount(seriesPayload.ownersTotal)}`}
        />
        <MetricCard
          icon={ChartIncreaseIcon}
          label="Proyección clientes 7d"
          value={formatCount(summary.projectedClientsNext7)}
          hint={`Tendencia ${percentLabel(summary.clientsGrowthRate)}`}
        />
        <MetricCard
          icon={AnalyticsUpIcon}
          label="Proyección dueños 7d"
          value={formatCount(summary.projectedOwnersNext7)}
          hint={`Tendencia ${percentLabel(summary.ownersGrowthRate)}`}
        />
      </div>

      <Card className="border-[oklch(0.3_0.03_275)] bg-[oklch(0.2_0.03_275)] text-white shadow-none">
        <CardHeader>
          <CardTitle className="text-white">Tendencia de altas</CardTitle>
          <CardDescription className="text-[oklch(0.7_0.02_280)]">
            Últimos 14 días (línea sólida) y proyección de los próximos 7 (línea punteada).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasGrowth ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyTitle className="text-white">Todavía no hay altas recientes</EmptyTitle>
                <EmptyDescription className="text-[oklch(0.7_0.02_280)]">
                  Cuando se registren clientes o dueños, verás aquí el historial y la proyección.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
              <LineChart data={series} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="oklch(0.35 0.03 275)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  stroke="oklch(0.65 0.02 280)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={40}
                  allowDecimals={false}
                  stroke="oklch(0.65 0.02 280)"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(value, name) => {
                        const amount =
                          typeof value === "number" ? formatCount(value) : "—"
                        const labels: Record<string, string> = {
                          clients: "Clientes",
                          owners: "Dueños",
                          clientsProjected: "Proy. clientes",
                          ownersProjected: "Proy. dueños",
                        }
                        const label = labels[String(name)] ?? String(name)
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-mono font-medium tabular-nums text-foreground">
                              {amount}
                            </span>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="clients"
                  stroke="var(--color-clients)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="owners"
                  stroke="var(--color-owners)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="clientsProjected"
                  stroke="var(--color-clientsProjected)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="ownersProjected"
                  stroke="var(--color-ownersProjected)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          size="sm"
          className="border-[oklch(0.3_0.03_275)] bg-[oklch(0.2_0.03_275)] text-white shadow-none"
        >
          <CardHeader>
            <CardTitle className="text-white">Proyección mensual</CardTitle>
            <CardDescription className="text-[oklch(0.7_0.02_280)]">
              Estimación: promedio diario de los últimos 14 días × 30.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-[oklch(0.65_0.02_280)]">Clientes</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatCount(summary.projectedClientsMonth)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[oklch(0.65_0.02_280)]">Dueños</p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatCount(summary.projectedOwnersMonth)}
              </p>
            </div>
            <p className="text-sm text-[oklch(0.7_0.02_280)]">
              Comercios nuevos estimados: {formatCount(summary.projectedBusinessesMonth)} / mes (
              {formatCount(summary.businessesLast14)} en 14 días).
            </p>
          </CardContent>
        </Card>

        <Card
          size="sm"
          className="border-[oklch(0.3_0.03_275)] bg-[oklch(0.2_0.03_275)] text-white shadow-none"
        >
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="text-white">Predicción IA</CardTitle>
              <CardDescription className="text-[oklch(0.7_0.02_280)]">
                Lectura de crecimiento futuro de clientes y dueños de la plataforma.
              </CardDescription>
            </div>
            {insight?.source === "ai" ? (
              <Badge variant="secondary">Generado con IA</Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {!hasGrowth ? (
              <p className="text-sm text-[oklch(0.7_0.02_280)]">
                Cuando haya altas recientes de clientes o dueños, aquí aparecerá una predicción.
              </p>
            ) : insightLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full bg-[oklch(0.28_0.03_275)]" />
                <Skeleton className="h-4 w-11/12 bg-[oklch(0.28_0.03_275)]" />
                <Skeleton className="h-4 w-3/4 bg-[oklch(0.28_0.03_275)]" />
              </div>
            ) : insight ? (
              <p className="text-sm leading-relaxed text-[oklch(0.88_0.02_280)]">{insight.text}</p>
            ) : (
              <p className="text-sm text-[oklch(0.7_0.02_280)]">
                No se pudo generar la predicción en este momento. Revisá las métricas de arriba.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: typeof AnalyticsUpIcon
  label: string
  value: string
  hint: string
}) {
  return (
    <Card
      size="sm"
      className="border-[oklch(0.3_0.03_275)] bg-[oklch(0.2_0.03_275)] text-white shadow-none"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardDescription className="text-[oklch(0.7_0.02_280)]">{label}</CardDescription>
          <CardTitle className="mt-1 text-xl tabular-nums text-white">{value}</CardTitle>
        </div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-[oklch(0.28_0.05_285)] text-[oklch(0.75_0.12_285)]">
          <HugeiconsIcon icon={icon} strokeWidth={2} />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-[oklch(0.65_0.02_280)]">{hint}</p>
      </CardContent>
    </Card>
  )
}
