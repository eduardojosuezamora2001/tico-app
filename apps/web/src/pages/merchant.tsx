import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import type {
  Business,
  CreateMenuItemInput,
  CreateServiceInput,
  MenuItem,
  Product,
  Service,
} from "@workspace/shared"

import { BusinessProfileWizard } from "@/components/business-profile-wizard"
import { ProductEditorDialog } from "@/components/product-editor-dialog"
import { MerchantHomeDashboard } from "@/components/merchant-home-dashboard"
import { ListFilter } from "@/components/list-filter"
import { SiteHeader } from "@/components/site-header"
import { GalleryPanel } from "@/components/gallery-panel"
import { ModulesPanel, useBusinessModules } from "@/components/modules-panel"
import { TeamPermissions, TeamRoster, useBusinessTeam } from "@/components/team-panel"
import { getBusiness } from "@/services/businesses.service"
import {
  createMenuItem,
  createService,
  deleteCatalogItem,
  listMenuItems,
  listProducts,
  listServices,
  updateCatalogItem,
} from "@/services/catalog.service"
import { listChains } from "@/services/chains.service"
import { getMe } from "@/services/me.service"
import type { BusinessChain } from "@workspace/shared"
import type { CatalogKind, Membership } from "@/services/types"
import { Button } from "@workspace/ui/components/button"
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

const colones = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
})

function CatalogForm({
  placeholder,
  submitLabel,
  onSubmit,
}: {
  placeholder: string
  submitLabel: string
  onSubmit: (name: string, price: string) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(event) => {
        event.preventDefault()
        void onSubmit(name, price).then(() => {
          setName("")
          setPrice("")
        })
      }}
    >
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 min-w-0 flex-1 rounded-xl"
      />
      <Input
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        placeholder="Precio"
        aria-label={`Precio de ${placeholder}`}
        inputMode="decimal"
        className="h-11 w-full rounded-xl sm:w-28"
      />
      <Button type="submit" className="rounded-full">
        {submitLabel}
      </Button>
    </form>
  )
}

function CatalogRows({
  rows,
  onEdit,
  onDelete,
}: {
  rows: { id: string; name: string; price: number | null }[]
  onEdit: (row: { id: string; name: string; price: number | null }) => void
  onDelete: (id: string) => void
}) {
  return (
    <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
      {rows.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="min-w-0 truncate">{item.name}</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-muted-foreground tabular-nums">
              {item.price === null ? "Sin precio" : colones.format(item.price)}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(item)}>
              Editar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(item.id)}>
              Quitar
            </Button>
          </span>
        </li>
      ))}
    </ul>
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
  const [listIds, setListIds] = useState<string[]>(["productos"])
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<{ kind: CatalogKind; id: string; name: string; price: number | null } | null>(null)
  const [productEditorOpen, setProductEditorOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
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
    })
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
    reloadBusiness()
    loadCatalog()
  }, [id, ready])

  if (!ready) {
    return (
      <div className="min-h-svh bg-background">
        <SiteHeader />
      </div>
    )
  }

  async function removeItem(kind: CatalogKind, itemId: string) {
    try {
      await deleteCatalogItem(id, kind, itemId)
      setError(null)
      loadCatalog()
    } catch {
      setError("No se pudo quitar ese elemento.")
    }
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
              <TabsTrigger value="permisos" className="data-active:text-primary after:bg-primary">Permisos</TabsTrigger>
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
              />
            ) : null}
          </TabsContent>

          <TabsContent value="catalogo" className="flex flex-col gap-4 pt-4">
            <div>
              <h2 className="text-lg font-semibold">Catálogo</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Agrega lo que vendes o ofreces. Primero activa un módulo en la sección Módulos.
              </p>
            </div>
            {!businessModules.isEnabled("products") &&
            !businessModules.isEnabled("services") &&
            !businessModules.isEnabled("menu") ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">Todavía no hay módulos de catálogo activos.</p>
                <Button type="button" className="mt-4 rounded-full" onClick={() => setTab("modulos")}>
                  Buscar y activar módulos
                </Button>
              </div>
            ) : (
              <>
                {businessModules.isEnabled("products") && (listIds.length === 0 || listIds.includes("productos")) ? (
                  <Button
                    type="button"
                    className="w-fit rounded-full"
                    onClick={() => {
                      setEditingProduct(null)
                      setProductEditorOpen(true)
                    }}
                  >
                    Nuevo producto
                  </Button>
                ) : null}
                {businessModules.isEnabled("services") && (listIds.length === 0 || listIds.includes("servicios")) ? (
                  <CatalogForm
                    placeholder="Servicio"
                    submitLabel="Agregar servicio"
                    onSubmit={async (name, price) => {
                      try {
                        await createService(id, { name, price: Number(price) } as CreateServiceInput)
                        setError(null)
                        loadCatalog()
                      } catch {
                        setError("No se pudo agregar el servicio.")
                      }
                    }}
                  />
                ) : null}
                {businessModules.isEnabled("menu") && (listIds.length === 0 || listIds.includes("menu")) ? (
                  <CatalogForm
                    placeholder="Plato del menú"
                    submitLabel="Agregar al menú"
                    onSubmit={async (name, price) => {
                      try {
                        await createMenuItem(id, { name, price: Number(price) } as CreateMenuItemInput)
                        setError(null)
                        loadCatalog()
                      } catch {
                        setError("No se pudo agregar al menú.")
                      }
                    }}
                  />
                ) : null}
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <ListFilter
                  activeIds={listIds}
                  onActiveChange={setListIds}
                  placeholder="Buscar en el catálogo"
                  lists={[
                    businessModules.isEnabled("products")
                      ? {
                          id: "productos",
                          label: "Productos",
                          empty: "Todavía no hay productos.",
                          items: products,
                          text: (item) => item.name,
                          group: (item) => item.category,
                          render: (items) => (
                            <CatalogRows
                              rows={items.map((item) => ({
                                id: item.id,
                                name: `${item.name}${item.productKind !== "simple" ? ` (${item.productKind})` : ""}`,
                                price: item.price,
                              }))}
                              onEdit={(row) => {
                                const full = products.find((p) => p.id === row.id) ?? null
                                setEditingProduct(full)
                                setProductEditorOpen(true)
                              }}
                              onDelete={(itemId) => void removeItem("products", itemId)}
                            />
                          ),
                        }
                      : null,
                    businessModules.isEnabled("services")
                      ? {
                          id: "servicios",
                          label: "Servicios",
                          empty: "Todavía no hay servicios.",
                          items: services,
                          text: (item) => item.name,
                          group: (item) => item.category,
                          render: (items) => (
                            <CatalogRows
                              rows={items.map((item) => ({ id: item.id, name: item.name, price: item.price }))}
                              onEdit={(row) => setEditor({ kind: "services", ...row })}
                              onDelete={(itemId) => void removeItem("services", itemId)}
                            />
                          ),
                        }
                      : null,
                    businessModules.isEnabled("menu")
                      ? {
                          id: "menu",
                          label: "Menú",
                          empty: "Todavía no hay platos.",
                          items: menu,
                          text: (item) => item.name,
                          group: (item) => item.section,
                          render: (items) => (
                            <CatalogRows
                              rows={items.map((item) => ({ id: item.id, name: item.name, price: item.price }))}
                              onEdit={(row) => setEditor({ kind: "menu", ...row })}
                              onDelete={(itemId) => void removeItem("menu", itemId)}
                            />
                          ),
                        }
                      : null,
                  ].filter((list): list is NonNullable<typeof list> => list !== null)}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="equipo" className="pt-4">
            {id ? <TeamRoster businessId={id} team={team} /> : null}
          </TabsContent>

          <TabsContent value="permisos" className="pt-4">
            {id ? <TeamPermissions businessId={id} team={team} /> : null}
          </TabsContent>
        </Tabs>

        <ProductEditorDialog
          businessId={id}
          open={productEditorOpen}
          onOpenChange={setProductEditorOpen}
          product={editingProduct}
          componentVariants={products.flatMap((product) =>
            (product.variants ?? []).map((variant) => ({
              id: variant.id,
              label: `${product.name} · ${Object.values(variant.options).join(" ") || "default"} (₡${variant.price})`,
            })),
          )}
          onSaved={() => {
            setError(null)
            loadCatalog()
          }}
        />

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
