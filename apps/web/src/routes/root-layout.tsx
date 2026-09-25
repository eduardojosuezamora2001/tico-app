import { useEffect } from "react"
import { NuqsAdapter } from "nuqs/adapters/react-router/v7"
import { Outlet } from "react-router"

import { FloatChat } from "@/components/float-chat"
import { useAuthStore } from "@/stores/auth-store"

/** Layout raiz: inicializa la sesion de Supabase una sola vez. */
export function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => initialize(), [initialize])

  return (
    <NuqsAdapter>
      <Outlet />
      <FloatChat />
    </NuqsAdapter>
  )
}
