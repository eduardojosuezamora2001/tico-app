import type { ChatOrderLine } from "@workspace/shared"

import { resolveSelection } from "./product-catalog.js"
import { supabaseAdmin } from "./supabase.js"

export async function validateChatOrderLines(
  businessId: string,
  lines: ChatOrderLine[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  for (const line of lines) {
    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", line.productId)
      .eq("business_id", businessId)
      .maybeSingle()
    if (error || !product) {
      return { ok: false, message: "Producto no válido en el pedido." }
    }

    const { data: variants } = await supabaseAdmin
      .from("product_variants")
      .select("*")
      .eq("product_id", line.productId)

    const { data: bundleItems } = await supabaseAdmin
      .from("product_bundle_items")
      .select("*")
      .eq("bundle_product_id", line.productId)

    let resolvedPrice: number
    let resolvedStock: number | null

    if (line.variantId) {
      const variant = (variants ?? []).find((v) => v.id === line.variantId)
      if (!variant) return { ok: false, message: "Variante no válida." }
      resolvedPrice = Number(variant.price)
      resolvedStock = variant.stock
    } else {
      try {
        const bundleQuantities =
          line.selection?.bundleLines?.reduce<Record<string, number>>((acc, item) => {
            acc[item.variantId] = item.quantity
            return acc
          }, {}) ?? undefined

        const resolved = resolveSelection({
          product,
          variants: variants ?? [],
          bundleItems: bundleItems ?? [],
          options: line.selection?.options,
          bundleQuantities,
        })
        resolvedPrice = resolved.price
        resolvedStock = resolved.stock
        if (line.variantId && line.variantId !== resolved.variant.id) {
          return { ok: false, message: "Variante no coincide." }
        }
      } catch (e) {
        return { ok: false, message: (e as Error).message }
      }
    }

    if (Math.abs(resolvedPrice - line.price) > 0.009) {
      return { ok: false, message: "Precio desactualizado. Vuelve a agregar al carrito." }
    }
    if (resolvedStock === 0) {
      return { ok: false, message: `Sin stock: ${line.name}` }
    }
    if (resolvedStock !== null && line.quantity > resolvedStock) {
      return { ok: false, message: `Stock insuficiente para ${line.name}` }
    }
  }
  return { ok: true }
}
