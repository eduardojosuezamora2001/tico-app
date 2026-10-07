import {
  AccessibilityIcon,
  AiVoice01Icon,
  TextFontIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  FONT_SCALE_LABEL,
  type FontScale,
} from "@/lib/accessibility-settings"
import { isSpeechSupported } from "@/lib/speech-synthesis"
import { useAccessibilityStore } from "@/stores/accessibility-store"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "cn"

type AccessibilityMenuProps = {
  variant?: "icon" | "full"
  className?: string
}

export function AccessibilityMenu({ variant = "icon", className }: AccessibilityMenuProps) {
  const fontScale = useAccessibilityStore((s) => s.fontScale)
  const voiceEnabled = useAccessibilityStore((s) => s.voiceEnabled)
  const speaking = useAccessibilityStore((s) => s.speaking)
  const increaseFontScale = useAccessibilityStore((s) => s.increaseFontScale)
  const decreaseFontScale = useAccessibilityStore((s) => s.decreaseFontScale)
  const resetFontScale = useAccessibilityStore((s) => s.resetFontScale)
  const setFontScale = useAccessibilityStore((s) => s.setFontScale)
  const setVoiceEnabled = useAccessibilityStore((s) => s.setVoiceEnabled)
  const speakSelection = useAccessibilityStore((s) => s.speakSelection)
  const speakMainContent = useAccessibilityStore((s) => s.speakMainContent)
  const stopSpeaking = useAccessibilityStore((s) => s.stopSpeaking)

  const speechOk = isSpeechSupported()

  return (
    <Popover>
      <PopoverTrigger
        className={className}
        render={
          variant === "full" ? (
            <Button variant="outline" className="gap-2 rounded-full">
              <HugeiconsIcon icon={AccessibilityIcon} strokeWidth={2} data-icon="inline-start" />
              Accesibilidad
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-border bg-background shadow-lg"
              aria-label="Opciones de accesibilidad"
            >
              <HugeiconsIcon icon={AccessibilityIcon} strokeWidth={2} />
            </Button>
          )
        }
      />
      <PopoverContent align="end" side="bottom" className="w-80">
        <PopoverHeader>
          <PopoverTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={AccessibilityIcon} strokeWidth={2} />
            Accesibilidad
          </PopoverTitle>
          <PopoverDescription>
            Ajustá el tamaño del texto y usá lectura en voz alta. Tus preferencias se guardan en este
            dispositivo.
          </PopoverDescription>
        </PopoverHeader>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HugeiconsIcon icon={TextFontIcon} strokeWidth={2} />
            Tamaño de letra
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              aria-label="Disminuir tamaño de letra"
              disabled={fontScale === "normal"}
              onClick={decreaseFontScale}
            >
              A−
            </Button>
            <span className="min-w-24 text-center text-sm tabular-nums text-muted-foreground">
              {FONT_SCALE_LABEL[fontScale]}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              aria-label="Aumentar tamaño de letra"
              disabled={fontScale === "xlarge"}
              onClick={increaseFontScale}
            >
              A+
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={resetFontScale}
            >
              Restablecer
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["normal", "large", "xlarge"] as FontScale[]).map((scale) => (
              <Button
                key={scale}
                type="button"
                size="sm"
                variant={fontScale === scale ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setFontScale(scale)}
              >
                {FONT_SCALE_LABEL[scale]}
              </Button>
            ))}
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <HugeiconsIcon icon={AiVoice01Icon} strokeWidth={2} />
            Voz
          </div>
          {!speechOk ? (
            <p className="text-xs text-muted-foreground">
              Lectura en voz alta no disponible en este navegador.
            </p>
          ) : (
            <>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={voiceEnabled}
                  onCheckedChange={(checked) => setVoiceEnabled(checked === true)}
                  aria-label="Activar herramientas de voz"
                  className="mt-0.5"
                />
                <span>
                  Activar lectura en voz alta
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Leé la selección o el contenido principal de la página.
                  </span>
                </span>
              </label>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start rounded-xl"
                  disabled={!voiceEnabled}
                  onClick={speakSelection}
                >
                  Leer texto seleccionado
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start rounded-xl"
                  disabled={!voiceEnabled}
                  onClick={speakMainContent}
                >
                  Leer contenido principal
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("justify-start rounded-xl", !speaking && "hidden")}
                  onClick={stopSpeaking}
                >
                  Detener lectura
                </Button>
              </div>
            </>
          )}
        </section>
      </PopoverContent>
    </Popover>
  )
}

/** Barra flotante visible en todas las pantallas (no tapa el chat inferior derecho). */
export function AccessibilityFloatingTrigger() {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40 flex flex-col gap-2 sm:bottom-6 sm:left-6 lg:hidden">
      <div className="pointer-events-auto">
        <AccessibilityMenu variant="icon" />
      </div>
    </div>
  )
}
