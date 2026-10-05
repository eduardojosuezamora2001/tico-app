const THREAD_KEY = "ticoapp:assistant_thread_id"

export function readAssistantThreadId(): string | undefined {
  try {
    const value = localStorage.getItem(THREAD_KEY)?.trim()
    return value || undefined
  } catch {
    return undefined
  }
}

export function writeAssistantThreadId(threadId: string) {
  try {
    localStorage.setItem(THREAD_KEY, threadId)
  } catch {
    // ignore quota / private mode
  }
}
