import { z } from "zod"

export const CHAT_ORDER_PREFIX = "[[tico-order:v1]]"

export type ChatOrderStatus = "pending" | "accepted" | "denied"
export type ChatOrderFulfillmentStage = "preparing" | "ready" | "delivered"

export type ChatOrderLine = {
  productId: string
  name: string
  quantity: number
  price: number
}

export type ChatOrderPayload = {
  orderId: string
  businessName: string
  lines: ChatOrderLine[]
  total: number
  status: ChatOrderStatus
  fulfillmentStage?: ChatOrderFulfillmentStage | null
  decidedAt?: string
  stageUpdatedAt?: string
}

export const ChatOrderLineSchema = z.object({
  productId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  quantity: z.number().int().positive().max(99),
  price: z.number().nonnegative(),
})

export const SendChatOrderSchema = z.object({
  businessName: z.string().trim().min(1).max(120),
  lines: z.array(ChatOrderLineSchema).min(1).max(40),
})

export type SendChatOrderInput = z.infer<typeof SendChatOrderSchema>

export type ParsedMessageContent =
  | { kind: "text"; text: string }
  | { kind: "order"; order: ChatOrderPayload }

export function chatOrderTotal(lines: ChatOrderLine[]) {
  return lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
}

export function encodeChatOrderMessage(order: ChatOrderPayload) {
  return `${CHAT_ORDER_PREFIX}${JSON.stringify(order)}`
}

export function parseMessageContent(text: string): ParsedMessageContent {
  if (!text.startsWith(CHAT_ORDER_PREFIX)) {
    return { kind: "text", text }
  }
  try {
    const parsed = JSON.parse(text.slice(CHAT_ORDER_PREFIX.length)) as ChatOrderPayload
    if (!parsed?.orderId || !Array.isArray(parsed.lines)) {
      return { kind: "text", text }
    }
    return {
      kind: "order",
      order: {
        orderId: parsed.orderId,
        businessName: parsed.businessName ?? "Negocio",
        lines: parsed.lines,
        total: parsed.total ?? chatOrderTotal(parsed.lines),
        status: parsed.status ?? "pending",
        fulfillmentStage: parsed.fulfillmentStage ?? null,
        decidedAt: parsed.decidedAt,
        stageUpdatedAt: parsed.stageUpdatedAt,
      },
    }
  } catch {
    return { kind: "text", text }
  }
}

export function createChatOrderPayload(input: SendChatOrderInput, orderId: string): ChatOrderPayload {
  const lines = input.lines.map((line) => ({
    productId: line.productId,
    name: line.name,
    quantity: line.quantity,
    price: line.price,
  }))
  return {
    orderId,
    businessName: input.businessName,
    lines,
    total: chatOrderTotal(lines),
    status: "pending",
  }
}

export function messagePreviewText(text: string) {
  const parsed = parseMessageContent(text)
  if (parsed.kind === "order") {
    const shortId = parsed.order.orderId.slice(-4).padStart(4, "0")
    return `Pedido #${shortId} · ₡${parsed.order.total.toLocaleString("es-CR")}`
  }
  return text
}

export function withChatOrderDecision(
  order: ChatOrderPayload,
  status: Exclude<ChatOrderStatus, "pending">,
): ChatOrderPayload {
  const now = new Date().toISOString()
  return {
    ...order,
    status,
    fulfillmentStage: status === "accepted" ? "preparing" : null,
    decidedAt: now,
    stageUpdatedAt: status === "accepted" ? now : undefined,
  }
}

export function withChatOrderStage(
  order: ChatOrderPayload,
  fulfillmentStage: ChatOrderFulfillmentStage,
): ChatOrderPayload {
  return {
    ...order,
    fulfillmentStage,
    stageUpdatedAt: new Date().toISOString(),
  }
}
