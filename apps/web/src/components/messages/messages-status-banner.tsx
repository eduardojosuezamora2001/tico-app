import { Link01Icon, ShoppingBag01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export function MessagesStatusBanner() {
  return (
    <div className="hidden border-b border-border/80 bg-card/80 px-4 py-2 text-xs text-muted-foreground sm:block sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} className="size-3.5 text-primary" />
          Canal oficial TicoApp CR
        </span>
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <HugeiconsIcon icon={Link01Icon} strokeWidth={2} className="size-3.5" />
          Chat directo con comercios locales
        </span>
      </div>
    </div>
  )
}
