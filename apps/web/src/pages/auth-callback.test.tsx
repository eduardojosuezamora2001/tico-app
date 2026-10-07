import { AuthCallbackPage } from "@/pages/auth-callback"
import { renderWithProviders, screen } from "@/test/test-utils"

describe("AuthCallbackPage", () => {
  it("muestra estado de espera por defecto", () => {
    renderWithProviders(<AuthCallbackPage />)
    expect(screen.getByText(/entrando|espera|sesión|google/i)).toBeInTheDocument()
  })
})
