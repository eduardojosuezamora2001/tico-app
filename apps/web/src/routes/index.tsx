import { createBrowserRouter } from "react-router"

import { RootLayout } from "@/routes/root-layout"
import { ProtectedRoute } from "@/routes/protected-route"
import { HomePage } from "@/pages/home"
import { BuscarPage } from "@/pages/buscar"
import { LoginPage } from "@/pages/login"
import { RegisterPage } from "@/pages/register"
import { AuthCallbackPage } from "@/pages/auth-callback"
import { AccountPage } from "@/pages/account"
import { BusinessPage } from "@/pages/business"
import { MerchantBusinessPage, MerchantHomePage } from "@/pages/merchant"
import { NewBusinessPage } from "@/pages/new-business"
import { LocalChatPage, MessageThreadPage, MessagesPage } from "@/pages/messages"
import { OrdersPage } from "@/pages/orders"
import { AdminResumenPage } from "@/pages/admin"
import { AdminCatalogoPage } from "@/pages/admin/catalogo"
import { AdminComerciosPage } from "@/pages/admin/comercios"
import { AdminUsuariosPage } from "@/pages/admin/usuarios"
import { AdminSoportePage } from "@/pages/admin/soporte"
import { AdminShell } from "@/components/admin/admin-shell"
import { NotFoundPage } from "@/pages/not-found"
import { ROLES } from "@workspace/shared"

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
      { path: "buscar", element: <BuscarPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "registro", element: <RegisterPage /> },
      { path: "auth/callback", element: <AuthCallbackPage /> },
      { path: "n/:id", element: <BusinessPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "cuenta", element: <AccountPage /> },
          { path: "mensajes", element: <MessagesPage /> },
          { path: "mensajes/local/:businessId", element: <LocalChatPage /> },
          { path: "mensajes/:conversationId", element: <MessageThreadPage /> },
          { path: "pedidos", element: <OrdersPage /> },
          { path: "mi-negocio", element: <MerchantHomePage /> },
          { path: "mi-negocio/nuevo", element: <NewBusinessPage /> },
          { path: "mi-negocio/nuevo/:draftId", element: <NewBusinessPage /> },
          { path: "mi-negocio/:id", element: <MerchantBusinessPage /> },
        ],
      },
      {
        path: "admin",
        element: <ProtectedRoute roles={[ROLES.ADMIN]} />,
        children: [
          {
            element: <AdminShell />,
            children: [
              { index: true, element: <AdminResumenPage /> },
              { path: "comercios", element: <AdminComerciosPage /> },
              { path: "catalogo", element: <AdminCatalogoPage /> },
              { path: "usuarios", element: <AdminUsuariosPage /> },
              { path: "soporte", element: <AdminSoportePage /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
