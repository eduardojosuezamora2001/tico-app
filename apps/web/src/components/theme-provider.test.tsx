import { ThemeProvider, useTheme } from "@/components/theme-provider"
import { render, screen, userEvent } from "@/test/test-utils"

function Probe() {
  const { theme, setTheme } = useTheme()
  return (
    <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      {theme}
    </button>
  )
}

describe("ThemeProvider", () => {
  it("expone y cambia el tema", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider defaultTheme="light" storageKey="jest-theme">
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByRole("button")).toHaveTextContent("light")
    await user.click(screen.getByRole("button"))
    expect(screen.getByRole("button")).toHaveTextContent("dark")
  })
})
