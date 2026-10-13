import { useQuery } from "@tanstack/react-query"

import { businessKeys, messageKeys } from "@/lib/message-query-keys"
import { queryClient } from "@/lib/query-client"
import { getBusiness } from "@/services/businesses.service"
import { getConversation, listConversations } from "@/services/messages.service"

export function useConversationsQuery(enabled = true) {
  return useQuery({
    queryKey: messageKeys.conversations(),
    queryFn: listConversations,
    enabled,
  })
}

export function prefetchConversations() {
  return queryClient.prefetchQuery({
    queryKey: messageKeys.conversations(),
    queryFn: listConversations,
  })
}

export function useConversationThreadQuery(conversationId: string, enabled = true) {
  return useQuery({
    queryKey: messageKeys.conversation(conversationId),
    queryFn: () => getConversation(conversationId),
    enabled: Boolean(conversationId) && enabled,
  })
}

export function prefetchConversationThread(conversationId: string) {
  if (!conversationId) return Promise.resolve()
  return queryClient.prefetchQuery({
    queryKey: messageKeys.conversation(conversationId),
    queryFn: () => getConversation(conversationId),
  })
}

export function useBusinessDetailQuery(businessId: string, enabled = true) {
  return useQuery({
    queryKey: businessKeys.detail(businessId),
    queryFn: () => getBusiness(businessId),
    enabled: Boolean(businessId) && enabled,
  })
}
