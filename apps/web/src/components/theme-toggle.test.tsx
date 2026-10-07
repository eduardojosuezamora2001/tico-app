import { ThemeToggle } from "@/components/theme-toggle"
import { renderWithProviders, screen, userEvent } from "@/test/test-utils"

describe("ThemeToggle", () => {
  it("alterna el tema al hacer click", async () => {
    const user = userEvent.setup()
    renderWithProviders(<ThemeToggle />)
    const button = screen.getByRole("button")
    const initial = button.getAttribute("aria-label")
    expect(initial).toMatch(/tema/i)
    await user.click(button)
    expect(button.getAttribute("aria-label")).not.toBe(initial)
  })
})
