import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"

import "@workspace/ui/globals.css"
import { applyAccessibilityPreferences, loadAccessibilityPreferences } from "@/lib/accessibility-settings"
import { queryClient } from "@/lib/query-client"
import { App } from "./App.tsx"

applyAccessibilityPreferences(loadAccessibilityPreferences())
import { AppToaster } from "@/components/app-toaster.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
        <AppToaster />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
)
