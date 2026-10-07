const MAX_SPEAK_CHARS = 8000

export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

export function stopSpeaking() {
  if (!isSpeechSupported()) return
  window.speechSynthesis.cancel()
}

export function speakText(
  text: string,
  options?: {
    lang?: string
    rate?: number
    onEnd?: () => void
    onError?: () => void
  },
) {
  if (!isSpeechSupported()) return false
  const trimmed = text.trim()
  if (!trimmed) return false

  stopSpeaking()
  const utterance = new SpeechSynthesisUtterance(trimmed.slice(0, MAX_SPEAK_CHARS))
  utterance.lang = options?.lang ?? "es-CR"
  utterance.rate = options?.rate ?? 1
  if (options?.onEnd) utterance.onend = () => options.onEnd?.()
  if (options?.onError) utterance.onerror = () => options.onError?.()
  window.speechSynthesis.speak(utterance)
  return true
}

export function getSelectedText() {
  if (typeof window === "undefined") return ""
  return window.getSelection()?.toString().trim() ?? ""
}

export function getMainReadableText() {
  if (typeof document === "undefined") return ""
  const main = document.querySelector("main")
  const root = main ?? document.body
  return root.innerText.replace(/\s+/g, " ").trim()
}
