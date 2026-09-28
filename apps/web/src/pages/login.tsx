import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router"

import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { SiteHeader } from "@/components/site-header"
import { supabase } from "@/lib/supabase"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@workspace/ui/components/button"

function safeNext(value: string | null | undefined, fallback = "/cuenta") {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value
  return fallback
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const status = useAuthStore((s) => s.status)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const fromState = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from
  const destination = safeNext(
    params.get("next") ??
      (fromState ? `${fromState.pathname ?? ""}${fromState.search ?? ""}${fromState.hash ?? ""}` : null),
  )

  useEffect(() => {
    if (status === "authenticated") {
      navigate(destination, { replace: true })
    }
  }, [destination, navigate, status])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setPending(false)
    if (signInError) {
      setError("Correo o contraseña incorrectos.")
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Entrar</h1>
        <div className="mt-6">
          <GoogleSignInButton />
        </div>
        <form className="mt-4 space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Correo"
            className="w-full rounded-xl border border-border bg-card px-3 py-2"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña"
            className="w-full rounded-xl border border-border bg-card px-3 py-2"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          ¿No tienes cuenta? <Link to="/registro" className="text-primary">Regístrate</Link>
        </p>
      </main>
    </div>
  )
}
