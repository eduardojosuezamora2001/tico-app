import { useEffect, useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router"

import { Menu01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useTheme } from "@/components/theme-provider"
import { useAuthStore } from "@/stores/auth-store"
import { Button } from "@workspace/ui/components/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

const links = [
  { to: "/", label: "Inicio", icon: HomeIcon, match: (path: string) => path === "/" },
  { to: "/mi-negocio", label: "Para negocios", icon: StoreIcon, match: (path: string) => path.startsWith("/mi-negocio") },
  { to: "/mensajes", label: "Mensajes", icon: MessageIcon, match: (path: string) => path.startsWith("/mensajes") },
] as const

export function SiteHeader() {
  const status = useAuthStore((s) => s.status)
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)
  const signedIn = status === "authenticated"
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const urlQuery = params.get("q") ?? ""
  const [term, setTerm] = useState(urlQuery)
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  useEffect(() => {
    setTerm(pathname === "/" ? urlQuery : "")
  }, [pathname, urlQuery])

  function search(event: FormEvent) {
    event.preventDefault()
    const next = term.trim()
    navigate(next ? `/?q=${encodeURIComponent(next)}` : "/")
  }

  const mark = initials(profile?.fullName ?? null, profile?.email)

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-3 sm:gap-4 sm:px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">T</span>
          <span className="hidden sm:inline">TicoApp</span>
        </Link>

        <form onSubmit={search} className="min-w-0 flex-1 sm:max-w-md">
          <InputGroup className="h-10 rounded-full">
            <InputGroupAddon>
              <SearchIcon />
              <span className="sr-only">Buscar comercios</span>
            </InputGroupAddon>
            <InputGroupInput
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Buscar sodas, comida típica, comercios..."
            />
          </InputGroup>
        </form>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((item) => {
            const active = item.match(pathname)
            const href = item.to === "/mensajes" && !signedIn ? "/login" : item.to
            return (
              <Link
                key={item.to}
                to={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <Sheet>
          <SheetTrigger
            className="ml-auto md:ml-0 md:hidden"
            render={<Button variant="ghost" size="icon" aria-label="Abrir menú" />}
          >
            <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>TicoApp</SheetTitle>
              <SheetDescription>Directorio de comercios locales</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {links.map((item) => {
                const href = item.to === "/mensajes" && !signedIn ? "/login" : item.to
                return (
                  <Button key={item.to} variant="ghost" className="justify-start" render={<Link to={href} />}>
                    <item.icon />
                    {item.label}
                  </Button>
                )
              })}
            </nav>
            <SheetFooter>
              <Button variant="outline" onClick={() => setTheme(isDark ? "light" : "dark")}>
                {isDark ? "Usar tema claro" : "Usar tema oscuro"}
              </Button>
              {signedIn ? (
                <>
                  <Button variant="ghost" render={<Link to="/cuenta" />}>
                    Mi cuenta
                  </Button>
                  <Button variant="ghost" onClick={() => void signOut()}>
                    Salir
                  </Button>
                </>
              ) : (
                <Button render={<Link to="/login" />}>Entrar</Button>
              )}
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
          <Link
            to={signedIn ? "/mensajes" : "/login"}
            aria-label="Mensajes"
            className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          >
            <MessageIcon />
          </Link>
          <Link
            to={signedIn ? "/mensajes" : "/login"}
            aria-label="Avisos"
            className="hidden size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground sm:grid"
          >
            <BellIcon />
          </Link>

          {signedIn ? (
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pr-1 pl-1 hover:bg-muted [&::-webkit-details-marker]:hidden">
                <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {mark}
                </span>
                <span className="hidden text-sm md:inline">Mi cuenta</span>
                <ChevronIcon />
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-border bg-popover p-1 text-sm shadow-[0_16px_40px_-24px_oklch(0.2_0.04_275)]">
                <Link className="block rounded-lg px-3 py-2 hover:bg-muted" to="/cuenta">
                  Mi cuenta
                </Link>
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                >
                  {isDark ? "Usar tema claro" : "Usar tema oscuro"}
                </button>
                <button
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted"
                  onClick={() => void signOut()}
                >
                  Salir
                </button>
              </div>
            </details>
          ) : (
            <>
              <button
                type="button"
                className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={isDark ? "Usar tema claro" : "Usar tema oscuro"}
                onClick={() => setTheme(isDark ? "light" : "dark")}
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
              </button>
              <Button variant="ghost" className="rounded-full" render={<Link to="/login" />}>
                Entrar
              </Button>
            </>
          )}

        </div>
        <Button className="shrink-0 rounded-full px-3 sm:px-4" render={<Link to={signedIn ? "/mi-negocio/nuevo" : "/registro"} />}>
          <span className="sm:hidden">Publicar</span>
          <span className="hidden sm:inline">Publicar negocio</span>
        </Button>
      </div>
    </header>
  )
}

function initials(name: string | null, email: string | undefined) {
  const source = (name?.trim() || email?.split("@")[0] || "C").replace(/[._-]+/g, " ")
  const parts = source.split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "C"
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none text-muted-foreground">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" strokeLinejoin="round" />
    </svg>
  )
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 9.5 6 4h12l2 5.5" strokeLinejoin="round" />
      <path d="M4 9.5h16V20H4z" strokeLinejoin="round" />
      <path d="M9 20v-5h6v5" />
    </svg>
  )
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M5 6.5h14v9H8l-3 2.5z" strokeLinejoin="round" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M6 16.5h12l-1.2-2V10a4.8 4.8 0 0 0-9.6 0v4.5z" strokeLinejoin="round" />
      <path d="M10 16.5a2 2 0 0 0 4 0" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M16 3.5A8 8 0 1 0 20.5 14 6.5 6.5 0 0 1 16 3.5Z" strokeLinejoin="round" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v2M12 18.5v2M4.5 12h2M17.5 12h2" strokeLinecap="round" />
    </svg>
  )
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
