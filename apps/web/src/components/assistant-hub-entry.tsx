import { SparklesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { openAssistantSheet } from "@/lib/assistant-sheet"
import { useSupportInboxStore } from "@/stores/support-inbox-store"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "cn"

export function AssistantHubEntry({ compact = false }: { compact?: boolean }) {
  const supportUnread = useSupportInboxStore((s) => s.unread)

  return (
    <div className={cn("flex flex-col gap-2", compact ? "" : "gap-2.5")}>
      <button
        type="button"
        onClick={() => openAssistantSheet("assistant")}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5 text-left transition-colors hover:border-primary/50 hover:from-primary/20",
          compact ? "px-3 py-2.5" : "px-4 py-3",
        )}
      >
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Asistente TicoApp</span>
          <span className="block truncate text-xs text-muted-foreground">
            Preguntá por negocios, productos y zonas · IA del directorio
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => openAssistantSheet("support")}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border text-left transition-colors",
          supportUnread > 0
            ? "border-primary/40 bg-primary/10 hover:border-primary/60"
            : "border-border bg-card hover:bg-muted/60",
          compact ? "px-3 py-2.5" : "px-4 py-3",
        )}
      >
        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground">
          <span className="text-sm font-semibold">SP</span>
          {supportUnread > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {supportUnread > 9 ? "9+" : supportUnread}
            </span>
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm", supportUnread > 0 ? "font-semibold" : "font-medium")}>
            Soporte TicoApp
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {supportUnread > 0
              ? `${supportUnread} mensaje${supportUnread === 1 ? "" : "s"} nuevo${supportUnread === 1 ? "" : "s"} del equipo`
              : "Chat con el equipo de la plataforma"}
          </span>
        </span>
        {supportUnread > 0 ? <Badge className="shrink-0">{supportUnread > 9 ? "9+" : supportUnread}</Badge> : null}
      </button>
    </div>
  )
}
