import { Link, useLocation, useNavigate } from "react-router"
import {
  AccessibilityIcon,
  Add01Icon,
  Home01Icon,
  Logout01Icon,
  Message01Icon,
  Moon02Icon,
  ShoppingBag01Icon,
  Store01Icon,
  Sun03Icon,
  UserIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { AccessibilityMenu } from "@/components/accessibility-menu"
import { HeaderCategoryExplorerDesktop, HeaderCategoryExplorerMobile } from "@/components/header-category-explorer"
import { HeaderSearch } from "@/components/header-search"
import { OrderTabBadge } from "@/components/orders/order-tab-badge"
import { useTheme } from "@/components/theme-provider"
import { useAccessibilityStore } from "@/stores/accessibility-store"
import { useAuthStore } from "@/stores/auth-store"
import { useOrdersInboxStore } from "@/stores/orders-inbox-store"
import { Avatar, AvatarBadge, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "cn"

const navLinks = [
  {
    to: "/",
    label: "Inicio",
    icon: Home01Icon,
    match: (path: string) => path === "/",
  },
  {
    to: "/mi-negocio",
    label: "Para negocios",
    icon: Store01Icon,
    match: (path: string) => path.startsWith("/mi-negocio"),
  },
  {
    to: "/mensajes",
    label: "Mensajes",
    icon: Message01Icon,
    match: (path: string) => path.startsWith("/mensajes"),
  },
] as const

export function SiteHeader() {
  const status = useAuthStore((s) => s.status)
  const signedIn = status === "authenticated"
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">
            T
          </span>
          <span className="hidden sm:inline">TicoApp</span>
        </Link>

        <HeaderCategoryExplorerDesktop />
        <HeaderSearch />
        <HeaderCategoryExplorerMobile />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {navLinks.map((item) => {
            const active = item.match(pathname)
            const href = authHref(item.to, signedIn)
            return (
              <Button
                key={item.to}
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-full",
                  active ? "bg-muted text-foreground" : "text-muted-foreground",
                )}
                render={<Link to={href} aria-current={active ? "page" : undefined} />}
              >
                <HugeiconsIcon icon={item.icon} strokeWidth={2} data-icon="inline-start" />
                {item.label}
              </Button>
            )
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="lg:hidden">
            <AccountMenu variant="compact" />
          </div>

          <div className="hidden items-center gap-1 sm:gap-2 lg:flex">
            <AccessibilityMenu variant="icon" />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Mensajes"
              render={<Link to={authHref("/mensajes", signedIn)} />}
            >
              <HugeiconsIcon icon={Message01Icon} strokeWidth={2} />
            </Button>
            <AccountMenu variant="desktop" />
            <Button
              className="rounded-full"
              render={<Link to={signedIn ? "/mi-negocio/nuevo" : "/registro"} />}
            >
              Publicar negocio
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

function AccountMenu({ variant }: { variant: "compact" | "desktop" }) {
  const navigate = useNavigate()
  const status = useAuthStore((s) => s.status)
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)
  const signedIn = status === "authenticated"
  const userId = useAuthStore((s) => s.session?.user.id)
  const ordersNavCount = useOrdersInboxStore((s) => s.navBadgeCount(userId))
  const { theme, setTheme } = useTheme()
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  const increaseFontScale = useAccessibilityStore((s) => s.increaseFontScale)
  const resetFontScale = useAccessibilityStore((s) => s.resetFontScale)

  const mark = initials(profile?.fullName ?? null, profile?.email)
  const displayName = profile?.fullName?.trim() || profile?.email || "Cuenta"
  const messagesHref = authHref("/mensajes", signedIn)
  const isCompact = variant === "compact"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className={cn("rounded-full", isCompact ? "size-9 p-0" : "h-10 gap-2 px-2")}
            aria-label={signedIn ? "Menú de cuenta" : "Menú"}
          />
        }
      >
        <Avatar size="default">
          <AvatarFallback className="bg-primary/15 font-semibold text-primary">{mark}</AvatarFallback>
          {ordersNavCount > 0 ? <AvatarBadge className="top-0 right-0 bottom-auto size-2.5" /> : null}
        </Avatar>
        {isCompact ? null : (
          <span className="max-w-28 truncate text-sm font-medium">
            {signedIn ? "Mi cuenta" : "Menú"}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-80 min-w-72 p-0">
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar size="lg">
            <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
              {mark}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{signedIn ? displayName : "Invitado"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {signedIn ? (profile?.email ?? "Tu cuenta en TicoApp") : "Entrá para guardar pedidos y chats"}
            </p>
          </div>
          {isCompact ? (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 rounded-full"
              render={<Link to={messagesHref} />}
            >
              <HugeiconsIcon icon={Message01Icon} strokeWidth={2} data-icon="inline-start" />
              Mensajes
            </Button>
          ) : null}
        </div>

        {isCompact ? (
          <>
            <Separator />
            <div className="grid grid-cols-3 gap-1 px-2 py-3">
              <QuickAction
                to={signedIn ? "/pedidos" : "/login"}
                label="Pedidos"
                icon={ShoppingBag01Icon}
                badge={ordersNavCount}
              />
              <QuickAction to="/mi-negocio" label="Negocios" icon={Store01Icon} />
              <QuickAction
                to={signedIn ? "/mi-negocio/nuevo" : "/registro"}
                label={signedIn ? "Publicar" : "Registro"}
                icon={Add01Icon}
              />
            </div>
            <Separator />
            <DropdownMenuGroup className="p-1">
              <DropdownMenuLabel>Navegación</DropdownMenuLabel>
              {navLinks.map((item) => (
                <DropdownMenuItem key={item.to} onClick={() => navigate(authHref(item.to, signedIn))}>
                  <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : (
          <Separator />
        )}

        <DropdownMenuGroup className="p-1">
          <DropdownMenuLabel>Cuenta</DropdownMenuLabel>
          {signedIn ? (
            <DropdownMenuItem onClick={() => navigate("/cuenta")}>
              <HugeiconsIcon icon={UserIcon} strokeWidth={2} />
              Mi cuenta
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => navigate("/login")}>
              <HugeiconsIcon icon={UserIcon} strokeWidth={2} />
              Entrar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => navigate(signedIn ? "/pedidos" : "/login")}>
            <HugeiconsIcon icon={ShoppingBag01Icon} strokeWidth={2} />
            Tus pedidos
            <OrderTabBadge count={ordersNavCount} highlight={ordersNavCount > 0} />
          </DropdownMenuItem>
          {isCompact ? null : (
            <DropdownMenuItem onClick={() => navigate(signedIn ? "/mi-negocio/nuevo" : "/registro")}>
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
              {signedIn ? "Publicar negocio" : "Crear cuenta"}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup className="p-1">
          <DropdownMenuLabel>Preferencias</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
            <HugeiconsIcon icon={isDark ? Sun03Icon : Moon02Icon} strokeWidth={2} />
            {isDark ? "Usar tema claro" : "Usar tema oscuro"}
          </DropdownMenuItem>
          {isCompact ? (
            <>
              <DropdownMenuItem onClick={increaseFontScale}>
                <HugeiconsIcon icon={AccessibilityIcon} strokeWidth={2} />
                Aumentar tamaño de letra
              </DropdownMenuItem>
              <DropdownMenuItem onClick={resetFontScale}>
                <HugeiconsIcon icon={AccessibilityIcon} strokeWidth={2} />
                Restablecer tamaño de letra
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuGroup>

        {signedIn ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className="p-1">
              <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
                <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function QuickAction({
  to,
  label,
  icon,
  badge = 0,
}: {
  to: string
  label: string
  icon: typeof Home01Icon
  badge?: number
}) {
  return (
    <Link
      to={to}
      className="relative flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <span className="relative grid size-10 place-items-center rounded-full bg-muted text-foreground">
        <HugeiconsIcon icon={icon} strokeWidth={2} />
        {badge > 0 ? (
          <Badge className="absolute -top-1 -right-1 min-w-5 justify-center px-1 py-0 text-[10px]">
            {badge > 99 ? "99+" : badge}
          </Badge>
        ) : null}
      </span>
      {label}
    </Link>
  )
}

function authHref(to: string, signedIn: boolean) {
  if (!signedIn && to === "/mensajes") return "/login"
  return to
}

function initials(name: string | null, email: string | undefined) {
  const source = (name?.trim() || email?.split("@")[0] || "C").replace(/[._-]+/g, " ")
  const parts = source.split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "C"
}
