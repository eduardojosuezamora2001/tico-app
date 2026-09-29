import { useEffect } from "react"
import { useLocation } from "react-router"

import { useOrdersInboxStore } from "@/stores/orders-inbox-store"
import { useAuthStore } from "@/stores/auth-store"

/** Mantiene pedidos y contadores sincronizados para /pedidos y el header. */
export function OrdersInboxSync() {
  const status = useAuthStore((s) => s.status)
  const userId = useAuthStore((s) => s.session?.user.id)
  const { pathname } = useLocation()
  const setActiveTab = useOrdersInboxStore((s) => s.setActiveTab)

  useEffect(() => {
    if (status !== "authenticated" || !userId) return
    return useOrdersInboxStore.getState().bootstrap(userId)
  }, [status, userId])

  useEffect(() => {
    if (!pathname.startsWith("/pedidos")) setActiveTab(null)
  }, [pathname, setActiveTab])

  return null
}
