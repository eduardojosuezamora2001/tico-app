export const ACCESSIBILITY_STORAGE_KEY = "tico-accessibility"

export type FontScale = "normal" | "large" | "xlarge"

export const FONT_SCALE_STEPS: FontScale[] = ["normal", "large", "xlarge"]

export const FONT_SCALE_LABEL: Record<FontScale, string> = {
  normal: "Normal",
  large: "Grande",
  xlarge: "Muy grande",
}

export type AccessibilityPreferences = {
  fontScale: FontScale
  voiceEnabled: boolean
}

export const defaultAccessibilityPreferences: AccessibilityPreferences = {
  fontScale: "normal",
  voiceEnabled: false,
}

export function fontScaleCssPercent(scale: FontScale) {
  if (scale === "large") return "112.5%"
  if (scale === "xlarge") return "125%"
  return "100%"
}

export function nextFontScale(current: FontScale, direction: "up" | "down"): FontScale {
  const index = FONT_SCALE_STEPS.indexOf(current)
  if (direction === "up") return FONT_SCALE_STEPS[Math.min(index + 1, FONT_SCALE_STEPS.length - 1)] ?? current
  return FONT_SCALE_STEPS[Math.max(index - 1, 0)] ?? current
}

export function loadAccessibilityPreferences(): AccessibilityPreferences {
  if (typeof localStorage === "undefined") return defaultAccessibilityPreferences
  try {
    const raw = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)
    if (!raw) return defaultAccessibilityPreferences
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>
    const fontScale = FONT_SCALE_STEPS.includes(parsed.fontScale as FontScale)
      ? (parsed.fontScale as FontScale)
      : "normal"
    return {
      fontScale,
      voiceEnabled: Boolean(parsed.voiceEnabled),
    }
  } catch {
    return defaultAccessibilityPreferences
  }
}

export function saveAccessibilityPreferences(prefs: AccessibilityPreferences) {
  localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(prefs))
}

export function applyAccessibilityPreferences(prefs: AccessibilityPreferences) {
  const root = document.documentElement
  root.dataset.a11yFont = prefs.fontScale
  root.style.setProperty("--a11y-root-font-size", fontScaleCssPercent(prefs.fontScale))
  if (prefs.voiceEnabled) root.dataset.a11yVoice = "on"
  else delete root.dataset.a11yVoice
}
