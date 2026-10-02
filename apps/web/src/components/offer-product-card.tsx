import { useMemo, useState } from "react"
import {
  findVariantByOptions,
  formatVariantLabel,
  type ProductBundleItem,
  type ProductKind,
  type ProductOptionGroup,
  type ProductVariant,
} from "@workspace/shared"

import { validateProductSelection } from "@/services/catalog.service"
import { useCartStore, type CartLine } from "@/stores/cart-store"
import type { Business } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"

import { colones } from "@/components/business-cart"

const emptyCartLines: CartLine[] = []

export type ProductOffer = {
  id: string
  name: string
  description: string | null
  price: number
  stock: number | null
  imageUrl: string | null
  category: string | null
  productKind: ProductKind
  optionGroups: ProductOptionGroup[]
  specifications: Record<string, string | number | boolean>
  variants: ProductVariant[]
  bundleItems: ProductBundleItem[]
}

export function OfferProductCard({
  business,
  offer,
  canOrder,
}: {
  business: Business
  offer: ProductOffer
  canOrder: boolean
}) {
  const lines = useCartStore((s) => s.carts[business.id] ?? emptyCartLines)
  const add = useCartStore((s) => s.add)
  const setQuantity = useCartStore((s) => s.setQuantity)

  const defaultVariant = useMemo(
    () => offer.variants.find((v) => v.isDefault) ?? offer.variants[0],
    [offer.variants],
  )

  const [pickedOptions, setPickedOptions] = useState<Record<string, string>>({})
  const [bundleQty, setBundleQty] = useState<Record<string, number>>(() =>
    Object.fromEntries(offer.bundleItems.map((b) => [b.componentVariantId, b.defaultQty])),
  )
  const [displayPrice, setDisplayPrice] = useState(offer.price)
  const [displayStock, setDisplayStock] = useState<number | null>(offer.stock)
  const [displayImage, setDisplayImage] = useState(offer.imageUrl)
  const [resolvedVariantId, setResolvedVariantId] = useState<string | null>(defaultVariant?.id ?? null)
  const [resolving, setResolving] = useState(false)

  const lineKey = resolvedVariantId ?? offer.id
  const line = lines.find((item) => item.lineKey === lineKey)
  const inCart = line?.quantity ?? 0
  const soldOut = displayStock === 0
  const capped = displayStock !== null && inCart >= displayStock

  async function resolveSelection(partialOptions?: Record<string, string>) {
    if (offer.productKind === "simple") {
      const v = defaultVariant
      if (!v) return
      setResolvedVariantId(v.id)
      setDisplayPrice(v.price)
      setDisplayStock(v.stock)
      setDisplayImage(v.imageUrl ?? offer.imageUrl)
      return
    }
    if (offer.productKind === "variant") {
      const options = partialOptions ?? pickedOptions
      const local = findVariantByOptions(
        offer.variants.map((v) => ({ id: v.id, options: v.options, isAvailable: v.isAvailable })),
        options,
      )
      if (local) {
        const full = offer.variants.find((v) => v.id === local.id)!
        setResolvedVariantId(full.id)
        setDisplayPrice(full.price)
        setDisplayStock(full.stock)
        setDisplayImage(full.imageUrl ?? offer.imageUrl)
      }
      return
    }
    setResolving(true)
    try {
      const result = await validateProductSelection(business.id, offer.id, {
        options: partialOptions ?? pickedOptions,
        bundleQuantities: bundleQty,
      })
      setResolvedVariantId(result.variantId)
      setDisplayPrice(result.price)
      setDisplayStock(result.stock)
    } finally {
      setResolving(false)
    }
  }

  function handleOptionChange(key: string, value: string) {
    const next = { ...pickedOptions, [key]: value }
    setPickedOptions(next)
    void resolveSelection(next)
  }

  async function handleAdd() {
    let variantId: string | null = resolvedVariantId
    let price = displayPrice
    let stock = displayStock

    if (offer.productKind === "variant") {
      const match = findVariantByOptions(
        offer.variants.map((v) => ({ id: v.id, options: v.options, isAvailable: v.isAvailable })),
        pickedOptions,
      )
      if (!match) return
      const full = offer.variants.find((v) => v.id === match.id)!
      variantId = full.id
      price = full.price
      stock = full.stock
    } else if (offer.productKind === "bundle") {
      const result = await validateProductSelection(business.id, offer.id, {
        bundleQuantities: bundleQty,
      })
      variantId = result.variantId
      price = result.price
      stock = result.stock
    } else {
      variantId = defaultVariant?.id ?? null
      price = defaultVariant?.price ?? offer.price
      stock = defaultVariant?.stock ?? offer.stock
    }

    const optionLabel = formatVariantLabel(offer.optionGroups, pickedOptions)
    const label =
      offer.productKind === "variant" && optionLabel ? `${offer.name} · ${optionLabel}` : offer.name

    add(business.id, {
      productId: offer.id,
      variantId,
      name: label,
      price,
      stock,
      selection:
        offer.productKind === "variant"
          ? { options: pickedOptions }
          : offer.productKind === "bundle"
            ? {
                bundleLines: Object.entries(bundleQty).map(([id, quantity]) => ({
                  variantId: id,
                  quantity,
                })),
              }
            : undefined,
    })
  }

  const specEntries = Object.entries(offer.specifications).slice(0, 4)

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_10px_30px_-18px_oklch(0.2_0.04_275)]">
      <div className={`relative bg-muted ${displayImage ? "aspect-[16/9]" : "h-24"}`}>
        {displayImage ? (
          <img src={displayImage} alt="" className="size-full object-cover" />
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
      <div className="flex flex-col gap-3 p-4">
        <div>
          <h3 className="font-medium">{offer.name}</h3>
          {offer.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{offer.description}</p>
          ) : null}
          {specEntries.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1">
              {specEntries.map(([key, value]) => (
                <li key={key} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {String(value)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {offer.productKind === "variant"
          ? offer.optionGroups.map((group) => (
              <label key={group.key} className="flex flex-col gap-1 text-xs">
                {group.label}
                <select
                  className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                  value={pickedOptions[group.key] ?? ""}
                  onChange={(e) => handleOptionChange(group.key, e.target.value)}
                >
                  <option value="">Elegir…</option>
                  {group.values.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            ))
          : null}

        {offer.productKind === "bundle"
          ? offer.bundleItems.map((item) => (
              <label key={item.id} className="flex items-center justify-between gap-2 text-xs">
                <span>Componente</span>
                <input
                  type="number"
                  min={item.minQty}
                  max={item.maxQty}
                  value={bundleQty[item.componentVariantId] ?? item.defaultQty}
                  className="h-8 w-16 rounded-md border border-input px-2 text-sm"
                  onChange={(e) => {
                    const next = { ...bundleQty, [item.componentVariantId]: Number(e.target.value) || 0 }
                    setBundleQty(next)
                    void resolveSelection()
                  }}
                />
              </label>
            ))
          : null}

        <p className="text-lg font-semibold text-primary">{colones(displayPrice)}</p>
        {canOrder ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {inCart > 0 ? (
              <div className="flex items-center gap-2 rounded-full bg-muted px-2 py-1 text-xs">
                <span className="pl-1 text-muted-foreground">En el carrito: {inCart}</span>
                <button
                  type="button"
                  className="grid size-7 place-items-center rounded-full bg-background text-base"
                  aria-label={`Quitar uno de ${offer.name}`}
                  onClick={() => setQuantity(business.id, lineKey, inCart - 1, displayStock)}
                >
                  −
                </button>
                <button
                  type="button"
                  className="grid size-7 place-items-center rounded-full bg-background text-base"
                  aria-label={`Agregar otro ${offer.name}`}
                  disabled={capped}
                  onClick={() => void handleAdd()}
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
              disabled={soldOut || capped || resolving}
              onClick={() => void handleAdd()}
            >
              {soldOut ? "Agotado" : inCart > 0 ? "Agregar otro" : "Agregar"}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  )
}
