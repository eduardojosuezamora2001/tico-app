import { create } from "zustand"

import { supabase } from "@/lib/supabase"
import {
  countMySupportUnread,
  getMySupportThread,
  markMySupportRepliesRead,
} from "@/services/support.service"

type SupportInboxState = {
  unread: number
  threadId: string | null
  viewing: boolean
  ready: boolean
  boot: (userId: string) => Promise<void>
  setViewing: (viewing: boolean) => void
  markRead: () => Promise<void>
  dispose: () => void
}

let channel: ReturnType<typeof supabase.channel> | null = null
let bootedFor: string | null = null

export const useSupportInboxStore = create<SupportInboxState>((set, get) => ({
  unread: 0,
  threadId: null,
  viewing: false,
  ready: false,

  async boot(userId) {
    if (bootedFor === userId && channel) {
      const total = await countMySupportUnread().catch(() => 0)
      set({ unread: total, ready: true })
      return
    }
    get().dispose()
    bootedFor = userId

    const thread = await getMySupportThread().catch(() => null)
    const total = await countMySupportUnread().catch(() => 0)
    set({ threadId: thread?.id ?? null, unread: total, ready: true })

    channel = supabase
      .channel(`my-support-inbox:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload) => {
          const row = payload.new as {
            id?: string
            thread_id?: string
            sender_id?: string
            body?: string
          }
          if (!row?.id || !row.thread_id || !row.sender_id) return
          if (row.sender_id === userId) return

          const { threadId, viewing } = get()
          if (threadId && row.thread_id !== threadId) return
          if (!threadId) set({ threadId: row.thread_id })

          if (viewing) {
            void get().markRead()
            return
          }

          set((state) => ({ unread: state.unread + 1 }))
          window.dispatchEvent(
            new CustomEvent("tico:support-message", {
              detail: {
                threadId: row.thread_id,
                body: row.body ?? "Nuevo mensaje de soporte",
              },
            }),
          )
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_messages" },
        () => {
          void countMySupportUnread()
            .then((next) => set({ unread: next }))
            .catch(() => undefined)
        },
      )
      .subscribe()
  },

  setViewing(viewing) {
    set({ viewing })
    if (viewing) void get().markRead()
  },

  async markRead() {
    const { threadId } = get()
    if (!threadId) {
      set({ unread: 0 })
      return
    }
    try {
      await markMySupportRepliesRead(threadId)
      set({ unread: 0 })
    } catch {
      // keep badge if mark fails
    }
  },

  dispose() {
    if (channel) {
      void supabase.removeChannel(channel)
      channel = null
    }
    bootedFor = null
    set({ unread: 0, threadId: null, viewing: false, ready: false })
  },
}))
