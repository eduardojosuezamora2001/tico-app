import { toast } from "sonner"
import { create } from "zustand"

import {
  applyAccessibilityPreferences,
  defaultAccessibilityPreferences,
  loadAccessibilityPreferences,
  nextFontScale,
  saveAccessibilityPreferences,
  type FontScale,
} from "@/lib/accessibility-settings"
import {
  getMainReadableText,
  getSelectedText,
  isSpeechSupported,
  speakText,
  stopSpeaking as cancelSpeech,
} from "@/lib/speech-synthesis"

type AccessibilityState = {
  fontScale: FontScale
  voiceEnabled: boolean
  speaking: boolean
  hydrated: boolean
  hydrate: () => void
  setFontScale: (scale: FontScale) => void
  increaseFontScale: () => void
  decreaseFontScale: () => void
  resetFontScale: () => void
  setVoiceEnabled: (enabled: boolean) => void
  speakSelection: () => void
  speakMainContent: () => void
  stopSpeaking: () => void
}

function persist(state: Pick<AccessibilityState, "fontScale" | "voiceEnabled">) {
  saveAccessibilityPreferences({
    fontScale: state.fontScale,
    voiceEnabled: state.voiceEnabled,
  })
  applyAccessibilityPreferences({
    fontScale: state.fontScale,
    voiceEnabled: state.voiceEnabled,
  })
}

export const useAccessibilityStore = create<AccessibilityState>((set, get) => ({
  ...defaultAccessibilityPreferences,
  speaking: false,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return
    const prefs = loadAccessibilityPreferences()
    applyAccessibilityPreferences(prefs)
    set({ ...prefs, hydrated: true })
  },

  setFontScale: (fontScale) => {
    set({ fontScale })
    persist({ fontScale, voiceEnabled: get().voiceEnabled })
  },

  increaseFontScale: () => {
    const fontScale = nextFontScale(get().fontScale, "up")
    get().setFontScale(fontScale)
  },

  decreaseFontScale: () => {
    const fontScale = nextFontScale(get().fontScale, "down")
    get().setFontScale(fontScale)
  },

  resetFontScale: () => {
    get().setFontScale("normal")
  },

  setVoiceEnabled: (voiceEnabled) => {
    if (!voiceEnabled) cancelSpeech()
    set({ voiceEnabled, speaking: false })
    persist({ fontScale: get().fontScale, voiceEnabled })
  },

  speakSelection: () => {
    if (!isSpeechSupported()) {
      toast.error("Tu navegador no admite lectura en voz alta.")
      return
    }
    const text = getSelectedText()
    if (!text) {
      toast.message("Seleccioná un texto en la página para leerlo.")
      return
    }
    set({ speaking: true })
    speakText(text, {
      onEnd: () => set({ speaking: false }),
      onError: () => set({ speaking: false }),
    })
  },

  speakMainContent: () => {
    if (!isSpeechSupported()) {
      toast.error("Tu navegador no admite lectura en voz alta.")
      return
    }
    const text = getMainReadableText()
    if (!text) {
      toast.message("No hay contenido para leer en esta pantalla.")
      return
    }
    set({ speaking: true })
    speakText(text, {
      onEnd: () => set({ speaking: false }),
      onError: () => set({ speaking: false }),
    })
  },

  stopSpeaking: () => {
    cancelSpeech()
    set({ speaking: false })
  },
}))
