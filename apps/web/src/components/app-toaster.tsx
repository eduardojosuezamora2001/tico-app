import { useTheme } from "@/components/theme-provider"
import { Toaster } from "@workspace/ui/components/sonner"

export function AppToaster() {
  const { theme } = useTheme()

  return (
    <Toaster
      closeButton
      position="top-center"
      richColors
      theme={theme === "system" ? "system" : theme}
    />
  )
}
