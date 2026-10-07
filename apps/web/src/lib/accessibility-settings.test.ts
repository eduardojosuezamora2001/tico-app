import {
  ACCESSIBILITY_STORAGE_KEY,
  applyAccessibilityPreferences,
  fontScaleCssPercent,
  loadAccessibilityPreferences,
  nextFontScale,
  saveAccessibilityPreferences,
} from "@/lib/accessibility-settings"

describe("accessibility-settings", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute("data-a11y-font")
    document.documentElement.removeAttribute("data-a11y-voice")
    document.documentElement.style.removeProperty("--a11y-root-font-size")
  })

  it("calcula porcentajes de escala", () => {
    expect(fontScaleCssPercent("normal")).toBe("100%")
    expect(fontScaleCssPercent("large")).toBe("112.5%")
    expect(fontScaleCssPercent("xlarge")).toBe("125%")
  })

  it("avanza y retrocede la escala", () => {
    expect(nextFontScale("normal", "up")).toBe("large")
    expect(nextFontScale("xlarge", "up")).toBe("xlarge")
    expect(nextFontScale("large", "down")).toBe("normal")
  })

  it("persiste y carga preferencias", () => {
    saveAccessibilityPreferences({ fontScale: "large", voiceEnabled: true })
    expect(JSON.parse(localStorage.getItem(ACCESSIBILITY_STORAGE_KEY)!)).toEqual({
      fontScale: "large",
      voiceEnabled: true,
    })
    expect(loadAccessibilityPreferences()).toEqual({ fontScale: "large", voiceEnabled: true })
  })

  it("aplica atributos al documento", () => {
    applyAccessibilityPreferences({ fontScale: "xlarge", voiceEnabled: true })
    expect(document.documentElement.dataset.a11yFont).toBe("xlarge")
    expect(document.documentElement.dataset.a11yVoice).toBe("on")
    expect(document.documentElement.style.getPropertyValue("--a11y-root-font-size")).toBe("125%")
  })
})
