import type { OrderListItem } from "@workspace/shared"
import { ORDER_STATUS } from "@workspace/shared"

export type SalesDayPoint = {
  date: string
  label: string
  sales: number | null
  orders: number | null
  projected: number | null
  isProjection: boolean
}

export type SalesSummary = {
  acceptedSales: number
  acceptedOrders: number
  pendingSales: number
  pendingOrders: number
  deniedOrders: number
  avgDailySales: number
  projectedNext7: number
  projectedMonth: number
  conversionRate: number
}

function dayKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("es-CR", { weekday: "short", day: "numeric" })
}

/** Linear regression slope/intercept over y values indexed 0..n-1. */
function linearTrend(values: number[]) {
  const n = values.length
  if (n === 0) return { slope: 0, intercept: 0 }
  if (n === 1) return { slope: 0, intercept: values[0] ?? 0 }

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  for (let i = 0; i < n; i++) {
    const y = values[i] ?? 0
    sumX += i
    sumY += y
    sumXY += i * y
    sumXX += i * i
  }
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n }
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

export function buildSalesSummary(orders: OrderListItem[]): SalesSummary {
  let acceptedSales = 0
  let acceptedOrders = 0
  let pendingSales = 0
  let pendingOrders = 0
  let deniedOrders = 0

  for (const order of orders) {
    if (order.status === ORDER_STATUS.accepted) {
      acceptedSales += order.total
      acceptedOrders += 1
    } else if (order.status === ORDER_STATUS.pending) {
      pendingSales += order.total
      pendingOrders += 1
    } else if (order.status === ORDER_STATUS.denied) {
      deniedOrders += 1
    }
  }

  const decided = acceptedOrders + deniedOrders
  const conversionRate = decided > 0 ? acceptedOrders / decided : 0

  const today = startOfDay(new Date())
  const windowStart = addDays(today, -13)
  const daily = new Map<string, number>()
  for (let i = 0; i < 14; i++) {
    daily.set(dayKey(addDays(windowStart, i)), 0)
  }
  for (const order of orders) {
    if (order.status !== ORDER_STATUS.accepted) continue
    const created = startOfDay(new Date(order.createdAt))
    const key = dayKey(created)
    if (daily.has(key)) {
      daily.set(key, (daily.get(key) ?? 0) + order.total)
    }
  }
  const recentValues = [...daily.values()]
  const avgDailySales =
    recentValues.length > 0
      ? recentValues.reduce((sum, value) => sum + value, 0) / recentValues.length
      : 0

  const { slope, intercept } = linearTrend(recentValues)
  let projectedNext7 = 0
  for (let i = 0; i < 7; i++) {
    const idx = recentValues.length + i
    projectedNext7 += Math.max(0, intercept + slope * idx)
  }
  const projectedMonth = Math.max(0, avgDailySales * 30)

  return {
    acceptedSales,
    acceptedOrders,
    pendingSales,
    pendingOrders,
    deniedOrders,
    avgDailySales,
    projectedNext7,
    projectedMonth,
    conversionRate,
  }
}

export function buildSalesSeries(
  orders: OrderListItem[],
  historyDays = 14,
  projectionDays = 7,
): SalesDayPoint[] {
  const today = startOfDay(new Date())
  const start = addDays(today, -(historyDays - 1))

  const salesByDay = new Map<string, number>()
  const ordersByDay = new Map<string, number>()
  for (let i = 0; i < historyDays; i++) {
    const key = dayKey(addDays(start, i))
    salesByDay.set(key, 0)
    ordersByDay.set(key, 0)
  }

  for (const order of orders) {
    if (order.status !== ORDER_STATUS.accepted) continue
    const created = startOfDay(new Date(order.createdAt))
    const key = dayKey(created)
    if (!salesByDay.has(key)) continue
    salesByDay.set(key, (salesByDay.get(key) ?? 0) + order.total)
    ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + 1)
  }

  const historyValues = [...salesByDay.values()]
  const { slope, intercept } = linearTrend(historyValues)

  const points: SalesDayPoint[] = []
  for (let i = 0; i < historyDays; i++) {
    const date = addDays(start, i)
    const key = dayKey(date)
    const sales = salesByDay.get(key) ?? 0
    points.push({
      date: key,
      label: formatDayLabel(date),
      sales,
      orders: ordersByDay.get(key) ?? 0,
      projected: null,
      isProjection: false,
    })
  }

  // Bridge: last historical point also carries the trend so the line connects.
  const last = points[points.length - 1]
  if (last) {
    last.projected = last.sales
  }

  for (let i = 1; i <= projectionDays; i++) {
    const date = addDays(today, i)
    const idx = historyDays - 1 + i
    const projected = Math.max(0, intercept + slope * idx)
    points.push({
      date: dayKey(date),
      label: formatDayLabel(date),
      sales: null,
      orders: null,
      projected,
      isProjection: true,
    })
  }

  return points
}

export function colones(value: number) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(value)
}
