import { FormEvent, useEffect, useState, startTransition } from "react"
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from "react-router"
import {
  Building03Icon,
  DashboardSquare01Icon,
  FolderTreeIcon,
  Search01Icon,
  Shield01Icon,
  UserGroupIcon,
  BubbleChatIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AccessibilityMenu } from "@/components/accessibility-menu"
import { useAuthStore } from "@/stores/auth-store"
import { Badge } from "@workspace/ui/components/badge"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"
import { cn } from "cn"

const NAV = [
  { to: "/admin", end: true, label: "Resumen Global / Métricas", icon: DashboardSquare01Icon },
  { to: "/admin/comercios", end: false, label: "Comercios & Negocios", icon: Building03Icon },
  { to: "/admin/catalogo", end: false, label: "Catálogo Global", icon: FolderTreeIcon },
  { to: "/admin/usuarios", end: false, label: "Usuarios & Dueños", icon: UserGroupIcon },
  { to: "/admin/soporte", end: false, label: "Soporte plataforma", icon: BubbleChatIcon },
] as const

export function AdminShell() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "")
  }, [searchParams])

  function onSearch(event: FormEvent) {
    event.preventDefault()
    const q = query.trim()
    startTransition(() => {
      navigate(q ? `/admin/comercios?q=${encodeURIComponent(q)}` : "/admin/comercios")
    })
  }

  return (
    <div className="flex min-h-svh bg-[oklch(0.16_0.03_275)] text-[oklch(0.96_0.01_280)]">
      <aside className="sticky top-0 flex h-svh w-64 shrink-0 flex-col border-r border-[oklch(0.28_0.03_275)] bg-[oklch(0.14_0.03_275)]">
        <div className="border-b border-[oklch(0.28_0.03_275)] px-4 py-5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium tracking-[0.14em] text-[oklch(0.7_0.08_285)] uppercase">
              TicoApp
            </p>
            <Badge className="bg-[oklch(0.55_0.22_285)] text-[oklch(0.98_0.01_280)]">ROOT</Badge>
          </div>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">Master Admin</h1>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-[oklch(0.72_0.04_180)]">
            <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} className="size-3.5" />
            SuperAdmin · MODO PLATAFORMA
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-[oklch(0.55_0.22_285)] text-white"
                    : "text-[oklch(0.78_0.02_280)] hover:bg-[oklch(0.22_0.03_275)] hover:text-white",
                )
              }
            >
              <HugeiconsIcon icon={item.icon} strokeWidth={2} className="size-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[oklch(0.28_0.03_275)] px-4 py-4">
          <p className="truncate text-xs text-[oklch(0.65_0.02_280)]">{profile?.email}</p>
          <Link to="/" className="mt-2 inline-block text-xs text-[oklch(0.75_0.1_285)] hover:underline">
            Volver al sitio
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-[oklch(0.28_0.03_275)] px-6 py-4">
          <form onSubmit={onSearch} className="min-w-0 flex-1">
            <InputGroup className="max-w-xl border-[oklch(0.32_0.03_275)] bg-[oklch(0.2_0.03_275)]">
              <InputGroupAddon>
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Búsqueda global (comercio, slug, provincia…)"
                className="text-[oklch(0.96_0.01_280)] placeholder:text-[oklch(0.55_0.02_280)]"
              />
            </InputGroup>
          </form>
          <AccessibilityMenu variant="icon" />
          <Badge variant="outline" className="border-[oklch(0.35_0.08_180)] text-[oklch(0.82_0.08_180)]">
            Sistemas CR: Operativo
          </Badge>
          <div className="text-right">
            <p className="text-xs font-medium text-[oklch(0.82_0.08_180)]">SuperAdmin GOD-MODE</p>
            <p className="truncate text-xs text-[oklch(0.65_0.02_280)]">{profile?.email}</p>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
