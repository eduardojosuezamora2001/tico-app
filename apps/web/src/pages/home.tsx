import { Link } from "react-router"

import { useAuthStore } from "@/stores/auth-store"

export function HomePage() {
  const status = useAuthStore((s) => s.status)
  const profile = useAuthStore((s) => s.profile)

  return (
    <main className="flex min-h-svh flex-col gap-4 p-6 text-sm leading-loose">
      <h1 className="font-medium">Plaza de Comercios Digital</h1>
      <p className="text-muted-foreground">
        Fase 1: fundaciones listas. Las pantallas llegan en la Fase 2.
      </p>
      <p>
        Sesion:{" "}
        {status === "loading"
          ? "cargando…"
          : status === "authenticated"
            ? `${profile?.email ?? "usuario"} (${profile?.role ?? "sin perfil"})`
            : "sin iniciar"}
      </p>
      <nav className="flex gap-4">
        <Link className="underline" to="/login">
          Iniciar sesion
        </Link>
        <Link className="underline" to="/cuenta">
          Mi cuenta
        </Link>
      </nav>
    </main>
  )
}
