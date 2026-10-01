import { MODULES, type ModuleName } from "@workspace/shared"

export const ONBOARDING_CATEGORIES = [
  "Restauración",
  "Cafetería",
  "Servicios",
  "Pulpería",
  "Salud y Belleza",
  "Venta Retail",
] as const

export const COSTA_RICA_PROVINCES = [
  "San José",
  "Alajuela",
  "Cartago",
  "Heredia",
  "Guanacaste",
  "Puntarenas",
  "Limón",
] as const

/** Orden de la semana en el formulario: lunes → domingo. En base, 0 = domingo. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

export const DAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  0: "Domingo",
}

export type ScheduleGroup = {
  id: string
  fromDay: number
  toDay: number
  open: string
  close: string
  closed: boolean
}

export function weekIndex(day: number) {
  return WEEK_ORDER.indexOf(day as (typeof WEEK_ORDER)[number])
}

export function daysInRange(fromDay: number, toDay: number): number[] {
  const start = weekIndex(fromDay)
  const end = weekIndex(toDay)
  if (start < 0 || end < 0 || end < start) return []
  return [...WEEK_ORDER.slice(start, end + 1)]
}

export function scheduleRangeLabel(fromDay: number, toDay: number) {
  const from = DAY_LABELS[fromDay] ?? "Día"
  const to = DAY_LABELS[toDay] ?? "Día"
  if (fromDay === toDay) return from
  return `${from} a ${to.toLowerCase()}`
}

export function createScheduleGroup(partial?: Partial<ScheduleGroup>): ScheduleGroup {
  return {
    id: crypto.randomUUID(),
    fromDay: 1,
    toDay: 1,
    open: "08:00",
    close: "16:00",
    closed: false,
    ...partial,
  }
}

export function defaultScheduleGroups(): ScheduleGroup[] {
  return [
    createScheduleGroup({ fromDay: 1, toDay: 5, open: "08:30", close: "22:00" }),
    createScheduleGroup({ fromDay: 6, toDay: 6, open: "07:00", close: "22:00" }),
    createScheduleGroup({ fromDay: 0, toDay: 0, open: "07:00", close: "18:00" }),
  ]
}

export function firstUnusedDay(groups: ScheduleGroup[]) {
  const used = new Set(groups.flatMap((group) => daysInRange(group.fromDay, group.toDay)))
  return WEEK_ORDER.find((day) => !used.has(day)) ?? 1
}

/** Mensaje si un día cae en dos bloques o el rango va hacia atrás. */
export function scheduleOverlapMessage(groups: ScheduleGroup[]): string | null {
  const seen = new Map<number, true>()
  for (const group of groups) {
    const days = daysInRange(group.fromDay, group.toDay)
    if (days.length === 0) return "El día final tiene que ser el mismo o posterior al inicial."
    for (const day of days) {
      if (seen.has(day)) return `${DAY_LABELS[day]} está en más de un horario.`
      seen.set(day, true)
    }
  }
  return null
}

export function schedulesToHours(groups: ScheduleGroup[]) {
  return groups.flatMap((group) =>
    daysInRange(group.fromDay, group.toDay).map((day) => ({
      dayOfWeek: day,
      exceptionDate: null,
      openTime: group.closed ? null : normalizeTime(group.open),
      closeTime: group.closed ? null : normalizeTime(group.close),
      isClosed: group.closed,
    })),
  )
}

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value
}

export function defaultModuleSelection(): Record<ModuleName, boolean> {
  return {
    [MODULES.PRODUCTS]: true,
    [MODULES.SERVICES]: false,
    [MODULES.MENU]: false,
    [MODULES.APPOINTMENTS]: false,
  }
}

export const ONBOARDING_MODULE_LABELS: Record<ModuleName, string> = {
  [MODULES.PRODUCTS]: "Productos",
  [MODULES.SERVICES]: "Servicios",
  [MODULES.MENU]: "Menú digital",
  [MODULES.APPOINTMENTS]: "Citas y reservas",
}
