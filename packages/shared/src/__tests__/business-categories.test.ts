import { describe, expect, it } from "vitest"

import {
  BUSINESS_CATEGORY_OPTIONS,
  MAX_BUSINESS_CATEGORIES,
  parseBusinessCategories,
  serializeBusinessCategories,
} from "../business-categories.js"

describe("business categories", () => {
  it("expone hasta 50 rubros predefinidos", () => {
    expect(BUSINESS_CATEGORY_OPTIONS.length).toBeLessThanOrEqual(MAX_BUSINESS_CATEGORIES)
    expect(BUSINESS_CATEGORY_OPTIONS.length).toBe(50)
    expect(new Set(BUSINESS_CATEGORY_OPTIONS).size).toBe(BUSINESS_CATEGORY_OPTIONS.length)
  })

  it("serializa y parsea CSV", () => {
    const raw = serializeBusinessCategories(["Farmacia", "Gimnasio"])
    expect(raw).toBe("Farmacia, Gimnasio")
    expect(parseBusinessCategories(raw)).toEqual(["Farmacia", "Gimnasio"])
  })
})
