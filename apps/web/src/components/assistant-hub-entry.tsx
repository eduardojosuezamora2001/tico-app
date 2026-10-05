import { SparklesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { openAssistantSheet } from "@/lib/assistant-sheet"
import { Button } from "@workspace/ui/components/button"
import { cn } from "cn"

export function AssistantHubEntry({ compact = false }: { compact?: boolean }) {
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
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Asistente TicoApp</span>
          <span className="block truncate text-xs text-muted-foreground">
            Preguntá por negocios, productos y zonas · IA del directorio
          </span>
        </span>
      </button>
      {!compact ? (
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-full"
          onClick={() => openAssistantSheet("support")}
        >
          Soporte con el equipo
        </Button>
      ) : null}
    </div>
  )
}
