import { NotFoundPage } from "@/pages/not-found"
import { renderWithProviders, screen } from "@/test/test-utils"

describe("NotFoundPage", () => {
  it("indica página no encontrada y enlace al inicio", () => {
    renderWithProviders(<NotFoundPage />)
    expect(screen.getByRole("heading", { name: /pagina no encontrada/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /volver al inicio/i })).toHaveAttribute("href", "/")
  })
})
