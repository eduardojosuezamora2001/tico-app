import axios from "axios"
import type { Conversation, Message } from "@workspace/shared"

export type IncomingMessage = {
  message: Message
  conversation: Conversation
}

export function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as { error?: { message?: string } } | undefined
    if (body?.error?.message) return body.error.message
  }
  return fallback
}

export function foldMessage(
  items: Conversation[],
  incoming: IncomingMessage,
  userId: string,
  viewingId: string | null,
) {
  const conversation = incoming.conversation
  const mine = incoming.message.senderId === userId
  const viewing = viewingId === conversation.id
  const counts = conversation.viewerRole === "customer" || conversation.viewerRole === "assignee"
  const previous = items.find((item) => item.id === conversation.id)
  const unreadCount =
    viewing || mine || !counts ? (viewing ? 0 : (previous?.unreadCount ?? 0)) : (previous?.unreadCount ?? 0) + 1
  const nextItem = { ...conversation, unreadCount }
  return [nextItem, ...items.filter((item) => item.id !== conversation.id)]
}

export function foldConversation(items: Conversation[], incoming: Conversation) {
  const previous = items.find((item) => item.id === incoming.id)
  const nextItem = { ...incoming, unreadCount: previous?.unreadCount ?? incoming.unreadCount }
  return [nextItem, ...items.filter((item) => item.id !== incoming.id)]
}

export function conversationTitle(item: Conversation) {
  if (item.viewerRole === "customer") return item.businessName
  return item.customerName ?? "Cliente"
}

export function statusLine(item: Conversation) {
  if (item.viewerRole === "customer") {
    return item.assigneeName ? `Te atiende ${item.assigneeName}` : "En espera"
  }
  if (item.status === "waiting") return `${item.businessName} · En espera`
  if (item.assigneeName && item.viewerRole !== "assignee") {
    return `${item.businessName} · Lo atiende ${item.assigneeName}`
  }
  return item.businessName
}

export function canOpen(item: Conversation) {
  return item.viewerRole !== "member"
}

export function canClaim(item: Conversation) {
  return item.status === "waiting" && item.viewerRole !== "customer"
}

export function canTake(item: Conversation) {
  return item.status === "open" && (item.viewerRole === "member" || item.viewerRole === "owner")
}

export function canCompose(item: Conversation) {
  return item.viewerRole === "customer" || item.viewerRole === "assignee"
}

export function senderName(item: Conversation, senderId: string) {
  if (senderId === item.customerId) return item.customerName
  if (senderId === item.assigneeId) return item.assigneeName
  return item.businessName
}
