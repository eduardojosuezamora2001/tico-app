import type { ChatOrderLineSelection } from "@workspace/shared"
import { create } from "zustand"

const storageKey = "ticoapp-carts"

export type CartLine = {
  productId: string
  variantId?: string | null
  lineKey: string
  name: string
  price: number
  quantity: number
  stock: number | null
  selection?: ChatOrderLineSelection
}

type Carts = Record<string, CartLine[]>

export type CartAddInput = {
  productId: string
  variantId?: string | null
  name: string
  price: number
  stock: number | null
  selection?: ChatOrderLineSelection
}

function lineKeyFor(input: CartAddInput) {
  return input.variantId ?? input.productId
}

type CartState = {
  carts: Carts
  add: (businessId: string, product: CartAddInput) => void
  setQuantity: (businessId: string, lineKey: string, quantity: number, stock: number | null) => void
  clear: (businessId: string) => void
}

function readCarts(): Carts {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Carts
    if (!parsed || typeof parsed !== "object") return {}
    for (const lines of Object.values(parsed)) {
      for (const line of lines) {
        if (!line.lineKey) {
          line.lineKey = line.variantId ?? line.productId
        }
      }
    }
    return parsed
  } catch {
    return {}
  }
}

function writeCarts(carts: Carts) {
  localStorage.setItem(storageKey, JSON.stringify(carts))
}

export const useCartStore = create<CartState>((set, get) => ({
  carts: typeof localStorage === "undefined" ? {} : readCarts(),

  add(businessId, product) {
    if (product.stock === 0) return
    const key = lineKeyFor(product)
    const current = get().carts[businessId] ?? []
    const existing = current.find((line) => line.lineKey === key)
    const nextQuantity = (existing?.quantity ?? 0) + 1
    if (product.stock !== null && nextQuantity > product.stock) return
    const lines = existing
      ? current.map((line) =>
          line.lineKey === key
            ? {
                ...line,
                quantity: nextQuantity,
                price: product.price,
                name: product.name,
                stock: product.stock,
                selection: product.selection,
              }
            : line,
        )
      : [
          ...current,
          {
            productId: product.productId,
            variantId: product.variantId ?? null,
            lineKey: key,
            name: product.name,
            price: product.price,
            quantity: 1,
            stock: product.stock,
            selection: product.selection,
          },
        ]
    const carts = { ...get().carts, [businessId]: lines }
    writeCarts(carts)
    set({ carts })
  },

  setQuantity(businessId, lineKey, quantity, stock) {
    const current = get().carts[businessId] ?? []
    const limit = stock ?? null
    const capped = limit === null ? quantity : Math.min(quantity, limit)
    const lines =
      capped <= 0
        ? current.filter((line) => line.lineKey !== lineKey)
        : current.map((line) => (line.lineKey === lineKey ? { ...line, quantity: capped } : line))
    const carts = { ...get().carts, [businessId]: lines }
    writeCarts(carts)
    set({ carts })
  },

  clear(businessId) {
    const carts = { ...get().carts, [businessId]: [] }
    writeCarts(carts)
    set({ carts })
  },
}))

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
}

export function cartMessage(businessName: string, lines: CartLine[]) {
  const rows = lines.map((line) => `- ${line.name} x${line.quantity} — ₡${line.price * line.quantity}`)
  return [`Pedido para ${businessName}:`, ...rows, `Total: ₡${cartTotal(lines)}`].join("\n")
}
