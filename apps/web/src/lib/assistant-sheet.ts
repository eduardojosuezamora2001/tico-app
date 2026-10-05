export type AssistantSheetTab = "assistant" | "support"

type OpenHandler = (tab: AssistantSheetTab) => void

let openHandler: OpenHandler | null = null

export function registerAssistantSheetOpen(handler: OpenHandler | null) {
  openHandler = handler
}

export function openAssistantSheet(tab: AssistantSheetTab = "assistant") {
  openHandler?.(tab)
}
