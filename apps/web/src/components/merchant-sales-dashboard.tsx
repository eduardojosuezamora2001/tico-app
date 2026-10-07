import { useEffect, useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import type { OrderListItem, SalesInsightResponse } from "@workspace/shared"
import {
  AnalyticsUpIcon,
  ShoppingBag01Icon,
  ChartIncreaseIcon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  buildSalesSeries,
  buildSalesSummary,
  colones,
} from "@/lib/sales-analytics"
import { listOrders } from "@/services/orders.service"
import { fetchSalesInsight } from "@/services/sales.service"
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
  sales: {
    label: "Ventas",
    color: "var(--primary)",
  },
  projected: {
    label: "Proyección",
    color: "var(--muted-foreground)",
  },
} satisfies ChartConfig

export function MerchantSalesDashboard({ businessId }: { businessId: string }) {
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [insight, setInsight] = useState<SalesInsightResponse | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setInsight(null)
    void listOrders(businessId)
      .then((rows) => {
        if (!active) return
        setOrders(rows)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError("No se pudieron cargar las ventas de este negocio.")
        setOrders([])
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [businessId])

  const summary = useMemo(() => buildSalesSummary(orders), [orders])
  const series = useMemo(() => buildSalesSeries(orders), [orders])
  const hasSales = summary.acceptedOrders > 0 || summary.pendingOrders > 0

  useEffect(() => {
    if (loading || error || !hasSales) {
      setInsight(null)
      setInsightLoading(false)
      return
    }

    let active = true
    setInsightLoading(true)
    setInsight(null)
    void fetchSalesInsight(businessId, {
      acceptedSales: summary.acceptedSales,
      acceptedOrders: summary.acceptedOrders,
      pendingSales: summary.pendingSales,
      pendingOrders: summary.pendingOrders,
      deniedOrders: summary.deniedOrders,
      avgDailySales: summary.avgDailySales,
      projectedNext7: summary.projectedNext7,
      projectedMonth: summary.projectedMonth,
      conversionRate: summary.conversionRate,
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
  }, [
    businessId,
    loading,
    error,
    hasSales,
    summary.acceptedSales,
    summary.acceptedOrders,
    summary.pendingSales,
    summary.pendingOrders,
    summary.deniedOrders,
    summary.avgDailySales,
    summary.projectedNext7,
    summary.projectedMonth,
    summary.conversionRate,
  ])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Ventas y proyecciones</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen de pedidos aceptados, tendencia reciente y proyección a 7 días según el ritmo
          actual.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={AnalyticsUpIcon}
          label="Ventas aceptadas"
          value={colones(summary.acceptedSales)}
          hint={`${summary.acceptedOrders} pedido${summary.acceptedOrders === 1 ? "" : "s"}`}
        />
        <MetricCard
          icon={ShoppingBag01Icon}
          label="Pendientes"
          value={colones(summary.pendingSales)}
          hint={`${summary.pendingOrders} por decidir`}
        />
        <MetricCard
          icon={ChartIncreaseIcon}
          label="Proyección 7 días"
          value={colones(summary.projectedNext7)}
          hint={`~${colones(summary.avgDailySales)} / día`}
        />
        <MetricCard
          icon={CheckmarkCircle02Icon}
          label="Tasa de aceptación"
          value={`${Math.round(summary.conversionRate * 100)}%`}
          hint={`${summary.deniedOrders} rechazado${summary.deniedOrders === 1 ? "" : "s"}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia de ventas</CardTitle>
          <CardDescription>
            Últimos 14 días (línea sólida) y proyección de los próximos 7 (línea punteada). La
            proyección usa la tendencia lineal de las ventas aceptadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSales ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyTitle>Todavía no hay ventas</EmptyTitle>
                <EmptyDescription>
                  Cuando aceptes pedidos desde Mensajes, verás aquí el historial y la proyección.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
              <LineChart data={series} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={64}
                  tickFormatter={(value) =>
                    typeof value === "number" ? colones(value).replace(/\s/g, "") : String(value)
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      formatter={(value, name) => {
                        const amount = typeof value === "number" ? colones(value) : "—"
                        const label = name === "projected" ? "Proyección" : "Ventas"
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
                  dataKey="sales"
                  stroke="var(--color-sales)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="var(--color-projected)"
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
        <Card size="sm">
          <CardHeader>
            <CardTitle>Proyección mensual</CardTitle>
            <CardDescription>
              Estimación simple: promedio diario de los últimos 14 días × 30.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{colones(summary.projectedMonth)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Basado en {summary.acceptedOrders} pedido{summary.acceptedOrders === 1 ? "" : "s"}{" "}
              aceptado{summary.acceptedOrders === 1 ? "" : "s"} en el historial reciente.
            </p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Predicción</CardTitle>
              <CardDescription>
                Lectura de métricas futuras para orientar decisiones del negocio.
              </CardDescription>
            </div>
            {insight?.source === "ai" ? (
              <Badge variant="secondary">Generado con IA</Badge>
            ) : null}
          </CardHeader>
          <CardContent>
            {!hasSales ? (
              <p className="text-sm text-muted-foreground">
                Cuando haya pedidos aceptados o pendientes, aquí aparecerá una predicción de las
                próximas métricas.
              </p>
            ) : insightLoading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : insight ? (
              <p className="text-sm leading-relaxed text-foreground">{insight.text}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
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
    <Card size="sm">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="mt-1 text-xl tabular-nums">{value}</CardTitle>
        </div>
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} strokeWidth={2} />
        </span>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
