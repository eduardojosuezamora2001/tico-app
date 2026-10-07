import { useEffect } from "react"

import { useAccessibilityStore } from "@/stores/accessibility-store"

/** Carga preferencias de accesibilidad y las aplica al documento. */
export function AccessibilityBootstrap() {
  const hydrate = useAccessibilityStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return null
}
