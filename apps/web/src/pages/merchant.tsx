import { lazy, Suspense, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import type { Business, MarketplaceTag, MenuItem, ModuleName, Product, Service } from "@workspace/shared"

import { BusinessProfileWizard } from "@/components/business-profile-wizard"
import { MerchantHomeDashboard } from "@/components/merchant-home-dashboard"
import { SiteHeader } from "@/components/site-header"
import { GalleryPanel } from "@/components/gallery-panel"
import { ModulesPanel, useBusinessModules } from "@/components/modules-panel"
import { TeamRoster, useBusinessTeam } from "@/components/team-panel"
import { getBusiness } from "@/services/businesses.service"
import { listMarketplaceTags, listMenuItems, listProducts, listServices, updateCatalogItem } from "@/services/catalog.service"
import { listChains } from "@/services/chains.service"
import { getMe } from "@/services/me.service"
import type { BusinessChain } from "@workspace/shared"
import type { CatalogKind, Membership } from "@/services/types"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"

const MerchantCatalogStudio = lazy(() =>
  import("@/components/merchant-catalog-studio").then((mod) => ({ default: mod.MerchantCatalogStudio })),
)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

export function MerchantHomePage() {
  const [rows, setRows] = useState<Membership[]>([])
  const [chains, setChains] = useState<BusinessChain[]>([])
  const [loading, setLoading] = useState(true)

  function loadDashboard() {
    setLoading(true)
    void Promise.allSettled([getMe(), listChains()])
      .then(([meResult, chainsResult]) => {
        if (meResult.status === "fulfilled") {
          setRows(meResult.value.memberships)
        }
        if (chainsResult.status === "fulfilled") {
          setChains(chainsResult.value)
        } else {
          setChains([])
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <MerchantHomeDashboard
          memberships={rows}
          chains={chains}
          loading={loading}
          onRefresh={loadDashboard}
        />
      </main>
    </div>
  )
}

export function MerchantBusinessPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [catalogReady, setCatalogReady] = useState(false)
  const [moduleFocus, setModuleFocus] = useState<{ id: ModuleName | null; token: number } | null>(null)
  const [editor, setEditor] = useState<{ kind: CatalogKind; id: string; name: string; price: number | null } | null>(null)
  const [tab, setTab] = useState("ficha")
  const team = useBusinessTeam(id)
  const businessModules = useBusinessModules(id)

  function loadCatalog() {
    void Promise.all([
      listProducts(id, { includeUnavailable: true, expand: true }),
      listServices(id).catch(() => [] as Service[]),
      listMenuItems(id).catch(() => [] as MenuItem[]),
    ]).then(([productRows, serviceRows, menuRows]) => {
      setProducts(productRows)
      setServices(serviceRows)
      setMenu(menuRows)
      setCatalogReady(true)
    })
  }

  function openModules(moduleId: ModuleName | null) {
    setModuleFocus({ id: moduleId, token: Date.now() })
    setTab("modulos")
  }

  useEffect(() => {
    if (!id) return
    setReady(false)
    void getMe()
      .then((payload) => {
        const member = payload.memberships.some((row) => row.businessId === id)
        if (!member) {
          navigate("/mi-negocio", { replace: true })
          return
        }
        setReady(true)
      })
      .catch(() => navigate("/mi-negocio", { replace: true }))
  }, [id, navigate])

  function reloadBusiness() {
    if (!id) return
    void getBusiness(id).then((detail) => setBusiness(detail.business))
  }

  useEffect(() => {
    if (!ready || !id) return
    let cancelled = false
    setCatalogReady(false)
    void Promise.all([
      getBusiness(id),
      listProducts(id, { includeUnavailable: true, expand: true }),
      listServices(id).catch(() => [] as Service[]),
      listMenuItems(id).catch(() => [] as MenuItem[]),
      listMarketplaceTags().catch(() => [] as MarketplaceTag[]),
    ])
      .then(([detail, productRows, serviceRows, menuRows]) => {
        if (cancelled) return
        setBusiness(detail.business)
        setProducts(productRows)
        setServices(serviceRows)
        setMenu(menuRows)
        setCatalogReady(true)
      })
      .catch(() => {
        if (!cancelled) setCatalogReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [id, ready])

  if (!ready) {
    return (
      <div className="min-h-svh bg-background">
        <SiteHeader />
      </div>
    )
  }

  const place = [business?.category, business?.address].filter(Boolean).join(" · ")

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              <Link to="/mi-negocio" className="hover:text-foreground">Panel de administración</Link>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{business?.name ?? "Negocio"}</h1>
              {business ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  {business.isActive ? "Activo" : "Inactivo"}
                </span>
              ) : null}
            </div>
            {place ? <p className="mt-1 text-sm text-muted-foreground">{place}</p> : null}
          </div>
          {business ? (
            <Button variant="outline" className="rounded-full" render={<Link to={`/n/${business.id}`} />}>
              Ver página pública
            </Button>
          ) : null}
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="-mx-4 overflow-x-auto overflow-y-hidden border-b border-border px-4 sm:mx-0 sm:px-0">
            <TabsList variant="line" className="h-11 w-max bg-transparent">
              <TabsTrigger value="ficha" className="data-active:text-primary after:bg-primary">Ficha del negocio</TabsTrigger>
              <TabsTrigger value="galeria" className="data-active:text-primary after:bg-primary">Galería</TabsTrigger>
              <TabsTrigger value="modulos" className="data-active:text-primary after:bg-primary">Módulos</TabsTrigger>
              <TabsTrigger value="catalogo" className="data-active:text-primary after:bg-primary">Catálogo</TabsTrigger>
              <TabsTrigger value="equipo" className="data-active:text-primary after:bg-primary">Equipo</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="ficha" className="pt-4">
            {id ? (
              <BusinessProfileWizard
                embedded
                mode="edit"
                businessId={id}
                title="Editar ficha del negocio"
                subtitle="Horarios, ubicación, contacto, redes sociales, pagos y módulos."
                backLink={{ to: "/mi-negocio", label: "Panel de administración" }}
                onSaved={reloadBusiness}
                onPublished={reloadBusiness}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="galeria" className="pt-4">
            {id ? <GalleryPanel businessId={id} /> : null}
          </TabsContent>

          <TabsContent value="modulos" className="pt-4">
            {id ? (
              <ModulesPanel
                businessId={id}
                modules={businessModules.modules}
                moduleSettings={businessModules.moduleSettings}
                loading={businessModules.loading}
                error={businessModules.error}
                onReload={() => void businessModules.reload()}
                focus={moduleFocus}
              />
            ) : null}
          </TabsContent>

          <TabsContent value="catalogo" className="pt-4">
            <Suspense
              fallback={
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-44 rounded-xl" />
                  ))}
                </div>
              }
            >
            <MerchantCatalogStudio
              businessId={id}
              modules={businessModules.modules}
              modulesLoading={businessModules.loading}
              bag={{ products, services, menu }}
              catalogReady={catalogReady}
              onModulesChanged={() => void businessModules.reload()}
              onCatalogChanged={loadCatalog}
              onOpenModuleSettings={openModules}
              onEdit={(item) => {
                setEditor({ kind: item.module, id: item.id, name: item.name, price: item.price })
              }}
            />
            </Suspense>
          </TabsContent>

          <TabsContent value="equipo" className="pt-4">
            {id ? <TeamRoster businessId={id} team={team} /> : null}
          </TabsContent>
        </Tabs>

        <CatalogEditor
          item={editor}
          onClose={() => setEditor(null)}
          onSave={async (name, price) => {
            if (!editor) return
            await updateCatalogItem(id, editor.kind, editor.id, { name, price: Number(price) })
            setEditor(null)
            loadCatalog()
          }}
        />
      </main>
    </div>
  )
}

function CatalogEditor({
  item,
  onClose,
  onSave,
}: {
  item: { id: string; name: string; price: number | null } | null
  onClose: () => void
  onSave: (name: string, price: string) => Promise<void>
}) {
  const [name, setName] = useState(item?.name ?? "")
  const [price, setPrice] = useState(item?.price === null || item?.price === undefined ? "" : String(item.price))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(item?.name ?? "")
    setPrice(item?.price === null || item?.price === undefined ? "" : String(item.price))
    setError(null)
  }, [item])

  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="w-[min(100%-2rem,28rem)]">
        <DialogHeader>
          <DialogTitle>Editar</DialogTitle>
          <DialogDescription>Cambia el nombre o el precio. El precio es solo de este local.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            setSaving(true)
            setError(null)
            void onSave(name, price)
              .catch(() => setError("No se pudo guardar. Revisa el precio."))
              .finally(() => setSaving(false))
          }}
        >
          <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="Nombre" required className="h-11 rounded-xl" />
          <Input value={price} onChange={(event) => setPrice(event.target.value)} aria-label="Precio" inputMode="decimal" required className="h-11 rounded-xl" />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="rounded-full" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
