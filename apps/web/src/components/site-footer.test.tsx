import { SiteFooter } from "@/components/site-footer"
import { renderWithProviders, screen } from "@/test/test-utils"

describe("SiteFooter", () => {
  it("muestra la marca en variante full", () => {
    renderWithProviders(<SiteFooter />)
    expect(screen.getByText("TicoAppCR")).toBeInTheDocument()
    expect(screen.getByText("Explorar Costa Rica")).toBeInTheDocument()
  })

  it("muestra enlace de registro en variante compact", () => {
    renderWithProviders(<SiteFooter variant="compact" />)
    expect(screen.getByRole("link", { name: /registrar un negocio/i })).toBeInTheDocument()
  })
})
