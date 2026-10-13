import type { ChatOrder, Conversation, Message } from "@workspace/shared"
import type { QueryClient } from "@tanstack/react-query"

import {
  foldConversation,
  foldMessage,
  type IncomingMessage,
  type IncomingOrder,
} from "@/lib/chat-events"
import { getViewingConversation } from "@/lib/chat-view"
import { messageKeys } from "@/lib/message-query-keys"
import type { ConversationThread } from "@/services/messages.service"

export function setConversationsCache(queryClient: QueryClient, items: Conversation[]) {
  queryClient.setQueryData<Conversation[]>(messageKeys.conversations(), items)
}

export function updateConversationsCache(
  queryClient: QueryClient,
  updater: (items: Conversation[]) => Conversation[],
) {
  queryClient.setQueryData<Conversation[]>(messageKeys.conversations(), (current) =>
    updater(current ?? []),
  )
}

export function updateThreadCache(
  queryClient: QueryClient,
  conversationId: string,
  updater: (thread: ConversationThread) => ConversationThread,
) {
  queryClient.setQueryData<ConversationThread>(messageKeys.conversation(conversationId), (current) => {
    if (!current) return current
    return updater(current)
  })
}

export function upsertConversationInCaches(queryClient: QueryClient, conversation: Conversation) {
  updateConversationsCache(queryClient, (items) => foldConversation(items, conversation))
  updateThreadCache(queryClient, conversation.id, (thread) => ({
    ...thread,
    conversation: {
      ...conversation,
      unreadCount: thread.conversation.unreadCount,
    },
  }))
}

export function applyIncomingMessageToCache(
  queryClient: QueryClient,
  event: IncomingMessage,
  userId: string,
) {
  const viewingId = getViewingConversation()
  const viewing = viewingId === event.conversation.id && event.conversation.viewerRole !== "member"

  updateConversationsCache(queryClient, (items) =>
    foldMessage(items, event, userId, viewing ? event.conversation.id : null),
  )

  if (!viewing) return

  updateThreadCache(queryClient, event.conversation.id, (thread) => ({
    conversation: { ...event.conversation, unreadCount: 0 },
    messages: thread.messages.some((item) => item.id === event.message.id)
      ? thread.messages
      : [...thread.messages, event.message],
    orders: thread.orders,
  }))
}

export function applyIncomingMessageUpdatedToCache(queryClient: QueryClient, event: IncomingMessage) {
  upsertConversationInCaches(queryClient, event.conversation)
  updateThreadCache(queryClient, event.conversation.id, (thread) => ({
    ...thread,
    conversation: {
      ...event.conversation,
      unreadCount: thread.conversation.unreadCount,
    },
    messages: thread.messages.map((item) =>
      item.id === event.message.id ? event.message : item,
    ),
  }))
}

export function applyIncomingOrderToCache(queryClient: QueryClient, event: IncomingOrder) {
  upsertConversationInCaches(queryClient, event.conversation)
  updateThreadCache(queryClient, event.conversation.id, (thread) => {
    const index = thread.orders.findIndex((item) => item.id === event.order.id)
    const mergeOrder = (prev: ChatOrder | undefined, next: ChatOrder): ChatOrder => ({
      ...prev,
      ...next,
      pickupCode: next.pickupCode ?? prev?.pickupCode ?? null,
    })
    const orders =
      index === -1
        ? [...thread.orders, event.order]
        : thread.orders.map((item) =>
            item.id === event.order.id ? mergeOrder(item, event.order) : item,
          )
    const messages = event.message
      ? thread.messages.map((item) => (item.id === event.message!.id ? event.message! : item))
      : thread.messages
    return {
      ...thread,
      conversation: {
        ...event.conversation,
        unreadCount: thread.conversation.unreadCount,
      },
      orders,
      messages,
    }
  })
}

export function applyConversationUpdatedToCache(queryClient: QueryClient, conversation: Conversation) {
  upsertConversationInCaches(queryClient, conversation)
  if (conversation.viewerRole === "member") {
    queryClient.setQueryData<ConversationThread>(messageKeys.conversation(conversation.id), (current) =>
      current
        ? { ...current, conversation, messages: [], orders: [] }
        : current,
    )
  }
}

export function appendThreadMessage(
  queryClient: QueryClient,
  conversationId: string,
  message: Message,
  conversation: Conversation,
) {
  updateConversationsCache(queryClient, (items) => foldConversation(items, conversation))
  updateThreadCache(queryClient, conversationId, (thread) => ({
    conversation: { ...conversation, unreadCount: 0 },
    messages: thread.messages.some((item) => item.id === message.id)
      ? thread.messages
      : [...thread.messages, message],
    orders: thread.orders,
  }))
}

export function patchThreadMessageText(
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
  text: string,
) {
  updateThreadCache(queryClient, conversationId, (thread) => ({
    ...thread,
    messages: thread.messages.map((item) => (item.id === messageId ? { ...item, text } : item)),
  }))
}

export function patchThreadOrder(
  queryClient: QueryClient,
  conversationId: string,
  order: ChatOrder,
) {
  updateThreadCache(queryClient, conversationId, (thread) => {
    const index = thread.orders.findIndex((item) => item.id === order.id)
    const orders =
      index === -1
        ? [...thread.orders, order]
        : thread.orders.map((item) => (item.id === order.id ? order : item))
    return { ...thread, orders }
  })
}

export function clearMessageCaches(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: messageKeys.all })
}
