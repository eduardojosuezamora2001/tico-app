export const messageKeys = {
  all: ["messages"] as const,
  conversations: () => [...messageKeys.all, "conversations"] as const,
  conversation: (id: string) => [...messageKeys.all, "conversation", id] as const,
}

export const businessKeys = {
  all: ["businesses"] as const,
  detail: (id: string) => [...businessKeys.all, "detail", id] as const,
}
