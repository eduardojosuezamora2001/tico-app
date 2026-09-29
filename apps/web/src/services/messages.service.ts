import type { Conversation, Message, SendMessageInput } from "@workspace/shared"

import { getData, postData } from "@/services/http"

export type ConversationThread = {
  conversation: Conversation
  messages: Message[]
}

export type SendMessageResult = {
  message: Message
  conversation: Conversation
}

export async function listConversations() {
  return getData<Conversation[]>("/messages/conversations")
}

export async function getConversation(conversationId: string) {
  return getData<ConversationThread>(`/messages/conversations/${conversationId}`)
}

export async function markConversationRead(conversationId: string) {
  await getData<ConversationThread>(`/messages/conversations/${conversationId}`)
}

export async function findConversationByBusiness(businessId: string) {
  return getData<{ id: string } | null>(`/messages/business/${businessId}`)
}

export async function sendMessage(input: SendMessageInput) {
  return postData<SendMessageResult>("/messages", input)
}

export async function replyToConversation(conversationId: string, text: string) {
  return postData<SendMessageResult>(`/messages/conversations/${conversationId}/reply`, { text })
}

export async function claimConversation(conversationId: string) {
  return postData<Conversation>(`/messages/conversations/${conversationId}/claim`)
}

export async function takeConversation(conversationId: string) {
  return postData<Conversation>(`/messages/conversations/${conversationId}/take`)
}
