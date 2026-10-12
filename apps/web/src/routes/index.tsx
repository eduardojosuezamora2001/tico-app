import { createBrowserRouter } from "react-router"
import { ROLES } from "@workspace/shared"

import { RootLayout } from "@/routes/root-layout"
import { ProtectedRoute } from "@/routes/protected-route"
import { HomePage } from "@/pages/home"
import { LoginPage } from "@/pages/login"
import { RegisterPage } from "@/pages/register"
import { AuthCallbackPage } from "@/pages/auth-callback"
import { NotFoundPage } from "@/pages/not-found"

/**
 * Arbol de rutas (React Router v7, data mode).
 * Páginas críticas quedan eager; el resto usa `lazy` para code-split.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "buscar",
        lazy: async () => {
          const { BuscarPage } = await import("@/pages/buscar")
          return { Component: BuscarPage }
        },
      },
      { path: "login", element: <LoginPage /> },
      { path: "registro", element: <RegisterPage /> },
      { path: "auth/callback", element: <AuthCallbackPage /> },
      {
        path: "n/:id",
        lazy: async () => {
          const { BusinessPage } = await import("@/pages/business")
          return { Component: BusinessPage }
        },
      },
      {
        path: "health",
        lazy: async () => {
          const { HealthPage } = await import("@/pages/health")
          return { Component: HealthPage }
        },
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "cuenta",
            lazy: async () => {
              const { AccountPage } = await import("@/pages/account")
              return { Component: AccountPage }
            },
          },
          {
            path: "mensajes",
            lazy: async () => {
              const { MessagesPage } = await import("@/pages/messages")
              return { Component: MessagesPage }
            },
          },
          {
            path: "mensajes/local/:businessId",
            lazy: async () => {
              const { LocalChatPage } = await import("@/pages/messages")
              return { Component: LocalChatPage }
            },
          },
          {
            path: "mensajes/:conversationId",
            lazy: async () => {
              const { MessageThreadPage } = await import("@/pages/messages")
              return { Component: MessageThreadPage }
            },
          },
          {
            path: "pedidos",
            lazy: async () => {
              const { OrdersPage } = await import("@/pages/orders")
              return { Component: OrdersPage }
            },
          },
          {
            path: "mi-negocio",
            lazy: async () => {
              const { MerchantHomePage } = await import("@/pages/merchant")
              return { Component: MerchantHomePage }
            },
          },
          {
            path: "mi-negocio/nuevo",
            lazy: async () => {
              const { NewBusinessPage } = await import("@/pages/new-business")
              return { Component: NewBusinessPage }
            },
          },
          {
            path: "mi-negocio/nuevo/:draftId",
            lazy: async () => {
              const { NewBusinessPage } = await import("@/pages/new-business")
              return { Component: NewBusinessPage }
            },
          },
          {
            path: "mi-negocio/:id",
            lazy: async () => {
              const { MerchantBusinessPage } = await import("@/pages/merchant")
              return { Component: MerchantBusinessPage }
            },
          },
        ],
      },
      {
        path: "admin",
        element: <ProtectedRoute roles={[ROLES.ADMIN]} />,
        children: [
          {
            lazy: async () => {
              const { AdminShell } = await import("@/components/admin/admin-shell")
              return { Component: AdminShell }
            },
            children: [
              {
                index: true,
                lazy: async () => {
                  const { AdminResumenPage } = await import("@/pages/admin")
                  return { Component: AdminResumenPage }
                },
              },
              {
                path: "comercios",
                lazy: async () => {
                  const { AdminComerciosPage } = await import("@/pages/admin/comercios")
                  return { Component: AdminComerciosPage }
                },
              },
              {
                path: "catalogo",
                lazy: async () => {
                  const { AdminCatalogoPage } = await import("@/pages/admin/catalogo")
                  return { Component: AdminCatalogoPage }
                },
              },
              {
                path: "usuarios",
                lazy: async () => {
                  const { AdminUsuariosPage } = await import("@/pages/admin/usuarios")
                  return { Component: AdminUsuariosPage }
                },
              },
              {
                path: "soporte",
                lazy: async () => {
                  const { AdminSoportePage } = await import("@/pages/admin/soporte")
                  return { Component: AdminSoportePage }
                },
              },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
