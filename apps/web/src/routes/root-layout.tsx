import { lazy, Suspense, useEffect } from "react"
import { NuqsAdapter } from "nuqs/adapters/react-router/v7"
import { Outlet } from "react-router"

import { AccessibilityBootstrap } from "@/components/accessibility-bootstrap"
import { AccessibilityFloatingTrigger } from "@/components/accessibility-menu"
import { OrdersInboxSync } from "@/components/orders-inbox-sync"
import { useAuthStore } from "@/stores/auth-store"

const AssistantMessengerFab = lazy(() =>
  import("@/components/assistant-messenger-fab").then((mod) => ({
    default: mod.AssistantMessengerFab,
  })),
)
const FloatChat = lazy(() =>
  import("@/components/float-chat").then((mod) => ({ default: mod.FloatChat })),
)

/** Layout raiz: inicializa la sesion de Supabase una sola vez. */
export function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => initialize(), [initialize])

  return (
    <NuqsAdapter>
      <AccessibilityBootstrap />
      <OrdersInboxSync />
      <Outlet />
      <AccessibilityFloatingTrigger />
      <Suspense fallback={null}>
        <AssistantMessengerFab />
        <FloatChat />
      </Suspense>
    </NuqsAdapter>
  )
}
