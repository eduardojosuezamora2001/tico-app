import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import type { Business, MenuItem, Product, Service } from "@workspace/shared"

import { ListFilter } from "@/components/list-filter"
import { SiteHeader } from "@/components/site-header"
import { GalleryPanel } from "@/components/gallery-panel"
import { TeamPanel } from "@/components/team-panel"
import { api } from "@/lib/api"
import { Button } from "@workspace/ui/components/button"

const categories = ["Sodas", "Farmacia", "Ferretería", "Pulpería", "Belleza", "Servicios"]

export function NewBusinessPage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [category, setCategory] = useState(categories[0] ?? "Servicios")
  const [whatsapp, setWhatsapp] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const response = await api.post<{ data: Business }>("/businesses", {
        name,
        category,
        whatsappNumber: whatsapp || undefined,
      })
      navigate(`/mi-negocio/${response.data.data.id}`)
    } catch {
      setError("No se pudo crear el negocio. Revisa el WhatsApp (+506…) y que hayas iniciado sesión.")
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold">Publicar mi negocio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Solo el nombre, la categoría y el WhatsApp. El catálogo y el equipo se agregan después, si quieres.
        </p>
        <form className="mt-6 space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del negocio" className="w-full rounded-xl border border-border bg-card px-3 py-2" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2">
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp +506..." className="w-full rounded-xl border border-border bg-card px-3 py-2" />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full">Crear negocio</Button>
        </form>
      </main>
    </div>
  )
}

type Membership = { businessId: string; business: { name: string; slug: string } | null }

export function MerchantHomePage() {
  const [rows, setRows] = useState<Membership[]>([])

  useEffect(() => {
    void api.get<{ data: { memberships: Membership[] } }>("/me").then((response) => {
      setRows(response.data.data.memberships)
    })
  }, [])

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Mis negocios</h1>
          <Button render={<Link to="/mi-negocio/nuevo" />}>Crear negocio</Button>
        </div>
        <ul className="mt-6 space-y-3">
          {rows.map((row) => (
            <li key={row.businessId}>
              <Link className="block rounded-2xl border border-border bg-card px-4 py-3" to={`/mi-negocio/${row.businessId}`}>
                {row.business?.name ?? "Negocio"}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

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
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2"
      />
      <input
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        placeholder="Precio"
        aria-label={`Precio de ${placeholder}`}
        inputMode="decimal"
        className="w-28 rounded-xl border border-border bg-card px-3 py-2"
      />
      <Button type="submit" variant="outline">
        {submitLabel}
      </Button>
    </form>
  )
}

function CatalogRows({ rows }: { rows: { id: string; name: string; price: number | null }[] }) {
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
      {rows.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="min-w-0 truncate">{item.name}</span>
          <span className="shrink-0 text-sm text-muted-foreground">{item.price === null ? "Sin precio" : `₡${item.price}`}</span>
        </li>
      ))}
    </ul>
  )
}

export function MerchantBusinessPage() {
  const { id = "" } = useParams()
  const [business, setBusiness] = useState<Business | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [listIds, setListIds] = useState<string[]>(["productos"])
  const [error, setError] = useState<string | null>(null)

  function load() {
    void api.get<{ data: Product[] }>(`/businesses/${id}/products`, { params: { includeUnavailable: true } }).then((response) => {
      setProducts(response.data.data)
    })
    void api.get<{ data: Service[] }>(`/businesses/${id}/services`).then((response) => setServices(response.data.data)).catch(() => setServices([]))
    void api.get<{ data: MenuItem[] }>(`/businesses/${id}/menu`).then((response) => setMenu(response.data.data)).catch(() => setMenu([]))
  }

  useEffect(() => {
    void api.get<{ data: { business: Business } }>(`/businesses/${id}`).then((res) => setBusiness(res.data.data.business))
    load()
  }, [id])

  async function enable(moduleName: "products" | "services" | "menu") {
    await api.put(`/businesses/${id}/modules/${moduleName}`, { enabled: true })
    setError(null)
  }

  return (
    <div className="min-h-svh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-semibold">{business?.name ?? "Negocio"}</h1>
        {business ? (
          <Link className="text-sm text-primary" to={`/n/${business.id}`}>
            Ver página pública
          </Link>
        ) : null}

        {id ? <GalleryPanel businessId={id} /> : null}

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Catálogo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Opcional. El negocio ya está publicado; productos, servicios y menú se agregan cuando quieras.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void enable("products")}>
              Activar productos
            </Button>
            <Button type="button" variant="outline" onClick={() => void enable("services")}>
              Activar servicios
            </Button>
            <Button type="button" variant="outline" onClick={() => void enable("menu")}>
              Activar menú
            </Button>
          </div>
          <div className="mt-4">
            {listIds.length === 0 || listIds.includes("productos") ? (
              <CatalogForm
                placeholder="Producto"
                submitLabel="Agregar producto"
                onSubmit={async (name, price) => {
                  try {
                    await api.post(`/businesses/${id}/products`, { name, price: Number(price) })
                    setError(null)
                    load()
                  } catch {
                    setError("Activa el módulo de productos antes de publicar, o revisa el precio.")
                  }
                }}
              />
            ) : null}
            {listIds.length === 0 || listIds.includes("servicios") ? (
              <CatalogForm
                placeholder="Servicio"
                submitLabel="Agregar servicio"
                onSubmit={async (name, price) => {
                  try {
                    await api.post(`/businesses/${id}/services`, { name, price: Number(price) })
                    setError(null)
                    load()
                  } catch {
                    setError("Activa el módulo de servicios antes de publicar.")
                  }
                }}
              />
            ) : null}
            {listIds.length === 0 || listIds.includes("menu") ? (
              <CatalogForm
                placeholder="Plato del menú"
                submitLabel="Agregar al menú"
                onSubmit={async (name, price) => {
                  try {
                    await api.post(`/businesses/${id}/menu`, { name, price: Number(price) })
                    setError(null)
                    load()
                  } catch {
                    setError("Activa el módulo de menú antes de publicar.")
                  }
                }}
              />
            ) : null}
          </div>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          <ListFilter
            activeIds={listIds}
            onActiveChange={setListIds}
            placeholder="Buscar en el catálogo"
            lists={[
              {
                id: "productos",
                label: "Productos",
                empty: "Todavía no hay productos.",
                items: products,
                text: (item) => item.name,
                group: (item) => item.category,
                render: (items) => <CatalogRows rows={items.map((item) => ({ id: item.id, name: item.name, price: item.price }))} />,
              },
              {
                id: "servicios",
                label: "Servicios",
                empty: "Todavía no hay servicios.",
                items: services,
                text: (item) => item.name,
                group: (item) => item.category,
                render: (items) => <CatalogRows rows={items.map((item) => ({ id: item.id, name: item.name, price: item.price }))} />,
              },
              {
                id: "menu",
                label: "Menú",
                empty: "Todavía no hay platos.",
                items: menu,
                text: (item) => item.name,
                group: (item) => item.section,
                render: (items) => <CatalogRows rows={items.map((item) => ({ id: item.id, name: item.name, price: item.price }))} />,
              },
            ]}
          />
        </section>

        {id ? <TeamPanel businessId={id} /> : null}
      </main>
    </div>
  )
}
