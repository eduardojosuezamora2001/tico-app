import { useEffect, useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import type { Business, BusinessEvent, GalleryImage, MenuItem, Product, Service } from "@workspace/shared"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import { colones, OrderBoard, type Offer } from "@/components/business-cart"
import { SiteHeader } from "@/components/site-header"
import { api } from "@/lib/api"
import { useAuthStore } from "@/stores/auth-store"

type Payload = {
  business: Business
  modules: { moduleName: string; enabled: boolean }[]
}

export function BusinessPage() {
  const { id = "" } = useParams()
  const [payload, setPayload] = useState<Payload | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [events, setEvents] = useState<BusinessEvent[]>([])
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPayload(null)
    setError(null)
    void api
      .get<{ data: Payload }>(`/businesses/${id}`)
      .then(async (response) => {
        const next = response.data.data
        setPayload(next)
        const enabled = new Set(next.modules.filter((item) => item.enabled).map((item) => item.moduleName))
        const businessId = next.business.id
        const [productRes, serviceRes, menuRes, eventRes, galleryRes] = await Promise.all([
          enabled.has("products")
            ? api.get<{ data: Product[] }>(`/businesses/${businessId}/products`)
            : Promise.resolve({ data: { data: [] as Product[] } }),
          enabled.has("services")
            ? api.get<{ data: Service[] }>(`/businesses/${businessId}/services`)
            : Promise.resolve({ data: { data: [] as Service[] } }),
          enabled.has("menu")
            ? api.get<{ data: MenuItem[] }>(`/businesses/${businessId}/menu`)
            : Promise.resolve({ data: { data: [] as MenuItem[] } }),
          api.get<{ data: BusinessEvent[] }>(`/businesses/${businessId}/events`),
          api.get<{ data: GalleryImage[] }>(`/businesses/${businessId}/gallery`),
        ])
        setProducts(productRes.data.data)
        setServices(serviceRes.data.data)
        setMenu(menuRes.data.data)
        setEvents(eventRes.data.data)
        setGallery(galleryRes.data.data)
      })
      .catch(() => setError("No encontramos ese comercio."))
  }, [id])

  const business = payload?.business
  const whatsapp = business?.whatsappNumber?.replace(/\D/g, "")
  const signedIn = useAuthStore((s) => s.status) === "authenticated"
  const userId = useAuthStore((s) => s.session?.user.id)
  const hero = gallery[0]?.imageUrl ?? business?.bannerUrl ?? null
  const mapsHref =
    business?.latitude != null && business.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`
      : business?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`
        : null

  const productOffers: Offer[] = products.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    stock: item.stock,
    imageUrl: item.imageUrl,
    category: item.category,
  }))
  const menuOffers: Offer[] = menu.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    stock: null,
    imageUrl: item.imageUrl,
    category: item.section,
  }))

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main>
        {error ? <p className="mx-auto max-w-6xl px-4 py-10 text-destructive">{error}</p> : null}
        {!business && !error ? <p className="mx-auto max-w-6xl px-4 py-10 text-muted-foreground">Cargando…</p> : null}
        {business ? (
          <>
            <section className="relative h-56 overflow-hidden bg-muted sm:h-72 md:h-80">
              {hero ? (
                <img src={hero} alt="" className="size-full object-cover" />
              ) : (
                <div className="size-full bg-[linear-gradient(120deg,var(--primary),oklch(0.42_0.08_275))]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            </section>

            <div className="mx-auto max-w-6xl px-4">
              <div className="relative -mt-14 flex flex-col gap-4 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-background bg-card text-2xl font-semibold shadow-[0_12px_30px_-16px_oklch(0.2_0.04_275)]">
                    {business.logoUrl ? <img src={business.logoUrl} alt="" className="size-full object-cover" /> : business.name.slice(0, 1)}
                  </div>
                  <div className="pb-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{business.name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {business.category}
                      {business.description ? ` · ${business.description}` : ""}
                    </p>
                    {business.address ? <p className="mt-1 text-sm">{business.address}</p> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {whatsapp ? (
                    <a
                      className="inline-flex h-10 items-center rounded-full bg-[#128C7E] px-4 text-sm font-medium text-white hover:bg-[#0f7a6e]"
                      href={`https://wa.me/${whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Pedir por WhatsApp
                    </a>
                  ) : (
                    <p className="self-center text-sm text-muted-foreground">Sin WhatsApp publicado.</p>
                  )}
                  {business.ownerId !== userId ? (
                    <Link
                      className="inline-flex h-10 items-center rounded-full border border-border bg-card px-4 text-sm"
                      to={signedIn ? `/mensajes/${business.id}/${business.ownerId}` : "/login"}
                    >
                      Mensaje
                    </Link>
                  ) : null}
                </div>
              </div>

              <Tabs defaultValue="productos" className="mt-2">
                <div className="overflow-x-auto border-b border-border">
                  <TabsList variant="line" className="h-11 w-max bg-transparent">
                    <TabsTrigger value="productos" className="data-active:text-primary after:bg-primary">
                      Productos {products.length}
                    </TabsTrigger>
                    <TabsTrigger value="servicios" className="data-active:text-primary after:bg-primary">
                      Servicios {services.length}
                    </TabsTrigger>
                    <TabsTrigger value="menu" className="data-active:text-primary after:bg-primary">
                      Menú {menu.length}
                    </TabsTrigger>
                    <TabsTrigger value="fotos" className="data-active:text-primary after:bg-primary">
                      Fotos {gallery.length}
                    </TabsTrigger>
                    <TabsTrigger value="eventos" className="data-active:text-primary after:bg-primary">
                      Eventos {events.length}
                    </TabsTrigger>
                    <TabsTrigger value="info" className="data-active:text-primary after:bg-primary">
                      Información
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="grid items-start gap-6 py-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
                  <aside className="space-y-4 lg:sticky lg:top-20">
                    <InfoCard title="Datos del comercio" detail={business.id}>
                      <InfoRow label="Ubicación">
                        {business.address ? <p>{business.address}</p> : <p className="text-muted-foreground">Sin dirección publicada.</p>}
                        {mapsHref ? (
                          <a className="mt-1 inline-block text-sm text-primary" href={mapsHref} target="_blank" rel="noreferrer">
                            Ver en el mapa
                          </a>
                        ) : null}
                      </InfoRow>
                      <InfoRow label="Contacto">
                        {whatsapp ? <p>WhatsApp {business.whatsappNumber}</p> : null}
                        {business.phone ? <p>{business.phone}</p> : null}
                        {business.email ? <p>{business.email}</p> : null}
                        {!whatsapp && !business.phone && !business.email ? (
                          <p className="text-muted-foreground">Este local todavía no publicó un contacto.</p>
                        ) : null}
                      </InfoRow>
                      {business.website ? (
                        <InfoRow label="Sitio">
                          <a className="text-primary" href={business.website} target="_blank" rel="noreferrer">
                            {business.website.replace(/^https?:\/\//, "")}
                          </a>
                        </InfoRow>
                      ) : null}
                    </InfoCard>

                    <section className="rounded-2xl border border-border bg-card p-4">
                      <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="font-semibold">Fotos del local</h2>
                        <span className="text-xs text-muted-foreground">{gallery.length}</span>
                      </div>
                      {gallery.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Este local todavía no publicó fotos.</p>
                      ) : (
                        <ul className="grid grid-cols-3 gap-2">
                          {gallery.slice(0, 6).map((image) => (
                            <li key={image.id} className="aspect-square overflow-hidden rounded-xl">
                              <img src={image.imageUrl} alt="" className="size-full object-cover" />
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </aside>

                  <div className="min-w-0">
                    <TabsContent value="productos">
                      <OrderBoard business={business} offers={productOffers} empty="Este local todavía no publicó productos." heading="Productos" />
                    </TabsContent>
                    <TabsContent value="servicios">
                      <ServiceList services={services} />
                    </TabsContent>
                    <TabsContent value="menu">
                      <OrderBoard business={business} offers={menuOffers} empty="Este local todavía no publicó menú." heading="Menú del local" />
                    </TabsContent>
                    <TabsContent value="fotos">
                      <PhotoGrid gallery={gallery} />
                    </TabsContent>
                    <TabsContent value="eventos">
                      <EventList events={events} />
                    </TabsContent>
                    <TabsContent value="info">
                      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
                        <h2 className="text-lg font-semibold">Sobre {business.name}</h2>
                        <p className="mt-2 max-w-[65ch] text-sm text-muted-foreground">
                          {business.description ?? "Este local todavía no escribió una descripción."}
                        </p>
                      </section>
                    </TabsContent>
                  </div>
                </div>
              </Tabs>
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}

function InfoCard({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <p className="max-w-[9rem] truncate text-right font-mono text-[10px] text-muted-foreground" title={detail}>
          ID {detail}
        </p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  )
}

function ServiceList({ services }: { services: Service[] }) {
  if (services.length === 0) return <p className="mt-4 text-sm text-muted-foreground">Este local todavía no publicó servicios.</p>
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {services.map((item) => (
        <li key={item.id} className="rounded-2xl border border-border bg-card p-4">
          {item.category ? <p className="text-xs text-muted-foreground">{item.category}</p> : null}
          <h3 className="mt-1 font-medium">{item.name}</h3>
          {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
          <p className="mt-3 text-sm">
            {item.price === null ? "Consulta el precio" : colones(item.price)}
            {item.durationMinutes ? ` · ${item.durationMinutes} min` : ""}
          </p>
        </li>
      ))}
    </ul>
  )
}

function PhotoGrid({ gallery }: { gallery: GalleryImage[] }) {
  if (gallery.length === 0) return <p className="mt-4 text-sm text-muted-foreground">Este local todavía no publicó fotos.</p>
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
      {gallery.map((image) => (
        <li key={image.id} className="aspect-[4/3] overflow-hidden rounded-2xl border border-border">
          <img src={image.imageUrl} alt="" className="size-full object-cover" />
        </li>
      ))}
    </ul>
  )
}

function EventList({ events }: { events: BusinessEvent[] }) {
  if (events.length === 0) return <p className="mt-4 text-sm text-muted-foreground">Este local todavía no publicó eventos.</p>
  return (
    <ul className="mt-4 space-y-3">
      {events.map((item) => (
        <li key={item.id} className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-medium">{item.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(item.startsAt).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" })}
            {item.locationText ? ` · ${item.locationText}` : ""}
          </p>
          {item.description ? <p className="mt-2 text-sm">{item.description}</p> : null}
        </li>
      ))}
    </ul>
  )
}
