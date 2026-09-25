import { useEffect, useState } from "react"
import { useNavigate } from "react-router"

import { supabase } from "@/lib/supabase"

/**
 * Google vuelve aqui con ?code=. El cliente PKCE lo cambia por la sesion
 * al iniciar (detectSessionInUrl). Esta pagina solo espera esa sesion.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextParam = params.get("next") ?? "/cuenta"
    const next = nextParam.startsWith("/") ? nextParam : "/cuenta"

    if (params.get("error")) {
      const description = params.get("error_description") ?? ""
      setError(
        description.toLowerCase().includes("exchange") || params.get("error") === "server_error"
          ? "Supabase no pudo canjear el código de Google. El Client Secret del proveedor no coincide con el de Google Cloud."
          : "Google no autorizó el inicio de sesión.",
      )
      return
    }

    let active = true
    const go = () => {
      if (active) navigate(next, { replace: true })
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) go()
    })

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) go()
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <p className="p-6 text-sm text-muted-foreground">
      {error ?? "Confirmando la sesión…"}
    </p>
  )
}
