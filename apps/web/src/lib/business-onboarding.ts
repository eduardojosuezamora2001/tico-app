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

export type ScheduleGroup = {
  id: string
  label: string
  days: number[]
  open: string
  close: string
  closed: boolean
}

export function defaultScheduleGroups(): ScheduleGroup[] {
  return [
    { id: "weekdays", label: "Lunes a viernes", days: [1, 2, 3, 4, 5], open: "08:30", close: "22:00", closed: false },
    { id: "sat", label: "Sábados", days: [6], open: "07:00", close: "22:00", closed: false },
    { id: "sun", label: "Domingos", days: [0], open: "07:00", close: "18:00", closed: false },
  ]
}

export function schedulesToHours(groups: ScheduleGroup[]) {
  return groups.flatMap((group) =>
    group.days.map((day) => ({
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
