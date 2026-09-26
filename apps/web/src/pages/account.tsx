import { useEffect, useState } from "react"
import { Link } from "react-router"
import axios from "axios"
import { SiteHeader } from "@/components/site-header"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@workspace/ui/components/empty"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { cn } from "cn"

type AccountBusiness = {
  id: string
  name: string
  slug: string
  category: string
  address: string | null
  isActive: boolean
  logoUrl: string | null
}

type Membership = {
  businessId: string
  role: string
  permissions: string[]
  isActive: boolean
  business: AccountBusiness | null
}

type ListedThread = {
  id?: string
  businessId?: string
  businessName?: string
  peerId?: string
  peerName?: string | null
  customerName?: string | null
  assigneeName?: string | null
  lastText?: string
  unreadCount?: number
  viewerRole?: "customer" | "assignee" | "owner" | "member"
}

const roleLabel: Record<string, string> = {
  owner: "Propietario de negocio",
  manager: "Encargado",
  employee: "En el equipo",
}

export function AccountPage() {
  const profile = useAuthStore((s) => s.profile)
  const session = useAuthStore((s) => s.session)
  const signOut = useAuthStore((s) => s.signOut)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const [fullName, setFullName] = useState(profile?.fullName ?? "")
  const [language, setLanguage] = useState(profile?.preferredLanguage ?? "es")
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [threads, setThreads] = useState<ListedThread[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFullName(profile?.fullName ?? "")
    setLanguage(profile?.preferredLanguage ?? "es")
  }, [profile?.fullName, profile?.preferredLanguage])

  useEffect(() => {
    let active = true
    void Promise.allSettled([
      api.get<{ data: { memberships: Membership[] } }>("/me"),
      api.get<{ data: ListedThread[] }>("/messages/conversations"),
    ]).then(([me, conversations]) => {
      if (!active) return
      if (me.status === "fulfilled") setMemberships(me.value.data.data.memberships)
      if (conversations.status === "fulfilled") setThreads(conversations.value.data.data)
      if (me.status === "rejected") setError(errorMessage(me.reason, "No se pudo cargar tu cuenta."))
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const stores = memberships.filter((item) => item.business)
  const headlineRole = stores.some((item) => item.role === "owner")
    ? roleLabel.owner
    : roleLabel[stores[0]?.role ?? ""] ?? "Cliente"
  const unread = threads.reduce((sum, item) => sum + (item.unreadCount ?? 0), 0)
  const verified = Boolean(session?.user.email_confirmed_at)
  const google = session?.user.identities?.some((item) => item.provider === "google") ?? false
  const since = profile?.createdAt ? new Date(profile.createdAt).getFullYear() : null
  const initials = nameInitials(profile?.fullName || profile?.email || "?")

  function resetForm() {
    setFullName(profile?.fullName ?? "")
    setLanguage(profile?.preferredLanguage ?? "es")
    setNotice(null)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    setError(null)
    try {
      await api.patch("/me", { fullName, preferredLanguage: language })
      await refreshProfile()
      setNotice("Datos actualizados.")
    } catch (reason) {
      setError(errorMessage(reason, "No se pudieron guardar los cambios."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <section className="flex flex-col gap-6 rounded-3xl border border-border bg-[color-mix(in_oklch,var(--card),var(--primary)_10%)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-20 rounded-2xl border border-primary/40 bg-primary/10 text-lg after:rounded-2xl">
              {profile?.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" className="rounded-2xl" /> : null}
              <AvatarFallback className="rounded-2xl bg-transparent text-lg font-semibold text-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{profile?.fullName || "Tu cuenta"}</h1>
                {verified ? <Pill>Verificado</Pill> : null}
                <Pill muted>{headlineRole}</Pill>
              </div>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="truncate">{profile?.email}</span>
                {since ? <span>Miembro desde {since}</span> : null}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-72">
            <Stat value={loading ? "–" : String(stores.length)} label="Negocios" />
            <Stat value={loading ? "–" : String(threads.length)} label="Mensajes" />
            <Stat value={loading ? "–" : String(unread)} label="Sin leer" />
          </div>
        </section>

        <Tabs defaultValue="datos">
          <div className="-mx-4 overflow-x-auto overflow-y-hidden border-b border-border px-4 sm:mx-0 sm:px-0">
            <TabsList variant="line" className="h-11 w-max bg-transparent">
              <TabsTrigger value="datos" className="data-active:text-primary after:bg-primary">Datos personales</TabsTrigger>
              <TabsTrigger value="negocios" className="data-active:text-primary after:bg-primary">
                Mis negocios
                {stores.length ? <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-xs text-primary">{stores.length}</span> : null}
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="data-active:text-primary after:bg-primary">Mensajes y pedidos</TabsTrigger>
              <TabsTrigger value="favoritos" className="data-active:text-primary after:bg-primary">Comercios favoritos</TabsTrigger>
              <TabsTrigger value="seguridad" className="data-active:text-primary after:bg-primary">Seguridad</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="datos" className="flex flex-col gap-4 pt-4">
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <form className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5" onSubmit={(event) => void onSubmit(event)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-medium">Información de tu perfil</h2>
                    <p className="mt-1 text-sm text-muted-foreground">El nombre es el que ven los locales cuando escribes.</p>
                  </div>
                </div>
                <label className="flex flex-col gap-2 text-sm">
                  Nombre completo
                  <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required className="h-11 rounded-xl" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="flex items-center justify-between gap-2">
                      Correo electrónico
                      {verified ? <span className="text-xs font-medium text-primary">Verificado</span> : null}
                    </span>
                    <Input value={profile?.email ?? ""} readOnly className="h-11 rounded-xl" />
                    {google ? <span className="text-xs text-muted-foreground">Asociado a tu cuenta de Google</span> : null}
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    Idioma
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className="h-11 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                </div>
                {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
                  <Button type="submit" disabled={saving} className="rounded-full px-5">{saving ? "Guardando…" : "Guardar cambios"}</Button>
                </div>
              </form>

              <aside className="flex flex-col gap-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <h2 className="text-xs font-medium tracking-wide text-muted-foreground">Accesos rápidos</h2>
                  <div className="mt-2 flex flex-col">
                    <QuickLink to="/mi-negocio" label="Panel de mis negocios" />
                    <QuickLink to="/mensajes" label="Mensajes" count={unread || undefined} />
                    <QuickLink to="/mi-negocio/nuevo" label="Publicar un local" />
                  </div>
                </div>
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                  <h2 className="text-sm font-medium">Comercio del barrio</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Cada local publica su propia oferta. El contacto con el comercio sigue siendo WhatsApp.</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <h2 className="text-xs font-medium tracking-wide text-muted-foreground">Sesión y cuenta</h2>
                  <p className="mt-2 text-sm">Conectado como <span className="font-medium">{profile?.email}</span></p>
                  <Button variant="destructive" className="mt-3 w-full rounded-full" onClick={() => void signOut()}>
                    Cerrar sesión
                  </Button>
                </div>
              </aside>
            </div>
            <BusinessSection memberships={stores} loading={loading} />
          </TabsContent>

          <TabsContent value="negocios" className="pt-4">
            <BusinessSection memberships={stores} loading={loading} />
          </TabsContent>

          <TabsContent value="pedidos" className="pt-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-medium">Mensajes con los locales</h2>
              <p className="mt-1 text-sm text-muted-foreground">Un pedido o una consulta vive en la conversación con ese comercio.</p>
              {loading ? <Skeleton className="mt-4 h-24 w-full" /> : threads.length === 0 ? (
                <Empty className="border-0">
                  <EmptyHeader>
                    <EmptyTitle>Todavía no escribes a un local</EmptyTitle>
                    <EmptyDescription>Cuando mandes un mensaje, el hilo queda aquí y en Mensajes.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ul className="mt-4 flex flex-col">
                  {threads.map((item) => (
                    <li key={item.id ?? `${item.businessId}-${item.peerId}`} className="border-t border-border first:border-t-0">
                      <Link to={threadHref(item)} className="flex items-center justify-between gap-3 py-3">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{threadTitle(item)}</span>
                          <span className="block truncate text-sm text-muted-foreground">{threadPreview(item)}</span>
                        </span>
                        {item.unreadCount ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{item.unreadCount}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </TabsContent>

          <TabsContent value="favoritos" className="pt-4">
            <Empty className="rounded-2xl border border-border bg-card">
              <EmptyHeader>
                <EmptyTitle>Aún no hay comercios guardados</EmptyTitle>
                <EmptyDescription>Guardar locales todavía no está disponible. El directorio es el lugar para volver a un comercio.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </TabsContent>

          <TabsContent value="seguridad" className="pt-4">
            <section className="max-w-lg rounded-2xl border border-border bg-card p-5">
              <h2 className="font-medium">Sesión y cuenta</h2>
              <p className="mt-2 text-sm text-muted-foreground">Conectado como {profile?.email}</p>
              <Button variant="destructive" className="mt-4 rounded-full" onClick={() => void signOut()}>Cerrar sesión</Button>
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function BusinessSection({ memberships, loading }: { memberships: Membership[]; loading: boolean }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Mis negocios asociados</h2>
          <p className="mt-1 text-sm text-muted-foreground">Locales que administras desde esta cuenta.</p>
        </div>
        <Button variant="outline" className="rounded-full" render={<Link to="/mi-negocio/nuevo" />}>Nuevo local</Button>
      </div>
      {loading ? <Skeleton className="mt-4 h-28 w-full" /> : memberships.length === 0 ? (
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyTitle>Esta cuenta no administra un local</EmptyTitle>
            <EmptyDescription>Puedes publicar el tuyo cuando quieras.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          {memberships.map((item) => {
            const business = item.business
            if (!business) return null
            return (
              <li key={item.businessId} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-sm font-semibold text-primary">
                      {business.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{business.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {[business.category, business.address].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </div>
                  <Pill muted={!business.isActive}>{business.isActive ? "Activo" : "Inactivo"}</Pill>
                </div>
                {!item.isActive ? <p className="text-sm text-muted-foreground">Tu acceso a este local está inactivo.</p> : null}
                <div className="flex items-center justify-between text-sm">
                  {item.isActive ? (
                    <Link to={`/mi-negocio/${business.id}`} className="font-medium text-primary">Administrar</Link>
                  ) : (
                    <span className="text-muted-foreground">{roleLabel[item.role] ?? "Miembro"}</span>
                  )}
                  <Link to={`/n/${business.id}`} className="text-muted-foreground">Ver página</Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { error?: { message?: string } } | undefined
    if (body?.error?.message) return body.error.message
  }
  return fallback
}

function threadHref(item: ListedThread) {
  if (item.viewerRole === "member") return "/mensajes"
  if (item.id) return `/mensajes/${item.id}`
  if (item.businessId && item.peerId) return `/mensajes/${item.businessId}/${item.peerId}`
  return "/mensajes"
}

function threadTitle(item: ListedThread) {
  if (item.viewerRole === "customer" || !item.viewerRole) return item.businessName || "Local"
  return item.customerName || "Cliente"
}

function threadPreview(item: ListedThread) {
  if (item.lastText) return item.lastText
  if (item.viewerRole === "customer") return item.assigneeName ? `Te atiende ${item.assigneeName}` : "En espera"
  return item.peerName || "Sin mensajes"
}

function nameInitials(value: string) {
  const parts = value.trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?"
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-3 text-center">
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Pill({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", muted ? "border border-border text-muted-foreground" : "bg-primary/15 text-primary")}>
      {children}
    </span>
  )
}

function QuickLink({ to, label, count }: { to: string; label: string; count?: number }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-xl px-2 py-2.5 text-sm hover:bg-muted">
      <span>{label}</span>
      <span className="text-muted-foreground">{count ?? "›"}</span>
    </Link>
  )
}
