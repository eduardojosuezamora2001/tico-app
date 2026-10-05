import { useState } from "react"
import { Link } from "react-router"

import { GoogleSignInButton } from "@/components/google-sign-in-button"
import { SiteHeader } from "@/components/site-header"
import { supabase } from "@/lib/supabase"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"
import { Spinner } from "@workspace/ui/components/spinner"

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
    setMessage(null)
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
    setMessage(
      "Revisa tu correo para confirmar la cuenta, o entra si la confirmación está desactivada.",
    )
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.72_0.12_145_/_0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_oklch(0.7_0.08_85_/_0.12),_transparent_45%)]"
      />
      <SiteHeader />
      <main className="relative mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10 sm:py-14">
        <div className="text-center sm:text-left">
          <p className="text-sm font-medium text-primary">TicoApp</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Crear cuenta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Únete para descubrir comercios, pedir y gestionar tu negocio en Costa Rica.
          </p>
        </div>

        <Card className="border-border/80 bg-card/90 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Registro</CardTitle>
            <CardDescription>
              Continúa con Google o completa el formulario con tu correo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              <GoogleSignInButton />

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">o</span>
                <Separator className="flex-1" />
              </div>

              {message ? (
                <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
                  {message}
                  <p className="mt-2">
                    <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                      Ir a iniciar sesión
                    </Link>
                  </p>
                </div>
              ) : (
                <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
                  <FieldGroup className="gap-4">
                    <Field data-invalid={error ? true : undefined}>
                      <FieldLabel htmlFor="register-name">Nombre</FieldLabel>
                      <Input
                        id="register-name"
                        required
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Tu nombre"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="register-email">Correo</FieldLabel>
                      <Input
                        id="register-email"
                        required
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="h-11 rounded-xl"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="register-password">Contraseña</FieldLabel>
                      <Input
                        id="register-password"
                        required
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="h-11 rounded-xl"
                      />
                      <FieldDescription>Usa al menos 8 caracteres.</FieldDescription>
                    </Field>
                  </FieldGroup>
                  {error ? <FieldError>{error}</FieldError> : null}
                  <Button type="submit" disabled={pending} className="h-11 w-full rounded-full">
                    {pending ? <Spinner data-icon="inline-start" /> : null}
                    {pending ? "Creando cuenta…" : "Registrarme"}
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t border-border/60 pt-(--card-spacing) text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="ml-1 font-medium text-primary underline-offset-4 hover:underline">
              Entrar
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
