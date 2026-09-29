import type { ChatOrder, OrderListItem } from "@workspace/shared"

export function orderFingerprint(order: Pick<ChatOrder, "status" | "fulfillmentStage" | "updatedAt">) {
  return `${order.status}:${order.fulfillmentStage ?? ""}:${order.updatedAt}`
}

export function isOrderOpen(order: Pick<ChatOrder, "status" | "fulfillmentStage">) {
  if (order.status === "pending") return true
  if (order.status === "accepted" && order.fulfillmentStage !== "delivered") return true
  return false
}

type InboxStore = {
  customerSeen: Record<string, string>
}

function storageKey(userId: string) {
  return `tico:orders-inbox:${userId}`
}

export function readOrdersInbox(userId: string): InboxStore {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { customerSeen: {} }
    const parsed = JSON.parse(raw) as InboxStore
    return { customerSeen: parsed.customerSeen ?? {} }
  } catch {
    return { customerSeen: {} }
  }
}

export function writeOrdersInbox(userId: string, store: InboxStore) {
  localStorage.setItem(storageKey(userId), JSON.stringify(store))
}

export function countCustomerUpdates(orders: OrderListItem[], seen: Record<string, string>) {
  return orders.filter((order) => seen[order.id] !== orderFingerprint(order)).length
}

export function markCustomerOrdersSeen(orders: OrderListItem[], seen: Record<string, string>) {
  const next = { ...seen }
  for (const order of orders) {
    next[order.id] = orderFingerprint(order)
  }
  return next
}

export function countStaffOpenOrders(orders: OrderListItem[], businessIds: ReadonlySet<string>) {
  return orders.filter((order) => businessIds.has(order.businessId) && isOrderOpen(order)).length
}
