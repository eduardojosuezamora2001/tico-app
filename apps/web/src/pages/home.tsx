import { useEffect, useState } from "react"
import { parseAsString, useQueryState } from "nuqs"
import { Link } from "react-router"

import { SiteHeader } from "@/components/site-header"
import { api } from "@/lib/api"
import { Button } from "@workspace/ui/components/button"

const categories = [
  { id: "sodas", label: "Sodas", tint: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200" },
  { id: "farmacia", label: "Farmacia", tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200" },
  { id: "ferreteria", label: "Ferretería", tint: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200" },
  { id: "pulperia", label: "Pulpería", tint: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200" },
  { id: "belleza", label: "Belleza", tint: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-200" },
  { id: "servicios", label: "Servicios", tint: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200" },
] as const

type BusinessCard = {
  id: string
  name: string
  category: string
  address: string | null
  distanceKm: number | null
}

export function HomePage() {
  const [query, setQuery] = useQueryState("q", parseAsString.withDefault(""))
  const [category, setCategory] = useQueryState("category", parseAsString)
  const [items, setItems] = useState<BusinessCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setLoading(true)
      void api
        .get<{ data: BusinessCard[] }>("/businesses", {
          params: { q: query || undefined, category: category ?? undefined },
        })
        .then((response) => {
          setItems(response.data.data)
          setError(null)
        })
        .catch(() => setError("No se pudo cargar el directorio."))
        .finally(() => setLoading(false))
    }, 250)
    return () => window.clearTimeout(handle)
  }, [query, category])

  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <section className="grid items-end gap-8 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-14">
          <div>
            <h1 className="max-w-[16ch] text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              Encuentra negocios cerca de ti
            </h1>
            <p className="mt-3 max-w-md text-muted-foreground">
              Descubre un comercio y entra a ver qué ofrece. Cada local muestra solo su propia oferta.
            </p>
            <form
              className="mt-6 flex max-w-xl gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm"
              onSubmit={(event) => event.preventDefault()}
            >
              <label className="sr-only" htmlFor="q">
                Buscar un comercio
              </label>
              <input
                id="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre o lugar"
                className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <Button type="submit" className="rounded-full px-5">
                Buscar
              </Button>
            </form>
          </div>
          <div
            aria-hidden="true"
            className="hidden h-44 rounded-3xl bg-[linear-gradient(120deg,var(--primary),oklch(0.72_0.12_230))] opacity-90 md:block dark:opacity-70"
          />
        </section>

        <section aria-label="Categorías" className="flex gap-4 overflow-x-auto pb-2">
          {categories.map((item) => {
            const selected = category === item.label
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setCategory(selected ? null : item.label)}
                className="flex w-16 shrink-0 flex-col items-center gap-2 text-xs"
              >
                <span
                  className={`grid size-12 place-items-center rounded-full ${item.tint} ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                >
                  {item.label.slice(0, 1)}
                </span>
                {item.label}
              </button>
            )
          })}
        </section>

        <section id="negocios" className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Negocios cerca</h2>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Cargando comercios…</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!loading && !error && items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Todavía no hay comercios publicados con ese criterio.
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const tint = categories.find((entry) => entry.label === item.category)?.tint
                return (
                  <li key={item.id}>
                    <Link to={`/n/${item.id}`} className="block overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                      <div className={`h-28 ${tint ?? "bg-muted"}`} />
                      <div className="space-y-1 p-4">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.category}
                          {item.address ? ` · ${item.address}` : ""}
                        </p>
                        {item.distanceKm !== null ? <p className="text-sm">{item.distanceKm} km</p> : null}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
