/** Conversación visible (página /mensajes o float-chat) para no sumar unread. */
let viewingConversationId: string | null = null

export function setViewingConversation(id: string | null) {
  viewingConversationId = id
}

export function getViewingConversation() {
  return viewingConversationId
}
