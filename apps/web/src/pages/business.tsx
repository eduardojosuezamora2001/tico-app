import { useEffect, useState, type ReactNode } from "react"
import { Link, useParams } from "react-router"
import {
  PAYMENT_METHOD_KEYS,
  formatMarketplaceTagLabels,
  type Business,
  type BusinessEvent,
  type BusinessHours,
  type GalleryImage,
  type MenuItem,
  type Product,
  type Review,
  type Service,
} from "@workspace/shared"

import { PaymentMethodBadgeList } from "@/components/payment-methods"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

import { colones, OrderBoard, type Offer } from "@/components/business-cart"
import { BusinessReviewsPanel } from "@/components/business-reviews-panel"
import { ListFilter } from "@/components/list-filter"
import { SiteHeader } from "@/components/site-header"
import { isActiveMemberOfBusiness } from "@/lib/merchant-memberships"
import { getBusiness } from "@/services/businesses.service"
import { getMe } from "@/services/me.service"
import {
  listMenuItems,
  listProducts,
  listServices,
} from "@/services/catalog.service"
import { listBusinessEvents } from "@/services/events.service"
import { listGalleryImages } from "@/services/gallery.service"
import { getBusinessHours } from "@/services/hours.service"
import { listBusinessReviews } from "@/services/reviews.service"
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
  const [hours, setHours] = useState<BusinessHours[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [error, setError] = useState<string | null>(null)
  const [canAdminister, setCanAdminister] = useState(false)

  useEffect(() => {
    setPayload(null)
    setError(null)
    void getBusiness(id)
      .then(async (next) => {
        setPayload(next)
        const enabled = new Set(next.modules.filter((item) => item.enabled).map((item) => item.moduleName))
        const businessId = next.business.id
        const [productRows, serviceRows, menuRows, eventRows, galleryRows, hourRows, reviewRows] =
          await Promise.all([
            enabled.has("products")
              ? listProducts(businessId, { expand: true })
              : Promise.resolve([] as Product[]),
            enabled.has("services") ? listServices(businessId) : Promise.resolve([] as Service[]),
            enabled.has("menu") ? listMenuItems(businessId) : Promise.resolve([] as MenuItem[]),
            listBusinessEvents(businessId),
            listGalleryImages(businessId),
            getBusinessHours(businessId).catch(() => [] as BusinessHours[]),
            listBusinessReviews(businessId).catch(() => [] as Review[]),
          ])
        setProducts(productRows)
        setServices(serviceRows)
        setMenu(menuRows)
        setEvents(eventRows)
        setGallery(galleryRows)
        setHours(hourRows)
        setReviews(reviewRows)
      })
      .catch(() => setError("No encontramos ese comercio."))
  }, [id])

  const signedIn = useAuthStore((s) => s.status) === "authenticated"

  useEffect(() => {
    setCanAdminister(false)
    const businessId = payload?.business.id
    if (!businessId || !signedIn) return

    void getMe()
      .then((me) => setCanAdminister(isActiveMemberOfBusiness(me.memberships, businessId)))
      .catch(() => setCanAdminister(false))
  }, [payload?.business.id, signedIn])

  const business = payload?.business
  const whatsapp = business?.whatsappNumber?.replace(/\D/g, "")
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
    category: formatMarketplaceTagLabels(item.marketplaceTags),
    productKind: item.productKind ?? "simple",
    optionGroups: item.optionGroups ?? [],
    specifications: item.specifications ?? {},
    variants: item.variants ?? [],
    bundleItems: item.bundleItems ?? [],
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
                  <div className="min-w-0 pb-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{business.name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {business.category}
                      {business.tagline ? ` · ${business.tagline}` : ""}
                    </p>
                    {business.address ? <p className="mt-1 text-sm">{business.address}</p> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canAdminister ? (
                    <Button
                      variant="outline"
                      className="rounded-full"
                      render={<Link to={`/mi-negocio/${business.id}`} />}
                    >
                      Administrar
                    </Button>
                  ) : null}
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
                      to={signedIn ? `/mensajes/local/${business.id}` : "/login"}
                    >
                      Mensaje
                    </Link>
                  ) : null}
                </div>
              </div>

              <Tabs defaultValue="oferta" className="mt-2">
                <ScrollArea className="border-b border-border" viewportClassName="h-auto">
                  <TabsList variant="line" className="h-11 w-max bg-transparent">
                    <TabsTrigger value="oferta" className="data-active:text-primary after:bg-primary">
                      Oferta {products.length + services.length + menu.length}
                    </TabsTrigger>
                    <TabsTrigger value="fotos" className="data-active:text-primary after:bg-primary">
                      Fotos {gallery.length}
                    </TabsTrigger>
                    <TabsTrigger value="eventos" className="data-active:text-primary after:bg-primary">
                      Eventos {events.length}
                    </TabsTrigger>
                    <TabsTrigger value="resenas" className="data-active:text-primary after:bg-primary">
                      Reseñas {reviews.length}
                    </TabsTrigger>
                    <TabsTrigger value="info" className="data-active:text-primary after:bg-primary">
                      Información
                    </TabsTrigger>
                  </TabsList>
                </ScrollArea>

                <div className="grid items-start gap-6 py-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
                  <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
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
                      {hours.length > 0 ? (
                        <InfoRow label="Horario">
                          <ul className="flex flex-col gap-1">
                            {hours.map((row) => (
                              <li key={row.id} className="text-sm">
                                {formatDay(row.dayOfWeek)}: {formatHours(row)}
                              </li>
                            ))}
                          </ul>
                        </InfoRow>
                      ) : null}
                      {PAYMENT_METHOD_KEYS.some((key) => business[key]) ? (
                        <InfoRow label="Pagos">
                          <PaymentMethodBadgeList business={business} />
                          {business.paymentSinpe && business.sinpePhone ? (
                            <p className="mt-2 text-sm">Transferencia móvil: {business.sinpePhone}</p>
                          ) : null}
                          {business.paymentSinpe && business.sinpeHolder ? (
                            <p className="text-sm text-muted-foreground">{business.sinpeHolder}</p>
                          ) : null}
                        </InfoRow>
                      ) : null}
                      {business.offersDelivery ? (
                        <InfoRow label="Domicilio">
                          <p className="text-sm">
                            {business.deliveryCost != null ? `Costo desde ₡${business.deliveryCost.toLocaleString("es-CR")}` : "Servicio express disponible"}
                            {business.deliveryRadiusKm != null ? ` · Radio ~${business.deliveryRadiusKm} km` : ""}
                          </p>
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
                    <TabsContent value="oferta">
                      <ListFilter
                        placeholder="Buscar producto, servicio o plato"
                        lists={[
                          {
                            id: "productos",
                            label: "Productos",
                            empty: "Este local todavía no publicó productos.",
                            items: productOffers,
                            text: (item) => `${item.name} ${item.description ?? ""}`,
                            group: (item) => item.category,
                            render: (items) => (
                              <OrderBoard business={business} offers={items} empty="" heading="Productos" hideChrome />
                            ),
                          },
                          {
                            id: "servicios",
                            label: "Servicios",
                            empty: "Este local todavía no publicó servicios.",
                            items: services,
                            text: (item) => `${item.name} ${item.description ?? ""} ${item.category ?? ""}`,
                            group: (item) => item.category,
                            render: (items) => <ServiceList services={items} />,
                          },
                          {
                            id: "menu",
                            label: "Menú",
                            empty: "Este local todavía no publicó menú.",
                            items: menuOffers,
                            text: (item) => `${item.name} ${item.description ?? ""}`,
                            group: (item) => item.category,
                            render: (items) => (
                              <OrderBoard business={business} offers={items} empty="" heading="Menú" hideChrome />
                            ),
                          },
                        ]}
                      />
                    </TabsContent>
                    <TabsContent value="fotos">
                      <PhotoGrid gallery={gallery} />
                    </TabsContent>
                    <TabsContent value="eventos">
                      <EventList events={events} />
                    </TabsContent>
                    <TabsContent value="resenas">
                      <BusinessReviewsPanel
                        businessId={business.id}
                        businessName={business.name}
                        onReviewsChange={setReviews}
                      />
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

const dayLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

function formatDay(dayOfWeek: number | null) {
  if (dayOfWeek == null) return "Horario"
  return dayLabels[dayOfWeek] ?? "Día"
}

function formatHours(row: BusinessHours) {
  if (row.isClosed) return "Cerrado"
  return `${row.openTime?.slice(0, 5) ?? "--:--"} – ${row.closeTime?.slice(0, 5) ?? "--:--"}`
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
      <div className="flex flex-col gap-4">{children}</div>
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
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
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
    <ul className="mt-4 flex flex-col gap-3">
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
