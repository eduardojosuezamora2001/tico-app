import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { searchBusinesses } from "@/services/businesses.service"
import type { BusinessSummary } from "@/services/types"

const kindCopy = {
  product: "Locales que tienen",
  service: "Locales que ofrecen",
  menu: "Locales con este plato",
} as const

export function BuscarPage() {
  const [params] = useSearchParams()
  const kind = params.get("kind")
  const label = params.get("label")?.trim() ?? ""
  const tag = params.get("tag")?.trim() ?? ""
  const bcat = params.get("bcat")?.trim() ?? ""
  const offerKind = kind === "product" || kind === "service" || kind === "menu" ? kind : tag ? "product" : null
  const [items, setItems] = useState<BusinessSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!offerKind && !bcat && !tag) {
      setItems([])
      setLoading(false)
      setError(null)
      return
    }
    if (offerKind && !label && !tag) {
      setItems([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    void searchBusinesses({
      catalogKind: label && offerKind ? offerKind : undefined,
      catalogLabel: label || undefined,
      tag: tag || undefined,
      bcat: bcat || undefined,
      limit: 24,
    })
      .then((response) => {
        setItems(response.data)
        setError(null)
      })
      .catch(() => setError("No se pudieron cargar los locales."))
      .finally(() => setLoading(false))
  }, [offerKind, label, tag, bcat])

  const title = bcat
    ? `Negocios en “${label || bcat.replace(/-/g, " ")}”`
    : tag
      ? `Locales con productos en “${label || tag.replace(/-/g, " ")}”`
      : offerKind && label
        ? `${kindCopy[offerKind]} “${label}”`
        : "Búsqueda"

  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 pb-16">
        <p className="text-sm text-muted-foreground">
          <Link to="/" className="text-primary">
            Inicio
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Elegí un local para ver su catálogo y coordinar el pedido.
        </p>
        {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}
        {loading ? <p className="mt-8 text-sm text-muted-foreground">Cargando locales…</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Ningún local publicado tiene esta oferta ahora.</p>
        ) : null}
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <Link to={`/n/${item.id}`} className="block p-4">
                <p className="text-xs text-muted-foreground">{item.category}</p>
                <h2 className="mt-1 text-lg font-semibold">{item.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.address ?? "Costa Rica"}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter variant="full" />
    </div>
  )
}
