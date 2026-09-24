import { createBrowserRouter } from "react-router"

import { RootLayout } from "@/routes/root-layout"
import { ProtectedRoute } from "@/routes/protected-route"
import { HomePage } from "@/pages/home"
import { LoginPage } from "@/pages/login"
import { AccountPage } from "@/pages/account"
import { NotFoundPage } from "@/pages/not-found"

/**
 * Arbol de rutas (React Router v7, data mode).
 * Fase 1: esqueleto. Las pantallas reales llegan en Fase 2.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      {
        element: <ProtectedRoute />,
        children: [{ path: "cuenta", element: <AccountPage /> }],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
