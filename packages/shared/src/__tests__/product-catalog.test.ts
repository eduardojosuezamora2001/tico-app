import { describe, expect, it } from "vitest"

import {
  findVariantByOptions,
  optionsKey,
  validateVariantOptions,
} from "../product-catalog.js"

describe("validateVariantOptions", () => {
  const groups = [
    {
      key: "color",
      label: "Color",
      type: "color" as const,
      values: [
        { value: "rojo", label: "Rojo" },
        { value: "azul", label: "Azul" },
      ],
    },
  ]

  it("accepts valid options", () => {
    const result = validateVariantOptions(groups, { color: "rojo" })
    expect(result.ok).toBe(true)
  })

  it("rejects missing option", () => {
    const result = validateVariantOptions(groups, {})
    expect(result.ok).toBe(false)
  })
})

describe("findVariantByOptions", () => {
  it("matches variant by options key", () => {
    const variants = [
      { id: "a", options: { color: "rojo" }, isAvailable: true },
      { id: "b", options: { color: "azul" }, isAvailable: true },
    ]
    expect(findVariantByOptions(variants, { color: "azul" })?.id).toBe("b")
    expect(optionsKey({ color: "azul" })).toBe("color=azul")
  })
})
