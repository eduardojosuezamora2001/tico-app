import { useEffect, useState } from "react"
import { parseAsString, useQueryState } from "nuqs"
import { Link } from "react-router"

import { SiteHeader } from "@/components/site-header"
import { api } from "@/lib/api"
import { Button } from "@workspace/ui/components/button"

const categories = [
  { id: "sodas", label: "Sodas", hint: "Casados y frescos", tint: "bg-orange-500/15 text-orange-700 dark:text-orange-200" },
  { id: "farmacia", label: "Farmacia", hint: "Medicamentos", tint: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200" },
  { id: "ferreteria", label: "Ferretería", hint: "Materiales", tint: "bg-sky-500/15 text-sky-700 dark:text-sky-200" },
  { id: "pulperia", label: "Pulpería", hint: "Abarrotes", tint: "bg-amber-500/15 text-amber-800 dark:text-amber-200" },
  { id: "belleza", label: "Belleza", hint: "Citas y uñas", tint: "bg-pink-500/15 text-pink-700 dark:text-pink-200" },
  { id: "servicios", label: "Servicios", hint: "Oficios", tint: "bg-violet-500/15 text-violet-700 dark:text-violet-200" },
] as const

const provinces = ["San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón"] as const

const provinceHints: Record<string, string[]> = {
  "San José": ["san jose", "san josé", "escazu", "escazú", "desamparados", "curridabat"],
  Alajuela: ["alajuela"],
  Cartago: ["cartago"],
  Heredia: ["heredia"],
  Guanacaste: ["guanacaste", "liberia", "santa cruz"],
  Puntarenas: ["puntarenas", "esparza", "quepos"],
  Limón: ["limon", "limón"],
}

type BusinessCard = {
  id: string
  name: string
  description: string | null
  category: string
  address: string | null
  whatsappNumber: string | null
  bannerUrl: string | null
  distanceKm: number | null
}

export function HomePage() {
  const [query, setQuery] = useQueryState("q", parseAsString.withDefault(""))
  const [category, setCategory] = useQueryState("category", parseAsString)
  const [draft, setDraft] = useState(query)
  const [province, setProvince] = useState("Todas")
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [items, setItems] = useState<BusinessCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(query)
  }, [query])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setLoading(true)
      void api
        .get<{ data: BusinessCard[] }>("/businesses", {
          params: {
            q: query || undefined,
            category: category ?? undefined,
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            radiusKm: coords ? 50 : undefined,
          },
        })
        .then((response) => {
          setItems(response.data.data)
          setError(null)
        })
        .catch(() => setError("No se pudo cargar el directorio."))
        .finally(() => setLoading(false))
    }, 250)
    return () => window.clearTimeout(handle)
  }, [query, category, coords])

  const visible = items.filter((item) => inProvince(item.address, province))

  function locate() {
    if (!navigator.geolocation) {
      setLocationError("Este navegador no comparte la ubicación.")
      return
    }
    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude })
        setLocating(false)
      },
      () => {
        setLocationError("No se pudo usar la ubicación. Revisá el permiso del navegador.")
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 8000 },
    )
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16">
        <section className="py-10 text-center md:py-14">
          <p className="mx-auto inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            Directorio de comercios locales en Costa Rica
          </p>
          <h1 className="mx-auto mt-4 max-w-[18ch] text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Encuentra y apoya <span className="text-primary">negocios locales</span> cerca de ti
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Descubrí el menú, los productos y los servicios de cada local. El pedido se coordina con ese negocio, por WhatsApp o por el chat.
          </p>

          <form
            className="mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-card p-3 text-left shadow-[0_16px_40px_-28px_oklch(0.2_0.04_275)]"
            onSubmit={(event) => {
              event.preventDefault()
              void setQuery(draft.trim() || null)
            }}
          >
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_14rem]">
              <label className="relative block">
                <span className="sr-only">Qué buscás</span>
                <SearchIcon />
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="¿Qué buscás? (ej. casados, farmacia, ferretería, panadería...)"
                  className="h-11 w-full rounded-xl border border-border bg-background pr-3 pl-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </label>
              <label className="block">
                <span className="sr-only">Provincia</span>
                <select
                  value={province}
                  onChange={(event) => setProvince(event.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="Todas">Todas las provincias</option>
                  {provinces.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button type="button" className="text-sm text-primary" onClick={locate}>
                {locating ? "Buscando ubicación…" : coords ? "Ubicación activa" : "Usar mi ubicación actual"}
              </button>
              <Button type="submit" className="rounded-full px-5">
                Explorar ofertas
              </Button>
            </div>
            {locationError ? <p className="mt-2 text-sm text-destructive">{locationError}</p> : null}
          </form>
        </section>

        <section aria-label="Categorías">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Categorías</h2>
            <button type="button" className="text-sm text-primary" onClick={() => void setCategory(null)}>
              Ver todas
            </button>
          </div>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {categories.map((item) => {
              const selected = category === item.label
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => void setCategory(selected ? null : item.label)}
                    className={`flex w-full flex-col items-center gap-2 rounded-2xl border px-2 py-4 ${
                      selected ? "border-primary bg-accent" : "border-border bg-card"
                    }`}
                  >
                    <span className={`grid size-12 place-items-center rounded-full ${item.tint}`}>
                      <CategoryMark label={item.label} />
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section id="negocios" className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Negocios cerca de ti</h2>
              <p className="mt-1 text-sm text-muted-foreground">Cada local muestra solo su propia oferta.</p>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              <FilterChip active={category === null} onClick={() => void setCategory(null)}>
                Todos
              </FilterChip>
              {categories.slice(0, 4).map((item) => (
                <FilterChip key={item.id} active={category === item.label} onClick={() => void setCategory(category === item.label ? null : item.label)}>
                  {item.label}
                </FilterChip>
              ))}
            </div>
          </div>

          {loading ? <p className="mt-6 text-sm text-muted-foreground">Cargando comercios…</p> : null}
          {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}
          {!loading && !error && visible.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Todavía no hay comercios publicados con ese criterio.
            </p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((item) => {
                const tint = categories.find((entry) => entry.label === item.category)?.tint
                const whatsapp = item.whatsappNumber?.replace(/\D/g, "")
                return (
                  <li key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_40px_-28px_oklch(0.2_0.04_275)]">
                    <Link to={`/n/${item.id}`} className="block">
                      <div className={`relative h-36 ${tint ?? "bg-muted"}`}>
                        {item.bannerUrl ? <img src={item.bannerUrl} alt="" className="size-full object-cover" /> : null}
                        <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium">
                          {item.category}
                        </span>
                      </div>
                      <div className="space-y-1 p-4">
                        <h3 className="text-lg font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.address ?? "Costa Rica"}
                          {item.distanceKm !== null ? ` · ${item.distanceKm} km` : ""}
                        </p>
                        {item.description ? <p className="line-clamp-2 text-sm">{item.description}</p> : null}
                      </div>
                    </Link>
                    <div className="px-4 pb-4">
                      {whatsapp ? (
                        <a
                          className="inline-flex h-9 items-center rounded-full bg-[#128C7E] px-4 text-sm font-medium text-white hover:bg-[#0f7a6e]"
                          href={`https://wa.me/${whatsapp}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {actionLabel(item.category)}
                        </a>
                      ) : (
                        <Link className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground" to={`/n/${item.id}`}>
                          Ver el local
                        </Link>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-semibold">Explorá por provincia</h2>
          <p className="mt-1 text-sm text-muted-foreground">Los comercios publicados cuya dirección cae en esa provincia.</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {provinces.map((item) => {
              const count = items.filter((business) => inProvince(business.address, item)).length
              const selected = province === item
              return (
                <li key={item}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setProvince(selected ? "Todas" : item)}
                    className={`w-full rounded-2xl border px-3 py-4 text-left ${selected ? "border-primary bg-accent" : "border-border bg-card"}`}
                  >
                    <span className="block text-sm font-medium">{item}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{count} {count === 1 ? "local" : "locales"}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="mt-14 overflow-hidden rounded-3xl bg-primary px-6 py-8 text-primary-foreground md:flex md:items-center md:justify-between md:px-10">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold text-balance">Publicá tu local y recibí pedidos directos</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">
              El cliente ve tu catálogo, arma el pedido y te lo envía por el chat. El resto se coordina por WhatsApp.
            </p>
          </div>
          <Button className="mt-5 rounded-full bg-background text-foreground hover:bg-background/90 md:mt-0" render={<Link to="/registro" />}>
            Registrar mi negocio
          </Button>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground">
          <p>TicoApp · Directorio de comercios locales</p>
          <Link className="hover:text-foreground" to="/registro">
            Registrar un negocio
          </Link>
        </div>
      </footer>
    </div>
  )
}

function inProvince(address: string | null, province: string) {
  if (province === "Todas") return true
  const haystack = (address ?? "").toLocaleLowerCase("es")
  return (provinceHints[province] ?? [province.toLocaleLowerCase("es")]).some((hint) => haystack.includes(hint))
}

function actionLabel(category: string) {
  if (category === "Sodas") return "Ver menú por WhatsApp"
  if (category === "Farmacia") return "Consultar por WhatsApp"
  if (category === "Ferretería") return "Cotizar por WhatsApp"
  if (category === "Pulpería") return "Pedir por WhatsApp"
  if (category === "Belleza") return "Escribir por WhatsApp"
  return "Contactar por WhatsApp"
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
      }`}
    >
      {children}
    </button>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function CategoryMark({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.75">
      {label === "Sodas" ? <path d="M6 9h12l-1 9H7zM8 9V7a4 4 0 0 1 8 0v2" strokeLinejoin="round" /> : null}
      {label === "Farmacia" ? <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" strokeLinejoin="round" /> : null}
      {label === "Ferretería" ? <path d="M14 5 19 10l-7 7-5-5zM5 19l4-1" strokeLinejoin="round" /> : null}
      {label === "Pulpería" ? <path d="M5 8h14l-1.5 11h-11zM8 8V6h8v2" strokeLinejoin="round" /> : null}
      {label === "Belleza" ? <path d="M8 14c1-4 7-4 8 0M9 8h.01M15 8h.01M12 20a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" strokeLinecap="round" /> : null}
      {label === "Servicios" ? <path d="M14.5 6.5a2 2 0 0 1 3 3L8 19l-4 1 1-4z" strokeLinejoin="round" /> : null}
    </svg>
  )
}
