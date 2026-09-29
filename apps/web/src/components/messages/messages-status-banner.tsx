import { Link01Icon, SecurityCheckIcon, ShoppingBag01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export function MessagesStatusBanner() {
  const time = new Intl.DateTimeFormat("es-CR", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Costa_Rica",
  }).format(new Date())

  return (
    <div className="border-b border-border/80 bg-card/80 px-4 py-2 text-xs text-muted-foreground sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} className="size-3.5 text-primary" />
            Canal oficial TicoApp CR
          </span>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <HugeiconsIcon icon={Link01Icon} strokeWidth={2} className="size-3.5" />
            Chat directo con comercios locales
          </span>
          <span className="hidden items-center gap-1.5 md:inline-flex">
            <HugeiconsIcon icon={SecurityCheckIcon} strokeWidth={2} className="size-3.5 text-emerald-500" />
            Validación de transferencia móvil integrada
          </span>
        </div>
        <p className="text-[11px] sm:text-xs">
          Garantía al comprador activa · San José, CR: {time}
        </p>
      </div>
    </div>
  )
}
