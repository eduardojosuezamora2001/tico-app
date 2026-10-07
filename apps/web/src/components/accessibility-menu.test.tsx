import { render, screen } from "@/test/test-utils"

import { AccessibilityMenu } from "@/components/accessibility-menu"

describe("AccessibilityMenu", () => {
  it("muestra el disparador de accesibilidad", () => {
    render(<AccessibilityMenu variant="full" />)
    expect(screen.getByRole("button", { name: /accesibilidad/i })).toBeInTheDocument()
  })
})
