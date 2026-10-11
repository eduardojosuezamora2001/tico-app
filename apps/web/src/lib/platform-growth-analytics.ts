export type GrowthDayPoint = {
  date: string
  label: string
  clients: number | null
  owners: number | null
  businesses: number | null
  clientsProjected: number | null
  ownersProjected: number | null
  isProjection: boolean
}

export type GrowthSummary = {
  clientsLast14: number
  ownersLast14: number
  businessesLast14: number
  avgDailyClients: number
  avgDailyOwners: number
  avgDailyBusinesses: number
  projectedClientsNext7: number
  projectedOwnersNext7: number
  projectedBusinessesNext7: number
  projectedClientsMonth: number
  projectedOwnersMonth: number
  projectedBusinessesMonth: number
  clientsGrowthRate: number
  ownersGrowthRate: number
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

function projectNext(values: number[], days: number) {
  const { slope, intercept } = linearTrend(values)
  let total = 0
  for (let i = 0; i < days; i++) {
    const idx = values.length + i
    total += Math.max(0, intercept + slope * idx)
  }
  return { total, slope, intercept }
}

function growthRate(avgDaily: number, projectedNext7: number) {
  if (avgDaily <= 0 && projectedNext7 <= 0) return 0
  if (avgDaily <= 0) return 1
  return (projectedNext7 / 7 - avgDaily) / avgDaily
}

export function buildGrowthSummary(input: {
  clientsByDay: number[]
  ownersByDay: number[]
  businessesByDay: number[]
}): GrowthSummary {
  const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0)
  const avg = (values: number[]) => (values.length ? sum(values) / values.length : 0)

  const clientsLast14 = sum(input.clientsByDay)
  const ownersLast14 = sum(input.ownersByDay)
  const businessesLast14 = sum(input.businessesByDay)

  const avgDailyClients = avg(input.clientsByDay)
  const avgDailyOwners = avg(input.ownersByDay)
  const avgDailyBusinesses = avg(input.businessesByDay)

  const clientsProj = projectNext(input.clientsByDay, 7)
  const ownersProj = projectNext(input.ownersByDay, 7)
  const businessesProj = projectNext(input.businessesByDay, 7)

  return {
    clientsLast14,
    ownersLast14,
    businessesLast14,
    avgDailyClients,
    avgDailyOwners,
    avgDailyBusinesses,
    projectedClientsNext7: clientsProj.total,
    projectedOwnersNext7: ownersProj.total,
    projectedBusinessesNext7: businessesProj.total,
    projectedClientsMonth: Math.max(0, avgDailyClients * 30),
    projectedOwnersMonth: Math.max(0, avgDailyOwners * 30),
    projectedBusinessesMonth: Math.max(0, avgDailyBusinesses * 30),
    clientsGrowthRate: growthRate(avgDailyClients, clientsProj.total),
    ownersGrowthRate: growthRate(avgDailyOwners, ownersProj.total),
  }
}

export function buildGrowthSeries(input: {
  clientsByDay: number[]
  ownersByDay: number[]
  businessesByDay: number[]
  historyDays?: number
  projectionDays?: number
}): GrowthDayPoint[] {
  const historyDays = input.historyDays ?? input.clientsByDay.length
  const projectionDays = input.projectionDays ?? 7
  const today = startOfDay(new Date())
  const start = addDays(today, -(historyDays - 1))

  const clientsTrend = linearTrend(input.clientsByDay)
  const ownersTrend = linearTrend(input.ownersByDay)

  const points: GrowthDayPoint[] = []
  for (let i = 0; i < historyDays; i++) {
    const date = addDays(start, i)
    points.push({
      date: dayKey(date),
      label: formatDayLabel(date),
      clients: input.clientsByDay[i] ?? 0,
      owners: input.ownersByDay[i] ?? 0,
      businesses: input.businessesByDay[i] ?? 0,
      clientsProjected: null,
      ownersProjected: null,
      isProjection: false,
    })
  }

  const last = points[points.length - 1]
  if (last) {
    last.clientsProjected = last.clients
    last.ownersProjected = last.owners
  }

  for (let i = 1; i <= projectionDays; i++) {
    const date = addDays(today, i)
    const idx = historyDays - 1 + i
    points.push({
      date: dayKey(date),
      label: formatDayLabel(date),
      clients: null,
      owners: null,
      businesses: null,
      clientsProjected: Math.max(0, clientsTrend.intercept + clientsTrend.slope * idx),
      ownersProjected: Math.max(0, ownersTrend.intercept + ownersTrend.slope * idx),
      isProjection: true,
    })
  }

  return points
}

export function percentLabel(rate: number) {
  const pct = Math.round(rate * 100)
  if (pct > 0) return `+${pct}%`
  return `${pct}%`
}
