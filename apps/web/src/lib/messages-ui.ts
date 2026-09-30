import {
  chatOrderTotal,
  orderStageLabel,
  parseMessageContent,
  type Business,
  type ChatOrder,
  type ChatOrderLine,
  type ChatOrderPayload,
  type Conversation,
  type Message,
} from "@workspace/shared"

import type { CartLine } from "@/stores/cart-store"
import { cartTotal } from "@/stores/cart-store"

export type ConversationTab = "active" | "history"

const colones = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
})

export function formatColones(amount: number) {
  return colones.format(amount)
}

export function formatMessageTime(iso: string) {
  return new Intl.DateTimeFormat("es-CR", { hour: "numeric", minute: "2-digit" }).format(new Date(iso))
}

export function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(0, Math.floor(diff / 60000))
  if (minutes < 1) return "ahora"
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  return formatMessageTime(iso)
}

/** Fecha y hora fija para hitos del pedido (zona Costa Rica). */
export function formatOrderStepTimestamp(iso: string) {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Costa_Rica",
  }).format(new Date(iso))
}

export function orderNumberFromConversation(conversationId: string) {
  const digits = conversationId.replace(/\D/g, "").slice(-4)
  return digits.padStart(4, "0")
}

export function orderShortId(orderId: string) {
  return orderId.replace(/\D/g, "").slice(-4).padStart(4, "0")
}

export type TrackedChatOrder = {
  messageId: string
  order: ChatOrderPayload
  createdAt: string
}

export function trackedOrdersFromMessages(messages: Message[]): TrackedChatOrder[] {
  const orders: TrackedChatOrder[] = []
  for (const message of messages) {
    const parsed = parseMessageContent(message.text)
    if (parsed.kind === "order") {
      orders.push({ messageId: message.id, order: parsed.order, createdAt: message.createdAt })
    }
  }
  return orders
}

/** Pedidos que siguen abiertos en el panel del chat (excluye entregados y denegados). */
export function filterUndeliveredConversationOrders(orders: ChatOrder[]) {
  return orders.filter((order) => {
    if (order.status === "pending") return true
    if (order.status === "accepted" && order.fulfillmentStage !== "delivered") return true
    return false
  })
}

export function mergeConversationOrders(orders: ChatOrder[], messages: Message[]): ChatOrder[] {
  if (orders.length > 0) return orders
  return trackedOrdersFromMessages(messages).map(({ messageId, order, createdAt }) => ({
    id: order.orderId,
    businessId: "",
    conversationId: "",
    messageId,
    customerId: "",
    status: order.status,
    fulfillmentStage: order.fulfillmentStage ?? null,
    businessName: order.businessName,
    lines: order.lines,
    subtotal: order.total,
    total: order.total,
    decidedAt: order.decidedAt ?? null,
    stageUpdatedAt: order.stageUpdatedAt ?? null,
    createdAt,
    updatedAt: createdAt,
  }))
}

export function conversationPreviewStatus(
  item: Conversation,
  cartLines: CartLine[],
): { label: string; tone: "success" | "primary" | "muted" } {
  const lastOrder = parseMessageContent(item.lastText)
  if (item.viewerRole === "customer" && lastOrder.kind === "order") {
    const shortId = orderShortId(lastOrder.order.orderId)
    if (lastOrder.order.status === "accepted") {
      const stage = orderStageLabel(lastOrder.order.fulfillmentStage ?? null)
      return { label: `Pedido #${shortId} · ${stage ?? "En curso"}`, tone: "success" }
    }
    if (lastOrder.order.status === "pending") {
      return { label: `Pedido #${shortId} · Pendiente`, tone: "primary" }
    }
  }
  const hasCart = cartLines.length > 0
  if (item.viewerRole === "customer") {
    if (hasCart) return { label: `Orden #${orderNumberFromConversation(item.id)} en curso`, tone: "success" }
    if (item.status === "waiting") return { label: "En espera de respuesta", tone: "muted" }
    if (item.assigneeName) return { label: `Atendido por ${item.assigneeName}`, tone: "primary" }
    return { label: "Conversación activa", tone: "primary" }
  }
  if (item.status === "waiting") return { label: `${item.businessName} · Por atender`, tone: "muted" }
  if (item.assigneeName && item.viewerRole !== "assignee") {
    return { label: `Lo atiende ${item.assigneeName}`, tone: "primary" }
  }
  return { label: item.businessName, tone: "primary" }
}

export function splitConversations(items: Conversation[], tab: ConversationTab) {
  if (tab === "active") {
    return items.filter((item) => item.unreadCount > 0 || item.status === "waiting" || isRecent(item.lastAt))
  }
  return items.filter((item) => item.unreadCount === 0 && item.status === "open" && !isRecent(item.lastAt))
}

function isRecent(iso: string) {
  return Date.now() - new Date(iso).getTime() < 14 * 86_400_000
}

export function activeConversationCount(items: Conversation[]) {
  return items.filter((item) => item.unreadCount > 0 || item.status === "waiting" || isRecent(item.lastAt)).length
}

export type OrderStep = {
  id: string
  label: string
  detail?: string
  /** ISO de cuándo ocurrió o inició este hito (si se conoce). */
  at?: string | null
  state: "done" | "current" | "pending"
}

function orderFulfillmentStage(order: ChatOrder | ChatOrderPayload) {
  return "fulfillmentStage" in order ? order.fulfillmentStage : (order.fulfillmentStage ?? null)
}

function orderDecidedAt(order: ChatOrder | ChatOrderPayload) {
  return "decidedAt" in order ? order.decidedAt : order.decidedAt
}

function orderCreatedAt(order: ChatOrder | ChatOrderPayload) {
  return "createdAt" in order ? order.createdAt : null
}

function orderStageUpdatedAt(order: ChatOrder | ChatOrderPayload) {
  const value = "stageUpdatedAt" in order ? order.stageUpdatedAt : order.stageUpdatedAt
  return value ?? null
}

export function orderStepsFromOrder(order: ChatOrder | ChatOrderPayload): OrderStep[] {
  const createdAt = orderCreatedAt(order)
  const decidedAt = orderDecidedAt(order) ?? null
  const stageUpdatedAt = orderStageUpdatedAt(order)

  if (order.status === "denied") {
    return [
      { id: "requested", label: "Solicitado", state: "done", at: createdAt },
      { id: "denied", label: "Denegado por el comercio", state: "current", at: decidedAt },
    ]
  }

  if (order.status === "pending") {
    return [
      { id: "requested", label: "Solicitado", state: "done", at: createdAt },
      { id: "waiting", label: "Esperando confirmación", state: "current", at: createdAt },
      { id: "prep", label: "En preparación", state: "pending" },
      { id: "ready", label: "Listo para retiro", state: "pending" },
      { id: "done", label: "Entregado", state: "pending" },
    ]
  }

  const stage = orderFulfillmentStage(order) ?? "preparing"
  const prepState = stage === "preparing" ? "current" : "done"
  const readyState = stage === "ready" ? "current" : stage === "delivered" ? "done" : "pending"
  const deliveredState = stage === "delivered" ? "done" : "pending"

  return [
    { id: "requested", label: "Solicitado", state: "done", at: createdAt },
    { id: "accepted", label: "Aceptado", state: "done", at: decidedAt },
    {
      id: "prep",
      label: "En preparación",
      state: prepState,
      at: prepState === "pending" ? null : (decidedAt ?? createdAt),
    },
    {
      id: "ready",
      label: "Listo para retiro",
      state: readyState,
      at:
        readyState === "pending"
          ? null
          : stage === "ready" || stage === "delivered"
            ? ("pickupCodeIssuedAt" in order && order.pickupCodeIssuedAt) ||
              stageUpdatedAt ||
              decidedAt
            : null,
    },
    {
      id: "done",
      label: "Entregado",
      state: deliveredState,
      at: deliveredState === "done" ? stageUpdatedAt : null,
    },
  ]
}

export function orderStatusLabel(order: ChatOrder | ChatOrderPayload) {
  if (order.status === "pending") return "Esperando confirmación"
  if (order.status === "denied") return "Denegado"
  const stage = orderFulfillmentStage(order)
  return orderStageLabel(stage) ?? "En preparación"
}

/** @deprecated Usar orderStepsFromOrder */
export function orderStepsFromChatOrder(order: ChatOrderPayload) {
  return orderStepsFromOrder(order)
}

export function orderProgress(steps: OrderStep[]) {
  const done = steps.filter((step) => step.state === "done").length
  const current = steps.some((step) => step.state === "current") ? 0.5 : 0
  return Math.round(((done + current) / steps.length) * 100)
}

export function cartBreakdown(lines: CartLine[]) {
  const subtotal = cartTotal(lines)
  const tax = Math.round(subtotal * 0.13)
  return { subtotal, tax, total: subtotal + tax }
}

export function orderBreakdown(lines: ChatOrderLine[]) {
  const subtotal = chatOrderTotal(lines)
  const tax = Math.round(subtotal * 0.13)
  return { subtotal, tax, total: subtotal + tax }
}

export function sinpeSummary(business: Business | null) {
  if (!business?.paymentSinpe || !business.sinpePhone) return null
  const holder = business.sinpeHolder ? ` · ${business.sinpeHolder}` : ""
  return `${business.sinpePhone}${holder}`
}

export function whatsappUrl(number: string | null | undefined) {
  if (!number) return null
  const digits = number.replace(/\D/g, "")
  return digits ? `https://wa.me/${digits}` : null
}

export function wazeUrl(address: string | null | undefined) {
  if (!address?.trim()) return null
  return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`
}
