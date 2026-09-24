import type { UserRole } from "@workspace/shared"
import { Navigate, Outlet, useLocation } from "react-router"

import { useAuthStore } from "@/stores/auth-store"

interface ProtectedRouteProps {
  /** Si se indica, solo estos roles globales pueden entrar. */
  roles?: readonly UserRole[]
}

/**
 * Envuelve rutas que requieren sesion. Mientras se resuelve la sesion no
 * renderiza nada para evitar parpadeos; sin sesion redirige a /login
 * recordando la ruta de origen.
 */
export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const status = useAuthStore((s) => s.status)
  const profile = useAuthStore((s) => s.profile)
  const location = useLocation()

  if (status === "loading") {
    return null
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && (!profile || !roles.includes(profile.role))) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
