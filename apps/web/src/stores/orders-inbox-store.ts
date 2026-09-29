import { parseMessageContent, type OrderListItem } from "@workspace/shared"
import { create } from "zustand"

import type { IncomingMessage, IncomingOrder } from "@/lib/chat-events"
import {
  countCustomerUpdates,
  countStaffOpenOrders,
  markCustomerOrdersSeen,
  readOrdersInbox,
  writeOrdersInbox,
} from "@/lib/orders-inbox"
import { chatSocket } from "@/lib/socket"
import { getMe } from "@/services/me.service"
import { listOrders } from "@/services/orders.service"
import type { Membership } from "@/services/types"

export type OrdersInboxTab = "mine" | "staff"

type OrdersInboxState = {
  orders: OrderListItem[]
  memberships: Membership[]
  customerSeen: Record<string, string>
  loading: boolean
  activeTab: OrdersInboxTab | null
  setActiveTab: (tab: OrdersInboxTab | null) => void
  refresh: () => Promise<void>
  patchOrder: (order: OrderListItem) => void
  markMineSeen: (userId: string, orders: OrderListItem[]) => void
  bootstrap: (userId: string) => () => void
  navBadgeCount: (userId: string | undefined) => number
  mineUpdateCount: (userId: string | undefined) => number
  staffOpenCount: () => number
}

function staffBusinessIds(memberships: Membership[]) {
  return new Set(
    memberships.filter((item) => item.isActive && item.business?.id).map((item) => item.business!.id),
  )
}

function mergeOrder(current: OrderListItem[], event: IncomingOrder) {
  const next: OrderListItem = {
    ...event.order,
    businessSlug: current.find((item) => item.id === event.order.id)?.businessSlug ?? "",
    customerName: current.find((item) => item.id === event.order.id)?.customerName ?? null,
  }
  const index = current.findIndex((item) => item.id === next.id)
  if (index === -1) return [next, ...current]
  return current.map((item) => (item.id === next.id ? { ...item, ...next } : item))
}

export const useOrdersInboxStore = create<OrdersInboxState>((set, get) => ({
  orders: [],
  memberships: [],
  customerSeen: {},
  loading: false,
  activeTab: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  refresh: async () => {
    set({ loading: true })
    try {
      const rows = await listOrders()
      set({ orders: rows })
    } finally {
      set({ loading: false })
    }
  },

  patchOrder: (order) => {
    set((state) => ({
      orders: state.orders.map((item) => (item.id === order.id ? order : item)),
    }))
  },

  markMineSeen: (userId, orders) => {
    set((state) => {
      const next = markCustomerOrdersSeen(orders, state.customerSeen)
      writeOrdersInbox(userId, { customerSeen: next })
      return { customerSeen: next }
    })
  },

  mineUpdateCount: (userId) => {
    const state = get()
    if (!userId || state.activeTab === "mine") return 0
    const myOrders = state.orders.filter((item) => item.customerId === userId)
    return countCustomerUpdates(myOrders, state.customerSeen)
  },

  staffOpenCount: () => {
    const state = get()
    const ids = staffBusinessIds(state.memberships)
    if (ids.size === 0) return 0
    return countStaffOpenOrders(state.orders, ids)
  },

  navBadgeCount: (userId) => {
    const state = get()
    const mine = state.mineUpdateCount(userId)
    const staff = state.staffOpenCount()
    return mine + staff
  },

  bootstrap: (userId) => {
    set({ customerSeen: readOrdersInbox(userId).customerSeen, loading: true })
    let live = true
    let detachSocket = () => {}

    void getMe()
      .then((payload) => {
        if (live) set({ memberships: payload.memberships })
      })
      .catch(() => {
        if (live) set({ memberships: [] })
      })

    void listOrders()
      .then((rows) => {
        if (!live) return
        set({ orders: rows, loading: false })
        const myOrders = rows.filter((item) => item.customerId === userId)
        if (myOrders.length === 0) return
        set((state) => {
          if (Object.keys(state.customerSeen).length > 0) return state
          const seeded = markCustomerOrdersSeen(myOrders, state.customerSeen)
          writeOrdersInbox(userId, { customerSeen: seeded })
          return { customerSeen: seeded }
        })
      })
      .catch(() => {
        if (live) set({ loading: false })
      })

    void chatSocket().then((socket) => {
      if (!socket || !live) return
      const onOrderUpdated = (event: IncomingOrder) => {
        set((state) => ({ orders: mergeOrder(state.orders, event) }))
      }
      const onMessage = (event: IncomingMessage) => {
        if (parseMessageContent(event.message.text).kind !== "order") return
        void get().refresh()
      }
      socket.on("order:updated", onOrderUpdated)
      socket.on("message:new", onMessage)
      detachSocket = () => {
        socket.off("order:updated", onOrderUpdated)
        socket.off("message:new", onMessage)
      }
    })

    return () => {
      live = false
      detachSocket()
      set({ orders: [], memberships: [], activeTab: null, loading: false })
    }
  },
}))
