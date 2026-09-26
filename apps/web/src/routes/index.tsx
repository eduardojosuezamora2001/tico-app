import { createBrowserRouter } from "react-router"

import { RootLayout } from "@/routes/root-layout"
import { ProtectedRoute } from "@/routes/protected-route"
import { HomePage } from "@/pages/home"
import { LoginPage } from "@/pages/login"
import { RegisterPage } from "@/pages/register"
import { AuthCallbackPage } from "@/pages/auth-callback"
import { AccountPage } from "@/pages/account"
import { BusinessPage } from "@/pages/business"
import { MerchantBusinessPage, MerchantHomePage, NewBusinessPage } from "@/pages/merchant"
import { LocalChatPage, MessageThreadPage, MessagesPage } from "@/pages/messages"
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
          { path: "mi-negocio", element: <MerchantHomePage /> },
          { path: "mi-negocio/nuevo", element: <NewBusinessPage /> },
          { path: "mi-negocio/:id", element: <MerchantBusinessPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
