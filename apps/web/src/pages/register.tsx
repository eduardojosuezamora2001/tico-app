import { useState } from "react"
import { Link } from "react-router"

import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { SiteHeader } from "@/components/site-header"
import { supabase } from "@/lib/supabase"
import { Button } from "@workspace/ui/components/button"

export function RegisterPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setPending(false)
    if (signUpError) {
      setError(signUpError.message)
      return
    }
    setMessage("Revisa tu correo para confirmar la cuenta, o entra si la confirmación está desactivada.")
  }

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Crear cuenta</h1>
        <div className="mt-6">
          <GoogleSignInButton />
        </div>
        <form className="mt-4 space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre" className="w-full rounded-xl border border-border bg-card px-3 py-2" />
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" className="w-full rounded-xl border border-border bg-card px-3 py-2" />
          <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mínimo 8)" className="w-full rounded-xl border border-border bg-card px-3 py-2" />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? <p className="text-sm">{message}</p> : null}
          <Button type="submit" disabled={pending} className="w-full">Registrarme</Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary">Entrar</Link>
        </p>
      </main>
    </div>
  )
}
