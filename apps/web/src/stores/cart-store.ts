import { create } from "zustand"

const storageKey = "ticoapp-carts"

export type CartLine = {
  productId: string
  name: string
  price: number
  quantity: number
  stock: number | null
}

type Carts = Record<string, CartLine[]>

type CartState = {
  carts: Carts
  add: (businessId: string, product: { id: string; name: string; price: number; stock: number | null }) => void
  setQuantity: (businessId: string, productId: string, quantity: number, stock: number | null) => void
  clear: (businessId: string) => void
}

function readCarts(): Carts {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Carts
    return parsed && typeof parsed === "object" ? parsed : {}
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
    const current = get().carts[businessId] ?? []
    const existing = current.find((line) => line.productId === product.id)
    const nextQuantity = (existing?.quantity ?? 0) + 1
    if (product.stock !== null && nextQuantity > product.stock) return
    const lines = existing
      ? current.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: nextQuantity, price: product.price, name: product.name, stock: product.stock }
            : line,
        )
      : [...current, { productId: product.id, name: product.name, price: product.price, quantity: 1, stock: product.stock }]
    const carts = { ...get().carts, [businessId]: lines }
    writeCarts(carts)
    set({ carts })
  },

  setQuantity(businessId, productId, quantity, stock) {
    const current = get().carts[businessId] ?? []
    const limit = stock ?? null
    const capped = limit === null ? quantity : Math.min(quantity, limit)
    const lines = capped <= 0
      ? current.filter((line) => line.productId !== productId)
      : current.map((line) => (line.productId === productId ? { ...line, quantity: capped } : line))
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
