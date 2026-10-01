import {
  createScheduleGroup,
  DAY_LABELS,
  daysInRange,
  firstUnusedDay,
  scheduleOverlapMessage,
  scheduleRangeLabel,
  WEEK_ORDER,
  weekIndex,
  type ScheduleGroup,
} from "@/lib/business-onboarding"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"

const selectClass = "h-11 rounded-xl border border-border bg-background px-3 text-sm"

export function ScheduleRangeEditor({
  groups,
  onChange,
}: {
  groups: ScheduleGroup[]
  onChange: (groups: ScheduleGroup[]) => void
}) {
  const overlap = scheduleOverlapMessage(groups)

  function update(id: string, patch: Partial<ScheduleGroup>) {
    onChange(groups.map((group) => (group.id === id ? { ...group, ...patch } : group)))
  }

  function changeFrom(group: ScheduleGroup, fromDay: number) {
    const toDay = weekIndex(group.toDay) < weekIndex(fromDay) ? fromDay : group.toDay
    update(group.id, { fromDay, toDay })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Arma cada horario con un rango de días. Por ejemplo, lunes a miércoles de 8:00 a 16:00 y el jueves con otro horario.
      </p>
      {groups.map((group, index) => {
        const fromIndex = Math.max(0, weekIndex(group.fromDay))
        const toOptions = WEEK_ORDER.slice(fromIndex)
        const dayCount = daysInRange(group.fromDay, group.toDay).length
        return (
          <div key={group.id} className="flex flex-col gap-3 rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{scheduleRangeLabel(group.fromDay, group.toDay)}</p>
              {groups.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(groups.filter((item) => item.id !== group.id))}
                >
                  Quitar
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Desde</span>
                <select
                  className={selectClass}
                  value={group.fromDay}
                  aria-label={`Día inicial del horario ${index + 1}`}
                  onChange={(event) => changeFrom(group, Number(event.target.value))}
                >
                  {WEEK_ORDER.map((day) => (
                    <option key={day} value={day}>
                      {DAY_LABELS[day]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Hasta</span>
                <select
                  className={selectClass}
                  value={toOptions.some((day) => day === group.toDay) ? group.toDay : group.fromDay}
                  aria-label={`Día final del horario ${index + 1}`}
                  onChange={(event) => update(group.id, { toDay: Number(event.target.value) })}
                >
                  {toOptions.map((day) => (
                    <option key={day} value={day}>
                      {DAY_LABELS[day]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={group.closed}
                onCheckedChange={(checked) => update(group.id, { closed: Boolean(checked) })}
              />
              Cerrado{dayCount > 1 ? " estos días" : ""}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Apertura</span>
                <input
                  type="time"
                  value={group.open}
                  disabled={group.closed}
                  aria-label={`Apertura del horario ${index + 1}`}
                  className={selectClass}
                  onChange={(event) => update(group.id, { open: event.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Cierre</span>
                <input
                  type="time"
                  value={group.close}
                  disabled={group.closed}
                  aria-label={`Cierre del horario ${index + 1}`}
                  className={selectClass}
                  onChange={(event) => update(group.id, { close: event.target.value })}
                />
              </label>
            </div>
          </div>
        )
      })}
      {overlap ? <p className="text-sm text-destructive">{overlap}</p> : null}
      <Button
        type="button"
        variant="outline"
        className="w-fit rounded-full"
        onClick={() => {
          const day = firstUnusedDay(groups)
          onChange([...groups, createScheduleGroup({ fromDay: day, toDay: day })])
        }}
      >
        Agregar horario
      </Button>
    </div>
  )
}
