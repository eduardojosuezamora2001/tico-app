import { useEffect } from "react"
import { Outlet } from "react-router"

import { useAuthStore } from "@/stores/auth-store"

/** Layout raiz: inicializa la sesion de Supabase una sola vez. */
export function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => initialize(), [initialize])

  return <Outlet />
}
