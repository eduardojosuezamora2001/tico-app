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
  staffSeen: Record<string, string>
}

function storageKey(userId: string) {
  return `tico:orders-inbox:${userId}`
}

export function readOrdersInbox(userId: string): InboxStore {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { customerSeen: {}, staffSeen: {} }
    const parsed = JSON.parse(raw) as InboxStore
    return {
      customerSeen: parsed.customerSeen ?? {},
      staffSeen: parsed.staffSeen ?? {},
    }
  } catch {
    return { customerSeen: {}, staffSeen: {} }
  }
}

export function writeOrdersInbox(userId: string, store: InboxStore) {
  localStorage.setItem(storageKey(userId), JSON.stringify(store))
}

export function countCustomerUpdates(orders: OrderListItem[], seen: Record<string, string>) {
  return orders.filter((order) => orderInboxNotice(order, seen) !== null).length
}

export function countStaffUpdates(
  orders: OrderListItem[],
  businessIds: ReadonlySet<string>,
  seen: Record<string, string>,
) {
  return orders.filter(
    (order) => businessIds.has(order.businessId) && orderInboxNotice(order, seen) !== null,
  ).length
}

/** `new` = nunca visto; `updated` = cambió estado o etapa desde la última vez. */
export function orderInboxNotice(
  order: Pick<ChatOrder, "id" | "status" | "fulfillmentStage" | "updatedAt">,
  seen: Record<string, string>,
): "new" | "updated" | null {
  const fp = orderFingerprint(order)
  const prev = seen[order.id]
  if (prev === undefined) return "new"
  if (prev !== fp) return "updated"
  return null
}

export function markCustomerOrdersSeen(orders: OrderListItem[], seen: Record<string, string>) {
  const next = { ...seen }
  for (const order of orders) {
    next[order.id] = orderFingerprint(order)
  }
  return next
}

export function markStaffOrdersSeen(orders: OrderListItem[], seen: Record<string, string>) {
  return markCustomerOrdersSeen(orders, seen)
}

export function markSingleOrderSeen(
  order: Pick<ChatOrder, "id" | "status" | "fulfillmentStage" | "updatedAt">,
  seen: Record<string, string>,
) {
  return { ...seen, [order.id]: orderFingerprint(order) }
}

export function sortOrdersInbox<T extends Pick<ChatOrder, "id" | "status" | "fulfillmentStage" | "updatedAt" | "createdAt">>(
  orders: T[],
  seen: Record<string, string>,
) {
  return [...orders].sort((a, b) => {
    const aUnread = orderInboxNotice(a, seen) ? 1 : 0
    const bUnread = orderInboxNotice(b, seen) ? 1 : 0
    if (bUnread !== aUnread) return bUnread - aUnread
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function countStaffOpenOrders(orders: OrderListItem[], businessIds: ReadonlySet<string>) {
  return orders.filter((order) => businessIds.has(order.businessId) && isOrderOpen(order)).length
}
