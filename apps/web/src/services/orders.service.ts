import type { ChatOrder, OrderFulfillmentStage, OrderListItem } from "@workspace/shared"

import { getData, postData } from "@/services/http"
import type { SendMessageResult } from "@/services/messages.service"

export async function listOrders(businessId?: string) {
  const query = businessId ? `?businessId=${encodeURIComponent(businessId)}` : ""
  return getData<OrderListItem[]>(`/orders${query}`)
}

export async function listConversationOrders(conversationId: string) {
  return getData<ChatOrder[]>(`/orders/conversations/${conversationId}`)
}

export async function advanceOrderStage(orderId: string, stage: Extract<OrderFulfillmentStage, "ready" | "delivered">) {
  return postData<ChatOrder>(`/orders/${orderId}/stage`, { stage })
}

export type OrderUpdateResult = SendMessageResult & { order: ChatOrder }
