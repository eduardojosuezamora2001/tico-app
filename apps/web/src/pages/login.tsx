import { Link } from "react-router"

/** Placeholder. El formulario de login/registro se implementa en Fase 2. */
export function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col gap-4 p-6 text-sm leading-loose">
      <h1 className="font-medium">Iniciar sesion</h1>
      <p className="text-muted-foreground">
        Formulario pendiente (Fase 2). Supabase Auth ya esta configurado con
        email + contrasena.
      </p>
      <Link className="underline" to="/">
        Volver al inicio
      </Link>
    </main>
  )
}
