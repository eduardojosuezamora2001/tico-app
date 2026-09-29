import { z } from "zod"

import type { Database, Tables } from "./database.types.js"
import {
  ChatOrderLineSchema,
  chatOrderTotal,
  encodeChatOrderMessage,
  type ChatOrderLine,
  type ChatOrderPayload,
} from "./chat-orders.js"
import type { ISODateString } from "./types.js"

export const ORDER_STATUS = {
  pending: "pending",
  accepted: "accepted",
  denied: "denied",
} as const

export const ORDER_FULFILLMENT_STAGE = {
  preparing: "preparing",
  ready: "ready",
  delivered: "delivered",
} as const

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]
export type OrderFulfillmentStage =
  (typeof ORDER_FULFILLMENT_STAGE)[keyof typeof ORDER_FULFILLMENT_STAGE]

export type ChatOrder = {
  id: string
  businessId: string
  conversationId: string
  messageId: string
  customerId: string
  status: OrderStatus
  fulfillmentStage: OrderFulfillmentStage | null
  businessName: string
  lines: ChatOrderLine[]
  subtotal: number
  total: number
  decidedAt: ISODateString | null
  stageUpdatedAt: ISODateString | null
  createdAt: ISODateString
  updatedAt: ISODateString
}

export type OrderListItem = ChatOrder & {
  businessSlug: string
  customerName: string | null
}

export const OrderStageSchema = z.object({
  stage: z.enum(["ready", "delivered"]),
})

export type OrderStageInput = z.infer<typeof OrderStageSchema>

const orderLineJsonSchema = z.array(ChatOrderLineSchema)

export function parseOrderLines(value: unknown): ChatOrderLine[] {
  return orderLineJsonSchema.parse(value)
}

export function toOrderListItem(
  row: Tables<"orders"> & {
    businesses?: { slug: string } | { slug: string }[] | null
    users?: { full_name: string | null } | { full_name: string | null }[] | null
  },
): OrderListItem {
  const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses
  const customer = Array.isArray(row.users) ? row.users[0] : row.users
  return {
    ...toChatOrder(row),
    businessSlug: business?.slug ?? "",
    customerName: customer?.full_name ?? null,
  }
}

export function toChatOrder(row: Tables<"orders">): ChatOrder {
  return {
    id: row.id,
    businessId: row.business_id,
    conversationId: row.conversation_id,
    messageId: row.message_id,
    customerId: row.customer_id,
    status: row.status as OrderStatus,
    fulfillmentStage: row.fulfillment_stage as OrderFulfillmentStage | null,
    businessName: row.business_name,
    lines: parseOrderLines(row.lines),
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    decidedAt: row.decided_at,
    stageUpdatedAt: row.stage_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toChatOrderPayload(order: ChatOrder): ChatOrderPayload {
  return {
    orderId: order.id,
    businessName: order.businessName,
    lines: order.lines,
    total: order.total,
    status: order.status,
    fulfillmentStage: order.fulfillmentStage,
    decidedAt: order.decidedAt ?? undefined,
    stageUpdatedAt: order.stageUpdatedAt ?? undefined,
  }
}

export function encodeOrderMessage(order: ChatOrder) {
  return encodeChatOrderMessage(toChatOrderPayload(order))
}

export function nextFulfillmentStage(
  current: OrderFulfillmentStage,
): OrderFulfillmentStage | null {
  if (current === ORDER_FULFILLMENT_STAGE.preparing) return ORDER_FULFILLMENT_STAGE.ready
  if (current === ORDER_FULFILLMENT_STAGE.ready) return ORDER_FULFILLMENT_STAGE.delivered
  return null
}

export function orderStageLabel(stage: OrderFulfillmentStage | null) {
  if (stage === ORDER_FULFILLMENT_STAGE.preparing) return "En preparación"
  if (stage === ORDER_FULFILLMENT_STAGE.ready) return "Listo para retiro"
  if (stage === ORDER_FULFILLMENT_STAGE.delivered) return "Entregado"
  return null
}

export function buildOrderInsert(input: {
  id: string
  businessId: string
  conversationId: string
  messageId: string
  customerId: string
  businessName: string
  lines: ChatOrderLine[]
}) {
  const subtotal = chatOrderTotal(input.lines)
  return {
    id: input.id,
    business_id: input.businessId,
    conversation_id: input.conversationId,
    message_id: input.messageId,
    customer_id: input.customerId,
    business_name: input.businessName,
    lines: input.lines,
    subtotal,
    total: subtotal,
    status: ORDER_STATUS.pending,
    fulfillment_stage: null,
  } satisfies Database["public"]["Tables"]["orders"]["Insert"]
}
