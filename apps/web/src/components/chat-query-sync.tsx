import { useEffect } from "react"
import { parseMessageContent, type Conversation } from "@workspace/shared"

import { prefetchConversations } from "@/hooks/use-conversations-query"
import type { IncomingMessage, IncomingOrder } from "@/lib/chat-events"
import { getViewingConversation } from "@/lib/chat-view"
import {
  applyConversationUpdatedToCache,
  applyIncomingMessageToCache,
  applyIncomingMessageUpdatedToCache,
  applyIncomingOrderToCache,
  clearMessageCaches,
  updateThreadCache,
} from "@/lib/message-cache"
import { queryClient } from "@/lib/query-client"
import { chatSocket } from "@/lib/socket"
import { markConversationRead } from "@/services/messages.service"
import { listConversationOrders } from "@/services/orders.service"
import { useAuthStore } from "@/stores/auth-store"

/**
 * Prefetch del inbox al autenticar + sync socket → cache de TanStack Query.
 * Una sola suscripción para mensajes/float-chat/cuenta.
 */
export function ChatQuerySync() {
  const status = useAuthStore((s) => s.status)
  const userId = useAuthStore((s) => s.session?.user.id)

  useEffect(() => {
    if (status !== "authenticated" || !userId) {
      clearMessageCaches(queryClient)
      return
    }
    void prefetchConversations()
  }, [status, userId])

  useEffect(() => {
    if (status !== "authenticated" || !userId) return
    let live = true
    let detach = () => {}

    void chatSocket().then((socket) => {
      if (!socket || !live) return

      const onMessage = (event: IncomingMessage) => {
        const viewingId = getViewingConversation()
        const viewing =
          viewingId === event.conversation.id && event.conversation.viewerRole !== "member"

        applyIncomingMessageToCache(queryClient, event, userId)

        if (viewing && parseMessageContent(event.message.text).kind === "order") {
          void listConversationOrders(event.conversation.id)
            .then((orders) => {
              updateThreadCache(queryClient, event.conversation.id, (thread) => ({
                ...thread,
                orders,
              }))
            })
            .catch(() => undefined)
        }

        const counts =
          event.conversation.viewerRole === "customer" ||
          event.conversation.viewerRole === "assignee"
        if (viewing && counts && event.message.senderId !== userId) {
          void markConversationRead(event.conversation.id)
        }
      }

      const onMessageUpdated = (event: IncomingMessage) => {
        applyIncomingMessageUpdatedToCache(queryClient, event)
      }

      const onOrderUpdated = (event: IncomingOrder) => {
        applyIncomingOrderToCache(queryClient, event)
      }

      const onConversation = (conversation: Conversation) => {
        applyConversationUpdatedToCache(queryClient, conversation)
      }

      socket.on("message:new", onMessage)
      socket.on("message:updated", onMessageUpdated)
      socket.on("order:updated", onOrderUpdated)
      socket.on("conversation:updated", onConversation)
      detach = () => {
        socket.off("message:new", onMessage)
        socket.off("message:updated", onMessageUpdated)
        socket.off("order:updated", onOrderUpdated)
        socket.off("conversation:updated", onConversation)
      }
    })

    return () => {
      live = false
      detach()
    }
  }, [status, userId])

  return null
}
