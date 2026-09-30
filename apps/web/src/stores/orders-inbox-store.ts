import { parseMessageContent, type OrderListItem } from "@workspace/shared"
import { create } from "zustand"

import type { IncomingMessage, IncomingOrder } from "@/lib/chat-events"
import {
  countCustomerUpdates,
  countStaffOpenOrders,
  countStaffUpdates,
  markCustomerOrdersSeen,
  markSingleOrderSeen,
  markStaffOrdersSeen,
  isOrderOpen,
  orderInboxNotice,
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
  staffSeen: Record<string, string>
  loading: boolean
  activeTab: OrdersInboxTab | null
  setActiveTab: (tab: OrdersInboxTab | null) => void
  refresh: () => Promise<void>
  patchOrder: (order: OrderListItem) => void
  markMineSeen: (userId: string, orders: OrderListItem[]) => void
  markStaffSeen: (userId: string, orders: OrderListItem[]) => void
  markOrderSeen: (userId: string, order: OrderListItem, mode: "customer" | "staff") => void
  customerOrderNotice: (order: OrderListItem) => ReturnType<typeof orderInboxNotice>
  staffOrderNotice: (order: OrderListItem) => ReturnType<typeof orderInboxNotice>
  bootstrap: (userId: string) => () => void
  navBadgeCount: (userId: string | undefined) => number
  mineUpdateCount: (userId: string | undefined) => number
  staffOpenCount: () => number
  staffUpdateCount: () => number
}

function staffBusinessIds(memberships: Membership[]) {
  return new Set(
    memberships.filter((item) => item.isActive && item.business?.id).map((item) => item.business!.id),
  )
}

function mergeOrder(current: OrderListItem[], event: IncomingOrder) {
  const prev = current.find((item) => item.id === event.order.id)
  const next: OrderListItem = {
    ...event.order,
    businessSlug: prev?.businessSlug ?? event.conversation.businessSlug ?? "",
    customerName: prev?.customerName ?? event.conversation.customerName ?? null,
  }
  const index = current.findIndex((item) => item.id === next.id)
  if (index === -1) return [next, ...current]
  return current.map((item) => (item.id === next.id ? { ...item, ...next } : item))
}

function scheduleOrdersRefresh(get: () => OrdersInboxState, delayMs = 350) {
  if (scheduleOrdersRefresh.timer !== undefined) {
    window.clearTimeout(scheduleOrdersRefresh.timer)
  }
  scheduleOrdersRefresh.timer = window.setTimeout(() => {
    scheduleOrdersRefresh.timer = undefined
    void get().refresh()
  }, delayMs)
}
scheduleOrdersRefresh.timer = undefined as number | undefined

export const useOrdersInboxStore = create<OrdersInboxState>((set, get) => ({
  orders: [],
  memberships: [],
  customerSeen: {},
  staffSeen: {},
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
      const customerSeen = markCustomerOrdersSeen(orders, state.customerSeen)
      writeOrdersInbox(userId, { customerSeen, staffSeen: state.staffSeen })
      return { customerSeen }
    })
  },

  markStaffSeen: (userId, orders) => {
    set((state) => {
      const staffSeen = markStaffOrdersSeen(orders, state.staffSeen)
      writeOrdersInbox(userId, { customerSeen: state.customerSeen, staffSeen })
      return { staffSeen }
    })
  },

  markOrderSeen: (userId, order, mode) => {
    set((state) => {
      if (mode === "customer") {
        const customerSeen = markSingleOrderSeen(order, state.customerSeen)
        writeOrdersInbox(userId, { customerSeen, staffSeen: state.staffSeen })
        return { customerSeen }
      }
      const staffSeen = markSingleOrderSeen(order, state.staffSeen)
      writeOrdersInbox(userId, { customerSeen: state.customerSeen, staffSeen })
      return { staffSeen }
    })
  },

  customerOrderNotice: (order) => orderInboxNotice(order, get().customerSeen),

  staffOrderNotice: (order) => orderInboxNotice(order, get().staffSeen),

  mineUpdateCount: (userId) => {
    const state = get()
    if (!userId) return 0
    const myOrders = state.orders.filter((item) => item.customerId === userId)
    return countCustomerUpdates(myOrders, state.customerSeen)
  },

  staffOpenCount: () => {
    const state = get()
    const ids = staffBusinessIds(state.memberships)
    if (ids.size === 0) return 0
    return countStaffOpenOrders(state.orders, ids)
  },

  staffUpdateCount: () => {
    const state = get()
    const ids = staffBusinessIds(state.memberships)
    if (ids.size === 0) return 0
    return countStaffUpdates(state.orders, ids, state.staffSeen)
  },

  navBadgeCount: (userId) => {
    const state = get()
    const mine = state.mineUpdateCount(userId)
    const staff = state.staffUpdateCount()
    return mine + staff
  },

  bootstrap: (userId) => {
    const inbox = readOrdersInbox(userId)
    set({ customerSeen: inbox.customerSeen, staffSeen: inbox.staffSeen, loading: true })
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
          const customerSeen = markCustomerOrdersSeen(
            myOrders.filter((order) => !isOrderOpen(order)),
            state.customerSeen,
          )
          writeOrdersInbox(userId, { customerSeen, staffSeen: state.staffSeen })
          return { customerSeen }
        })
      })
      .catch(() => {
        if (live) set({ loading: false })
      })

    void chatSocket().then((socket) => {
      if (!socket || !live) return

      const onOrderUpdated = (event: IncomingOrder) => {
        set((state) => ({ orders: mergeOrder(state.orders, event) }))
        scheduleOrdersRefresh(get)
      }
      const onOrderMessage = (event: IncomingMessage) => {
        if (parseMessageContent(event.message.text).kind !== "order") return
        scheduleOrdersRefresh(get)
      }
      const onConnect = () => {
        scheduleOrdersRefresh(get, 0)
      }

      socket.on("order:updated", onOrderUpdated)
      socket.on("message:new", onOrderMessage)
      socket.on("message:updated", onOrderMessage)
      socket.on("connect", onConnect)
      if (socket.connected) scheduleOrdersRefresh(get, 800)

      detachSocket = () => {
        socket.off("order:updated", onOrderUpdated)
        socket.off("message:new", onOrderMessage)
        socket.off("message:updated", onOrderMessage)
        socket.off("connect", onConnect)
      }
    })

    return () => {
      live = false
      detachSocket()
      set({ orders: [], memberships: [], activeTab: null, loading: false })
    }
  },
}))
