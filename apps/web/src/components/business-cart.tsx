import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Business } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Empty, EmptyDescription, EmptyHeader } from "@workspace/ui/components/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@workspace/ui/components/input-group"

import { FilterCombobox } from "@/components/list-filter"

import { OfferProductCard, type ProductOffer } from "@/components/offer-product-card"
import { sendMessage } from "@/services/messages.service"
import { cartTotal, useCartStore, type CartLine } from "@/stores/cart-store"
import { useAuthStore } from "@/stores/auth-store"

const emptyLines: CartLine[] = []

export type Offer = ProductOffer | {
  id: string
  name: string
  description: string | null
  price: number
  stock: number | null
  imageUrl: string | null
  category: string | null
}

function isProductOffer(offer: Offer): offer is ProductOffer {
  return "productKind" in offer && typeof offer.productKind === "string"
}

export function colones(value: number) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(value)
}

export function OrderBoard({
  business,
  offers,
  empty,
  heading,
  hideChrome = false,
}: {
  business: Business
  offers: Offer[]
  empty: string
  heading: string
  hideChrome?: boolean
}) {
  const userId = useAuthStore((s) => s.session?.user.id)
  const canOrder = business.ownerId !== userId
  const lines = useCartStore((s) => s.carts[business.id]) ?? emptyLines
  const add = useCartStore((s) => s.add)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const [query, setQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const categories = useMemo(
    () => [...new Set(offers.map((item) => item.category).filter((item): item is string => Boolean(item)))],
    [offers],
  )

  const visible = hideChrome
    ? offers
    : offers.filter((item) => {
        const haystack = `${item.name} ${item.description ?? ""}`.toLocaleLowerCase("es")
        const matchesQuery = haystack.includes(query.trim().toLocaleLowerCase("es"))
        const matchesCategory =
          selectedCategories.length === 0 || (item.category !== null && selectedCategories.includes(item.category))
        return matchesQuery && matchesCategory
      })

  if (offers.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">{empty}</p>
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      {hideChrome ? null : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <InputGroup className="h-11 min-w-0 flex-1 rounded-full">
            <InputGroupAddon>
              <SearchIcon />
              <span className="sr-only">Buscar en {heading}</span>
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busca platillo, fresco, casado o producto"
            />
          </InputGroup>
          {categories.length > 0 ? (
            <div className="min-w-0 sm:w-72 sm:shrink-0">
              <FilterCombobox
                label="Categoría"
                items={[{ id: "todas", label: "Todos" }, ...categories.map((item) => ({ id: item, label: item }))]}
                value={selectedCategories}
                clearId="todas"
                onChange={setSelectedCategories}
              />
            </div>
          ) : null}
        </div>
      )}

      {canOrder && !hideChrome ? <OrderBar business={business} lines={lines} /> : null}

      {hideChrome ? null : (
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{heading}</h2>
        <p className="text-xs text-muted-foreground">Precios de este local</p>
      </div>
      )}

      {visible.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyDescription>Nada coincide con esa búsqueda.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((offer) =>
            isProductOffer(offer) ? (
              <OfferProductCard key={offer.id} business={business} offer={offer} canOrder={canOrder} />
            ) : (
              <SimpleOfferCard
                key={offer.id}
                business={business}
                offer={offer}
                canOrder={canOrder}
                lines={lines}
                add={add}
                setQuantity={setQuantity}
              />
            ),
          )}
        </ul>
      )}
    </div>
  )
}

function SimpleOfferCard({
  business,
  offer,
  canOrder,
  lines,
  add,
  setQuantity,
}: {
  business: Business
  offer: Extract<Offer, { productKind?: never }>
  canOrder: boolean
  lines: CartLine[]
  add: ReturnType<typeof useCartStore.getState>["add"]
  setQuantity: ReturnType<typeof useCartStore.getState>["setQuantity"]
}) {
  const line = lines.find((item) => item.lineKey === offer.id)
  const inCart = line?.quantity ?? 0
  const soldOut = offer.stock === 0
  const capped = offer.stock !== null && inCart >= offer.stock
  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_10px_30px_-18px_oklch(0.2_0.04_275)]">
      <div className={`relative bg-muted ${offer.imageUrl ? "aspect-[16/9]" : "h-24"}`}>
        {offer.imageUrl ? (
          <img src={offer.imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center bg-[linear-gradient(145deg,var(--muted),color-mix(in_oklch,var(--primary)_22%,var(--card)))]">
            <span className="text-2xl font-semibold text-primary/80">{offer.name.slice(0, 1)}</span>
          </div>
        )}
        {offer.category ? (
          <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground">
            {offer.category}
          </span>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="font-medium">{offer.name}</h3>
          {offer.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{offer.description}</p>
          ) : null}
        </div>
        <p className="text-lg font-semibold text-primary">{colones(offer.price)}</p>
        {canOrder ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {inCart > 0 ? (
              <div className="flex items-center gap-2 rounded-full bg-muted px-2 py-1 text-xs">
                <span className="pl-1 text-muted-foreground">En el carrito: {inCart}</span>
                <button
                  type="button"
                  className="grid size-7 place-items-center rounded-full bg-background text-base"
                  aria-label={`Quitar uno de ${offer.name}`}
                  onClick={() => setQuantity(business.id, offer.id, inCart - 1, offer.stock)}
                >
                  −
                </button>
                <button
                  type="button"
                  className="grid size-7 place-items-center rounded-full bg-background text-base"
                  aria-label={`Agregar otro ${offer.name}`}
                  disabled={capped}
                  onClick={() =>
                    add(business.id, {
                      productId: offer.id,
                      name: offer.name,
                      price: offer.price,
                      stock: offer.stock,
                    })
                  }
                >
                  +
                </button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">{soldOut ? "Agotado" : "Disponible en este local"}</span>
            )}
            <Button
              type="button"
              size="sm"
              className="rounded-full px-4"
              disabled={soldOut || capped}
              onClick={() =>
                add(business.id, {
                  productId: offer.id,
                  name: offer.name,
                  price: offer.price,
                  stock: offer.stock,
                })
              }
            >
              {soldOut ? "Agotado" : inCart > 0 ? "Agregar otro" : "Agregar"}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  )
}

export function OrderBar({
  business,
  lines,
  sticky = false,
}: {
  business: Business
  lines: CartLine[]
  sticky?: boolean
}) {
  const clear = useCartStore((s) => s.clear)
  const setQuantity = useCartStore((s) => s.setQuantity)
  const signedIn = useAuthStore((s) => s.status) === "authenticated"
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const count = lines.reduce((sum, line) => sum + line.quantity, 0)
  const total = cartTotal(lines)

  useEffect(() => {
    if (confirmOpen && lines.length === 0 && !sending) setConfirmOpen(false)
  }, [confirmOpen, lines.length, sending])

  async function send() {
    if (lines.length === 0) return
    setSending(true)
    setError(null)
    try {
      await sendMessage({
        businessId: business.id,
        order: {
          businessName: business.name,
          lines: lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId ?? null,
            name: line.name,
            quantity: line.quantity,
            price: line.price,
            selection: line.selection,
          })),
        },
      })
      clear(business.id)
      setSent(true)
      setConfirmOpen(false)
    } catch {
      setError("No se pudo enviar el pedido. Entra con tu cuenta e inténtalo de nuevo.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div
        className={
          sticky
            ? "sticky top-14 z-10 rounded-2xl border border-primary/30 bg-accent/95 px-4 py-3 shadow-sm backdrop-blur-md sm:top-16"
            : "rounded-2xl border border-primary/30 bg-accent px-4 py-3"
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Mi pedido en {business.name}</p>
            <p className="text-xs text-muted-foreground">
              {sent
                ? "Pedido enviado. El negocio lo ve en su chat."
                : count > 0
                  ? `${count} ${count === 1 ? "producto" : "productos"} · ${colones(total)}`
                  : "Todavía no agregaste nada de este local."}
            </p>
          </div>
          {count > 0 && signedIn ? (
            <Button
              type="button"
              className="rounded-full bg-[#128C7E] px-4 text-white hover:bg-[#0f7a6e]"
              disabled={sending}
              onClick={() => {
                setError(null)
                setConfirmOpen(true)
              }}
            >
              Enviar pedido
            </Button>
          ) : null}
          {count > 0 && !signedIn ? (
            <Button className="rounded-full px-4" render={<Link to={`/login?next=/n/${business.id}`} />}>
              Entra para enviar
            </Button>
          ) : null}
        </div>
        {error && !confirmOpen ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>

      <Dialog open={confirmOpen} onOpenChange={(open) => !sending && setConfirmOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar pedido</DialogTitle>
            <DialogDescription>
              Revisa o ajusta los productos antes de enviar el pedido al chat de {business.name}.
            </DialogDescription>
          </DialogHeader>

          <ul className="flex max-h-72 flex-col gap-3 overflow-y-auto border-y border-border py-4">
            {lines.map((line) => {
              const capped = line.stock !== null && line.quantity >= line.stock
              return (
                <li key={line.lineKey} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="font-medium">{line.name}</p>
                      <p className="text-xs text-muted-foreground">{colones(line.price)} c/u</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 rounded-full bg-muted px-1 py-0.5">
                        <button
                          type="button"
                          className="grid size-7 place-items-center rounded-full bg-background text-base disabled:opacity-40"
                          aria-label={`Quitar uno de ${line.name}`}
                          disabled={sending}
                          onClick={() => setQuantity(business.id, line.lineKey, line.quantity - 1, line.stock)}
                        >
                          −
                        </button>
                        <span className="min-w-6 text-center tabular-nums text-xs font-medium">{line.quantity}</span>
                        <button
                          type="button"
                          className="grid size-7 place-items-center rounded-full bg-background text-base disabled:opacity-40"
                          aria-label={`Agregar otro ${line.name}`}
                          disabled={sending || capped}
                          onClick={() => setQuantity(business.id, line.lineKey, line.quantity + 1, line.stock)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                        aria-label={`Eliminar ${line.name} del pedido`}
                        disabled={sending}
                        onClick={() => setQuantity(business.id, line.lineKey, 0, line.stock)}
                      >
                        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
                      </button>
                    </div>
                  </div>
                  <span className="shrink-0 pt-0.5 tabular-nums font-medium">
                    {colones(line.price * line.quantity)}
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total del pedido</span>
            <span className="text-lg font-semibold tabular-nums">{colones(total)}</span>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" disabled={sending} onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#128C7E] text-white hover:bg-[#0f7a6e]"
              disabled={sending || lines.length === 0}
              onClick={() => void send()}
            >
              {sending ? "Enviando…" : "Confirmar y enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none text-muted-foreground">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
