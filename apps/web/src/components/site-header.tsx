import { Link } from "react-router"

import { ThemeToggle } from "@/components/theme-toggle"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@workspace/ui/components/button"

export function SiteHeader() {
  const status = useAuthStore((s) => s.status)
  const signedIn = status === "authenticated"

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">
            T
          </span>
          TicoApp
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          <Link to="/" className="hover:text-foreground">
            Inicio
          </Link>
          <Link to="/mi-negocio" className="hover:text-foreground">
            Para negocios
          </Link>
          {signedIn ? (
            <Link to="/mensajes" className="hover:text-foreground">
              Mensajes
            </Link>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Button variant="ghost" render={<Link to="/cuenta" />}>
              Mi cuenta
            </Button>
          ) : (
            <Button variant="ghost" render={<Link to="/login" />}>
              Entrar
            </Button>
          )}
          <Button render={<Link to={signedIn ? "/mi-negocio/nuevo" : "/registro"} />}>
            Publicar negocio
          </Button>
        </div>
      </div>
    </header>
  )
}
